# Contributing to Watch Party OBS Timer

First off, thank you for considering contributing to this project! We welcome any contributions, whether it's new features, bug fixes, documentation improvements, or issue reporting.

To ensure a smooth collaboration, please review the following guidelines.

## Table of Contents

- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Pull Requests](#pull-requests)
- [Style Guides](#style-guides)
  - [Git Commit Messages](#git-commit-messages)
  - [Branching Strategy](#branching-strategy)
  - [Naming Conventions](#naming-conventions)
- [Versioning](#versioning)

## How Can I Contribute?

### Reporting Bugs

If you find a bug, please open an issue on our GitHub repository. Make sure to include:
- A clear and descriptive title.
- Steps to reproduce the bug.
- Expected behavior and what actually happened.
- Your environment (OS, browser version, Node.js version, extension version, server version).
- Screenshots or GIFs if helpful.

### Suggesting Enhancements

If you have an idea for a new feature or an improvement to an existing one, please open an issue to discuss it first. This allows us to coordinate efforts and ensure the suggestion aligns with the project's goals.

### Pull Requests

1.  Fork the repository and create your branch from `develop`.
2.  If you've added code that should be tested, add tests.
3.  Ensure your code lints (if a linter is set up).
4.  Make sure your commit messages follow our [Git Commit Messages](#git-commit-messages) guidelines.
5.  Open a pull request to the `develop` branch with a clear description of your changes.

## Style Guides

### Git Commit Messages

We follow the **Conventional Commits** specification. Each commit message should be in the format:

`<type>(<scope>): <subject>`

-   **Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`.
-   **Scope** (optional): Module or part of the project affected (e.g., `extension`, `server`, `readme`, `api`).
-   **Subject**: A concise description of the change.
    -   Use the imperative, present tense: "add" not "added" nor "adds".
    -   Don't capitalize the first letter.
    -   No dot (.) at the end.

Example: `feat(extension): add support for dark mode in overlay`

### Branching Strategy

We use a simplified Git Flow:
-   `main`: Stores the official release history. Stable and deployable.
-   `develop`: Main development branch. New features and fixes are merged here.
-   `feature/<name>` or `fix/<name>`: Branches for new features or bug fixes, branched off `develop` and merged back into `develop`.

### Naming Conventions

-   **Folders and non-script files**: `kebab-case` (e.g., `watch-party-extension`, `obs-timer-server`).
-   **JavaScript variables and functions**: `camelCase` (e.g., `getVideoInfo`, `mainTitleElement`).
-   **CSS classes**: `kebab-case` or BEM, be consistent.

## Versioning

This project adheres to **Semantic Versioning (SemVer)**, which dictates version numbers in the format `MAJOR.MINOR.PATCH` (e.g., `v1.2.3`).

**General Rules:**

Given a version number `MAJOR.MINOR.PATCH`, increment the:
1.  `MAJOR` version when you make incompatible API changes.
2.  `MINOR` version when you add functionality in a backward-compatible manner.
3.  `PATCH` version when you make backward-compatible bug fixes.

Additional labels for pre-release and build metadata are available as extensions to the `MAJOR.MINOR.PATCH` format (e.g., `1.0.0-alpha`, `1.0.0-alpha.1`, `1.0.0+20130313144700`).

**Initial Development Phase (Versions `0.y.z`):**

Currently, the project is in its initial development phase, and all versions will be in the `0.y.z` range. During this phase:
*   The API should be considered unstable.
*   Anything MAY change at any time.
*   `MINOR` version (`y` in `0.y.z`) is incremented when significant new features are added or breaking changes are introduced. While SemVer states that `0.y.z` can break compatibility at any time, we will strive to increment the `MINOR` version for such changes.
*   `PATCH` version (`z` in `0.y.z`) is incremented for smaller additions, bug fixes, or refactors that are mostly backward-compatible within the `0.y` scope.

**Examples for Initial Development (`0.y.z`):**
*   `v0.0.1`: First internal/alpha release.
*   `v0.0.2`: Minor bug fixes or very small additions to `v0.0.1`.
*   `v0.1.0`: Introduction of a significant new feature set or a breaking change from `v0.0.x`. For example, changing the WebSocket message format.
*   `v0.1.1`: Bug fixes for features introduced in `v0.1.0`.
*   `v0.2.0`: Another set of major features or breaking changes.

**Stable Releases (`1.0.0` and beyond):**

Once the project reaches a stable state and is ready for a public, dependable API, it will be released as `v1.0.0`. After `v1.0.0`:
*   `PATCH` (`1.0.z`): Used for backward-compatible bug fixes. If you fix a security vulnerability that doesn't change the API, it's a patch.
    *   Example: `v1.0.0` -> `v1.0.1` (fixed a bug where the timer wouldn't update correctly).
*   `MINOR` (`1.y.0`): Used for adding new features that are backward-compatible with the existing API. If you add a new endpoint to the server or a new option to the extension that doesn't break existing usage, it's a minor update.
    *   Example: `v1.0.1` -> `v1.1.0` (added support for a new streaming platform).
*   `MAJOR` (`x.0.0`): Used for changes that break backward compatibility. If you change an existing API endpoint in a way that old clients would no longer work, or remove a feature, it's a major update.
    *   Example: `v1.1.0` -> `v2.0.0` (completely overhauled the configuration system, making old `config.json` files incompatible).

Releases will be tagged in Git (e.g., `git tag v0.1.0`).

---

We look forward to your contributions! 