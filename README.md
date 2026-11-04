# 🌙 Moonlight Tizen

[![Release Version](https://img.shields.io/github/v/release/brightcraft/moonlight-tizen?style=for-the-badge&logo=github)](https://github.com/brightcraft/moonlight-tizen/releases/latest)
[![Build Status](https://img.shields.io/github/actions/workflow/status/brightcraft/moonlight-tizen/release-stable.yml?branch=master&style=for-the-badge&logo=docker)](https://github.com/brightcraft/moonlight-tizen/actions/workflows/release-stable.yml)
[![Total Downloads](https://img.shields.io/github/downloads/brightcraft/moonlight-tizen/total?style=for-the-badge&logo=github)](https://github.com/brightcraft/moonlight-tizen/releases)
[![Discord Community](https://img.shields.io/badge/Discord-Community-7289DA?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/vr62ZDH236)

Moonlight Tizen is a port of [Moonlight ChromeOS](https://github.com/moonlight-stream/moonlight-chrome), an open-source client for NVIDIA GameStream and [Sunshine](https://app.lizardbyte.dev/Sunshine/). This application allows you to stream your collection of games, programs, or entire desktop from your powerful PC directly to your **Samsung Smart TV**, providing a convenient way to enjoy PC gaming and other desktop applications on a larger screen. By bringing Moonlight to Samsung’s Tizen platform, this project provides a **low-latency streaming** experience without requiring an additional streaming device connected to your TV.

> [!IMPORTANT]
>
> With the core functionality **fully implemented** and the project having reached a mature and stable state, it is now approaching the end of its active development period. Given this progress, **this will be my final year** of actively maintaining and developing it.
>
> Despite this, I'm still doing my best with the **limited time** I have, focusing on the **final update** and making the most of the remaining time. My intention is to complete and push as many of the remaining improvements and features as possible, incorporating recent community contributions along the way.
>
> As the end of the year approaches, I will make a **final announcement**, perhaps in December, with more details about the reasons behind this.

---

## ⚙️ Prerequisites

Before proceeding with the installation, please take a moment to ensure that your current hardware, network, and input setup fully meet the necessary requirements described below:

- **Client:** Samsung Smart TV running Tizen OS version 5.5 or newer (model year 2020 onwards).
- **Host:** Gaming PC with a GPU capable of hardware encoding that meets the [system requirements](https://docs.lizardbyte.dev/projects/sunshine/latest/index.html#%EF%B8%8F-system-requirements) for optimal streaming performance.
- **Network:** Mid-range or high-end wireless router with a stable wireless connection (Wi-Fi 5/6) for the TV and a wired gigabit Ethernet connection (CAT5e or better) for the host PC are strongly recommended.
- **Input:** [Supported gamepad](https://github.com/brightcraft/moonlight-tizen/wiki/Frequently-Asked-Questions#which-gamepad-controllers-are-officially-supported-on-samsung-tvs) connected to your TV or directly connected to a nearby PC is highly recommended for the best streaming experience.

---

## 📦 Installation

Preparing Moonlight for installation is a straightforward process, although the exact steps depend on the Tizen version your TV uses and the installation method you choose. To get started, follow the steps below:

- Choose your preferred [installation method](https://github.com/brightcraft/moonlight-tizen/wiki/Installation-Guide) from the provided guide.
- Follow the step-by-step instructions to successfully install the application.
- Once complete, you can launch **Moonlight** and start streaming your games.

---

## 📚 Documentation

For in-depth guides, technical support, and comprehensive documentation, please refer to the [Wiki](https://github.com/brightcraft/moonlight-tizen/wiki) or jump directly to a relevant section below:

- 🧭 Get started with Moonlight Tizen: [Quick Start Guide](https://github.com/brightcraft/moonlight-tizen/wiki/Quick-Start-Guide)
- 🚀 Install the app step-by-step: [Installation Guide](https://github.com/brightcraft/moonlight-tizen/wiki/Installation-Guide)
- 🔄 Update your application version: [Updating Guide](https://github.com/brightcraft/moonlight-tizen/wiki/Updating-Guide)
- ✨ Explore available app features: [Features Overview](https://github.com/brightcraft/moonlight-tizen/wiki/Features-Overview)
- ❓ Common questions and tips: [Frequently Asked Questions](https://github.com/brightcraft/moonlight-tizen/wiki/Frequently-Asked-Questions)
- ⚠️ Review limitations and notes: [Known Issues & Limitations](https://github.com/brightcraft/moonlight-tizen/wiki/Known-Issues-&-Limitations)
- 🔧 Troubleshoot common problems: [Troubleshooting Guide](https://github.com/brightcraft/moonlight-tizen/wiki/Troubleshooting-Guide)
- 🔮 Build instructions and log collection: [Development Guide](https://github.com/brightcraft/moonlight-tizen/wiki/Development-Guide)

---

## 📖 Project History and Independent Development

This project originally started as a **WASM port** for Tizen TVs developed by the [Samsung Developers Forum](https://github.com/SamsungDForum/moonlight-chrome). Their work demonstrated how Moonlight could run on Tizen OS by converting the original Native Client module to WebAssembly, enabling raw TCP/UDP socket access for networking, implementing the video and audio pipelines using the Tizen WASM Player to leverage hardware acceleration, and adapting the application to the Tizen web environment. See their [full article](https://developer.samsung.com/smarttv/develop/extension-libraries/webassembly/game-streaming-on-tizen-tv-with-wasm.html) for further technical details.

Although initially limited to a proof of concept, the project was later adapted by [KyroFrCode](https://github.com/KyroFrCode/moonlight-chrome-tizen) into a **fully installable** Tizen application, simplifying the build and compilation process for users. However, the application eventually became outdated, lacking newer features and retaining several long-standing bugs that affected usability.

In **September 2023**, I began development on my own fork derived from **KyroFrCode’s** repository, introducing a **brand-new app logo** alongside extensive improvements focused on delivering a modern, reliable, and user-friendly experience. When the **upstream repository** became inactive and was eventually abandoned, I migrated all my work to this new dedicated repository, establishing an **independently maintained continuation** of the project. This transition provided a cleaner structure, easier maintenance, and greater flexibility for future development.

Since then, the [current repository](https://github.com/brightcraft/moonlight-tizen) has been actively maintained with frequent updates. Over time, I have extensively refactored the codebase, updated core libraries, fixed numerous bugs, refined the UI/UX, and introduced a wide range of new features and improvements. Through several years of dedicated development, Moonlight Tizen has evolved into **one of the most feature-rich Moonlight client** available for Samsung Smart TVs, offering significant enhancements beyond its original implementation.

---

## 📝 Changelogs

See the [CHANGELOG](https://github.com/brightcraft/moonlight-tizen/blob/master/CHANGELOG.md) file for more information about the changes for each version of this project.

---

## 🛠️ Contributing

Contributions have always been welcome and appreciated! Contributions made through pull requests, issue reports, and discussions have helped the project grow and improve over time. Now, as the project has reached its final stage of active development, **new issue and pull request submissions are restricted**, although existing issues and pull requests remain available for reference. For quick questions, troubleshooting help, and community support, you can still use the project’s Discord server.

Anyone interested in continuing the development of this project independently is welcome to fork the repository, provided that proper credit is given to the original project, its maintainer, and its contributors in recognition of their work and dedication.

If you find Moonlight Tizen useful, consider leaving a ⭐ to show your support for the project and the maintainer who has dedicated several years to its development and maintenance.

The [CONTRIBUTING](https://github.com/brightcraft/moonlight-tizen/blob/master/.github/CONTRIBUTING.md) file, which contains more information about the project’s contribution guidelines, remains available for reference.

---

## ❤️ Support

If you find this project useful and appreciate the time and effort I have dedicated to its development and maintenance over the years, consider making a donation. Every contribution is greatly appreciated and serves as a gesture of recognition for the work behind this project and the maintainer.

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

### Special thanks to:

- [Moonlight Game Streaming Project](https://github.com/moonlight-stream) — for creating the core Moonlight implementation, adapting the NVIDIA GameStream protocol, and developing the Moonlight Chrome OS client. Their open-source work made it possible to bring Moonlight streaming support to additional platforms and serves as the foundation for the entire Tizen port.
- [Samsung Developers Forum](https://github.com/SamsungDForum/moonlight-chrome) — for creating the first Tizen OS (WASM) adaptation based on the Moonlight Chrome OS client. Their work brought Moonlight to Samsung Smart TVs by integrating the client with Tizen's WASM environment, including video and audio playback through Tizen WASM Player, platform-specific adjustments, and the initial groundwork required to run Moonlight on Tizen devices.
- [KyroFrCode](https://github.com/KyroFrCode/moonlight-chrome-tizen) and its contributors — for further developing the Tizen implementation by introducing improvements such as a dedicated application build method, 1440p resolution support, a shortcut combination to stop the streaming session, and audio volume control using the remote. My repository originated as a fork of his project and was later migrated to an independent repository, continuing that work as the starting point for my own development and subsequent improvements.
- [OneLiberty](https://github.com/OneLiberty/moonlight-chrome-tizen) and its contributors — for expanding the Tizen implementation in their fork with features such as video codec selection, mouse emulation using the gamepad, Wake-on-LAN (WoL), a new IP address input mode, and other improvements. These changes served as a basis for further development, which I adapted and improved before integrating them into this project.
- [toypoodlegaming](https://github.com/toypoodlegaming/moonlight-chrome-tizen) — for further expanding the functionality in their fork with features such as 5.1 and 7.1 surround sound configuration, performance statistics, and enhanced bitrate calculation. These changes served as a basis for further development, which I adapted and improved before integrating them into this project.
- [eduardomozart](https://github.com/eduardomozart) — for contributing localization support featuring Tizen-first locale detection, HTTP subnet scanning, custom port/IPv6/DNS hostname support, Smart Hub Preview support, and build optimizations, along with numerous fixes and improvements that were further refined and integrated into the application.
- [fophillips](https://github.com/fophillips) — for contributing the integration of the Web Audio backend implementation from [ruanformigoni](https://github.com/ruanformigoni) alongside the existing EMSS backend, including an Audio Backend selection setting for switching between the two renderers.
