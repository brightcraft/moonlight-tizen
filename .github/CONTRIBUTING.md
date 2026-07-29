# Contributing

Thanks for contributing to the Moonlight project! Whether you're opening an issue or proposing a pull request, your help is greatly appreciated.

## General Guidelines

- Use proper English. It doesn't have to be complicated, just make it simple and understandable for everyone.
- Search existing issues before creating a new one to avoid duplicates.
- Clearly explain your feature request or the problem you're facing.
- Include steps to reproduce the issue whenever possible.
- Include screenshots or video demonstrations when they help explain the issue.
- When posting an issue, include logs if available (**please remove or mask your private IP**).

## Reporting Issues

If you want to report a bug or request a feature, please use the appropriate issue template:

- **Bug Report** — use this if you found an issue or unexpected behavior.
- **Feature Request** — use this if you want to propose a new feature or improvement.

Please provide as much information as possible. The templates will guide you through the necessary details to help us diagnose and resolve issues faster. Incomplete reports may take longer to investigate.

## Before You Start

Before making changes, consider the following:

- For larger features, significant refactors, or behavior changes, **open an issue or discussion first** to review the proposed approach.
- Check existing issues, discussions, and pull requests to avoid duplicating ongoing work.
- Make sure you understand the purpose of the change and how it fits with the project's current direction.
- Keep changes focused and avoid introducing unrelated improvements in the same contribution.

This helps make reviews easier and ensures contributions align with the project's goals.

## Development Setup

Before opening a pull request, make sure you can build and test your changes successfully:

- Please follow the [development guide](https://github.com/brightcraft/moonlight-tizen/wiki/Development-Guide) available in the Wiki. This guide explains how to properly build Moonlight locally and run it on your device.
- **Test your changes** on the target Tizen device whenever possible to ensure they work correctly in the real environment.
- When making changes to platform-specific functionality, ensure that your changes do not introduce **regressions or affect existing Tizen behavior**.

Following these steps helps ensure changes are stable, easier to review, and compatible with the Tizen platform.

## Pull Requests

If you want to contribute code, please follow these guidelines:

- Clearly describe what the PR does and why it is needed.
- Reference related issues when applicable (for example, `Fixes #123`).
- Keep pull requests focused on a single feature, fix, or improvement.
- Avoid combining multiple unrelated changes in the same PR.
- Make sure the project builds successfully before submitting.
- Test your changes as much as possible before submitting.
- Include screenshots or videos when changing the user interface.
- Update the documentation if your change affects user-facing behavior.
- Keep commit history reasonably clean before requesting a review.

Large PRs can be harder to review and may require more time. Smaller and focused contributions are easier to review and can usually be processed faster.

## Code Style

- Follow the existing project structure and coding style.
- Avoid unrelated refactoring in feature PRs.
- Do not introduce unrelated formatting changes in the same PR.
- Keep changes minimal and directly related to the improvement or fix.
- Prefer consistency with the existing codebase over introducing new coding patterns.

## Localization

Moonlight includes built-in localization support, and contributions for new or improved translations are always welcome.

### Adding a New Language

To add support for a new language:

1. Choose an appropriate locale code (for example, `de-DE` or `fr-FR`). You can find a list of commonly used locale codes from resources such as [SimpleLocalize](https://simplelocalize.io/data/locales/).
2. Create a new locale file in `wasm/static/locales/` using the exact locale code as the filename (for example, `de-DE.json`).
3. Copy the contents of `en-US.json` into the new locale file.
4. Translate **only the values**, while keeping:
   - JSON keys unchanged.
   - Positional placeholders (for example, `%1$s` and `%1$d`) intact.
   - Formatting, punctuation, and escape sequences where applicable.
5. Register the new language in `wasm/platform/i18n.js` by adding the locale to:
   - `SUPPORTED_LOCALES`
   - `LOCALE_LABELS`
6. Verify that the new language appears in the application's **Language** setting and that translations are displayed correctly.

### Updating Existing Translations

When translating or updating strings:

- Do not modify JSON keys or locale codes.
- Keep placeholders such as `%1$s` and `%1$d` unchanged.
- Keep the order of the JSON entries consistent with `en-US.json`.
- Preserve formatting and special characters unless the translated language requires different punctuation.
- Avoid machine translations without reviewing the final result for accuracy and natural wording.
- Test the translated interface whenever possible to ensure text fits correctly and remains understandable.

If new strings are introduced, they should first be added to `en-US.json`, which serves as the source language for all translations.

## Third-Party Dependencies

This repository includes several third-party dependencies required for application functionality. The following rules apply to each dependency:

- `libgamestream` — modifications are allowed when required for project functionality or new features.
- `h264bitstream` — **manual modifications are not allowed**; updates should only come from the official [upstream repository](https://github.com/cgutman/h264bitstream).
- `moonlight-common-c` — updates should generally come from the official [upstream repository](https://github.com/moonlight-stream/moonlight-common-c). However, some project-specific changes may be required to maintain Tizen compatibility. These changes should only be handled by the maintainer.

  **The following files currently require manual updates to preserve Tizen-specific functionality:**
  - `moonlight-common-c/.gitmodules`
  - `moonlight-common-c/src/Platform.h`
  - `moonlight-common-c/src/PlatformSockets.c`
- `enet` (submodule of `moonlight-common-c`) — updates should generally come from the official [upstream repository](https://github.com/cgutman/enet). The same Tizen-specific exceptions and maintainer-only changes described for `moonlight-common-c` also apply here.

  **The following file currently requires manual updates to preserve Tizen-specific functionality:**
  - `moonlight-common-c/enet/unix.c`
- `opus` — **manual modifications are not allowed**; updates should only come from the official [upstream repository](https://github.com/xiph/opus).

### Dependency Guidelines

- Avoid modifying third-party libraries manually unless the change is required and follows the rules above.
- Updates should come from the official upstream repositories whenever possible.
- If changes to these libraries are needed, please discuss them with the maintainer first.

Pull requests that include **unauthorized manual modifications** to third-party libraries may be asked to revert those changes.

## Communication

Please keep discussions respectful and constructive. Different opinions are welcome as long as they remain focused on improving the project.

## Final Notes

Contributions are always appreciated. Clear, focused pull requests and well-described issues help keep the project healthy and easier to maintain for everyone.

Every contribution, whether it's code, documentation, bug reports, or translations, helps improve the project.
