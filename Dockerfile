FROM ubuntu:22.04 AS base

ARG DEBIAN_FRONTEND=noninteractive
ENV TZ=Etc/UTC

# Install required packages and dependencies
RUN apt-get update && apt-get install -y \
	cmake \
	ccache \
	expect \
	git \
	ninja-build \
	python2 \
	unzip \
	wget \
	&& rm -rf /var/lib/apt/lists/*

# Some of the Samsung Tizen scripts refer to `python`, but Ubuntu only provides `/usr/bin/python2`
RUN ln -sf /usr/bin/python2 /usr/bin/python

# Create a non-root user and set up the working directory
RUN useradd -m -s /bin/bash moonlight
USER moonlight
WORKDIR /home/moonlight

# Install Tizen Studio CLI and configure the toolchain path
RUN wget -nv -O web-cli_Tizen_Studio_6.1_ubuntu-64.bin 'https://download.tizen.org/sdk/Installer/tizen-studio_6.1/web-cli_Tizen_Studio_6.1_ubuntu-64.bin'
RUN chmod a+x web-cli_Tizen_Studio_6.1_ubuntu-64.bin
RUN ./web-cli_Tizen_Studio_6.1_ubuntu-64.bin --accept-license /home/moonlight/tizen-studio
ENV PATH=/home/moonlight/tizen-studio/tools/ide/bin:/home/moonlight/tizen-studio/tools:${PATH}

# Prepare the Tizen certificate and security profiles for signing the application package
RUN tizen certificate \
	-a Moonlight \
	-f Moonlight \
	-p 1234
RUN tizen security-profiles add \
	-n Moonlight \
	-a /home/moonlight/tizen-studio-data/keystore/author/Moonlight.p12 \
	-p 1234

# Workaround to package applications without gnome-keyring
# These steps must be repeated each time before packaging an application
# See: <https://developer.tizen.org/forums/sdk-ide/pwd-fle-format-profile.xml-certificates> for more details
RUN sed -i 's|/home/moonlight/tizen-studio-data/keystore/author/Moonlight.pwd||' /home/moonlight/tizen-studio-data/profile/profiles.xml
RUN sed -i 's|/home/moonlight/tizen-studio-data/tools/certificate-generator/certificates/distributor/tizen-distributor-signer.pwd|tizenpkcs12passfordsigner|' /home/moonlight/tizen-studio-data/profile/profiles.xml

# Install Samsung Emscripten SDK and configure Java path for closure compiler
RUN wget -nv -O emscripten-1.39.4.7-linux64.zip 'https://developer.samsung.com/smarttv/file/a5013a65-af11-4b59-844f-2d34f14d19a9'
RUN unzip emscripten-1.39.4.7-linux64.zip

# Replace deprecated OpenSSL download URL in Emscripten SDK ports to prevent build failure caused by invalid upstream path
RUN sed -i 's|https://www.openssl.org/source/old/1.1.1/openssl-|https://github.com/openssl/openssl/releases/download/OpenSSL_1_1_1d/openssl-|g' \
/home/moonlight/emscripten-release-bundle/emsdk/fastcomp/emscripten/tools/ports/tizen/ssl.py
RUN sed -i 's|https://www.openssl.org/source/old/1.1.1/openssl-|https://github.com/openssl/openssl/releases/download/OpenSSL_1_1_1d/openssl-|g' \
/home/moonlight/emscripten-release-bundle/emsdk/fastcomp/emscripten/tools/ports/tizen/crypto.py

# Activate the Emscripten SDK to set up the environment variables for compiling the application
WORKDIR emscripten-release-bundle/emsdk
RUN ./emsdk activate latest-fastcomp

# Copy only the backend files required for compiling the application
WORKDIR /home/moonlight
COPY --chown=moonlight CMakeLists.txt ./moonlight-tizen/
COPY --chown=moonlight h264bitstream ./moonlight-tizen/h264bitstream/
COPY --chown=moonlight libgamestream ./moonlight-tizen/libgamestream/
COPY --chown=moonlight moonlight-common-c ./moonlight-tizen/moonlight-common-c/
COPY --chown=moonlight opus ./moonlight-tizen/opus/
COPY --chown=moonlight ports ./moonlight-tizen/ports/ 
COPY --chown=moonlight wasm/*.c ./moonlight-tizen/wasm/
COPY --chown=moonlight wasm/*.cpp ./moonlight-tizen/wasm/
COPY --chown=moonlight wasm/*.hpp ./moonlight-tizen/wasm/
COPY --chown=moonlight wasm/dispatcher ./moonlight-tizen/wasm/dispatcher/

RUN cmake \
	-DCMAKE_TOOLCHAIN_FILE=/home/moonlight/emscripten-release-bundle/emsdk/fastcomp/emscripten/cmake/Modules/Platform/Emscripten.cmake \
	-DCMAKE_C_COMPILER_LAUNCHER=ccache \
	-DCMAKE_CXX_COMPILER_LAUNCHER=ccache \
	-G Ninja \
	-S moonlight-tizen \
	-B build
RUN --mount=type=cache,target=/home/moonlight/.ccache,uid=1000,gid=1000 \
	--mount=type=cache,target=/home/moonlight/.emscripten_cache,uid=1000,gid=1000 \
	--mount=type=cache,target=/home/moonlight/.emscripten_ports,uid=1000,gid=1000 \
	CCACHE_DIR=/home/moonlight/.ccache cmake --build build

# Copy the remaining frontend files required for packaging the application
COPY --chown=moonlight res/ ./moonlight-tizen/res/
COPY --chown=moonlight wasm/index.html ./moonlight-tizen/wasm/
COPY --chown=moonlight wasm/platform/ ./moonlight-tizen/wasm/platform/
COPY --chown=moonlight wasm/static/ ./moonlight-tizen/wasm/static/

RUN cmake --install build --prefix build
RUN cp moonlight-tizen/res/icon.png build/widget/

# Sign and package the application into a WGT file using Expect to automate the interactive password prompts
RUN echo \
	'set timeout -1\n' \
	'spawn tizen package -t wgt -- build/widget\n' \
	'expect "Author password:"\n' \
	'send -- "1234\\r"\n' \
	'expect "Yes: (Y), No: (N) ?"\n' \
	'send -- "N\\r"\n' \
	'expect eof\n' \
| expect
RUN mv build/widget/Moonlight.wgt .

# Clean up unnecessary files to reduce image size
RUN rm -rf \
	build \
	moonlight-tizen \
	web-cli_Tizen_Studio_6.1_ubuntu-64.bin \
	tizen-package-expect.sh \
	.package-manager \
	emscripten-1.39.4.7-linux64.zip \
	emscripten-release-bundle \
	.emscripten \
	.emscripten_cache \
	.emscripten_cache.lock \
	.emscripten_ports \
	.emscripten_sanity \
	.wget-hsts

# Use a multi-stage build to reclaim space from deleted files
FROM ubuntu:22.04
COPY --from=base / /
USER moonlight
WORKDIR /home/moonlight

# Add Tizen Studio tools to PATH environment variable
ENV PATH=/home/moonlight/tizen-studio/tools/ide/bin:/home/moonlight/tizen-studio/tools:${PATH}
