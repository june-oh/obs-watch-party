// Popup window 관련 변수 제거
// let displayWindowId = null;
// let lastVideoData = {};

// --- Popup window 관련 함수 제거 ---
/*
function createOrFocusWindow() {
  if (displayWindowId !== null) {
    chrome.windows.get(displayWindowId, { populate: false }, (existingWindow) => {
      if (chrome.runtime.lastError || !existingWindow) {
        displayWindowId = null;
        createWindow();
      } else {
        chrome.windows.update(displayWindowId, { focused: true });
        sendDataToDisplayWindow(lastVideoData);
      }
    });
  } else {
    createWindow();
  }
}

function createWindow() {
  chrome.windows.create({
    url: chrome.runtime.getURL('display.html'),
    type: 'popup',
    width: 350,
    height: 150
  }, (newWindow) => {
    displayWindowId = newWindow.id;
  });
}

function sendDataToDisplayWindow(data) {
  if (displayWindowId !== null) {
    chrome.runtime.sendMessage({ type: 'VIDEO_DATA_UPDATE', data: data }, (response) => {
       if (chrome.runtime.lastError) {
           // console.log('Error sending message to display window:', chrome.runtime.lastError.message);
       } else {
           // console.log('Message sent to display window');
       }
    });
  }
}
*/

// --- Icon 경로 설정 (실제 파일 경로로 수정 필요) ---
const icons = {
  active: {
    "16": "icons/icon-active-16.png",
    "48": "icons/icon-active-48.png"
  },
  inactive: {
    "16": "icons/icon-inactive-16.png",
    "48": "icons/icon-inactive-48.png"
  }
};

// --- Event Listeners --- 

// Listen for the extension icon click
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    console.log('Extension icon clicked on tab:', tab.id);
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    }).then(() => {
      console.log('Injected content script into tab:', tab.id);
    }).catch(err => {
      console.error('Failed to inject content script:', err);
    });
  } else {
    console.error('Could not get tab ID for action click.');
  }
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // content.js로부터 WebSocket 상태 수신
  if (message.type === 'WS_CONNECTED') {
    if (sender.tab?.id) {
      console.log(`WebSocket connected on tab ${sender.tab.id}. Activating icon.`);
      chrome.action.setIcon({ tabId: sender.tab.id, path: icons.active });
      sendResponse({ status: "icon_activated" });
    } else {
      console.warn('Received WS_CONNECTED without tab ID.');
    }
  } else if (message.type === 'WS_DISCONNECTED') {
    if (sender.tab?.id) {
      console.log(`WebSocket disconnected on tab ${sender.tab.id}. Deactivating icon.`);
      chrome.action.setIcon({ tabId: sender.tab.id, path: icons.inactive });
      sendResponse({ status: "icon_deactivated" });
    } else {
      console.warn('Received WS_DISCONNECTED without tab ID.');
    }
  }

  /* Popup 관련 메시지 핸들러 제거
  if (message.type === 'VIDEO_INFO') {
    // ... (removed) ...
  }
  if (message.type === 'GET_INITIAL_DATA') {
    // ... (removed) ...
  }
  */
  
  return true; // Keep message channel open for potential async response
});

// --- Popup 윈도우 종료 리스너 제거 ---
/*
chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === displayWindowId) {
    console.log('Extension display window closed.');
    displayWindowId = null;
  }
});
*/

console.log("Background service worker started. Icon handler ready."); 