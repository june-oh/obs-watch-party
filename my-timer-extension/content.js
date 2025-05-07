// --- 스크립트 중복 실행 방지 --- 
if (typeof window.myTimerExtensionContentLoaded === 'undefined') {
  window.myTimerExtensionContentLoaded = true;

  // --- WebSocket 연결 ---
  let ws = null;
  let lastSentData = '';
  let attempt = 0;
  let maxAttempts = 5; // 최대 재시도 횟수
  let retryInterval = 5000; // 재시도 간격 (ms)

  console.log("Watch Party Timer content script loaded for Laftel.");

  // --- 비디오 데이터 추출 로직 (사용자 코드 통합) ---
  let intervalId = null;
  let videoElement = null;
  let isClosing = false; // 중복 종료 방지 플래그

  function connectWebSocket() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        console.log("WebSocket is already open or connecting.");
        return;
    }

    ws = new WebSocket('ws://localhost:3000'); // 서버 주소 고정
    attempt = 0;

    ws.onopen = () => {
        console.log('Connected to OBS Timer Server at ws://localhost:3000');
        attempt = 0; // 연결 성공 시 재시도 횟수 초기화
        chrome.runtime.sendMessage({ type: "WEBSOCKET_STATUS", status: "connected" });
        initializeVideoTracking(); // 연결 성공 시 비디오 추적 시작
    };

    ws.onmessage = (event) => {
        // console.log('Message from server:', event.data);
    };

    ws.onclose = (event) => {
        console.log('Disconnected from OBS Timer Server. Code:', event.code, 'Reason:', event.reason, 'Was clean:', event.wasClean);
        chrome.runtime.sendMessage({ type: "WEBSOCKET_STATUS", status: "disconnected" });
        ws = null;
        stopSendingData(); // 데이터 전송 중지
        if (attempt < maxAttempts) {
            attempt++;
            console.log(`Retrying connection in ${retryInterval / 1000} seconds... (Attempt ${attempt}/${maxAttempts})`);
            setTimeout(connectWebSocket, retryInterval);
        } else {
            console.log("Max retry attempts reached. Giving up.");
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket Error:', error);
        chrome.runtime.sendMessage({ type: "WEBSOCKET_STATUS", status: "error" });
        // onclose가 보통 뒤따라 호출되므로, 재연결 로직은 onclose에서 처리
    };
  }

  // 1) 시간을 HH:MM:SS로 변환 (이전 로직 사용)
  function formatTimeForDisplay(sec) { // 함수 이름 변경 (다른 formatTime과 구분)
    if (!sec || !isFinite(sec)) {
        return '--:--';
    }
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const hh = h > 0 ? String(h).padStart(2, '0') + ':' : '';
    const mm = String(m).padStart(2, '0') + ':';
    const ss = String(s).padStart(2, '0');
    return hh + mm + ss;
  }

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
    return text || null; // 비어있으면 null 반환
  }

  function getVideoInfoForLaftel() {
    const video = document.querySelector('video'); // 비디오 선택자 변경
    if (!video) {
      // console.warn("Laftel video element not found with selector 'video'");
      return null;
    }

    let seriesText = getElementText(laftelSelectors.seriesTitle);
    let episodeText = getElementText(laftelSelectors.episodeTitle);

    let finalMainTitle = '';
    let finalSubTitle = '';

    if (seriesText && episodeText && seriesText !== episodeText) {
      // 시리즈와 에피소드 제목이 모두 있고 서로 다를 경우
      finalMainTitle = seriesText;
      finalSubTitle = episodeText;
    } else if (seriesText && (!episodeText || seriesText === episodeText)) {
      // 시리즈 제목만 있거나, 에피소드 제목이 시리즈 제목과 같은 경우 (단편 애니, 영화 시작 부분 등)
      // 이 경우 시리즈 제목을 주 정보로 간주하여 subTitle로 보냄
      finalMainTitle = ''; 
      finalSubTitle = seriesText;
    } else if (episodeText) {
      // 에피소드 제목만 있는 경우
      finalMainTitle = '';
      finalSubTitle = episodeText;
    } else {
      // 시리즈와 에피소드 제목을 모두 찾지 못한 경우, 영화/단편 제목 선택자로 시도
      const movieText = getElementText(laftelSelectors.movieTitle);
      if (movieText) {
        finalMainTitle = '';
        finalSubTitle = movieText;
      } else {
        // 모든 제목 정보를 찾지 못함
        finalMainTitle = '';
        finalSubTitle = ''; // 또는 '제목 없음'과 같은 기본값 설정 가능
      }
    }
    
    const currentTime = Math.floor(video.currentTime);
    const duration = Math.floor(video.duration);

    if (isNaN(currentTime) || isNaN(duration)) {
        // console.warn("Video time is NaN.");
        return null;
    }

    return {
        main: finalMainTitle,
        sub: finalSubTitle,
        current: formatTimeForDisplay(currentTime),
        duration: formatTimeForDisplay(duration)
    };
  }

  function sendVideoData() {
      if (isClosing) return;
      if (ws && ws.readyState === WebSocket.OPEN) {
          const videoData = getVideoInfoForLaftel(); // 라프텔 전용 추출 함수 사용
          if (videoData) {
              const dataString = JSON.stringify(videoData);
              if (dataString !== lastSentData) {
                  ws.send(JSON.stringify({ type: 'FROM_EXTENSION', data: videoData }));
                  lastSentData = dataString;
                  // console.log('Sent data:', videoData);
              } else {
                  // console.log('Data unchanged, not sending.');
              }
          }
      }
  }

  function startSendingData() {
      if (intervalId) {
          clearInterval(intervalId);
      }
      intervalId = setInterval(sendVideoData, 1000);
      console.log('Started sending data interval for Laftel.');
      if (videoElement) {
          videoElement.removeEventListener('ended', stopSendingDataOnEnd);
          videoElement.addEventListener('ended', stopSendingDataOnEnd);
      }
  }

  function stopSendingData() {
      if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
          console.log('Stopped sending data interval.');
      }
  }

  function stopSendingDataOnEnd() {
      if (isClosing) return;
      console.log('Video ended, stopping data interval.');
      stopSendingData();
  }

  function cleanupAndClose() {
      if (isClosing) return;
      isClosing = true;
      console.log('Cleanup: Stopping data sending and closing WebSocket.');
      stopSendingData();
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) ) {
          ws.onclose = null; // 재연결 로직 방지
          ws.onerror = null;
          ws.close(1000, "Page Unloaded or navigated");
      }
      ws = null;
      chrome.runtime.sendMessage({ type: "WEBSOCKET_STATUS", status: "disconnected" });
  }

  function initializeVideoTracking() {
      if (isClosing) return;
      videoElement = document.querySelector('video');
      if (videoElement) {
          console.log('Laftel video element found.');
          startSendingData();
      } else {
          console.warn('Laftel video element not found. Retrying in 2 seconds...');
          setTimeout(initializeVideoTracking, 2000);
      }
  }
  
  // --- 스크립트 시작 및 종료 리스너 ---
  connectWebSocket(); // 페이지 로드 시 WebSocket 연결 시도

  window.addEventListener('beforeunload', cleanupAndClose);
  window.addEventListener('popstate', () => { 
      console.log("popstate detected, cleaning up.");
      cleanupAndClose();
      setTimeout(() => {
          isClosing = false; 
          connectWebSocket(); 
      }, 1000);
  });

  const observer = new MutationObserver((mutationsList, observerInstance) => {
      const video = document.querySelector('video');
      if (video && !videoElement) { 
          console.log("Laftel video element dynamically appeared.");
          isClosing = false; 
          initializeVideoTracking();
      } else if (!video && videoElement) { 
          console.log("Laftel video element dynamically disappeared.");
          cleanupAndClose();
          videoElement = null;
      }
      if (window.location.href !== currentUrlForObserver) {
          console.log(`URL changed from ${currentUrlForObserver} to ${window.location.href}. Re-initializing.`);
          currentUrlForObserver = window.location.href;
          cleanupAndClose();
          setTimeout(() => {
              isClosing = false;
              connectWebSocket();
          }, 1000);
      }
  });
  let currentUrlForObserver = window.location.href;
  observer.observe(document.body, { childList: true, subtree: true });

  console.log("Content script setup complete for Laftel.");

} // End of the guard block 