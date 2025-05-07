// --- 스크립트 중복 실행 방지 --- 
if (typeof window.myTimerExtensionContentLoaded === 'undefined') {
  window.myTimerExtensionContentLoaded = true;

  console.log("Watch Party Timer content script loaded for Laftel.");

  let intervalId = null;
  let isTrackingActive = false; // background-script.js로부터 제어받음

  // 1) 시간을 HH:MM:SS로 변환 - background-script.js로 이동하여 거기서 포매팅
  // function formatTimeForDisplay(sec) { ... }

  // 라프텔용 제목 선택자 정의
  
  const laftelSelectors = {
    seriesTitle: "#root > div.sc-4a02fa07-0.cSulJK > div > div.sc-ec16796a-2.hlVrXi > div > a",
    episodeTitle: "#root > div.sc-4a02fa07-0.cSulJK > div > div.sc-ec16796a-2.hlVrXi > div > div > div.sc-46d49bb0-5.hFtDBz > div.sc-46d49bb0-7.krHzYQ",
    movieTitle: "#root > div.sc-4a02fa07-0.cSulJK > div > div.sc-ec16796a-2.hlVrXi > div > div > div.sc-46d49bb0-5.hFtDBz > a" // 영화/단편용
  };

  // 요소에서 텍스트를 추출하는 헬퍼 함수
  function getElementText(selector) {
    const element = document.querySelector(selector);
    if (!element) return null;
    let text = element.innerText?.trim();
    if (!text && typeof element.textContent === 'string') text = element.textContent.trim();
    if (!text && typeof element.title === 'string' && element.title.trim()) text = element.title.trim();
    return text || null;
  }

  function getVideoInfoForLaftel() {
    const video = document.querySelector('video');
    if (!video) return null;

    let seriesText = getElementText(laftelSelectors.seriesTitle);
    let episodeText = getElementText(laftelSelectors.episodeTitle);
    let movieText = getElementText(laftelSelectors.movieTitle);

    let finalSeries = null;   // New key: series
    let finalEpisode = null;  // New key: episode
    let dataSource = null;

    if (movieText) { // 영화/단독 OVA등을 우선 체크 (이 경우 series는 없음)
        finalSeries = null;
        finalEpisode = movieText;
        dataSource = 'movie';
    } else if (seriesText && episodeText && seriesText !== episodeText) {
        // 시리즈 제목과 에피소드 제목이 모두 있고, 서로 다르면
        finalSeries = seriesText;   // 시리즈 제목
        finalEpisode = episodeText;  // 에피소드 제목
        dataSource = 'series_episode';
    } else if (seriesText && (!episodeText || seriesText === episodeText)) {
        // 시리즈 제목만 있거나, 시리즈 제목과 에피소드 제목이 같으면 (예: 단편 애니) -> 시리즈 제목을 에피소드로 취급
        finalSeries = null;
        finalEpisode = seriesText;
        dataSource = 'series_as_episode';
    } else if (episodeText) {
        // 에피소드 제목만 있으면 (이 경우도 단편 등으로 간주)
        finalSeries = null;
        finalEpisode = episodeText;
        dataSource = 'episode_only';
    } else {
        // 아무것도 없으면 둘 다 null
        finalSeries = null;
        finalEpisode = null;
        dataSource = 'none';
    }

    const currentTimeSeconds = video.currentTime; // 초 단위 숫자
    const durationSeconds = video.duration;     // 초 단위 숫자

    if (isNaN(currentTimeSeconds) || isNaN(durationSeconds)) {
        // 시간 정보가 없으면 제목 정보도 의미 없을 수 있으므로 null 반환 또는 데이터 포함 결정 필요
        return null; // 일단 null 반환
    }

    return {
        series: finalSeries,   // new key
        episode: finalEpisode, // new key
        currentSeconds: currentTimeSeconds, 
        durationSeconds: durationSeconds,   
        source: dataSource
    };
  }

  function sendVideoDataUpdate() {
      if (!isTrackingActive) return;
      
      const videoData = getVideoInfoForLaftel();
      if (videoData) {
          // console.log('Sending video data to background:', videoData);
          chrome.runtime.sendMessage({ type: 'VIDEO_INFO_UPDATE', data: videoData }, (response) => {
            if (chrome.runtime.lastError) {
              console.warn(`Content script: Error sending VIDEO_INFO_UPDATE: ${chrome.runtime.lastError.message}`);
              if (chrome.runtime.lastError.message?.includes("Extension context invalidated") ||
                  chrome.runtime.lastError.message?.includes("Receiving end does not exist")) {
                  console.warn("Content script: Background context invalidated or closed. Stopping tracking.");
                  stopTracking(); // Stop the interval
              }
              return;
            } 
            // else {
            //   console.log('Background script responded to VIDEO_INFO_UPDATE:', response?.status);
            // }
          });
      } else {
          // console.log('No video data to send.');
          chrome.runtime.sendMessage({ type: 'VIDEO_INFO_UPDATE', data: null }, (response) => {
            if (chrome.runtime.lastError) {
              console.warn(`Content script: Error sending null VIDEO_INFO_UPDATE: ${chrome.runtime.lastError.message}`);
              if (chrome.runtime.lastError.message?.includes("Extension context invalidated") ||
                  chrome.runtime.lastError.message?.includes("Receiving end does not exist")) {
                  console.warn("Content script: Background context invalidated or closed. Stopping tracking.");
                  stopTracking(); // Stop the interval
              }
              return;
            }
          });
      }
  }

  function startTracking() {
      if (intervalId) clearInterval(intervalId);
      isTrackingActive = true;
      intervalId = setInterval(sendVideoDataUpdate, 1000); // 1초마다 업데이트
      console.log('Content script: Started video data tracking.');
      // 비디오 종료 이벤트 리스너 추가 (선택 사항)
      const video = document.querySelector('video');
      if (video) {
        video.addEventListener('ended', handleVideoEnd);
      }
  }

  function stopTracking() {
      if (intervalId) clearInterval(intervalId);
      isTrackingActive = false;
      intervalId = null;
      console.log('Content script: Stopped video data tracking.');
      const video = document.querySelector('video');
      if (video) {
        video.removeEventListener('ended', handleVideoEnd);
      }
  }
  
  function handleVideoEnd() {
    console.log('Content script: Video ended.');
    stopTracking();
    chrome.runtime.sendMessage({ type: 'VIDEO_INFO_UPDATE', data: null }, (response) => {
        if (chrome.runtime.lastError) {
            console.warn(`Content script: Error sending VIDEO_INFO_UPDATE on video end: ${chrome.runtime.lastError.message}`);
            // stopTracking() is already called above, so no need to call it again here if context is invalidated.
        }
    }); 
  }

  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'CONTROL_TRACKING') {
      if (message.command === 'start') {
        startTracking();
        sendResponse({ status: "tracking_started" });
      } else if (message.command === 'stop') {
        stopTracking();
        sendResponse({ status: "tracking_stopped" });
      }
    }
    return true; // Keep channel open for async response
  });

  // Let background script know this content script is ready and can receive commands
  // This is important if content script is injected on demand
  chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY' }, (response) => {
    if (chrome.runtime.lastError) {
      // console.error("Error sending CONTENT_SCRIPT_READY:", chrome.runtime.lastError.message);
    }
  });

  // --- WebSocket 및 기존 연결/종료 로직 제거 ---
  // connectWebSocket(); // 제거
  // window.addEventListener('beforeunload', cleanupAndClose); // 제거
  // function cleanupAndClose() { ... } // 제거

} // End of 중복 실행 방지 