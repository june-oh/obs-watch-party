// Global state
let isActive = false; // Is tracking active (controlled by popup)?
let isSocketConnected = false; // Is the WebSocket actually connected?
let webSocket = null;
let lastVideoInfo = null; // Stores { series, episode, currentSeconds, durationSeconds, source }
let currentTabId = null; // To send messages to the active content script

const SERVER_URL = 'ws://localhost:3000';

const ICONS = {
  connected: { // Green: Socket connected (implies tracking might be active or starting)
    "16": "icons/icon-connected-16.png",
    "48": "icons/icon-connected-48.png",
    "128": "icons/icon-connected-128.png"
  },
  inactive: { // Grey: Not tracking AND socket disconnected
    "16": "icons/icon-inactive-16.png",
    "48": "icons/icon-inactive-48.png",
    "128": "icons/icon-inactive-128.png"
  },
  error: { // Red: Tracking attempt but socket disconnected, or general error
    "16": "icons/icon-error-16.png",
    "48": "icons/icon-error-48.png",
    "128": "icons/icon-error-128.png"
  }
};

// --- Helper Functions ---
function formatTime(totalSeconds) {
  if (isNaN(totalSeconds) || totalSeconds < 0) return '--:--';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  let timeString = '';
  if (hours > 0) {
    timeString += `${String(hours).padStart(2, '0')}:`;
  }
  timeString += `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return timeString;
}

function updateActionIcon() {
  let iconPath = ICONS.inactive;
  if (isActive) {
    iconPath = isSocketConnected ? ICONS.connected : ICONS.error;
  } else {
    iconPath = isSocketConnected ? ICONS.connected : ICONS.inactive; // If not tracking but socket is somehow connected, show green
  }
  chrome.action.setIcon({ path: iconPath });
}

// Send current state to popup (if open)
function sendStateToPopup() {
    chrome.runtime.sendMessage({
        type: 'BACKGROUND_STATE_UPDATE',
        data: {
            isTrackingActive: isActive,
            isServerConnected: isSocketConnected,
            lastVideoInfo: lastVideoInfo
        }
    }).catch(e => { /* console.log("Popup not open or error sending state:", e.message); */ });
}

// --- WebSocket Logic ---
function connectWebSocket() {
  if (webSocket && (webSocket.readyState === WebSocket.OPEN || webSocket.readyState === WebSocket.CONNECTING)) {
    // console.log('BG: WebSocket already open or connecting.');
    return;
  }
  console.log('BG: Attempting to connect to WebSocket server...');
  webSocket = new WebSocket(SERVER_URL);
  // Icon will be updated via onopen/onclose/onerror

  webSocket.onopen = () => {
    console.log('BG: WebSocket connected to server.');
    isSocketConnected = true;
    updateActionIcon();
    sendStateToPopup();
    if (isActive && currentTabId) { // If tracking was already active, ensure content script is running
      chrome.tabs.sendMessage(currentTabId, { type: 'CONTROL_TRACKING', command: 'start' });
    }
  };

  webSocket.onmessage = (event) => { /* console.log('BG: Message from server:', event.data); */ };

  webSocket.onclose = (event) => {
    console.log('BG: WebSocket disconnected from server.', event.reason);
    isSocketConnected = false;
    webSocket = null;
    updateActionIcon();
    sendStateToPopup();
  };

  webSocket.onerror = (error) => {
    console.error('BG: WebSocket error:', error);
    isSocketConnected = false; 
    // webSocket might still be non-null here if error occurred before close
    updateActionIcon();
    sendStateToPopup();
  };
}

function disconnectWebSocket() {
  if (webSocket) {
    console.log('BG: Disconnecting WebSocket...');
    webSocket.onclose = null; // Prevent onclose handler from trying to update UI again if we are manually disconnecting
    webSocket.close(1000, 'User or extension initiated disconnect');
    webSocket = null;
  }
  isSocketConnected = false;
  updateActionIcon();
  sendStateToPopup();
}

// --- Event Listeners ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'POPUP_TOGGLE_TRACKING') {
    isActive = (message.command === 'start');
    console.log(`BG: Tracking toggled by popup to: ${isActive}`);
    if (isActive) {
      // Ensure content script is running and start tracking
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
            currentTabId = tabs[0].id;
            chrome.scripting.executeScript({
                target: { tabId: currentTabId },
                files: ['content-script.js']
            }).then(() => {
                chrome.tabs.sendMessage(currentTabId, { type: 'CONTROL_TRACKING', command: 'start' });
                connectWebSocket(); // Attempt to connect when tracking starts
            }).catch(err => {
                console.error('BG: Failed to inject for POPUP_TOGGLE_TRACKING', err);
                isActive = false; // Revert state if injection fails
            });
        } else {
            console.warn("BG: Could not get active tab ID for starting tracking from popup.");
            isActive = false; // Cannot start tracking without a tab
        }
        updateActionIcon();
        sendResponse({ isTrackingActive: isActive, isServerConnected: isSocketConnected, lastVideoInfo: lastVideoInfo });
      });
      return true; // Indicates async response
    } else { // Stopping tracking
      if (currentTabId) {
        chrome.tabs.sendMessage(currentTabId, { type: 'CONTROL_TRACKING', command: 'stop' });
      }
      disconnectWebSocket(); // Disconnect when tracking stops
      updateActionIcon();
      lastVideoInfo = null; // Clear video info when stopping
      sendResponse({ isTrackingActive: isActive, isServerConnected: isSocketConnected, lastVideoInfo: null });
    }
    // For synchronous path if not returning true above for async query
    // sendResponse({ isTrackingActive: isActive, isServerConnected: isSocketConnected, lastVideoInfo: lastVideoInfo }); 

  } else if (message.type === 'GET_POPUP_INITIAL_DATA') {
    // console.log('BG: Popup requested initial data.');
    // Try to ensure a tab ID is available if tracking is supposed to be active but no tab is known
    if (isActive && !currentTabId) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id) currentTabId = tabs[0].id;
            sendResponse({ isTrackingActive: isActive, isServerConnected: isSocketConnected, lastVideoInfo: lastVideoInfo });
        });
        return true; // Async
    }
    sendResponse({ isTrackingActive: isActive, isServerConnected: isSocketConnected, lastVideoInfo: lastVideoInfo });

  } else if (message.type === 'VIDEO_INFO_UPDATE') {
    // console.log('BG: Received video info from content script:', message.data);
    lastVideoInfo = message.data;
    if (isActive && isSocketConnected && webSocket && webSocket.readyState === WebSocket.OPEN) {
      if (lastVideoInfo) {
        webSocket.send(JSON.stringify({ type: 'FROM_EXTENSION', data: lastVideoInfo }));
      }
    }
    // Always update icon and send state to popup if it's open
    updateActionIcon(); 
    sendStateToPopup();
    sendResponse({ status: 'video_info_processed_by_bg' });

  } else if (message.type === 'CONTENT_SCRIPT_READY') {
    console.log('BG: Content script reported ready in tab:', sender.tab.id);
    currentTabId = sender.tab.id; 
    if (isActive && currentTabId) { 
        chrome.tabs.sendMessage(currentTabId, { type: 'CONTROL_TRACKING', command: 'start' });
        if (!isSocketConnected) connectWebSocket(); // If tracking is active but not connected, try connecting
    }
  }
  return true; 
});

function initializeExtensionState() {
    isActive = false; 
    isSocketConnected = false;
    lastVideoInfo = null;
    currentTabId = null;
    updateActionIcon();
    console.log('BG: Extension state initialized.');
}

chrome.runtime.onStartup.addListener(() => {
  console.log("BG: Extension started up.");
  initializeExtensionState();
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("BG: Extension installed.");
  initializeExtensionState();
});

initializeExtensionState();
console.log("Background Script (with WebSocket & Popup Support) Loaded."); 