# Watch Party OBS Timer

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![GitHub last commit](https://img.shields.io/github/last-commit/june.oh/watch-party-obs-timer)](https://github.com/june.oh/watch-party-obs-timer/commits/main)
[![GitHub issues](https://img.shields.io/github/issues/june.oh/watch-party-obs-timer)](https://github.com/june.oh/watch-party-obs-timer/issues)
[![GitHub stars](https://img.shields.io/github/stars/june.oh/watch-party-obs-timer?style=social)](https://github.com/june.oh/watch-party-obs-timer/stargazers)
<!-- [![GitHub release (latest by date)](https://img.shields.io/github/v/release/june.oh/watch-party-obs-timer)](https://github.com/june.oh/watch-party-obs-timer/releases/latest) -->
<!-- [![Build Status](https://github.com/june.oh/watch-party-obs-timer/actions/workflows/main.yml/badge.svg)](https://github.com/june.oh/watch-party-obs-timer/actions/workflows/main.yml) -->

[Read this in Korean (한국어 버전)](./README.ko.md)

This project helps display video playback information (title, subtitle, current time, duration) from streaming services (initially Laftel, with plans for expansion) directly into OBS Studio. This is ideal for synchronized watch parties or enhancing personal streaming setups by showing what you're watching in real-time.

It consists of two main components:

1.  **Chrome Extension (`my-timer-extension/`)**: Extracts playback information from the streaming service's web player.
    *   [Detailed README for the Extension](./my-timer-extension/README.md)
2.  **Node.js Server (`obs_timer_server/`)**: Receives data from the extension and serves a customizable HTML overlay for OBS to display the timer and video details.
    *   [Detailed README for the Server](./obs_timer_server/README.md)

## Core Features

*   Real-time display of video title, subtitle, current playback time, and total duration in OBS.
*   Seamless communication via WebSockets between the browser extension and a local Node.js server.
*   Configurable display options for the OBS overlay (e.g., colors, font sizes) via a web interface provided by the server.
*   Designed for easy setup for both single-PC and dual-PC streaming configurations.
*   Initial support for Laftel, with a flexible design to support more platforms in the future.

## Tech Stack

*   **Chrome Extension**: JavaScript, HTML, CSS, Chrome Extension API, WebSockets
*   **Node.js Server**: Node.js, Express.js (or native http module), WebSocket (e.g., `ws` library)
*   **OBS Display**: HTML, CSS, JavaScript (client-side WebSocket)

## Screenshots

*(Screenshots demonstrating the extension in action and the OBS overlay will be added here soon!)*

## Installation & Usage

There are two main ways to use this project:

### 1. For End-Users (Recommended for most)

If you just want to use the timer for your watch parties or streams without dealing with code:

*   **Server Application**:
    *   Download the pre-built server executable (`obs_timer_server.exe` for Windows, other OS versions may be provided in releases).
    *   Run the executable. No Node.js installation is required.
    *   Detailed instructions can be found in the [Server README's "Packaging (Executable)" section](./obs_timer_server/README.md#packaging-executable) (once releases are available).
*   **Chrome Extension**:
    *   Install the Chrome Extension. This might be available via a `.crx` file or by loading the unpacked extension from the `my-timer-extension` directory.
    *   Follow the [Extension README's "Setup and Usage" section](./my-timer-extension/README.md#setup-and-usage).
*   **OBS Configuration**: Add the server's display page (e.g., `http://localhost:3000` if the server is running on the same PC) as a Browser Source in OBS Studio.

*(Note: Pre-built executables and extension packages will be made available under the "Releases" section of this repository once finalized.)*

### 2. For Developers (or if you want to run from source)

If you want to modify the code, contribute, or run the server directly using Node.js:

*   **Prerequisites**:
    *   Node.js (version specified in `obs_timer_server/README.md`)
    *   Git (for cloning the repository)
*   **Setup**:
    1.  Clone this repository: `git clone https://github.com/june.oh/watch-party-obs-timer.git`
    2.  Navigate to the `obs_timer_server` directory and install dependencies: `cd obs_timer_server && npm install`
    3.  Follow the server setup instructions in the [Server README](./obs_timer_server/README.md#setup-and-usage).
    4.  For the extension, load it as an unpacked extension from the `my-timer-extension` directory as described in the [Extension README](./my-timer-extension/README.md#setup-and-usage).
*   **Running**:
    *   Start the Node.js server: `cd obs_timer_server && node src/server.js` (or as specified in its README).
    *   Ensure the Chrome extension is active in your browser.
*   **Building (Optional)**: If you make changes to the server and want to create an executable, follow the build instructions in the [Server README](./obs_timer_server/README.md#packaging-executable).

## Future Plans

*   Support for additional streaming platforms (e.g., Netflix, YouTube, Disney+).
*   Enhanced customization options for the OBS overlay.
*   Potentially a more user-friendly settings management for the extension (e.g., via an options page).
*   Localization for other languages.

## Contributing

Contributions are welcome! If you have ideas for new features, improvements, or bug fixes, please feel free to:

1.  Open an issue to discuss your ideas.
2.  Fork the repository and submit a pull request with your changes.

Please try to follow the existing coding style and ensure your changes are well-tested.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details. 