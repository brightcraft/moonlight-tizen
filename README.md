# Moonlight Tizen

[![Build Status](https://img.shields.io/github/actions/workflow/status/brightcraft/moonlight-tizen/release-stable.yml?branch=master&style=for-the-badge&logo=docker)](https://github.com/brightcraft/moonlight-tizen/actions/workflows/release-stable.yml)
[![Release Version](https://img.shields.io/github/v/release/brightcraft/moonlight-tizen?style=for-the-badge&logo=github)](https://github.com/brightcraft/moonlight-tizen/releases/latest)
[![Total Downloads](https://img.shields.io/github/downloads/brightcraft/moonlight-tizen/total?style=for-the-badge&logo=github)](https://github.com/brightcraft/moonlight-tizen/releases)

Moonlight Tizen is a port of [Moonlight ChromeOS](https://github.com/moonlight-stream/moonlight-chrome), which is an open source client for NVIDIA GameStream and [Sunshine](https://app.lizardbyte.dev/Sunshine/).

This application allows you to stream your collection of games, programs, or your full desktop from your powerful PC to your Samsung Smart TV.

---

## ✨ Features

- Fully compatible with all supported Tizen OS versions.
- Modern UI & UX with a clean interface and smooth navigation.
- Up to 4K 120 FPS HDR streaming with Stereo sound.
- H.264, HEVC, and AV1 codec support (requires a supported host GPU).
- Dedicated settings page organized by categories and options.
- Change the sorting order of the apps list or remove all hosts with one click.
- Wake-on-LAN (WoL) support to wake up your PC remotely.
- Adjusts host resolution to match the client via *Optimize Game Settings*.
- Automatically toggles HDR on the host PC to match the client’s setting.
- Keyboard and mouse support for casual browsing.
- Local co-op with up to 4 connected controllers.
- Axis support for in-app navigation via gamepad.
- Force feedback and mouse control via gamepad by long-pressing *Start*.
- Swap face buttons to match your specific gamepad layout.
- Play audio from the host computer and your client device.
- Game Mode switching and full color range support.
- Connection warnings and performance statistics overlays.
- ...and many other features and improvements!

---

## ⚙️ Prerequisites

To get started, ensure your current setup meets the requirements as described below:
- **Client Requirements:** You must have a Samsung TV running Tizen OS starting from the 2020 model year (Tizen 5.5) or newer.
- **Host Requirements:** You must have a powerful PC with a GPU capable of hardware decoding that meets the [system requirements](https://docs.lizardbyte.dev/projects/sunshine/latest/index.html#%EF%B8%8F-system-requirements) to ensure optimal streaming performance.
- **Network Requirements:** You need a mid-range or high-end wireless router with a good wireless connection to your client using 5 GHz WiFi 5 (802.11ac) or WiFi 6 (802.11ax) and a good wired connection to your host using the CAT5e ethernet or better, which is strongly recommended.
- **Input Requirements:** It is highly recommended that you use a [supported gamepad](https://github.com/brightcraft/moonlight-tizen/wiki/Frequently-Asked-Questions#what-gamepad-controllers-are-supported-on-samsung-tv) connected to your client or host device for the best game streaming experience, as using a mouse and keyboard may cause some interference issues with Tizen OS during the streaming session.

---

## 📦 Installation

The installation process varies depending on your Tizen OS version:
- Choose an [installation method](https://github.com/brightcraft/moonlight-tizen/wiki/Installation-Guide) that you prefer or works best for your Tizen version.
- Follow the provided instructions step-by-step to successfully install the application on your TV.
- Once the installation is complete, **Moonlight** can be found under **Recent Apps** for launch.

---

## 📚 Documentation

For in-depth guides, technical support, and comprehensive documentation, please refer to the [Wiki](https://github.com/brightcraft/moonlight-tizen/wiki):
- 🚀 Install the app step-by-step: [Installation Guide](https://github.com/brightcraft/moonlight-tizen/wiki/Installation-Guide)
- 🔄 Manage your application version: [Updating Guide](https://github.com/brightcraft/moonlight-tizen/wiki/Updating-Guide)
- ❓ Common questions and tips: [Frequently Asked Questions](https://github.com/brightcraft/moonlight-tizen/wiki/Frequently-Asked-Questions)
- ⚠️ Important limitations and notes: [Known Issues & Limitations](https://github.com/brightcraft/moonlight-tizen/wiki/Known-Issues-&-Limitations)
- 🔮 Information for developers: [Development Guide](https://github.com/brightcraft/moonlight-tizen/wiki/Development-Guide)

---

## 📖 About Project

This project originally started as a **WASM port** for Tizen TV created by the [Samsung Developers Forum](https://github.com/SamsungDForum/moonlight-chrome). They demonstrated how Moonlight could run on Tizen OS by converting the original Native Client module to WebAssembly, enabling raw TCP/UDP socket access for networking, reimplementing the video and audio pipelines using the Tizen WASM Player to leverage hardware acceleration, and fully adapting the application to the Tizen web environment (see their [full article](https://developer.samsung.com/smarttv/develop/extension-libraries/webassembly/game-streaming-on-tizen-tv-with-wasm.html) for technical details).

Although it remained only a proof-of-concept at that stage, the work was later taken much further by [KyroFrCode](https://github.com/KyroFrCode/moonlight-chrome-tizen), who expanded and transformed it into a **fully installable** Tizen application, simplifying the complex build and compilation process for users. However, the application became outdated, lacking new features and still containing several long-standing bugs that affected usability.

In **September 2023**, I started development on a [fork repository](https://web.archive.org/web/20231101171228/https://github.com/ndriqimlahu/moonlight-chrome-tizen), where I made significant changes, including a **brand-new app logo** and **extensive improvements** focused on delivering a modern, reliable, and user-friendly experience. When the [upstream repository](https://github.com/KyroFrCode/moonlight-chrome-tizen) became inactive and was eventually abandoned, I migrated all my work to this new dedicated repository as a fresh and **standalone continuation**, offering a cleaner structure, easier maintenance, and greater flexibility for future development.

Since then, [this repository](https://github.com/brightcraft/moonlight-tizen) has been actively maintained with frequent updates. Over time, I have refactored the codebase, updated core libraries, fixed bugs, polished the UI/UX, and introduced many new features and improvements. Thanks to more than two years of dedicated work, this has become the **most enhanced and feature-rich Moonlight client** available for Samsung Tizen TVs.

---

## 📝 Changelogs

See the [CHANGELOG](https://github.com/brightcraft/moonlight-tizen/blob/master/CHANGELOG.md) file for more information about the changes for each version of this project.

---

## 🛠️ Contributing

Contributions are welcome! You can help by forking the repo, creating pull requests, opening issues, or simply giving a ⭐ to the project to show your support.

- 🐛 Bug reports and feature requests: [Issues](https://github.com/brightcraft/moonlight-tizen/issues)
- 💬 Ideas, questions, and community chat: [Discussions](https://github.com/brightcraft/moonlight-tizen/discussions)
- 🧪 Test early development builds: [Pre-releases](https://github.com/brightcraft/moonlight-tizen/releases?q=pre-release&expanded=false)

---

## ❤️ Support

If you find this project useful and would like to support its continued development, maintenance, and the addition of new features, consider a donation. Your contribution directly helps ensure that the application remains stable and up-to-date for the community.

[![Patreon](https://img.shields.io/badge/Support_me_on_Patreon-F96854?style=for-the-badge&logo=patreon&logoColor=white)](https://www.patreon.com/BrightCraft)

---

## ⚖️ License

This project is licensed under the `GNU General Public License v3.0`. See the [LICENSE](https://github.com/brightcraft/moonlight-tizen/blob/master/LICENSE) file for more information.

---

## 🙏 Acknowledgements
- Thanks to [Moonlight Game Streaming Project](https://github.com/moonlight-stream) for the core implementation of the NVIDIA GameStream protocol and the development of Moonlight for Chrome OS.
- Thanks to [Samsung Developers Forum](https://github.com/SamsungDForum/moonlight-chrome) for creating a port version based on Chrome OS (NaCl) and adapting the Moonlight implementation for Tizen OS (WASM).
- Thanks to [babagreensheep](https://github.com/babagreensheep/jellyfin-tizen-docker) and [pablojrl123](https://github.com/pablojrl123/moonlight-tizen-docker) for creating a method for building the application and adapting the Dockerfile including the supporting files.
- Thanks to [KyroFrCode](https://github.com/KyroFrCode/moonlight-chrome-tizen) for updating the core files, adding a shortcut combo to stop the streaming session, allowing audio volume changes, and improving the Dockerfile for better build compatibility.
- Thanks to [OneLiberty](https://github.com/OneLiberty/moonlight-chrome-tizen) for implementing features such as video codec selection, mouse emulation, Wake-on-LAN, new IP address field mode, improved Docker publishing workflow, and several improvements.
- Thanks to [toypoodlegaming](https://github.com/toypoodlegaming/moonlight-chrome-tizen) for improving video codec selection logic and implementing features such as audio configuration and performance statistics.
