// server.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const { getAsset, isSea } = require('node:sea'); // SEA 모듈 추가
const os = require('os'); // os 모듈 추가

const PORT = 3000; // 서버가 사용할 포트 번호

// --- 함수: 로컬 IP 주소 가져오기 (최상위 스코프로 이동) ---
function getLocalIPs() {
    const interfaces = os.networkInterfaces();
    const ips = [];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // IPv4 주소이고, 내부 루프백 주소가 아닌 경우만 선택
            if (iface.family === 'IPv4' && !iface.internal) {
                ips.push(iface.address);
            }
        }
    }
    return ips;
}
// --- End 함수 ---

// --- 설정 로드 ---
const DEFAULT_CONFIG = {
    port: 3000,
    currentPlatformIndex: 0,
    platforms: ["Netflix", "YouTube", "Twitch"],
    backgroundColor: "rgba(0,0,0,0.5)",
    fontSizeEpisode: 32, // Was fontSizeMain
    fontSizeSeries: 24,  // Was fontSizeSub
    fontColorEpisode: "rgba(255,255,255,1)", // Was fontColorMain
    fontColorSeries: "rgba(200,200,200,1)",  // Was fontColorSub
    fontColorTime: "rgba(255,255,255,1)",
    fontColorProgress: "rgba(255,255,255,1)",
    progressBarFilledColor: "rgba(0,123,255,1)",
    progressBarBackgroundColor: "rgba(255,255,255,0.3)",
    progressDotColor: "rgba(255,255,255,1)",
    pillActiveBackgroundColor: "rgba(0,123,255,0.5)",
    pillActiveFontColor: "rgba(255,255,255,1)",
    pillInactiveBackgroundColor: "rgba(108,117,125,0.2)",
    pillInactiveFontColor: "rgba(200,200,200,1)"
};

let currentConfig = { ...DEFAULT_CONFIG };

// SEA 환경에서는 __dirname이 process.execPath의 디렉터리가 됩니다.
// 일반 Node.js 환경에서는 스크립트 파일이 있는 디렉터리입니다.
const configPath = path.join(isSea() ? path.dirname(process.execPath) : path.join(__dirname, '../'), 'config.json');

// --- Server-side progress logging ---
let lastLoggedSeries = null;
let lastLoggedEpisode = null;

function formatTimeForServer(totalSecondsInput) {
    const totalSeconds = Number(totalSecondsInput);
    if (isNaN(totalSeconds) || totalSeconds < 0) return '--:--:--';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function logVideoProgressOnServer(currentData) {
    // --- 디버깅 로그 제거 ---
    // console.log("[Debug] logVideoProgressOnServer called with data:", JSON.stringify(currentData));
    // --- 디버깅 로그 끝 ---

    const currentSeries = currentData.series || null;
    const currentEpisode = currentData.episode || "";
    const currentTimeNum = parseFloat(currentData.currentSeconds);
    const durationNum = parseFloat(currentData.durationSeconds);

    const titlesChanged = currentSeries !== lastLoggedSeries || currentEpisode !== lastLoggedEpisode;

    if (titlesChanged) {
        if (lastLoggedSeries !== null || lastLoggedEpisode !== null) {
             process.stdout.write('\n');
        }
        let titleDisplay = "No Title";
        if (currentSeries && currentEpisode) {
            titleDisplay = `${currentSeries} - ${currentEpisode}`;
        } else if (currentEpisode) {
            titleDisplay = currentEpisode;
        } else if (currentSeries) {
            titleDisplay = currentSeries;
        }
        console.log(`🎬 Now Tracking: ${titleDisplay}`);
        lastLoggedSeries = currentSeries;
        lastLoggedEpisode = currentEpisode;
    }

    if (!isNaN(currentTimeNum) && !isNaN(durationNum) && durationNum > 0) {
        const barWidth = 20;
        const progressRatio = Math.min(1, Math.max(0, currentTimeNum / durationNum));
        const filledWidth = Math.round(barWidth * progressRatio);
        const emptyWidth = barWidth - filledWidth;
        
        const progressBar = '█'.repeat(filledWidth) + '─'.repeat(emptyWidth);
        const currentTimeFormatted = formatTimeForServer(currentTimeNum);
        const durationFormatted = formatTimeForServer(durationNum);
        const percent = Math.round(progressRatio * 100);

        process.stdout.write(`\r  [${progressBar}] ${currentTimeFormatted} / ${durationFormatted} (${percent}%) \x1b[K`);
    } else if (titlesChanged) {
        process.stdout.write(`\r  [No valid time data for current title] \x1b[K`);
    }
}
// --- End Server-side progress logging ---

function loadConfiguration() {
    // currentConfig.serverIPs = getLocalIPs(); // Moved to later stage
    try {
        if (fs.existsSync(configPath)) {
            const rawData = fs.readFileSync(configPath);
            const loadedConfig = JSON.parse(rawData);
            // Ensure all keys from DEFAULT_CONFIG are present, preferring loaded values
            currentConfig = { ...DEFAULT_CONFIG, ...loadedConfig }; 
            // Specifically handle new keys if old ones might exist in a user's config, though this basic merge handles new additions well.
            // For removed/renamed keys, the spread above means old keys might persist if not overwritten.
            // However, since we are renaming, we should ideally handle migration or accept that old named keys are ignored.
            // For this refactor, we assume new keys are used, and old ones (fontSizeMain etc.) from old config files will be ignored by client.
            console.log("Loaded configuration from config.json:", currentConfig);
        } else {
            console.warn(`config.json not found at ${configPath}. Using default settings and creating file if not in SEA.`);
            if (!isSea()) { 
                 fs.writeFileSync(configPath, JSON.stringify({ ...DEFAULT_CONFIG, serverIPs: undefined }, null, 2), 'utf8'); // serverIPs는 파일에 저장 안 함
                 console.log("Created default config.json (serverIPs excluded)");
            }
        }
    } catch (error) {
        console.warn("Config file not found or unreadable, using default config.");
        currentConfig = { ...DEFAULT_CONFIG };
        saveConfig(); // Save the default config if one doesn't exist
    }
    // Ensure serverIPs is set *after* currentConfig is established
    currentConfig.serverIPs = getLocalIPs();

    // 유효성 검사 (로드 후 최종 config 객체에 대해 수행)
    if (!currentConfig.platforms || !Array.isArray(currentConfig.platforms) || currentConfig.platforms.length === 0) {
        console.warn("Config 'platforms' is missing, not an array, or empty. Using default: [\"Default\"]");
        currentConfig.platforms = ["Default"];
        currentConfig.currentPlatformIndex = 0;
    }
    if (typeof currentConfig.currentPlatformIndex !== 'number' || currentConfig.currentPlatformIndex < 0 || currentConfig.currentPlatformIndex >= currentConfig.platforms.length) {
        console.warn(`Invalid currentPlatformIndex (${currentConfig.currentPlatformIndex}). Resetting to 0.`);
        currentConfig.currentPlatformIndex = 0;
    }
    if (typeof currentConfig.backgroundColor !== 'string') {
        currentConfig.backgroundColor = "rgba(0, 0, 0, 0.65)";
    }
    if (typeof currentConfig.fontSizeEpisode !== 'number') {
        currentConfig.fontSizeEpisode = 32;
    }
    if (typeof currentConfig.fontSizeSeries !== 'number') {
        currentConfig.fontSizeSeries = 24;
    }
    // 추가된 색상 설정 유효성 검사 (간단한 타입 체크)
    currentConfig.fontColorEpisode = typeof currentConfig.fontColorEpisode === 'string' ? currentConfig.fontColorEpisode : "rgba(255,255,255,1)";
    currentConfig.fontColorSeries = typeof currentConfig.fontColorSeries === 'string' ? currentConfig.fontColorSeries : "rgba(200,200,200,1)";
    currentConfig.fontColorTime = typeof currentConfig.fontColorTime === 'string' ? currentConfig.fontColorTime : "rgba(255,255,255,1)";
    currentConfig.fontColorProgress = typeof currentConfig.fontColorProgress === 'string' ? currentConfig.fontColorProgress : "rgba(255,255,255,1)";
    currentConfig.progressBarFilledColor = typeof currentConfig.progressBarFilledColor === 'string' ? currentConfig.progressBarFilledColor : "rgba(0,123,255,1)";
    currentConfig.progressBarBackgroundColor = typeof currentConfig.progressBarBackgroundColor === 'string' ? currentConfig.progressBarBackgroundColor : "rgba(255,255,255,0.3)";
    currentConfig.progressDotColor = typeof currentConfig.progressDotColor === 'string' ? currentConfig.progressDotColor : "rgba(255,255,255,1)";
    currentConfig.pillActiveBackgroundColor = typeof currentConfig.pillActiveBackgroundColor === 'string' ? currentConfig.pillActiveBackgroundColor : "rgba(0,123,255,0.5)";
    currentConfig.pillActiveFontColor = typeof currentConfig.pillActiveFontColor === 'string' ? currentConfig.pillActiveFontColor : "rgba(255,255,255,1)";
    currentConfig.pillInactiveBackgroundColor = typeof currentConfig.pillInactiveBackgroundColor === 'string' ? currentConfig.pillInactiveBackgroundColor : "rgba(108,117,125,0.2)";
    currentConfig.pillInactiveFontColor = typeof currentConfig.pillInactiveFontColor === 'string' ? currentConfig.pillInactiveFontColor : "rgba(200,200,200,1)";
}

function saveConfig() {
    try {
        // Ensure all keys that are in DEFAULT_CONFIG are saved.
        // This is important if new config options were added to DEFAULT_CONFIG
        // and aren't yet in currentConfig (e.g. if currentConfig was loaded from an older version)
        const configToSave = { ...DEFAULT_CONFIG };
        for (const key in currentConfig) {
            if (Object.prototype.hasOwnProperty.call(DEFAULT_CONFIG, key)) {
                 // Only save keys that are defined in DEFAULT_CONFIG to avoid saving obsolete keys
                configToSave[key] = currentConfig[key];
            }
        }
        fs.writeFileSync(configPath, JSON.stringify(configToSave, null, 2));
        console.log("Config saved.");
    } catch (error) {
        console.error("Error saving config.json:", error);
    }
}

loadConfiguration(); // 서버 시작 시 설정 로드

// 1. HTTP 서버 생성
const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/obs-display.html') {
        serveAsset('obs-display.html', 'text/html; charset=utf-8', res, path.join(__dirname, '../public/obs-display.html'));
    } else if (req.url === '/config') {
        serveAsset('config-page.html', 'text/html; charset=utf-8', res, path.join(__dirname, '../public/config-page.html'));
    } else if (req.url === '/css/obs-display.css') {
        serveAsset('css/obs-display.css', 'text/css; charset=utf-8', res, path.join(__dirname, '../public/css/obs-display.css'));
    } else if (req.url === '/js/obs-display.js') {
        serveAsset('js/obs-display.js', 'application/javascript; charset=utf-8', res, path.join(__dirname, '../public/js/obs-display.js'));
    } else if (req.url === '/css/config-page.css') {
        serveAsset('css/config-page.css', 'text/css; charset=utf-8', res, path.join(__dirname, '../public/css/config-page.css'));
    } else if (req.url === '/js/config-page.js') {
        serveAsset('js/config-page.js', 'application/javascript; charset=utf-8', res, path.join(__dirname, '../public/js/config-page.js'));
    } else if (req.url === '/api/config' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        // API 응답 시 최신 IP 정보 (config 객체에 이미 포함되어 있음) 전송
        res.end(JSON.stringify(currentConfig)); 
    } else if (req.url === '/api/config' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const newConfig = JSON.parse(body);
                const { serverIPs, ...restOfNewConfig } = newConfig; // serverIPs는 클라이언트에서 보내도 무시
                currentConfig = { ...currentConfig, ...restOfNewConfig, serverIPs: getLocalIPs() }; // IP는 항상 서버에서 최신으로
                
                // 유효성 검사 강화
                if (!currentConfig.platforms || !Array.isArray(currentConfig.platforms) || currentConfig.platforms.length === 0) currentConfig.platforms = ["Default"];
                currentConfig.currentPlatformIndex = Math.max(0, Math.min(Number(currentConfig.currentPlatformIndex) || 0, currentConfig.platforms.length - 1));
                currentConfig.backgroundColor = typeof currentConfig.backgroundColor === 'string' ? currentConfig.backgroundColor : "rgba(0,0,0,0.65)";
                currentConfig.fontSizeEpisode = typeof currentConfig.fontSizeEpisode === 'number' ? currentConfig.fontSizeEpisode : 32;
                currentConfig.fontSizeSeries = typeof currentConfig.fontSizeSeries === 'number' ? currentConfig.fontSizeSeries : 24;

                // POST 요청 시 신규 색상 설정 업데이트 및 유효성 검사
                currentConfig.fontColorEpisode = typeof restOfNewConfig.fontColorEpisode === 'string' ? restOfNewConfig.fontColorEpisode : currentConfig.fontColorEpisode;
                currentConfig.fontColorSeries = typeof restOfNewConfig.fontColorSeries === 'string' ? restOfNewConfig.fontColorSeries : currentConfig.fontColorSeries;
                currentConfig.fontColorTime = typeof restOfNewConfig.fontColorTime === 'string' ? restOfNewConfig.fontColorTime : currentConfig.fontColorTime;
                currentConfig.fontColorProgress = typeof restOfNewConfig.fontColorProgress === 'string' ? restOfNewConfig.fontColorProgress : currentConfig.fontColorProgress;
                currentConfig.progressBarFilledColor = typeof restOfNewConfig.progressBarFilledColor === 'string' ? restOfNewConfig.progressBarFilledColor : currentConfig.progressBarFilledColor;
                currentConfig.progressBarBackgroundColor = typeof restOfNewConfig.progressBarBackgroundColor === 'string' ? restOfNewConfig.progressBarBackgroundColor : currentConfig.progressBarBackgroundColor;
                currentConfig.progressDotColor = typeof restOfNewConfig.progressDotColor === 'string' ? restOfNewConfig.progressDotColor : currentConfig.progressDotColor;
                currentConfig.pillActiveBackgroundColor = typeof restOfNewConfig.pillActiveBackgroundColor === 'string' ? restOfNewConfig.pillActiveBackgroundColor : currentConfig.pillActiveBackgroundColor;
                currentConfig.pillActiveFontColor = typeof restOfNewConfig.pillActiveFontColor === 'string' ? restOfNewConfig.pillActiveFontColor : currentConfig.pillActiveFontColor;
                currentConfig.pillInactiveBackgroundColor = typeof restOfNewConfig.pillInactiveBackgroundColor === 'string' ? restOfNewConfig.pillInactiveBackgroundColor : currentConfig.pillInactiveBackgroundColor;
                currentConfig.pillInactiveFontColor = typeof restOfNewConfig.pillInactiveFontColor === 'string' ? restOfNewConfig.pillInactiveFontColor : currentConfig.pillInactiveFontColor;

                // serverIPs 필드를 제외하고 파일에 저장
                const { serverIPs: ipsToExclude, ...configToSave } = currentConfig;
                saveConfig();
            } catch (e) {
                console.error("Error parsing or processing new config:", e);
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ message: 'Invalid configuration data' }));
            }
        });
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

// 2. WebSocket 서버 생성 (실시간 데이터 통신용)
const wss = new WebSocket.Server({ server }); // 기졸 HTTP 서버에 연결

console.log(`OBS Bridge Server listening on http://localhost:${PORT}`);
if (currentConfig.serverIPs.length > 0) {
    console.log(`Other available IP addresses for remote access (PC 2 OBS Source):`);
    currentConfig.serverIPs.forEach(ip => {
        // 127.0.0.1은 localhost와 동일하므로 보통 외부 접속에는 사용 안 함
        // 필요시 if (ip !== '127.0.0.1') 조건을 추가할 수 있음
        console.log(`  http://${ip}:${PORT} (for config page)`);
        console.log(`  ws://${ip}:${PORT} (for OBS browser source if on different PC)`);
    });
}
console.log(`Config page available at http://localhost:${PORT}/config (for local access)`);
console.log(`WebSocket Server ready.`);
console.log('서버를 종료하려면 이 창에서 Ctrl+C를 누르거나 창을 닫으세요.'); // 종료 안내 메시지 추가

// 연결된 클라이언트(OBS 브라우저 소스) 목록 관리
const clients = new Set();
const connectedIPs = new Set(); // 연결된 클라이언트의 IP 주소들을 추적 (로깅용)
let lastKnownVideoData = { series: null, episode: '대기중...', currentSeconds: 0, durationSeconds: 0, source: null }; // 키 변경 및 초기값 조정

wss.on('connection', (ws, req) => { // req 추가하여 클라이언트 IP 로깅 가능
    const clientIp = req.socket.remoteAddress;
    
    if (!connectedIPs.has(clientIp)) {
        console.log(`OBS Client first connected from ${clientIp}`);
        connectedIPs.add(clientIp);
    } // 이미 연결된 IP의 경우 재연결 로그는 생략
    
    clients.add(ws);
    // 각 WebSocket 연결에 IP 주소 저장 (연결 종료 시 IP를 알기 위함)
    ws.clientIpAddress = clientIp; 

    // 연결 시 마지막 데이터 + 설정 즉시 전송
    ws.send(JSON.stringify({ 
        type: 'VIDEO_UPDATE', 
        data: lastKnownVideoData, // series, episode 포함 데이터
        config: currentConfig
    }));

    // 클라이언트로부터 메시지 수신 (주로 확장 프로그램에서 보낼 것)
    ws.on('message', (message) => {
        try {
            const parsedMessage = JSON.parse(message);
            // 확장 프로그램에서 보낸 데이터인지 확인 (간단한 방식)
            if (parsedMessage.type === 'FROM_EXTENSION' && parsedMessage.data) {
                 // logVideoProgressOnServer는 이제 data.series, data.episode를 기대함
                 logVideoProgressOnServer(parsedMessage.data); 
                 lastKnownVideoData = parsedMessage.data; // 마지막 데이터 업데이트 (series, episode 포함)
                 // 연결된 모든 OBS 클라이언트에게 데이터 + 설정 브로드캐스트
                 broadcast(JSON.stringify({ 
                     type: 'VIDEO_UPDATE', 
                     data: lastKnownVideoData, // series, episode 포함 데이터
                     config: currentConfig
                 }));
            } else {
                // console.log('Received other message:', parsedMessage);
            }
        } catch (e) {
            console.error('Failed to parse message or invalid message format:', message, e);
        }
    });

    // 클라이언트 연결 종료 시
    ws.on('close', () => {
        const closedClientIp = ws.clientIpAddress; // 연결 객체에 저장된 IP 사용
        console.log(`\nOBS Client disconnected from ${closedClientIp}`); // Ensure newline after progress bar
        clients.delete(ws);

        // 해당 IP를 사용하는 다른 활성 연결이 있는지 확인
        let ipStillActive = false;
        for (const client of clients) {
            if (client.clientIpAddress === closedClientIp) {
                ipStillActive = true;
                break;
            }
        }
        if (!ipStillActive) {
            connectedIPs.delete(closedClientIp); // 이 IP를 사용하는 활성 연결이 없으면 Set에서 제거
            // console.log(`IP ${closedClientIp} is no longer active.`);
        }
    });

    // 에러 처리
    ws.on('error', (error) => {
        const errorClientIp = ws.clientIpAddress || 'unknown IP';
        console.error(`\nWebSocket error from ${errorClientIp}:`, error); // Ensure newline after progress bar
        // clients.delete(ws)는 on('close')에서 처리됨 (에러 발생 시 보통 close도 발생)
    });
});

// 모든 연결된 클라이언트에게 메시지 보내는 함수
function broadcast(messageString) { // 인자를 문자열로 받음
    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(messageString);
        }
    });
}

function serveAsset(assetKey, contentType, res, fallbackPath) {
    try {
        const content = getAsset(assetKey, 'utf8');
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    } catch (e) {
        if (!isSea() || e.code === 'ERR_SEA_ASSET_NOT_FOUND') {
            console.warn(`Asset '${assetKey}' not found via SEA or not in SEA environment. Trying fs.readFile from ${fallbackPath}...`);
            fs.readFile(fallbackPath, (err, data) => {
                if (err) {
                    res.writeHead(500);
                    res.end(`Error loading ${assetKey}`);
                    console.error(`Failed to load ${assetKey} via fs.readFile:`, err);
                    return;
                }
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(data);
            });
        } else {
            res.writeHead(500);
            res.end(`Error loading ${assetKey} from SEA asset.`);
            console.error(`Failed to get asset '${assetKey}' from SEA:`, e);
        }
    }
}

// HTTP 서버 시작
server.listen(PORT, () => {
    // 서버 시작 콜백에서 IP 로깅 (config 객체가 loadConfiguration 후 사용 가능하므로)
    // loadConfiguration()이 server.listen보다 먼저 호출되므로, config.serverIPs는 여기서 이미 설정됨
    // 콘솔 로그는 위에서 이미 처리함
});

// --- 확장 프로그램에서 데이터 받는 별도 채널 (선택적: POST 요청) ---
// 만약 확장 프로그램이 WebSocket 대신 HTTP POST로 데이터를 보내는 것을 선호한다면,
// '/update' 같은 경로를 추가하고 요청 본문을 파싱하여 broadcast()를 호출할 수 있습니다.
// 예: http.createServer 안에서 req.url === '/update' && req.method === 'POST' 처리 
