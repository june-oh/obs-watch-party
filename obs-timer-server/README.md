# OBS Timer Server

This Node.js server application receives video playback information (title, subtitle, current time, duration) via a WebSocket connection from the `watch-party-extension` Chrome extension. It then makes this information available for display in an OBS Studio browser source through a dynamically updated HTML page (`obs-display.html`). It also provides a web interface for configuration.

## Features

*   **WebSocket Server:**
    *   Listens for incoming WebSocket connections (default port: 3000).
    *   Receives JSON data containing video information from the Chrome extension.
    *   Broadcasts received video data to all connected OBS browser source clients.
*   **HTTP Server:**
    *   Serves `obs-display.html` (for OBS) and `config-page.html` (for server configuration).
    *   Handles API endpoints for getting and updating server configuration (`/api/config`).
*   **OBS Display (`obs-display.html`):**
    *   Displays the video title, subtitle, current time, and duration.
    *   Styled for OBS overlay (transparent background, configurable content box background).
    *   Dynamically updates content based on data received from the server via WebSocket.
    *   Shows a "연결 안됨" (Disconnected) message if the WebSocket connection to the server is lost or if no data is being received from the Chrome extension.
    *   Font sizes for titles can be dynamically adjusted (larger if only one title is present).
    *   Time display is styled like a music player.
    *   Content is wrapped in a semi-transparent, rounded-corner box (`.overlay`) that spans the full width of the OBS browser source.
    *   Series title appears above the episode title.
    *   Uses "Noto Sans KR" web font for Korean typography.
*   **Configuration (`config.json` and `config-page.html`):**
    *   Allows users to configure:
        *   Supported platforms (though this is primarily for future expansion, current focus is Laftel via the extension).
        *   Background color of the `.overlay` box in `obs-display.html`.
        *   Text color for the platform display in `obs-display.html`.
        *   Font sizes for titles and time display.
    *   Configuration is loaded from `config.json` on server start and saved back when updated via the `/config` web page.
    *   The configuration page (`config-page.html`) provides a user-friendly interface to modify these settings.
*   **Server IP Display:**
    *   On startup, the server logs its local network IP addresses to the console, making it easier to configure remote access if needed (e.g., for accessing the config page or OBS source from another device on the same network).
*   **SEA (Single Executable Application) Asset Loading:**
    *   The server code includes logic to correctly load assets (`obs-display.html`, `config-page.html`) when packaged as a Node.js SEA, using `node:sea` and `process.versions.sea` to determine the asset path.

## Key Files

*   `src/server-main.js`: The main application file containing the Node.js HTTP and WebSocket server logic, configuration management, and asset serving.
*   `public/obs-display.html`: The HTML page intended to be used as a browser source in OBS. It connects to the server via WebSocket to receive and display video information.
*   `public/config-page.html`: An HTML page that provides a GUI for editing the server's `config.json` file.
*   `public/style.css`: CSS for `config-page.html`.
*   `config.json`: Stores server configuration (platforms, UI colors, font sizes). Automatically created if it doesn't exist.
*   `package.json`: Defines project dependencies and scripts, including a `build` script for packaging the server using `pkg`.
*   `clean-and-build.bat`: A batch script to clean the project (remove `node_modules`, `dist`) and then perform `npm install` and `npm run build`.

## Setup and Usage

1.  **Prerequisites:**
    *   Node.js (version 21+ recommended for SEA features if not using `pkg`). The server was developed with Node `v22.15.0`.
2.  **Installation:**
    *   Clone the repository or download the files.
    *   Navigate to the `obs-timer-server` directory in your terminal.
    *   Run `npm install` to install dependencies.
3.  **Running the Server:**
    *   Run `node src/server-main.js`.
    *   The server will start, and you should see console output indicating it's listening on a port (default: 3000) and displaying local IP addresses.
4.  **Configuration (Optional):**
    *   Open a web browser and navigate to `http://localhost:3000/config` (or use one of the logged IP addresses if accessing from another device on the network).
    *   Adjust settings as needed and save.
5.  **OBS Setup:**

    *   **원컴 방송 환경 (Single-PC Setup):**
        *   OBS Studio, 게임, 웹 브라우저(확장 프로그램 실행), `obs-timer-server`가 모두 동일한 컴퓨터에서 실행되는 경우입니다.
        *   OBS Studio에서 새로운 "브라우저" 소스를 추가합니다.
        *   URL을 `http://localhost:3000` 으로 설정합니다. (또는 `http://127.0.0.1:3000`)
        *   너비와 높이를 필요에 맞게 조정합니다.
        *   Chrome에 `watch-party-extension`이 설치 및 활성화되어 있고, Laftel 비디오가 재생 중인지 확인합니다.

    *   **투컴 방송 환경 (Dual-PC Setup):**
        *   **게임용 PC:** 게임, 웹 브라우저(확장 프로그램 실행), `obs-timer-server` 실행
        *   **송출용 PC:** OBS Studio 실행
        *   이 구성에서 `watch-party-extension`은 여전히 게임용 PC의 `obs-timer-server`와 통신하므로, 확장 프로그램 자체의 서버 주소 설정은 `localhost`로 유지됩니다.
        *   **송출용 PC의 OBS Studio**에서 새로운 "브라우저" 소스를 추가합니다.
        *   URL을 `http://<게임용 PC의 IP 주소>:3000` 으로 설정합니다.
            *   예: 게임용 PC의 IP 주소가 `192.168.0.10`이라면 `http://192.168.0.10:3000` 으로 설정합니다.
            *   게임용 PC의 IP 주소는 `obs-timer-server` 실행 시 콘솔에 표시되는 IP 주소를 참고하거나, 운영체제의 네트워크 설정에서 확인할 수 있습니다.
        *   너비와 높이를 필요에 맞게 조정합니다.
        *   **중요:** 게임용 PC의 방화벽에서 `obs-timer-server`가 사용하는 포트(기본값: 3000)에 대한 인바운드 연결을 허용해야 합니다. 그렇지 않으면 송출용 PC의 OBS가 게임용 PC의 서버에 접속할 수 없습니다.
        *   게임용 PC의 Chrome에 `watch-party-extension`이 설치 및 활성화되어 있고, Laftel 비디오가 재생 중인지 확인합니다.

## Packaging (Executable)

The server can be packaged into a standalone executable using `pkg`, which bundles Node.js and the application files.

*   **Build Command:** `npm run build` (this executes the build script defined in `package.json`). The `clean-and-build.bat` script can also be used to ensure a clean build.
*   **Important:**
    *   If you modify `public/obs-display.html`, `public/config-page.html`, or other assets in the `public` directory, you **must** rebuild the executable using `npm run build` for the changes to be included.
    *   `pkg` includes assets specified in the `"pkg"` section of `package.json` (e.g., `"assets": ["public/**/*", "config.json"]`).
    *   The `server-main.js` file contains logic to correctly resolve paths to these assets when running as a packaged executable and also when run directly with `node` or as an SEA.

### Node.js Single Executable Applications (SEAs)

While `pkg` is used for the primary build process, the server has been prepared to work with Node.js SEAs. If you choose to build an SEA manually (using Node.js 21+), the asset loading mechanism in `server-main.js` should handle finding `public/*` files correctly.

### GUI for Configuration (Experimental - Paused)

An attempt was made to integrate `node-gui` to provide a native GUI for configuration as an alternative to the web interface and direct `config.json` editing. This effort was paused due to persistent issues with `@nodegui/packer` (the NodeGui packaging tool), specifically around project initialization and build processes failing to generate necessary template files or encountering copy errors. The `gui.js` file and related dependencies (`@nodegui/nodegui`, `@nodegui/packer`) might still be present but are not part of the primary functional server.

## Notes

*   The server is designed to work in tandem with the `watch-party-extension`.
*   Ensure the port (default 3000) is not blocked by a firewall if accessing the server from other devices on the network. 