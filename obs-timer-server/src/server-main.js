// server.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const { getAsset, isSea } = require('node:sea'); // SEA 모듈 추가
const os = require('os'); // os 모듈 추가

const PORT = 3000; // 서버가 사용할 포트 번호

// --- 설정 로드 ---
let config = {
    platforms: ["Default"],
    currentPlatformIndex: 0,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    // 폰트 크기 기본값 추가 (config-page.html과 동기화)
    fontSizeMain: 22, 
    fontSizeSub: 14,
    serverIPs: [] // 서버 IP 주소들을 저장할 배열 초기화
};
// SEA 환경에서는 __dirname이 process.execPath의 디렉터리가 됩니다.
// 일반 Node.js 환경에서는 스크립트 파일이 있는 디렉터리입니다.
const configPath = path.join(isSea() ? path.dirname(process.execPath) : path.join(__dirname, '../'), 'config.json');

// 함수: 로컬 IP 주소 가져오기
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

function loadConfiguration() {
    config.serverIPs = getLocalIPs(); // 설정 로드 전/후에 IP 주소 먼저 가져오기
    try {
        if (fs.existsSync(configPath)) {
            const rawConfig = fs.readFileSync(configPath, 'utf8');
            const loadedConfig = JSON.parse(rawConfig);
            // 로드된 설정과 기본 설정을 병합 (serverIPs는 항상 최신으로 유지)
            config = { ...config, ...loadedConfig, serverIPs: config.serverIPs }; 
            console.log("Loaded configuration from config.json:", config);
        } else {
            console.warn(`config.json not found at ${configPath}. Using default settings and creating file if not in SEA.`);
            if (!isSea()) { 
                 fs.writeFileSync(configPath, JSON.stringify({ ...config, serverIPs: undefined }, null, 2), 'utf8'); // serverIPs는 파일에 저장 안 함
                 console.log("Created default config.json (serverIPs excluded)");
            }
        }
    } catch (err) {
        console.error("Error loading or parsing config.json. Using default settings.", err);
    }
    // 유효성 검사 (로드 후 최종 config 객체에 대해 수행)
    if (!config.platforms || !Array.isArray(config.platforms) || config.platforms.length === 0) {
        console.warn("Config 'platforms' is missing, not an array, or empty. Using default: [\"Default\"]");
        config.platforms = ["Default"];
        config.currentPlatformIndex = 0;
    }
    if (typeof config.currentPlatformIndex !== 'number' || config.currentPlatformIndex < 0 || config.currentPlatformIndex >= config.platforms.length) {
        console.warn(`Invalid currentPlatformIndex (${config.currentPlatformIndex}). Resetting to 0.`);
        config.currentPlatformIndex = 0;
    }
    if (typeof config.backgroundColor !== 'string') {
        config.backgroundColor = "rgba(0, 0, 0, 0.65)";
    }
    if (typeof config.fontSizeMain !== 'number') {
        config.fontSizeMain = 22;
    }
    if (typeof config.fontSizeSub !== 'number') {
        config.fontSizeSub = 14;
    }
}

loadConfiguration(); // 서버 시작 시 설정 로드

// 1. HTTP 서버 생성
const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/obs-display.html') {
        serveAsset('obs-display.html', 'text/html; charset=utf-8', res, path.join(__dirname, '../public/obs-display.html'));
    } else if (req.url === '/config') {
        serveAsset('config-page.html', 'text/html; charset=utf-8', res, path.join(__dirname, '../public/config-page.html'));
    } else if (req.url === '/api/config' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        // API 응답 시 최신 IP 정보 (config 객체에 이미 포함되어 있음) 전송
        res.end(JSON.stringify(config)); 
    } else if (req.url === '/api/config' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const newConfig = JSON.parse(body);
                const { serverIPs, ...restOfNewConfig } = newConfig; // serverIPs는 클라이언트에서 보내도 무시
                config = { ...config, ...restOfNewConfig, serverIPs: getLocalIPs() }; // IP는 항상 서버에서 최신으로
                
                // 유효성 검사 강화
                if (!config.platforms || !Array.isArray(config.platforms) || config.platforms.length === 0) config.platforms = ["Default"];
                config.currentPlatformIndex = Math.max(0, Math.min(Number(config.currentPlatformIndex) || 0, config.platforms.length - 1));
                config.backgroundColor = typeof config.backgroundColor === 'string' ? config.backgroundColor : "rgba(0,0,0,0.65)";
                config.fontSizeMain = typeof config.fontSizeMain === 'number' ? config.fontSizeMain : 22;
                config.fontSizeSub = typeof config.fontSizeSub === 'number' ? config.fontSizeSub : 14;

                // serverIPs 필드를 제외하고 파일에 저장
                const { serverIPs: ipsToExclude, ...configToSave } = config;
                fs.writeFile(configPath, JSON.stringify(configToSave, null, 2), 'utf8', (err) => {
                    if (err) {
                        console.error("Error writing config.json:", err);
                        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ message: 'Error saving configuration' }));
                        return;
                    }
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ message: 'Configuration saved successfully', config: config }));
                    broadcast(JSON.stringify({ type: 'CONFIG_UPDATED', config: config }));
                });
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
if (config.serverIPs.length > 0) {
    console.log(`Other available IP addresses for remote access (PC 2 OBS Source):`);
    config.serverIPs.forEach(ip => {
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
let lastKnownVideoData = { main: '대기중...', sub: '대기중...', current: '--:--', duration: '--:--' }; // 마지막 데이터 저장

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
        data: lastKnownVideoData, 
        config: config
    }));

    // 클라이언트로부터 메시지 수신 (주로 확장 프로그램에서 보낼 것)
    ws.on('message', (message) => {
        try {
            const parsedMessage = JSON.parse(message);
            // 확장 프로그램에서 보낸 데이터인지 확인 (간단한 방식)
            if (parsedMessage.type === 'FROM_EXTENSION' && parsedMessage.data) {
                 console.log('Received data from extension:', parsedMessage.data);
                 lastKnownVideoData = parsedMessage.data; // 마지막 데이터 업데이트
                 // 연결된 모든 OBS 클라이언트에게 데이터 + 설정 브로드캐스트
                 broadcast(JSON.stringify({ 
                     type: 'VIDEO_UPDATE', 
                     data: lastKnownVideoData, 
                     config: config
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
        console.log(`OBS Client disconnected from ${closedClientIp}`);
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
        console.error(`WebSocket error from ${errorClientIp}:`, error);
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
