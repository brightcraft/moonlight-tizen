// Safely wraps IPv6 addresses in brackets for URL construction.
// IPv4 addresses and DNS hostnames do not contain colons, so they are untouched.
function formatAddressForUrl(address) {
  if (address && address.indexOf(':') !== -1 && address.indexOf('[') === -1) {
    return '[' + address + ']';
  }
  return address;
}

function guuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0,
      v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function uniqueid() {
  return 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, function(c) {
    var r = Math.random() * 16 | 0;
    return r.toString(16);
  });
}

function generateRemoteInputKey() {
  var array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
}

function generateRemoteInputKeyId() {
  // Value must be signed 32-bit int for correct behavior
  var array = new Int32Array(1);
  window.crypto.getRandomValues(array);
  return array[0];
}

// Based on OpenBSD arc4random_uniform()
function cryptoRand(upper_bound) {
  var min = (Math.pow(2, 32) - upper_bound) % upper_bound;
  var array = new Uint32Array(1);

  do {
    window.crypto.getRandomValues(array);
  } while (array[0] < min);

  return array[0] % upper_bound;
}

var _realGamepads = new Set();
function getConnectedGamepadMask() {
  var count = 0;
  var mask = 0;
  var gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

  for (var i = 0; i < gamepads.length; i++) {
    var gamepad = gamepads[i];
    if (gamepad) {
      // See logic in gamepad.cpp
      // These must stay in sync!

      if (!gamepad.connected) {
        // Not connected
        _realGamepads.delete(gamepad.index);
        continue;
      }

      if (gamepad.timestamp !== 0) {
        _realGamepads.add(gamepad.index);
      }

      if (gamepad.timestamp === 0 && !_realGamepads.has(gamepad.index)) {
        // On some platforms, Tizen returns "connected" gamepads that really 
        // aren't, so timestamp stays at zero. To work around this, we'll only
        // count gamepads that have a non-zero timestamp in our controller index.
        continue;
      }

      mask |= 1 << count++;
    }
  }

  console.log('%c[utils.js, getConnectedGamepadMask]', 'color: gray;', 'Detected: ' + count + ' gamepads.');
  return mask;
}

String.prototype.toHex = function() {
  var hex = '';
  for (var i = 0; i < this.length; i++) {
    hex += '' + this.charCodeAt(i).toString(16);
  }
  return hex;
}

function NvHTTP(address, clientUid, userEnteredAddress = '', macAddress) {
  // Constructor start
  this.hostname = address;
  this.address = address;
  this.userEnteredAddress = userEnteredAddress; // if the user entered an address, we keep it on hand to try when polling
  this.localAddress = '';
  this.externalIP = '';
  this.macAddress = macAddress;
  this.httpsPort = 0;
  this.httpPort = 0;
  this.externalPort = 0;
  this.clientUid = clientUid;
  this.serverUid = '';
  this.ppkstr = null;
  this._pollCount = 0;
  this._consecutivePollFailures = 0;
  this._pollCompletionCallbacks = [];
  this.paired = false;
  this.online = false;
  this.numofapps = 0;
  this.currentGame = 0;
  this.appVersion = '';
  this.gfeVersion = '';
  this.serverMajorVersion = 0;
  this.serverState = '';
  this.isNvidiaServerSoftware = false;
  this.gputype = '';
  this.supportedDisplayModes = {}; // key: y-resolution:x-resolution, value: array of supported frame rates

  _self = this;
  console.log('%c[utils.js, NvHTTP]', 'color: gray;', 'NvHTTP Object: \n' + this);
};

function _arrayBufferToBase64(buffer) {
  var binary = '';
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;

  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return window.btoa(binary);
}

function _base64ToArrayBuffer(base64) {
  var binary_string = window.atob(base64);
  var len = binary_string.length;
  var bytes = new Uint8Array(len);

  for (var i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }

  return bytes.buffer;
}

NvHTTP.prototype = {
  getUid: function() {
    return this.isNvidiaServerSoftware ? '0123456789ABCDEF' : this.clientUid;
  },

  _openUrlWithTimeout: function(url, ppkstr) {
    return Promise.race([
      sendMessage('openUrl', [url, ppkstr, false]),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout retrieving server info')), 5000))
    ]).catch(error => {
      if (error && error.message === 'Timeout retrieving server info') {
        sendMessage('cancelRequest', []);
        throw -1;
      }
      throw error;
    });
  },

  // Refreshes the server info using the base URL. This is useful for testing whether we can successfully ping a host at the base URL
  refreshServerInfo: function() {
    if (this.ppkstr == null) {
      // Use HTTP if we have no pinned cert
      return this._openUrlWithTimeout(this._baseUrlHttp + '/serverinfo?' + this._buildUidStr(), this.ppkstr).then(function(retHttp) {
        this._parseServerInfo(retHttp);
      }.bind(this));
    }
    // Try HTTPS first
    return this._openUrlWithTimeout(this._baseUrlHttps + '/serverinfo?' + this._buildUidStr(), this.ppkstr).then(function(ret) {
      if (!this._parseServerInfo(ret)) { // If that fails
        console.error('%c[utils.js, refreshServerInfo]', 'color: gray;', 'Error: Failed to parse server info from HTTPS, falling back to HTTP...');
        // Try HTTP as a failover. Useful to clients who aren't paired yet
        return this._openUrlWithTimeout(this._baseUrlHttp + '/serverinfo?' + this._buildUidStr(), this.ppkstr).then(function(retHttp) {
          if (!this._parseServerInfo(retHttp)) {
            return Promise.reject("Failed to parse server info from HTTP");
          }
        }.bind(this));
      }
    }.bind(this), function(error) {
      if (error == -100) { // GS_CERT_MISMATCH
        console.warn('%c[utils.js, refreshServerInfo]', 'color: gray;', 'Warning: Certificate mismatch. Retrying over HTTP...', this);
        return this._openUrlWithTimeout(this._baseUrlHttp + '/serverinfo?' + this._buildUidStr(), this.ppkstr).then(function(retHttp) {
          if (!this._parseServerInfo(retHttp)) {
            return Promise.reject("Failed to parse server info from HTTP");
          }
        }.bind(this));
      }
      return Promise.reject(error);
    }.bind(this));
  },

  // Refreshes the server info using a given address. This is useful for testing whether we can successfully ping a host at a given address
  refreshServerInfoAtAddress: function(givenAddress) {
    var urlAddr = formatAddressForUrl(givenAddress);
    if (this.ppkstr == null) {
      // Use HTTP if we have no pinned cert
      return this._openUrlWithTimeout('http://' + urlAddr + ':' + this.httpPort + '/serverinfo?' + this._buildUidStr(), this.ppkstr).then(function(retHttp) {
        var parsed = this._parseServerInfo(retHttp);
        if (!parsed) return Promise.reject("Failed to parse server info from HTTP");
        return parsed;
      }.bind(this));
    }
    // Try HTTPS first
    return this._openUrlWithTimeout('https://' + urlAddr + ':' + this.httpsPort + '/serverinfo?' + this._buildUidStr(), this.ppkstr).then(function(ret) {
      if (!this._parseServerInfo(ret)) { // If that fails
        console.error('%c[utils.js, refreshServerInfoAtAddress]', 'color: gray;', 'Error: Failed to parse server info from HTTPS, falling back to HTTP...');
        // Try HTTP as a failover. Useful to clients who aren't paired yet
        return this._openUrlWithTimeout('http://' + urlAddr + ':' + this.httpPort + '/serverinfo?' + this._buildUidStr(), this.ppkstr).then(function(retHttp) {
          var parsed = this._parseServerInfo(retHttp);
          if (!parsed) return Promise.reject("Failed to parse server info from HTTP");
          return parsed;
        }.bind(this));
      }
    }.bind(this), function(error) {
      if (error == -100) { // GS_CERT_MISMATCH
        console.warn('%c[utils.js, refreshServerInfoAtAddress]', 'color: gray;', 'Warning: Certificate mismatch. Retrying over HTTP...', this);
        return this._openUrlWithTimeout('http://' + urlAddr + ':' + this.httpPort + '/serverinfo?' + this._buildUidStr(), this.ppkstr).then(function(retHttp) {
          var parsed = this._parseServerInfo(retHttp);
          if (!parsed) return Promise.reject("Failed to parse server info from HTTP");
          return parsed;
        }.bind(this));
      }
      return Promise.reject(error);
    }.bind(this));
  },

  // Called every few seconds to poll the server for updated info
  pollServer: function(onComplete) {
    // Pend this callback on completion
    this._pollCompletionCallbacks.push(onComplete);

    // Check if a poll was already in progress
    if (this._pollCompletionCallbacks.length > 1) {
      // Don't start another, because the one in progress will alert our caller too
      return;
    }

    // Check if a stream session is already in progress
    if (isInGame === true) {
      // Drain callbacks to avoid permanently blocking the deduplication guard
      var completion;
      while ((completion = this._pollCompletionCallbacks.pop())) {
        completion(this); // Executes the callback so the caller isn't left hanging
      }
      // Do not initiate any server polls while a streaming session is already in progress
      return;
    }

    this.selectServerAddress(function(successfulAddress) {
      // Successfully determined server address. Update base URL
      var urlAddr = formatAddressForUrl(successfulAddress);
      this.address = successfulAddress;
      this._baseUrlHttps = 'https://' + urlAddr + ':' + this.httpsPort;
      this._baseUrlHttp = 'http://' + urlAddr + ':' + this.httpPort;

      // Poll for updated mac address only on first successful server info poll
      if (this.paired && this._pollCount === 0) {
        updateMacAddress(this);
      }

      // Poll for the app list every 10 successful server info polls
      // Not including the first one to avoid PCs taking a while to show as online initially
      if (this.paired && this._pollCount++ % 10 === 1) {
        this.getAppListWithCacheFlush();
      }

      this._consecutivePollFailures = 0;
      this.online = true;

      // Call all pending completion callbacks
      var completion;
      while ((completion = this._pollCompletionCallbacks.pop())) {
        completion(this);
      }
    }.bind(this), function() {
      if (++this._consecutivePollFailures >= 2) {
        this.online = false;
        this._memCachedApplist = null;
      }

      // Call all pending completion callbacks
      var completion;
      while ((completion = this._pollCompletionCallbacks.pop())) {
        completion(this);
      }
    }.bind(this));
  },

  // Initially pings the server to try and figure out if it's routable by any means
  selectServerAddress: function(onSuccess, onFailure) {
    // Build a deduplicated, validated list of candidate addresses to try in order.
    var seen = {};
    var candidates = [];

    var addCandidate = function(addr) {
      if (addr && !seen[addr]) { // skip empty strings AND duplicates
        seen[addr] = true;
        candidates.push(addr);
      }
    };

    addCandidate(this.address);
    // Only append '.local' if the hostname doesn't already end with it
    var localSuffix = this.hostname.endsWith('.local') ? this.hostname : this.hostname + '.local';
    addCandidate(localSuffix);
    addCandidate(this.externalIP);
    addCandidate(this.userEnteredAddress);

    var tryNext = function(index) {
      if (index >= candidates.length) {
        console.error('%c[utils.js, selectServerAddress]', 'color: gray;', 'Error: Failed to contact the ' + this.hostname + '!', this);
        onFailure();
        return;
      }
      var addr = candidates[index];
      this.refreshServerInfoAtAddress(addr).then(function() {
        onSuccess(addr);
      }.bind(this), function() {
        tryNext.call(this, index + 1);
      }.bind(this));
    }.bind(this);

    tryNext(0);
  },

  toString: function() {
    var string = '';
    string += 'host name: ' + this.hostname + '\r\n';
    string += 'host address: ' + this.address + '\r\n';
    string += 'local address: ' + this.localAddress + '\r\n';
    string += 'external IP: ' + this.externalIP + '\r\n';
    string += 'mac address: ' + this.macAddress + '\r\n';
    string += 'https port: ' + this.httpsPort + '\r\n';
    string += 'http port: ' + this.httpPort + '\r\n';
    string += 'external port: ' + this.externalPort + '\r\n';
    string += 'client UID: ' + this.clientUid + '\r\n';
    string += 'server UID: ' + this.serverUid + '\r\n';
    string += 'is paired: ' + this.paired + '\r\n';
    string += 'is online: ' + this.online + '\r\n';
    string += 'number of apps: ' + this.numofapps + '\r\n';
    string += 'current game: ' + this.currentGame + '\r\n';
    string += 'app version: ' + this.appVersion + '\r\n';
    string += 'gfe version: ' + this.gfeVersion + '\r\n';
    string += 'server major version: ' + this.serverMajorVersion + '\r\n';
    string += 'server state: ' + this.serverState + '\r\n';
    string += 'nvidia server software: ' + this.isNvidiaServerSoftware + '\r\n';
    string += 'gpu type: ' + this.gputype + '\r\n';
    string += 'supported display modes: ' + '\r\n';

    for (var displayMode in this.supportedDisplayModes) {
      string += '\t' + displayMode + ': ' + this.supportedDisplayModes[displayMode] + '\r\n';
    }

    return string;
  },

  _parseServerInfo: function(xmlStr) {
    $xml = this._parseXML(xmlStr);
    $root = $xml.find('root');

    if ($root.attr('status_code') != 200) {
      return false;
    }

    if (this.serverUid != $root.find('uniqueid').text().trim() && this.serverUid != '') {
      // If we received a UUID that isn't the one we expected, fail
      return false;
    }

    console.log('%c[utils.js, _parseServerInfo]', 'color: gray;', 'Parsing server info: ', $root);

    // Retrieve the hostname and handle name validation
    var serverName = $root.find('hostname').text().trim();
    if (serverName != '') {
      this.hostname = serverName;
    } else {
      this.hostname = 'UNKNOWN';
    }

    // UUID is mandatory to determine which machine is responding
    this.serverUid = $root.find('uniqueid').text().trim();

    // Retrieve the local IP address and MAC address of the host
    this.localAddress = $root.find('LocalIP').text().trim();
    this.macAddress = $root.find('mac').text().trim();

    // This is an extension which is not present in GFE. It is present for Sunshine to be able
    // to support dynamic HTTP WAN ports without requiring the user to manually enter the port.
    this.externalPort = parseInt($root.find('ExternalPort').text().trim(), 10);
    this.httpsPort = parseInt($root.find('HttpsPort').text().trim(), 10);

    // This is not present in newer GFE versions
    var externIP = $root.find('ExternalIP').text().trim();
    if (externIP) {
      // Don't overwrite the external IP we found via STUN
      this.externalIP = externIP;
    }

    // These are present in all supported GFE versions
    this.paired = $root.find('PairStatus').text().trim() == 1;
    this.appVersion = $root.find('appversion').text().trim();
    this.serverMajorVersion = parseInt(this.appVersion.substring(0, 1), 10);

    // This wasn't present on old GFE versions
    this.serverCodecModeSupport = parseInt($root.find('ServerCodecModeSupport').text().trim(), 10);

    try {
      // These aren't critical for functionality, and don't necessarily exist in older GFE versions
      this.gfeVersion = $root.find('GfeVersion').text().trim();
      this.gputype = $root.find('gputype').text().trim();
      this.numofapps = $root.find('numofapps').text().trim();
      // Now for the hard part: parsing the supported streaming
      $root.find('DisplayMode').each(function(index, value) { // For each resolution: FPS object
        var yres = parseInt($(value).find('Height').text());
        var xres = parseInt($(value).find('Width').text());
        var fps = parseInt($(value).find('RefreshRate').text());
        if (!this.supportedDisplayModes[yres + ':' + xres]) {
          this.supportedDisplayModes[yres + ':' + xres] = [];
        }
        if (!this.supportedDisplayModes[yres + ':' + xres].includes(fps)) {
          this.supportedDisplayModes[yres + ':' + xres].push(fps);
        }
      }.bind(this));
    } catch (err) {
      // We don't need this data, so no error handling necessary
    }

    var serverStatus = $root.find('state').text().trim();
    if (serverStatus) {
      this.serverState = serverStatus;
      // Detect GFE by its historical "MJOLNIR" codename, which was never used by any third-party server
      this.isNvidiaServerSoftware = serverStatus.includes('MJOLNIR');
    }

    // GFE 2.8 started keeping current game set to the last game played. As a result, it no longer
    // has the semantics that its name would indicate. To contain the effects of this change as much
    // as possible, we'll force the current game to zero if the server isn't in a streaming session.
    if (serverStatus.endsWith('_SERVER_BUSY')) {
      this.currentGame = parseInt($root.find('currentgame').text().trim(), 10);
    } else {
      this.currentGame = 0;
    }

    return true;
  },

  getAppById: function(appId) {
    return this.getAppList().then(function(list) {
      var retApp = null;

      list.some(function(app) {
        if (app.id == appId) {
          retApp = app;
          return true;
        }
        return false;
      });

      return retApp;
    });
  },

  getAppByName: function(appName) {
    return this.getAppList().then(function(list) {
      var retApp = null;

      list.some(function(app) {
        if (app.title == appName) {
          retApp = app;
          return true;
        }
        return false;
      });

      return retApp;
    });
  },

  getAppListWithCacheFlush: function() {
    return Promise.race([
      sendMessage('openUrl', [
        this._baseUrlHttps + '/applist?' + this._buildUidStr(), this.ppkstr, false
      ]),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout retrieving app list')), 10000))
    ]).catch(error => {
      // If it's our timeout error, instruct the C++ layer to abort the hung network request
      if (error.message === 'Timeout retrieving app list') {
        sendMessage('cancelRequest', []);
      }
      throw error;
    }).then(function(ret) {
      $xml = this._parseXML(ret);
      $root = $xml.find('root');

      if ($root.attr('status_code') != 200) {
        // TODO: Bubble up an error here
        console.error('%c[utils.js, getAppListWithCacheFlush]', 'color: gray;', 'Error: Failed to request app list: ', $root.attr('status_code'));
        return [];
      }

      var rootElement = $xml.find('root')[0];
      var appElements = rootElement.getElementsByTagName('App');
      var appList = [];

      for (var i = 0, len = appElements.length; i < len; i++) {
        appList.push({
          id: parseInt(appElements[i].getElementsByTagName('ID')[0].innerHTML.trim(), 10),
          title: appElements[i].getElementsByTagName('AppTitle')[0].innerHTML.trim(),
        });
      }

      this._memCachedApplist = appList;
      console.log('%c[utils.js, getAppListWithCacheFlush]', 'color: gray;', 'App list requested successfully.');

      return appList;
    }.bind(this));
  },

  getAppList: function() {
    if (this._memCachedApplist) {
      return new Promise(function(resolve, reject) {
        console.log('%c[utils.js, getAppList]', 'color: gray;', 'Returning memory-cached apps list.');
        resolve(this._memCachedApplist);
        return;
      }.bind(this));
    }

    return this.getAppListWithCacheFlush();
  },

  // Returns the box art based on the the given appId
  // Three layers of response time are possible: memory-cached (in JavaScript), storage-cached (in tizen.filesystem), and network-fetched (host sends binary over the network)
  // For explanations on the file system, see: https://developer.samsung.com/smarttv/develop/api-references/tizen-web-device-api-references/filesystem-api.html
  // Box art is stored in the public documents virtual root so that the Smart Hub Preview background
  // service process can access it directly without any cross-process copying.
  getBoxArt: function(appId, secureFileName) {
    return new Promise(function(resolve, reject) {
      var boxArtFileName = secureFileName || 'boxart_' + appId + '.png'; // Use secure deterministic name
      var boxArtDir = 'documents'; // Public storage directory so the background service can read it

      var self = this;
      
      // Read the cached box art from the storage
      try {
        var fileHandleRead = tizen.filesystem.openFile(boxArtDir + '/' + boxArtFileName, 'r');
        var fileData = fileHandleRead.readData(); // Returns Uint8Array
        fileHandleRead.close();

        // Convert Uint8Array to base64
        var binary = '';
        for (var i = 0; i < fileData.length; i++) {
          binary += String.fromCharCode(fileData[i]);
        }
        var base64Data = btoa(binary);

        console.log('%c[utils.js, getBoxArt]', 'color: gray;', 'Returning storage-cached box art: ', appId);
        resolve('data:image/png;base64,' + base64Data);
      } catch (readError) {
        console.warn('%c[utils.js, getBoxArt]', 'color: gray;', 'Warning: Cannot find or read box art from internal storage!', readError.message);
        // Fetch the new box art from the network
        sendMessage('openUrl', [
          self._baseUrlHttps + '/appasset?' + self._buildUidStr() + '&appid=' + appId + '&AssetType=2&AssetIdx=0', self.ppkstr, true
        ]).then(function(boxArtBuffer) {
          // boxArtBuffer is a Uint8Array from the WASM binary response
          var blob = new Blob([boxArtBuffer], { type: 'image/png' });
          var reader = new FileReader();
          reader.onloadend = function() {
            var dataUrl = reader.result;
            // Always resolve for UI display regardless of caching outcome.
            console.log('%c[utils.js, getBoxArt]', 'color: gray;', 'Returning network-fetched box art: ', appId);

            // Save to disk as true binary PNG for local HTTP server and future cache using modern Tizen API
            try {
              try {
                tizen.filesystem.createDirectory('documents', true);
              } catch (mkdirErr) {
                console.error('%c[utils.js, getBoxArt]', 'color: gray;', 'Error: Failed to create documents directory: ', mkdirErr.message);
              }
              
              var fileHandleWrite = tizen.filesystem.openFile('documents/' + boxArtFileName, 'w');
              
              var base64Payload = dataUrl.split(',')[1];
              var binaryStr = atob(base64Payload);
              var bytes = new Uint8Array(binaryStr.length);
              for (var i = 0; i < binaryStr.length; i++) {
                bytes[i] = binaryStr.charCodeAt(i);
              }
              
              fileHandleWrite.writeData(bytes);
              fileHandleWrite.close();
            } catch (writeError) {
              console.warn('%c[utils.js, getBoxArt]', 'color: gray;', 'Warning: Could not cache box art to disk: ', writeError.message);
            }
            
            resolve(dataUrl);
          };
          reader.readAsDataURL(blob);
        }, function(error) {
          console.error('%c[utils.js, getBoxArt]', 'color: gray;', 'Error: Failed to retrieve box art from network: ', error);
          reject(error);
        });
      }
    }.bind(this));
  },

  clearBoxArt: function() {
    return new Promise(function(resolve, reject) {
      var boxArtDir = 'documents'; // Public storage directory so the background service can read it

      // Delete the cached box art files from the storage using modern API
      try {
        tizen.filesystem.listDirectory(boxArtDir, function(files) {
          var deleteCount = 0;
          for (var i = 0; i < files.length; i++) {
            if (files[i].name.startsWith('boxart_') && files[i].name.endsWith('.png')) {
              tizen.filesystem.deleteFile(files[i].fullPath);
              deleteCount++;
            }
          }
          console.log('%c[utils.js, clearBoxArt]', 'color: gray;', 'Cleared ' + deleteCount + ' box art files from ' + boxArtDir);
          resolve();
        }.bind(this), function(err) {
          console.warn('%c[utils.js, clearBoxArt]', 'color: gray;', 'Warning: Could not list documents directory to clear box art: ', err.message);
          resolve();
        });
      } catch (error) {
        console.error('%c[utils.js, clearBoxArt]', 'color: gray;', 'Error: Failed to clear box art files: ', error);
        reject(error);
      }
    }.bind(this));
  },

  launchApp: function(appId, mode, sops, rikey, rikeyid, enableHdr, localAudio, surroundAudioInfo, gamepadMask) {
    return sendMessage('openUrl', [
      this._baseUrlHttps + '/launch?' + this._buildUidStr() + '&appid=' + appId + '&mode=' + mode +
      '&additionalStates=1&sops=' + sops + '&rikey=' + rikey + '&rikeyid=' + rikeyid + '&hdrMode=' + enableHdr +
      '&localAudioPlayMode=' + localAudio + '&surroundAudioInfo=' + surroundAudioInfo +
      '&remoteControllersBitmap=' + gamepadMask + '&gcmap=' + gamepadMask, this.ppkstr, false
    ]);
  },

  resumeApp: function(mode, sops, rikey, rikeyid, enableHdr, localAudio, surroundAudioInfo, gamepadMask) {
    return sendMessage('openUrl', [
      this._baseUrlHttps + '/resume?' + this._buildUidStr() + '&mode=' + mode +
      '&additionalStates=1&sops=' + sops + '&rikey=' + rikey + '&rikeyid=' + rikeyid + '&hdrMode=' + enableHdr +
      '&localAudioPlayMode=' + localAudio + '&surroundAudioInfo=' + surroundAudioInfo +
      '&remoteControllersBitmap=' + gamepadMask + '&gcmap=' + gamepadMask, this.ppkstr, false
    ]);
  },

  quitApp: function() {
    // Refresh server info after quitting because it may silently fail if the session belongs to a different client
    return sendMessage('openUrl', [
      this._baseUrlHttps + '/cancel?' + this._buildUidStr(), this.ppkstr, false
    ]).then(this.refreshServerInfo());
    // TODO: We should probably bubble this up to our caller.
  },

  updateExternalAddressIP4: function() {
    console.log('%c[utils.js, updateExternalAddressIP4]', 'color: gray;', 'Looking for the external IPv4 address of ' + this.hostname + '...');
    return sendMessage('STUN', []).then(function(addr) {
      if (addr) {
        this.externalIP = addr;
        console.log('%c[utils.js, updateExternalAddressIP4]', 'color: gray;', 'External IPv4 address of ' + this.hostname + ' is ' + this.externalIP);
      } else {
        console.error('%c[utils.js, updateExternalAddressIP4]', 'color: gray;', 'Error: External IPv4 address lookup failed!');
      }
    }.bind(this))
  },

  pair: function(randomNumber) {
    return this.refreshServerInfo().then(function() {
      if (this.paired && this.ppkstr) {
        return true;
      }
      return sendMessage('pair', [
        this.serverMajorVersion.toString(), this.address, this.httpPort, randomNumber, this.getUid()
      ]).then(function(ppkstr) {
        this.ppkstr = ppkstr;
        return Promise.race([
          sendMessage('openUrl', [
            this._baseUrlHttps + '/pair?uniqueid=' + this.getUid() + '&devicename=roth&updateState=1&phrase=pairchallenge', this.ppkstr, false
          ]),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout during pairchallenge')), 5000))
        ]).catch(function(error) {
          if (error.message === 'Timeout during pairchallenge') {
            console.warn('%c[utils.js, pair]', 'color: gray;', 'Warning: HTTPS request timed out, canceling C++ HTTP request');
            sendMessage('cancelRequest', []);
          }
          throw error;
        }.bind(this)).then(function(ret) {
          $xml = this._parseXML(ret);
          this.paired = $xml.find('paired').html() == '1';
          return this.paired;
        }.bind(this));
      }.bind(this));
    }.bind(this));
  },

  sendWOL: function() {
    return sendMessage('wakeOnLan', [this.macAddress]);
  },

  _buildUidStr: function() {
    return 'uniqueid=' + this.getUid() + '&uuid=' + guuid();
  },

  _parseXML: function(xmlData) {
    return $($.parseXML(xmlData.toString()));
  },
};
