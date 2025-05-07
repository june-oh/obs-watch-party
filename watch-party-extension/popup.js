document.addEventListener('DOMContentLoaded', () => {
  const serverStatusEl = document.getElementById('serverStatus');
  const trackingStatusEl = document.getElementById('trackingStatus');
  const mainTitleEl = document.getElementById('mainTitle');
  const subTitleEl = document.getElementById('subTitle');
  const timeInfoEl = document.getElementById('timeInfo');
  const progressInfoEl = document.getElementById('progressInfo');
  const toggleButton = document.getElementById('toggleButton');

  let currentIsTrackingActive = false;
  let currentIsServerConnected = false;
  // let lastVideoInfoFromBackground = null; // Store the most recent full video info object

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

  function updatePopupUI(isTrackingActive, isServerConnected, videoInfo) {
    currentIsTrackingActive = isTrackingActive;
    currentIsServerConnected = isServerConnected;
    // lastVideoInfoFromBackground = videoInfo; // Update local cache

    // Update Server Status
    if (isServerConnected) {
      serverStatusEl.textContent = 'Server: Connected';
      serverStatusEl.className = 'connected';
    } else {
      serverStatusEl.textContent = 'Server: Disconnected';
      serverStatusEl.className = 'disconnected';
    }

    // Update Tracking Status and Button
    if (isTrackingActive) {
      toggleButton.textContent = 'Stop Tracking';
      toggleButton.classList.add('inactive'); // Red button when tracking
      trackingStatusEl.textContent = videoInfo ? 'Tracking Active' : 'Waiting for Laftel data...';
    } else {
      toggleButton.textContent = 'Start Tracking';
      toggleButton.classList.remove('inactive'); // Green button when not tracking
      trackingStatusEl.textContent = 'Tracking Inactive';
    }

    // Update Video Info display
    if (videoInfo && isTrackingActive) { // Only show details if tracking and info exists
      mainTitleEl.textContent = videoInfo.episode || 'N/A';
      subTitleEl.textContent = videoInfo.series || '';
      const progress = videoInfo.durationSeconds > 0 ? 
                       Math.floor((videoInfo.currentSeconds / videoInfo.durationSeconds) * 100) : 0;
      timeInfoEl.textContent = `${formatTime(videoInfo.currentSeconds)} / ${formatTime(videoInfo.durationSeconds)}`;
      progressInfoEl.textContent = `${progress}%`;
    } else {
      mainTitleEl.textContent = '-';
      subTitleEl.textContent = '-';
      timeInfoEl.textContent = '-';
      progressInfoEl.textContent = '-';
    }
  }

  toggleButton.addEventListener('click', () => {
    const command = currentIsTrackingActive ? 'stop' : 'start';
    chrome.runtime.sendMessage({ type: 'POPUP_TOGGLE_TRACKING', command: command }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Popup: Error sending toggle tracking command:', chrome.runtime.lastError.message);
        trackingStatusEl.textContent = 'Error. Check background console.';
        return;
      }
      if (response) {
        updatePopupUI(response.isTrackingActive, response.isServerConnected, response.lastVideoInfo);
      }
    });
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'BACKGROUND_STATE_UPDATE') {
      // console.log('Popup received state update:', message.data);
      updatePopupUI(message.data.isTrackingActive, message.data.isServerConnected, message.data.lastVideoInfo);
    } else if (message.type === 'VIDEO_INFO_UPDATE') {
      const videoInfo = message.data;
      if (videoInfo) {
        // Swapped titles: main display now uses videoInfo.sub, sub display uses videoInfo.main
        let displayMain = videoInfo.sub || ''; 
        let displaySub = videoInfo.main || '';

        // Fallback logic: if the intended main title (now from videoInfo.sub) is empty,
        // but the intended sub title (now from videoInfo.main) has content,
        // then use the sub title content for the main display, and clear the sub display.
        if (!displayMain && displaySub) {
          displayMain = displaySub;
          displaySub = '';
        }

        mainTitleEl.textContent = displayMain || 'N/A';
        subTitleEl.textContent = displaySub || 'N/A';
        
        const currentTimeFormatted = formatTime(videoInfo.currentSeconds);
        const durationFormatted = formatTime(videoInfo.durationSeconds);
        // Ensure timeDisplayEl and progressBarEl are the correct variable names used in your existing code for these elements
        timeInfoEl.textContent = `${currentTimeFormatted} / ${durationFormatted}`;
        progressInfoEl.textContent = `${(videoInfo.currentSeconds / videoInfo.durationSeconds) * 100}%`;
        
        // Update status if necessary (assuming statusEl is the correct variable for status display)
        if (videoInfo.currentSeconds > 0) {
          serverStatusEl.textContent = 'Server: Playing';
          serverStatusEl.className = 'status playing';
        } else {
          serverStatusEl.textContent = 'Server: Idle';
          serverStatusEl.className = 'status idle';
        }
      } else {
        mainTitleEl.textContent = 'N/A';
        subTitleEl.textContent = 'N/A';
        // Ensure timeDisplayEl and progressBarEl are the correct variable names
        timeInfoEl.textContent = '0:00:00 / 0:00:00';
        progressInfoEl.textContent = '0%';
        // Update status if necessary (assuming statusEl is the correct variable for status display)
        serverStatusEl.textContent = 'Server: Idle';
        serverStatusEl.className = 'status idle';
      }
    } else if (message.type === 'WEBSOCKET_STATUS') {
      // ... existing code ...
    }
    return true;
  });

  // Request initial state when popup opens
  chrome.runtime.sendMessage({ type: 'GET_POPUP_INITIAL_DATA' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Popup: Error getting initial data:', chrome.runtime.lastError.message);
      trackingStatusEl.textContent = 'Init error. Background connection failed.';
      serverStatusEl.textContent = 'Server: Error';
      serverStatusEl.className = 'disconnected';
      return;
    }
    if (response) {
      // console.log('Popup received initial data:', response);
      updatePopupUI(response.isTrackingActive, response.isServerConnected, response.lastVideoInfo);
    }
  });
}); 