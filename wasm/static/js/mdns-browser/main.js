/**
 * findNvService() — unified host discovery for Tizen.
 * 
 * Tizen's WebAssembly sandbox cannot receive mDNS responses:
 *   - UDP multicast on port 5353 is intercepted by the system Avahi daemon and
 *     never delivered to WASM sockets, even with SO_REUSEPORT set.
 *   - Unicast mDNS replies are dropped by Tizen's SMACK stateful firewall because
 *     the query goes to 224.0.0.251 but the reply comes from the host's unicast IP,
 *     so the 5-tuple never matches an established conntrack entry.
 *   - Samsung's Tizen WRT has no mDNS/NetBIOS/local DNS support, making .local
 *     hostnames (e.g. MacBook-Pro.local from /serverinfo's <hostname>) unresolvable.
 * 
 * Instead, we perform a fast parallel HTTP scan of the /24 subnet. TCP fetch()
 * correctly establishes conntrack state, so replies are delivered normally.
 * Only port 47989 (Sunshine HTTP) is probed — 47984 (HTTPS/GFE) is skipped to
 * halve the number of parallel requests and avoid TLS certificate errors.
 * 
 * If Samsung ever adds native UDP multicast or mDNS support to the Tizen WRT,
 * re-enable the original findNvService() and replace this function with a
 * call to sendMessage('startMdnsDiscovery').
 */
function findNvService(ipString) {
  // Discovery is IPv4-only: Tizen has no mDNS/NetBIOS/local DNS to resolve
  // .local hostnames, and the HTTP subnet scanner only produces IPv4 addresses.
  var ip = ipString.replace('ipv4:', '');

  // Create a new NvHTTP object for the discovered host
  var discoveredHost = new NvHTTP(ip, myUniqueid);
  discoveredHost.httpPort = 47989;
  discoveredHost.httpsPort = 47984;

  // Poll the discovered host and verify host status before adding it
  discoveredHost.pollServer(function(returnedDiscoveredHost) {
    // If the host is offline, do not add it to the grid or update its stored IP
    if (!returnedDiscoveredHost.online) {
      return;
    }
    // Check if the host is already known by its server UID
    if (hosts[returnedDiscoveredHost.serverUid] != null) {
      // Host already known — update its stored IP if it has changed
      var existingAddress = hosts[returnedDiscoveredHost.serverUid].address;
      // Also check if the base URL is out of sync or stale compared to the discovered host
      var existingBaseUrl = hosts[returnedDiscoveredHost.serverUid]._baseUrlHttps;
      if (existingAddress !== returnedDiscoveredHost.address || existingBaseUrl !== returnedDiscoveredHost._baseUrlHttps) {
        var isIpv4 = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(existingAddress);
        // Do not overwrite IPv6 or DNS addresses if they are currently online
        if (!isIpv4 && hosts[returnedDiscoveredHost.serverUid].online && existingBaseUrl === returnedDiscoveredHost._baseUrlHttps) {
          console.log('%c[main.js, findNvService]', 'color: gray;', 'Keeping existing non-IPv4 address since it is online:', existingAddress);
        } else {
          // Update the stored address to the newly discovered IPv4 address
          console.log('%c[main.js, findNvService]', 'color: gray;', 'Updating address for server UID:', returnedDiscoveredHost.serverUid, 'from', existingAddress, 'to', returnedDiscoveredHost.address);
          hosts[returnedDiscoveredHost.serverUid].address = returnedDiscoveredHost.address;
          hosts[returnedDiscoveredHost.serverUid].localAddress = returnedDiscoveredHost.localAddress;
          hosts[returnedDiscoveredHost.serverUid]._baseUrlHttp = returnedDiscoveredHost._baseUrlHttp;
          hosts[returnedDiscoveredHost.serverUid]._baseUrlHttps = returnedDiscoveredHost._baseUrlHttps;
          hosts[returnedDiscoveredHost.serverUid].macAddress = returnedDiscoveredHost.macAddress;
          if (typeof hosts[returnedDiscoveredHost.serverUid].updateExternalAddressIP4 === 'function') {
            hosts[returnedDiscoveredHost.serverUid].updateExternalAddressIP4();
          }
          saveHosts();
        }
      }
    } else {
      // New host — add to grid and begin background polling
      addHostToGrid(returnedDiscoveredHost, true);
      beginBackgroundPollingOfHost(returnedDiscoveredHost);
      saveHosts();
    }
  });
}

/**
 * Scan the /24 subnet for Sunshine/GFE hosts. For each IP that responds with
 * HTTP 200 on port 47989, findNvService() runs the full NvHTTP handshake and
 * registers the host in the UI. See the findNvService() comment above for why
 * mDNS is not used on Tizen.
 */
window.subnetScanAbortCtrl = null;
window.subnetScanPromise = null;

window.abortSubnetScan = function() {
  if (window.subnetScanAbortCtrl) {
    console.log('%c[main.js]', 'color: orange;', 'User initiated action: Aborting background subnet scan to free network stack.');
    window.subnetScanAbortCtrl.abort();
    window.subnetScanAbortCtrl = null;
  }
};

function startSubnetScanner() {
  if (window.subnetScanPromise) {
    console.log('%c[main.js, startSubnetScanner]', 'color: orange;', 'Subnet scan already in progress, skipping new scan.');
    return window.subnetScanPromise;
  }

  window.subnetScanPromise = new Promise(function(resolve) {
    try {
      var localIp = (typeof webapis !== 'undefined' && webapis.network) ? webapis.network.getIp() : null;
      // If the local IP cannot be determined, skip the subnet scan to avoid unnecessary network traffic
      if (!localIp) {
        window.subnetScanPromise = null;
        return resolve();
      }
      
      var parts = localIp.split('.');
      // Check if the IP address is in the expected IPv4 format
      if (parts.length !== 4) {
        console.warn('%c[main.js, startSubnetScanner]', 'color: orange;', 'Unexpected IP format:', localIp);
        window.subnetScanPromise = null;
        return resolve();
      }
      
      var subnet = parts[0] + '.' + parts[1] + '.' + parts[2];
      console.log('%c[main.js, startSubnetScanner]', 'color: green;', 'Starting chunked subnet /24 scan on', subnet + '.0/24');
      
      if (window.subnetScanAbortCtrl) {
        window.subnetScanAbortCtrl.abort();
      }
      window.subnetScanAbortCtrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      
      var IPs = [];
      for (var i = 1; i <= 254; i++) IPs.push(subnet + '.' + i);
      
      var index = 0;
      var activeCount = 0;
      var concurrency = 64; // Throttle to 64 to save Tizen's ARP queue
      
      function scanNext() {
        if (!window.subnetScanAbortCtrl || index >= IPs.length) {
          if (activeCount === 0) {
            window.subnetScanPromise = null;
            resolve();
          }
          return;
        }
        
        var ip = IPs[index++];
        activeCount++;
        
        var localAbort = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        var timeoutId = setTimeout(function() {
          if (localAbort) localAbort.abort();
        }, 1000);
        
        var onGlobalAbort = function() {
          if (localAbort) localAbort.abort();
        };
        
        if (window.subnetScanAbortCtrl) {
          window.subnetScanAbortCtrl.signal.addEventListener('abort', onGlobalAbort);
        }
        
        fetch('http://' + ip + ':47989/serverinfo', localAbort ? { signal: localAbort.signal } : {})
          .then(function(res) {
            clearTimeout(timeoutId);
            if (res.ok) {
              console.log('%c[main.js, startSubnetScanner]', 'color: green;', 'Found host with IP address:', ip);
              findNvService('ipv4:' + ip);
            }
            if (window.subnetScanAbortCtrl) window.subnetScanAbortCtrl.signal.removeEventListener('abort', onGlobalAbort);
            activeCount--;
            scanNext();
          })
          .catch(function() {
            clearTimeout(timeoutId);
            if (window.subnetScanAbortCtrl) window.subnetScanAbortCtrl.signal.removeEventListener('abort', onGlobalAbort);
            activeCount--;
            scanNext();
          });
      }
      
      // Kick off the initial batch of 64 concurrent scans
      for (var c = 0; c < Math.min(concurrency, IPs.length); c++) {
        scanNext();
      }
    } catch (e) {
      console.error('%c[main.js, startSubnetScanner]', 'color: red;', 'Subnet scanner failed:', e);
      window.subnetScanPromise = null;
      resolve();
    }
  });
  return window.subnetScanPromise;
}

/**
 * Construct a new ServiceFinder. This is a single-use object that does a DNS
 * multicast search on creation.
 * @constructor
 * @param {function} callback The callback to be invoked when this object is
 *                            updated, or when an error occurs (passes string).
 */
// var ServiceFinder = function(callback) {
//   this.callback_ = callback;
//   this.byIP_ = {};
//   this.byService_ = {};

//  // Set up receive handlers
//   this.onReceiveListener_ = this.onReceive_.bind(this);
//   chrome.sockets.udp.onReceive.addListener(this.onReceiveListener_);
//   this.onReceiveErrorListener_ = this.onReceiveError_.bind(this);
//   chrome.sockets.udp.onReceiveError.addListener(this.onReceiveErrorListener_);

//   ServiceFinder.forEachAddress_(function(address, error) {
//     if (error) {
//       this.callback_(error);
//       return true;
//     }
//     if (address.indexOf(':') != -1) {
//      // TODO: Support IPv6
//       console.log('%c[main.js, ServiceFinder]', 'color: gray;', 'IPv6 address unsupported: ' + address);
//       return true;
//     }
//     console.log('%c[main.js, ServiceFinder]', 'color: gray;', 'Broadcasting to address: ' + address);

//     ServiceFinder.bindToAddress_(address, function(socket) {
//       if (!socket) {
//         this.callback_('could not bind UDP socket');
//         return true;
//       }
//      // Broadcast on it
//       this.broadcast_(socket, address);
//     }.bind(this));
//   }.bind(this));

//  // After a short time, if our database is empty, report an error
//   setTimeout(function() {
//     if (!Object.keys(this.byIP_).length) {
//       this.callback_('no mDNS services found!');
//     }
//   }.bind(this), 10 * 1000);
// };

/**
 * Invokes the callback for every local network address on the system.
 * @private
 * @param {function} callback to invoke
 */
// ServiceFinder.forEachAddress_ = function(callback) {
//   chrome.system.network.getNetworkInterfaces(function(networkInterfaces) {
//     if (!networkInterfaces.length) {
//       callback(null, 'no network available!');
//       return true;
//     }
//     networkInterfaces.forEach(function(networkInterface) {
//       callback(networkInterface['address'], null);
//     });
//   });
// };

/**
 * Creates UDP socket bound to the specified address, passing it to the
 * callback. Passes null on failure.
 * @private
 * @param {string} address to bind to
 * @param {function} callback to invoke when done
 */
// ServiceFinder.bindToAddress_ = function(address, callback) {
//   chrome.sockets.udp.create({}, function(createInfo) {
//     chrome.sockets.udp.bind(createInfo['socketId'], address, 0, function(result) {
//       callback((result >= 0) ? createInfo['socketId'] : null);
//     });
//   });
// };

/**
 * Sorts the passed list of string IPs in-place.
 * @private
 */
// ServiceFinder.sortIps_ = function(arg) {
//   arg.sort(ServiceFinder.sortIps_.sort);
//   return arg;
// };

// ServiceFinder.sortIps_.sort = function(l, r) {
//  // TODO: Support IPv6
//   var lp = l.split('.').map(ServiceFinder.sortIps_.toInt_);
//   var rp = r.split('.').map(ServiceFinder.sortIps_.toInt_);
//   for (var i = 0; i < Math.min(lp.length, rp.length); ++i) {
//     if (lp[i] < rp[i]) {
//       return -1;
//     } else if (lp[i] > rp[i]) {
//       return +1;
//     }
//   }
//   return 0;
// };

// ServiceFinder.sortIps_.toInt_ = function(i) { 
//   return +i
// };

/**
 * Returns the services found by this ServiceFinder, optionally filtered by IP.
 */
// ServiceFinder.prototype.services = function(opt_ip) {
//   var k = Object.keys(opt_ip ? this.byIP_[opt_ip] : this.byService_);
//   k.sort();
//   return k;
// };

/**
 * Returns the IPs found by this ServiceFinder, optionally filtered by service.
 */
// ServiceFinder.prototype.ips = function(opt_service) {
//   var k = Object.keys(opt_service ? this.byService_[opt_service] : this.byIP_);
//   return ServiceFinder.sortIps_(k);
// };

/**
 * Handles an incoming UDP packet.
 * @private
 */
// ServiceFinder.prototype.onReceive_ = function(info) {
//   var getDefault_ = function(o, k, def) {
//     (k in o) || false == (o[k] = def);
//     return o[k];
//   };

//  // Update our local database
//  // TODO: Resolve IPs using the DNS extension
//   var packet = DNSPacket.parse(info.data);
//   var byIP = getDefault_(this.byIP_, info.remoteAddress, {});

//   packet.each('an', 12, function(rec) {
//     var ptr = rec.asName();
//     var byService = getDefault_(this.byService_, ptr, {})
//     byService[info.remoteAddress] = true;
//     byIP[ptr] = true;
//   }.bind(this));

//  // Ping! Something new is here. Only update every 500ms
//   if (!this.callback_pending_) {
//     this.callback_pending_ = true;
//     setTimeout(function() {
//       this.callback_pending_ = undefined;
//       this.callback_();
//     }.bind(this), 500);
//   }
// };

/**
 * Handles network error occurred while waiting for data.
 * @private
 */
// ServiceFinder.prototype.onReceiveError_ = function(info) {
//   this.callback_(info.resultCode);
//   return true;
// };

/**
 * Broadcasts for services on the given socket/address.
 * @private
 */
// ServiceFinder.prototype.broadcast_ = function(sock, address) {
//   var packet = new DNSPacket();
//   packet.push('qd', new DNSRecord('_services._dns-sd._udp.local', 12, 1));

//   var raw = packet.serialize();
//   chrome.sockets.udp.send(sock, raw, '224.0.0.251', 5353, function(sendInfo) {
//     if (sendInfo.resultCode < 0) {
//       this.callback_('Could not send data to:' + address);
//     }
//   });
// };

// ServiceFinder.prototype.shutdown = function() {
//  // Remove event listeners
//   chrome.sockets.udp.onReceive.removeListener(this.onReceiveListener_);
//   chrome.sockets.udp.onReceiveError.removeListener(this.onReceiveErrorListener_);
//  // Close opened sockets
//   chrome.sockets.udp.getSockets(function(sockets) {
//     sockets.forEach(function(sock) {
//       chrome.sockets.udp.close(sock.socketId);
//     });
//   });
// };

// var finder = null;
// function findNvService(callback) {
//   finder && finder.shutdown();
//   finder = new ServiceFinder(function(opt_error) {
//     callback(finder, opt_error);
//   });
// }
