# Contributing

Thanks for contributing to the Moonlight project! Whether you're opening an issue or proposing a pull request, your help is greatly appreciated.

## General Guidelines

- Use proper English. It doesn't have to be complicated, just make it simple and understandable for everyone.
- Clearly explain your feature request or the problem you're facing.
- Include screenshots when possible.
- When posting an issue, include logs if available (please remove or mask your private IP).

## Reporting Issues

If you want to report a bug or request a feature, please use the appropriate issue template:
- **Bug Report** – use this if you found an issue or unexpected behavior
- **Feature Request** – use this if you want to propose a new feature or improvement

These templates will guide you to include all the necessary information to helps us **diagnose and resolve issues faster**.

## Development Setup

If you want to contribute code, you should first make sure you can build the project locally.

Please follow the [development guide](https://github.com/brightcraft/moonlight-tizen/wiki/Development-Guide) available in the Wiki.

This guide explains how to build Moonlight for Tizen and run it on your device.

## Pull Requests

If you want to contribute code, please follow these guidelines:
- Keep pull requests **focused on a single feature or fix**.
- Avoid combining multiple unrelated changes in the same PR.
- Make sure the project **builds successfully** before submitting.
- Clearly describe **what the PR does and why it is needed**.
- Test your changes as much as possible before submitting.

Large PRs are harder to review, so **smaller and focused contributions are preferred**.

## Third-Party Libraries

This repository contains several **third-party libraries**, including but not limited to:
- `h264bitstream`
- `libgamestream`
- `moonlight-common-c`
- `opus`
- `ports`

Important rules:
- These libraries **should not be modified manually** in feature pull requests.
- Changes should only come from the **official upstream repositories**.
- If an update to these libraries is needed, please discuss it with the maintainer first.

Pull requests that include manual modifications to these libraries **may be asked to revert those changes**.

## Code Style

- Follow the existing project structure and coding style.
- Avoid unnecessary refactoring in feature PRs.
- Keep changes minimal and directly related to the improvement or fix.

## Communication

Constructive discussions are always welcome. If you're unsure about a change or feature, feel free to **open an issue first before implementing it**.

This helps ensure the feature aligns with the direction of the project.

## Final Notes

Contributions are always appreciated. Clear, focused pull requests and well-described issues help keep the project healthy and easier to maintain for everyone.

If you’d like to support the project financially and help me continue the development and maintenance, you can contribute via ongoing support or a one-time donation:

[![Patreon](https://img.shields.io/badge/Support_me_on_Patreon-F96854?style=for-the-badge&logo=patreon&logoColor=white)](https://www.patreon.com/BrightCraft)
