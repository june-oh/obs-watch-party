// Global state for simple-background.js
let isActive = false; 
let lastVideoInfo = null; 
let currentTabId = null; 
// let lastTooltipText = ''; // 팝업 사용으로 툴팁은 더 이상 주력으로 사용 안 함

const ICONS = {
  inactive: {
    "16": "icons/icon-inactive-16.png",
    "48": "icons/icon-inactive-48.png",
    "128": "icons/icon-inactive-128.png"
  },
  active: { // 아이콘 색상 변경은 여전히 유효 (정보 수집 중임을 표시)
    "16": "icons/icon-connected-16.png", 
    "48": "icons/icon-connected-48.png",
    "128": "icons/icon-connected-128.png"
  }
};

// --- Helper Functions (formatTime은 popup.js에도 있으므로 여기서는 생략 가능하나, 일관성을 위해 유지) ---
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

// 아이콘 상태만 업데이트 (툴팁은 manifest의 default_title이 표시됨)
function updateIconState() {
  const iconPath = isActive ? ICONS.active : ICONS.inactive;
  chrome.action.setIcon({ path: iconPath });
  // chrome.action.setTitle 제거 또는 고정값 설정 (팝업 사용으로 불필요)
  // chrome.action.setTitle({ title: isActive ? "정보 수집 중" : "Watch Party 정보 보기" });
}


// --- Event Listeners ---
// chrome.action.onClicked 리스너는 default_popup이 설정되면 호출되지 않음.
// 팝업이 열릴 때 popup.js에서 초기 데이터를 요청하게 됨.

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'POPUP_TOGGLE_TRACKING') {
    isActive = (message.command === 'start');
    console.log(`Simple BG: Tracking toggled by popup to: ${isActive}`);
    if (isActive) {
      // 현재 활성 탭에 content script 주입 및 시작 요청 (currentTabId 필요)
      // 가장 최근에 활성화된 Laftel 탭을 찾아야 할 수도 있음, 일단은 마지막 currentTabId 사용 시도
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
            currentTabId = tabs[0].id;
             // content-script 주입 보장
            chrome.scripting.executeScript({
                target: { tabId: currentTabId },
                files: ['content-script.js']
            }).then(() => {
                chrome.tabs.sendMessage(currentTabId, { type: 'CONTROL_TRACKING', command: 'start' });
            }).catch(err => console.error('Simple BG: Failed to inject for POPUP_TOGGLE_TRACKING', err));
        } else {
            console.warn("Simple BG: Could not get active tab ID for starting tracking from popup.");
        }
      });
    } else {
      if (currentTabId) {
        chrome.tabs.sendMessage(currentTabId, { type: 'CONTROL_TRACKING', command: 'stop' });
      }
    }
    updateIconState();
    sendResponse({ isActive: isActive, lastVideoInfo: lastVideoInfo });

  } else if (message.type === 'GET_POPUP_INITIAL_DATA') {
    // console.log('Simple BG: Popup requested initial data.');
    sendResponse({ isActive: isActive, lastVideoInfo: lastVideoInfo });

  } else if (message.type === 'VIDEO_INFO_UPDATE') {
    // console.log('Simple BG: Received video info from content script:', message.data);
    lastVideoInfo = message.data;
    if (isActive) { // 아이콘 상태는 계속 업데이트
        updateIconState(); 
    }
    // 팝업이 열려있을 경우, 팝업에게도 정보 전달 (popup.js가 직접 요청/수신)
    // 이 메시지는 popup.js가 자체적으로 메시지 리스너를 가지고 있어야 함.
    // chrome.runtime.sendMessage({ type: 'BACKGROUND_VIDEO_INFO_UPDATE_TO_POPUP', data: lastVideoInfo });
    // 위 방식 대신, popup.js가 필요할 때 GET_POPUP_INITIAL_DATA를 보내거나, 
    // 아니면 background가 직접 popup view를 찾아서 메시지를 보내는 더 복잡한 방식이 필요.
    // 가장 간단한 것은 popup.js가 background에 메시지를 보내고, background는 그 응답으로 최신 정보를 주는 것.
    // 이미 popup.js에서 onMessage로 BACKGROUND_VIDEO_INFO_UPDATE를 수신 대기하고 있으므로,
    // 여기서 그 메시지를 보내주면 됨.
    chrome.runtime.sendMessage({ type: 'BACKGROUND_VIDEO_INFO_UPDATE', data: lastVideoInfo }).catch(e => {}); // 팝업이 닫혀있으면 오류 발생 가능, 무시

    sendResponse({ status: 'video_info_received_by_bg' });

  } else if (message.type === 'CONTENT_SCRIPT_READY') {
    console.log('Simple BG: Content script reported ready in tab:', sender.tab.id);
    currentTabId = sender.tab.id; 
    if (isActive && currentTabId) { 
        chrome.tabs.sendMessage(currentTabId, { type: 'CONTROL_TRACKING', command: 'start' });
    }
  }
  return true; 
});

function initializeUI() {
    isActive = false; 
    updateIconState();
    console.log('Simple BG: Initial UI (icon) set to inactive.');
}

chrome.runtime.onStartup.addListener(() => {
  console.log("Simple BG: Extension started up.");
  initializeUI();
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("Simple BG: Extension installed.");
  initializeUI();
});

initializeUI();

console.log("Simple Background Script (with Popup Support) Loaded."); 