# Moonlight port for Samsung Smart TVs running Tizen OS

This is a fork of the `Moonlight Chrome` project adapted to run on Samsung Tizen TVs.
Changes made:

- WebAssembly is used instead of Native Client
- Main adaptation layer is in a wasm/ directory instead of the root project directory

## Used Tizen specific features

- [Tizen WASM Player](https://developer.samsung.com/smarttv/develop/extension-libraries/webassembly/tizen-wasm-player/overview.html)
- [Tizen Sockets Extension](https://developer.samsung.com/smarttv/develop/extension-libraries/webassembly/api-reference/tizen-sockets-extension.html)

## Controller identification

Moonlight reports the family of each connected controller from the browser's
Gamepad API. Supported identifiers distinguish PlayStation, Xbox and Nintendo
controllers; unrecognized controllers use the host's default profile. Each
controller is reported separately, so switching families does not require a
global Sunshine controller setting.

The host's drivers determine the virtual controller model. For example, a
DualSense may appear as a PS4 controller when Sunshine uses its ViGEm fallback.
The browser API does not provide motion, touchpad, battery or RGB data. Rumble
is reported only when supported by the browser and enabled in Moonlight.

Some hosts retain an allocated virtual controller between stream connections.
After upgrading from a client that did not report controller identities, end
the old application session and start a fresh one if the old controller type
persists. See [controller regression tests](tests/README.md) for offline checks.

## Checking out required submodules
Since some of the dependencies used are provided as git submodules, after cloning this repository (if you did not provide the `--recurse-submodules` option while cloning) you need to issue the below command:

```bash
git submodule update --init --recursive
```

## Building

### Required software
- [Samsung Emscripten fork](https://developer.samsung.com/smarttv/develop/extension-libraries/webassembly/getting-started/downloading-and-installing.html)
- cmake (at least 3.10 - tested using CMake 3.10 and CMake 3.18)
- ninja (at least 1.8.2- recommended for Windows)

### Build procedure

```bash
mkdir build
cd build/
cmake -DCMAKE_TOOLCHAIN_FILE=<YOUR EMSCRIPTEN INSTALLATION_DIR>/cmake/Modules/Platform/Emscripten.cmake -G Ninja ..
ninja

# CMake 3.10 (and above):
cmake -DCMAKE_INSTALL_PREFIX=. -P cmake_install.cmake

# CMake 3.15 (and above):
cmake --install . --prefix .
```

*Note:* On Linux and macOS you can also use `Makefile` cmake generators.

After that you can pack widget as described in [Sample cURL application built using CLI tools](https://developer.samsung.com/smarttv/develop/extension-libraries/webassembly/tizen-sockets-extension/sample-curl-application-built-using-cli-tools.html) tutorial.
