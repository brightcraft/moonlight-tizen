# Moonlight Tizen

[![Release Version](https://img.shields.io/github/v/release/brightcraft/moonlight-tizen?style=for-the-badge&logo=github)](https://github.com/brightcraft/moonlight-tizen/releases/latest)
[![Build Status](https://img.shields.io/github/actions/workflow/status/brightcraft/moonlight-tizen/release-stable.yml?branch=master&style=for-the-badge&logo=docker)](https://github.com/brightcraft/moonlight-tizen/actions/workflows/release-stable.yml)
[![Total Downloads](https://img.shields.io/github/downloads/brightcraft/moonlight-tizen/total?style=for-the-badge&logo=github)](https://github.com/brightcraft/moonlight-tizen/releases)
[![Discord Community](https://img.shields.io/badge/Discord-Community-7289DA?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/vr62ZDH236)

Moonlight Tizen is a port of [Moonlight ChromeOS](https://github.com/moonlight-stream/moonlight-chrome), which is an open-source client for NVIDIA GameStream and [Sunshine](https://app.lizardbyte.dev/Sunshine/).

This application allows you to stream your collection of games, programs, or your full desktop from your powerful PC to your Samsung Smart TV.

---

## ✨ Features

- Compatible with all supported Tizen versions (5.5 or higher).
- Supports streaming using NVIDIA GameStream or Sunshine (including popular forks).
- Modern UI & UX with a clean interface and smooth navigation.
- Up to 4K 120 FPS HDR streaming with Stereo sound.
- H.264, HEVC, and AV1 codec support (requires a supported host GPU).
- Dedicated settings page organized by categories and options.
- Sort apps list (ascending/descending) or remove all hosts with one click.
- Wake-on-LAN (WoL) support to wake up your PC remotely.
- Automatically adjust host resolution to match the client via *Optimize Game Settings*.
- Automatically toggles HDR state on the host PC to match the client’s HDR setting.
- Keyboard and mouse support for browsing and productivity use.
- Local co-op with up to 4 connected controllers.
- Gamepad axis support for in-app navigation.
- Force feedback and mouse control via gamepad by long-pressing *Start*.
- Swap face buttons to match your specific gamepad layout.
- Play audio from the host computer and your client device.
- Game mode switching, full color range, and custom port support.
- Connection warnings and performance statistics overlays.
- ...and many more features and improvements!

---

## ⚙️ Prerequisites

Before proceeding with the installation, please take a moment to ensure that your current hardware, network, and input setup fully meet the necessary requirements described below:
- **Client:** Samsung Smart TV running Tizen OS version 5.5 or newer (model year 2020 onwards).
- **Host:** Gaming PC with a GPU capable of hardware encoding that meets the [system requirements](https://docs.lizardbyte.dev/projects/sunshine/latest/index.html#%EF%B8%8F-system-requirements) for optimal streaming performance.
- **Network:** Mid-range or high-end wireless router with a stable wireless connection (Wi-Fi 5/6) for the TV and a wired gigabit Ethernet connection (CAT5e or better) for the host PC are strongly recommended.
- **Input:** [Supported gamepad](https://github.com/brightcraft/moonlight-tizen/wiki/Frequently-Asked-Questions#what-gamepad-controllers-are-supported-on-samsung-tv) connected to your TV or directly connected to a nearby PC is highly recommended for the best streaming experience.

---

## 📦 Installation

Preparing Moonlight for installation is a straightforward process, although the exact steps depend on the Tizen version your TV uses and the installation method you choose. To get started, follow the steps below:
- Go to releases and download the widget file from the release assets.
- Choose your preferred [installation method](https://github.com/brightcraft/moonlight-tizen/wiki/Installation-Guide) from the provided guide.
- Follow the step-by-step instructions to successfully install the application.
- Once complete, you can launch **Moonlight** and start streaming your games.

---

## 📚 Documentation

For in-depth guides, technical support, and comprehensive documentation, please refer to the [Wiki](https://github.com/brightcraft/moonlight-tizen/wiki) or jump directly to a relevant section below:
- 🚀 Install the app step-by-step: [Installation Guide](https://github.com/brightcraft/moonlight-tizen/wiki/Installation-Guide)
- 🔄 Update your application version: [Updating Guide](https://github.com/brightcraft/moonlight-tizen/wiki/Updating-Guide)
- ❓ Common questions and tips: [Frequently Asked Questions](https://github.com/brightcraft/moonlight-tizen/wiki/Frequently-Asked-Questions)
- ⚠️ Review limitations and notes: [Known Issues & Limitations](https://github.com/brightcraft/moonlight-tizen/wiki/Known-Issues-&-Limitations)
- 🔮 Instructions for building the app: [Development Guide](https://github.com/brightcraft/moonlight-tizen/wiki/Development-Guide)

---

## 📖 About This Repository

This project originally started as a **WASM port** for Tizen TV created by the [Samsung Developers Forum](https://github.com/SamsungDForum/moonlight-chrome). They demonstrated how Moonlight could run on Tizen OS by converting the original Native Client module to WebAssembly, enabling raw TCP/UDP socket access for networking, reimplementing the video and audio pipelines using the Tizen WASM Player to leverage hardware acceleration, and fully adapting the application to the Tizen web environment (see their [full article](https://developer.samsung.com/smarttv/develop/extension-libraries/webassembly/game-streaming-on-tizen-tv-with-wasm.html) for technical details).

Although it remained only a proof-of-concept at that stage, the work was later taken much further by [KyroFrCode](https://github.com/KyroFrCode/moonlight-chrome-tizen), who expanded and transformed it into a **fully installable** Tizen application, simplifying the complex build and compilation process for users. However, the application became outdated, lacking new features and still containing several long-standing bugs that affected usability.

In **September 2023**, I started development on a fork repository, where I made significant changes, including a **brand-new app logo** and **extensive improvements** focused on delivering a modern, reliable, and user-friendly experience. When the [upstream repository](https://github.com/KyroFrCode/moonlight-chrome-tizen) became inactive and was eventually abandoned, I migrated all my work to this new dedicated repository as a fresh and **standalone continuation**, offering a cleaner structure, easier maintenance, and greater flexibility for future development.

Since then, [this repository](https://github.com/brightcraft/moonlight-tizen) has been actively maintained with frequent updates. Over time, I have refactored the codebase, updated core libraries, fixed bugs, polished the UI/UX, and introduced many new features and improvements. Thanks to more than two years of dedicated work, this has become the **most enhanced and feature-rich Moonlight client** available for Samsung Tizen TVs.

> [!NOTE]
> Currently, as the primary maintainer with **limited time to work** on this project, my personal focus is strictly on addressing critical issues and integrating community contributions, with necessary improvements or new features **occurring only as my schedule permits**. Since the core functionality is now almost fully implemented and well established, the project is gradually moving into its **final maintenance phase**. Going forward, you can expect development from my end to be significantly slower and responses to support requests to be delayed. That said, this repository (including releases) will **always remain open and available** for the community to use, download, and build upon.

---

## 📝 Changelogs

See the [CHANGELOG](https://github.com/brightcraft/moonlight-tizen/blob/master/CHANGELOG.md) file for more information about the changes for each version of this project.

---

## 🛠️ Contributing

Contributions are welcome! You can help by forking the repo, creating pull requests, opening issues, or simply giving a ⭐ to the project.

Where to start:
- 🐛 Report a bug or request a feature: [Issues](https://github.com/brightcraft/moonlight-tizen/issues)
- 💬 Share ideas or ask questions: [Discussions](https://github.com/brightcraft/moonlight-tizen/discussions)
- 🧪 Test early development builds: [Pre-releases](https://github.com/brightcraft/moonlight-tizen/releases?q=pre-release&expanded=false)

See the [CONTRIBUTING](https://github.com/brightcraft/moonlight-tizen/blob/master/.github/CONTRIBUTING.md) file for more information about the project’s contribution guidelines.

---

## ❤️ Support

If you find this project useful and would like to support its continued development, maintenance, and the addition of new features, consider a donation. Your contribution directly helps ensure that the application remains stable and up-to-date for the community.

[![Patreon](https://img.shields.io/badge/Support_me_on_Patreon-F96854?style=for-the-badge&logo=patreon&logoColor=white)](https://www.patreon.com/cw/BrightCraft/membership)

---

## ⚖️ License

This project is licensed under the `GNU General Public License v3.0`. See the [LICENSE](https://github.com/brightcraft/moonlight-tizen/blob/master/LICENSE) file for more information.

---

## 🙏 Contributors

This project is made possible thanks to the people who dedicate their time, knowledge, and feedback to making it better.

<a href="https://github.com/brightcraft/moonlight-tizen/graphs/contributors?all=1">
  <img src="https://contrib.rocks/image?repo=brightcraft/moonlight-tizen"/>
</a>

Special thanks to:
- [Moonlight Game Streaming Project](https://github.com/moonlight-stream) — for adapting the core implementation of the NVIDIA GameStream protocol and the development of Moonlight for Chrome OS client.
- [Samsung Developers Forum](https://github.com/SamsungDForum/moonlight-chrome) — for creating a port based on Chrome OS (NaCl) and adapting the Moonlight implementation for Tizen OS (WASM), including converting video and audio channels using Tizen WASM Player and more.
- [KyroFrCode](https://github.com/KyroFrCode/moonlight-chrome-tizen) — for creating a method for building the application, adding 1440p resolution, including a shortcut combo to stop the streaming session, and allowing audio volume changes using the remote.
- [OneLiberty](https://github.com/OneLiberty/moonlight-chrome-tizen) — for expanding the core functionality by implementing video codec selection, mouse emulation using the gamepad, Wake-on-LAN (WoL), providing a new IP address input mode, and several improvements.
- [ToyPoodleGaming](https://github.com/toypoodlegaming/moonlight-chrome-tizen) — for expanding the core functionality by implementing 5.1 and 7.1 surround sound within the audio configuration selection, performance statistics, and providing an enhanced bitrate calculation.
