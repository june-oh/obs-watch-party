# Watch Party OBS Timer

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![GitHub last commit](https://img.shields.io/github/last-commit/june-oh/obs-watch-party)](https://github.com/june-oh/obs-watch-party/commits/main)
[![GitHub issues](https://img.shields.io/github/issues/june-oh/obs-watch-party)](https://github.com/june-oh/obs-watch-party/issues)
[![GitHub stars](https://img.shields.io/github/stars/june-oh/obs-watch-party?style=social)](https://github.com/june-oh/obs-watch-party/stargazers)
[![Made with HTML5](https://img.shields.io/badge/HTML-5-orange.svg?style=flat-square&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/HTML5)
[![Made with CSS3](https://img.shields.io/badge/CSS-3-blue.svg?style=flat-square&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![Made with JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow.svg?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Runs with Node.js](https://img.shields.io/badge/Node.js-LTS-green.svg?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)

[한국어 버전 보기 (View in Korean)](./README.md)

This project helps display video playback information (title, subtitle, current time, duration) from streaming services (initially Laftel, with plans for expansion) directly into OBS Studio. This is ideal for synchronized watch parties or enhancing personal streaming setups by showing what you're watching in real-time.

It consists of two main components:

1.  **Chrome Extension (`watch-party-extension/`)**: Extracts playback information from the streaming service's web player.
    *   [Detailed README for the Extension](./watch-party-extension/README.md)
2.  **Node.js Server (`obs-timer-server/`)**: Receives data from the extension and serves a customizable HTML overlay for OBS to display the timer and video details.
    *   [Detailed README for the Server](./obs-timer-server/README.md)

## Core Features (Version 1.0)

*   Real-time display of video title, subtitle (series/episode), current playback time, and total duration in OBS for a single user setup.
*   Seamless communication via WebSockets between the browser extension and a local Node.js server.
*   Configurable display options for the OBS overlay (e.g., colors, font sizes) via a web interface provided by the server.
*   Designed for easy setup for single-PC streaming configurations.
*   Supports dual-PC streaming configurations (currently requires manual server IP configuration by the user if the server is run locally on one of the PCs).
*   Initial support for Laftel, with a flexible design to support more platforms in the future.

## Architecture

### One-Computer Setup

```mermaid
graph LR<br>
    subgraph "PC 1"<br>
        OBS --> BSource("Browser Source (obs-display.html)");<br>
        ChromeExt("Chrome Extension (Timer Data Source)") --> Server("Local Timer Server (server-main.js)");<br>
        Server --> BSource;<br>
        BSource -- WebSocket --> Server;<br>
    end<br>
    ChromeExt -.-> |Reads data from| StreamingPlatform("Streaming Platform (e.g., YouTube, Netflix)");<br>
```

### Two-Computer Setup

```mermaid
graph LR<br>
    subgraph "PC 1 (Gaming/Streaming PC)"<br>
        OBS --> BSource("Browser Source (obs-display.html)");<br>
    end<br>
<br>
    subgraph "PC 2 (Auxiliary/Server PC)"<br>
        ChromeExt("Chrome Extension (Timer Data Source)") --> TimerServer("Timer Server (server-main.js on Railway/other)");<br>
    end<br>
<br>
    StreamingPlatform("Streaming Platform (e.g., YouTube, Netflix)");<br>
    ChromeExt -.-> |Reads data from| StreamingPlatform;<br>
    TimerServer -- WebSocket --> BSource;<br>
    BSource -- WebSocket --> TimerServer;<br>
    <br>
    style TimerServer fill:#f9f,stroke:#333,stroke-width:2px<br>
```

## Tech Stack

*   **Chrome Extension**: JavaScript, HTML, CSS, Chrome Extension API, WebSockets
*   **Node.js Server**: Node.js, Express.js (or native http module), WebSocket (e.g., `ws` library)
*   **OBS Display**: HTML, CSS, JavaScript (client-side WebSocket)

## Screenshots

Here's a glimpse of the extension and the OBS overlay:

**Chrome Extension in Action:**

![Chrome Extension UI showing video detection and server connection status](./imgs/extension.png)

**OBS Overlay Display:**

![OBS overlay showing video title, series, progress bar, and time](./imgs/obs.png)

## Installation & Usage (v1.0)

### 1. For End-Users

If you just want to use the timer for your watch parties or streams:

*   **Server Application (v1.0 - Run from Source)**:
    *   Currently, running the server from source is the primary method. This requires Node.js.
    *   Follow the developer setup to run the server: [2. For Developers (or if you want to run from source)](#2-for-developers-or-if-you-want-to-run-from-source).
    *   (Pre-built executables for simpler setup are planned for future releases.)
*   **Chrome Extension**:
    *   Install the Chrome Extension. This might be available via a `.crx` file or by loading the unpacked extension from the `watch-party-extension` directory. (Check the Releases section).
    *   Follow the [Extension README's "Setup and Usage" section](./watch-party-extension/README.md#setup-and-usage).
*   **OBS Configuration**: Add the server's display page (e.g., `http://localhost:3000` if the server is running on the same PC) as a Browser Source in OBS Studio.

### 2. For Developers (or if you want to run from source)

If you want to modify the code, contribute, or run the server directly using Node.js:

*   **Prerequisites**:
    *   Node.js (LTS version recommended, e.g., v18 or later. Check `obs-timer-server/package.json` for specific engine requirements if any.)
    *   Git (for cloning the repository)
*   **Setup**:
    1.  Clone this repository: `git clone https://github.com/june-oh/obs-watch-party.git`
    2.  Navigate to the `obs-timer-server` directory and install dependencies: `cd obs-timer-server && npm install` (or `yarn install` if you use Yarn)
    3.  Follow the server setup instructions in the [Server README](./obs-timer-server/README.md#setup-and-usage).
    4.  For the extension, load it as an unpacked extension from the `watch-party-extension` directory as described in the [Extension README](./watch-party-extension/README.md#setup-and-usage).
*   **Running**:
    *   Start the Node.js server: `cd obs-timer-server && node src/server-main.js` (or as specified in its README).
    *   Ensure the Chrome extension is active in your browser.
*   **Building (Optional)**: If you make changes to the server and want to create an executable, follow the build instructions in the [Server README](./obs-timer-server/README.md#packaging-executable).

## Future Plans

*   Support for additional streaming platforms (e.g., Netflix, YouTube, Disney+).
*   Enhanced customization options for the OBS overlay.
*   Support for multi-user environments (individual timers per user/streamer) using a cloud-hosted server.
*   Deployment options for cloud-based server hosting (e.g., Railway, Render) for easier and more robust two-computer/multi-user setups.
*   Potentially a more user-friendly settings management for the extension (e.g., via an options page).
*   Localization for other languages.

## Contributing

Contributions are welcome! For more details on how to contribute, including our branching strategy, commit conventions, and versioning, please see our [Contributing Guidelines](./CONTRIBUTING.md).

If you have ideas for new features, improvements, or bug fixes, please feel free to:

1.  Open an issue to discuss your ideas.
2.  Fork the repository and submit a pull request with your changes.

Please try to follow the existing coding style and ensure your changes are well-tested.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details. 