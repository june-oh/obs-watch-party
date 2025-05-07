# My Timer Extension (for Laftel)

This Chrome extension is designed to extract video playback information (title, subtitle, current time, and duration) from the Laftel.net streaming service. It then sends this information via a WebSocket connection to a local server (`obs_timer_server`) for display in applications like OBS Studio.

## Features

*   **Video Information Extraction:**
    *   Targets Laftel.net to find relevant video metadata and playback status.
    *   Identifies series titles and episode titles (or main and sub-titles).
    *   Tracks current playback time and total duration of the video.
*   **WebSocket Communication:**
    *   `obs_timer_server`와 웹소켓 연결을 설정합니다 (기본적으로 `ws://localhost:3000`으로 연결을 시도하며, 이는 확장 프로그램과 서버가 동일한 컴퓨터에서 실행되는 것을 가정합니다).
    *   추출된 비디오 데이터를 실시간으로 전송합니다.
    *   (투컴 환경으로 구성하는 경우에도 확장 프로그램은 게임용 PC의 `obs_timer_server`와 통신하므로 이 설정은 변경되지 않습니다. 송출용 PC의 OBS 설정은 `obs_timer_server`의 README를 참고하세요.)
*   **Dynamic Icon Status:**
    *   The extension icon changes color to indicate the WebSocket connection status:
        *   Green: Connected to the server.
        *   Red: Disconnected from the server.
*   **Automatic Connection Management:**
    *   The `content.js` script attempts to connect to the server when a Laftel video page is loaded.
    *   It automatically disconnects and stops sending data if the user navigates away from the page or closes the tab (`beforeunload` and `popstate` events are handled).
*   **Content Script Injection:**
    *   The `manifest.json` is configured with `host_permissions` for `"*://*.laftel.net/*"` to allow the content script to run on Laftel pages.
    *   Includes a guard in `content.js` to prevent multiple injections if the script is run more than once on the same page.

## Key Files

*   `manifest.json`: Defines the extension's properties, permissions, background script, and content scripts. Includes necessary host permissions for Laftel and permissions for `scripting` and `storage` (though storage is not actively used by the final version for icon status, communication is via message passing).
*   `content.js`:
    *   This is the core script injected into Laftel pages.
    *   Responsible for:
        *   Locating and extracting video title, subtitle, current time, and duration from the DOM.
        *   Establishing and managing the WebSocket connection to `obs_timer_server`.
        *   Sending video data updates to the server.
        *   Sending `WS_CONNECTED` and `WS_DISCONNECTED` messages to `background.js` to update the icon.
        *   Handling `beforeunload` and `popstate` events to gracefully close the WebSocket connection.
*   `background.js`:
    *   Listens for messages from `content.js` (`WS_CONNECTED`, `WS_DISCONNECTED`).
    *   Updates the extension icon dynamically based on the WebSocket connection status reported by `content.js`.
*   `icons/`: Contains the `active.png` and `inactive.png` icons used to display connection status. These are simple colored circles.

## Setup and Usage

1.  **Ensure `obs_timer_server` is running:** This extension requires the companion `obs_timer_server` to be active and listening for WebSocket connections on `localhost:3000`.
2.  **Load the Extension in Chrome:**
    *   Open Chrome and navigate to `chrome://extensions`.
    *   Enable "Developer mode" (usually a toggle in the top right).
    *   Click "Load unpacked".
    *   Select the `my-timer-extension` directory.
3.  **Navigate to Laftel:**
    *   Go to `laftel.net` and start playing a video.
    *   The extension should automatically attempt to connect to the server, and its icon should turn green if successful.
    *   The video information will be sent to the `obs_timer_server`.

## Notes

*   The extension was initially planned with a popup (`popup.html`, `popup.js`) but this functionality was removed in favor of a dynamic icon to indicate status.
*   Error handling for WebSocket connection failures (e.g., server not running) is primarily managed by the browser's WebSocket API, with the icon reflecting the disconnected state.
*   The selectors in `content.js` are specific to Laftel's website structure at the time of development and may need updates if Laftel changes its page layout. 