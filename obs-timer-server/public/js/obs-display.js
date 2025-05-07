let ws;
let currentConfig = {}; // 현재 설정을 저장할 변수
const overlayElement = document.getElementById('video-overlay');
const titleMainElement = document.getElementById('title-main');
const titleSubElement = document.getElementById('title-sub');
const currentTimeElement = document.getElementById('current-time');
const totalTimeElement = document.getElementById('total-time');
const progressBarElement = document.getElementById('progress-bar');
const progressDotElement = document.getElementById('progress-dot');
const platformPillsContainer = document.getElementById('platform-pills-container');
const connectionStatusElement = document.getElementById('connection-status');

function connect() {
  // 현재 페이지의 호스트 주소를 사용하여 WebSocket 서버에 연결
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsHost = window.location.hostname || 'localhost';
  const wsPort = window.location.port || (wsProtocol === 'wss:' ? 443 : 3000); // 서버 포트와 일치시킴
  
  ws = new WebSocket(`${wsProtocol}//${wsHost}:${wsPort}`);

  ws.onopen = () => {
    console.log('Connected to OBS Bridge Server');
    connectionStatusElement.style.display = 'none';
    overlayElement.classList.remove('hidden');
  };

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'VIDEO_UPDATE' || message.type === 'CONFIG_UPDATED') {
        if (message.config) {
            currentConfig = message.config;
            applyConfig(currentConfig);
        }
        if (message.data) {
            updateDisplay(message.data);
        }
    }
  };

  ws.onclose = () => {
    console.log('Disconnected from OBS Bridge Server');
    connectionStatusElement.style.display = 'block';
    overlayElement.classList.add('hidden');
    setTimeout(connect, 5000); // 5초 후 재연결 시도
  };

  ws.onerror = (error) => {
    console.error('WebSocket Error:', error);
    // ws.onclose가 호출되므로 별도 처리는 불필요
  };
}

function applyConfig(config) {
    if (overlayElement && config.backgroundColor) {
        overlayElement.style.backgroundColor = config.backgroundColor;
    }
    if (titleMainElement && config.fontSizeEpisode) {
        titleMainElement.style.fontSize = `${config.fontSizeEpisode}pt`;
    }
    if (titleSubElement && config.fontSizeSeries) {
        titleSubElement.style.fontSize = `${config.fontSizeSeries}pt`;
    }

    if (titleMainElement && config.fontColorEpisode) titleMainElement.style.color = config.fontColorEpisode;
    if (titleSubElement && config.fontColorSeries) titleSubElement.style.color = config.fontColorSeries;
    if (currentTimeElement && config.fontColorTime) currentTimeElement.style.color = config.fontColorTime;
    if (totalTimeElement && config.fontColorTime) totalTimeElement.style.color = config.fontColorTime;
    const progressPercentageElement = document.getElementById('progress-percentage');
    if (progressPercentageElement && config.fontColorProgress) progressPercentageElement.style.color = config.fontColorProgress;

    if (progressBarElement && config.progressBarFilledColor) progressBarElement.style.backgroundColor = config.progressBarFilledColor;
    const progressBarContainer = document.querySelector('.progress-bar-container');
    if (progressBarContainer && config.progressBarBackgroundColor) progressBarContainer.style.backgroundColor = config.progressBarBackgroundColor;
    if (progressDotElement && config.progressDotColor) progressDotElement.style.backgroundColor = config.progressDotColor;
    
    platformPillsContainer.innerHTML = '';
    if (config.platforms && config.platforms.length > 0) {
        config.platforms.forEach((platformName, index) => {
            const pill = document.createElement('span');
            pill.classList.add('platform-pill');
            if (index === config.currentPlatformIndex) {
                pill.classList.add('active');
                if (config.pillActiveBackgroundColor) pill.style.backgroundColor = config.pillActiveBackgroundColor;
                if (config.pillActiveFontColor) pill.style.color = config.pillActiveFontColor;
            } else {
                if (config.pillInactiveBackgroundColor) pill.style.backgroundColor = config.pillInactiveBackgroundColor;
                if (config.pillInactiveFontColor) pill.style.color = config.pillInactiveFontColor;
            }
            pill.textContent = platformName;
            platformPillsContainer.appendChild(pill);
        });
    }
}

function updateDisplay(data) {
  // titleMainElement (큰 글씨) 에는 episode를 표시
  titleMainElement.textContent = data.episode || '';   
  // titleSubElement (작은 글씨) 에는 series를 표시
  titleSubElement.textContent = data.series || '';  

  const currentSecondsNum = Math.floor(parseFloat(data.currentSeconds));
  const totalSecondsNum = Math.floor(parseFloat(data.durationSeconds));

  const showHours = totalSecondsNum >= 3600;

  currentTimeElement.textContent = formatTime(currentSecondsNum, showHours);
  totalTimeElement.textContent = formatTime(totalSecondsNum, showHours);

  let percentage = 0;
  if (!isNaN(currentSecondsNum) && !isNaN(totalSecondsNum) && totalSecondsNum > 0) {
    percentage = Math.min(100, Math.max(0, (currentSecondsNum / totalSecondsNum) * 100));
    progressBarElement.style.width = `${percentage}%`;
    progressDotElement.style.left = `${percentage}%`;
  } else {
    progressBarElement.style.width = '0%';
    progressDotElement.style.left = '0%';
  }
  document.getElementById('progress-percentage').textContent = `${Math.round(percentage)}%`;
}

function formatTime(totalSeconds, showHours) {
  // Ensure totalSeconds is an integer
  const s = Math.floor(Math.max(0, totalSeconds)); 

  if (isNaN(s)) return showHours ? "00:00:00" : "00:00";
  
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  const paddedHours = String(hours).padStart(2, '0');
  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(seconds).padStart(2, '0');

  return showHours || hours > 0 ? `${paddedHours}:${paddedMinutes}:${paddedSeconds}` : `${paddedMinutes}:${paddedSeconds}`;
}

// Ensure DOM is loaded before trying to connect or attach event listeners
document.addEventListener('DOMContentLoaded', () => {
    connect(); // 페이지 로드 시 연결 시작
}); 