// obs-timer-server/public/js/config-page.js
const configFormElements = {
    backgroundColor: document.getElementById('backgroundColor'),
    fontSizeEpisode: document.getElementById('fontSizeEpisode'),
    fontSizeSeries: document.getElementById('fontSizeSeries'),
    fontColorEpisode: document.getElementById('fontColorEpisode'),
    fontColorSeries: document.getElementById('fontColorSeries'),
    fontColorTime: document.getElementById('fontColorTime'),
    fontColorProgress: document.getElementById('fontColorProgress'),
    progressBarFilledColor: document.getElementById('progressBarFilledColor'),
    progressBarBackgroundColor: document.getElementById('progressBarBackgroundColor'),
    progressDotColor: document.getElementById('progressDotColor'),
    pillActiveBackgroundColor: document.getElementById('pillActiveBackgroundColor'),
    pillActiveFontColor: document.getElementById('pillActiveFontColor'),
    pillInactiveBackgroundColor: document.getElementById('pillInactiveBackgroundColor'),
    pillInactiveFontColor: document.getElementById('pillInactiveFontColor'),
};

// Platform UI Elements
const platformListDiv = document.getElementById('platform-list');
const newPlatformInput = document.getElementById('new-platform-name');
const addPlatformBtn = document.getElementById('add-platform-btn');

// Server Info Toggle Elements
const serverInfoHeader = document.getElementById('server-info-header');
const serverInfoContent = document.getElementById('server-info-content');

let currentPlatforms = [];
let currentPlatformIndex = 0;

const previewElements = {
    overlay: document.getElementById('preview-video-overlay'),
    titleEpisode: document.getElementById('preview-title-episode'),
    titleSeries: document.getElementById('preview-title-series'),
    progressBarContainer: document.getElementById('preview-progress-bar-container'),
    progressBar: document.getElementById('preview-progress-bar'),
    progressDot: document.getElementById('preview-progress-dot'),
    currentTime: document.getElementById('preview-current-time'),
    totalTime: document.getElementById('preview-total-time'),
    progressPercentage: document.getElementById('preview-progress-percentage'),
    platformPills: Array.from(document.querySelectorAll('.preview-platform-pill')), // NodeList to Array
    activePill: document.querySelector('.preview-platform-pill.active'),
    inactivePill: document.querySelector('.preview-platform-pill:not(.active)')
};

const statusMessage = document.getElementById('status-message');
const serverIpsDiv = document.getElementById('server-ips');

// --- Utility Functions for Color Conversion ---
function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
}

function rgbToHex(r, g, b) {
    const componentToHex = (c) => {
        const hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    };
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function rgbaToHexAlpha(rgbaString) {
    if (!rgbaString || typeof rgbaString !== 'string') return { hex: '#000000', alpha: 1 }; 
    if (rgbaString.startsWith('#')) return { hex: rgbaString, alpha: 1}; // Already HEX

    const match = rgbaString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d\.]+))?\)/);
    if (!match) return { hex: '#000000', alpha: 1 };

    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    const alpha = match[4] !== undefined ? parseFloat(match[4]) : 1;

    return { hex: rgbToHex(r, g, b), alpha: alpha };
}

function hexAlphaToRgba(hex, alpha) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
}
// --- End Utility Functions ---

function renderPlatformList() {
    platformListDiv.innerHTML = '';
    currentPlatforms.forEach((platform, index) => {
        const platformDiv = document.createElement('div');
        platformDiv.classList.add('platform-item');
        if (index === currentPlatformIndex) {
            platformDiv.classList.add('selected');
        }
        platformDiv.dataset.index = index;
        platformDiv.onclick = () => selectPlatform(index);

        const platformSpan = document.createElement('span');
        platformSpan.textContent = platform;

        const deleteButton = document.createElement('button');
        deleteButton.textContent = '×'; // Use multiplication sign for delete
        deleteButton.classList.add('delete-platform-btn');
        deleteButton.onclick = (event) => {
            event.stopPropagation(); // Prevent platform selection when deleting
            deletePlatform(index);
        };

        platformDiv.appendChild(platformSpan);
        platformDiv.appendChild(deleteButton);
        platformListDiv.appendChild(platformDiv);
    });
    // Update preview pills based on the new list
    applyCurrentConfigToPreview(); 
}

function selectPlatform(index) {
    currentPlatformIndex = index;
    renderPlatformList(); // Re-render to update selection visually
}

function addPlatform() {
    const newPlatformName = newPlatformInput.value.trim();
    if (newPlatformName && !currentPlatforms.includes(newPlatformName)) {
        currentPlatforms.push(newPlatformName);
        newPlatformInput.value = '';
        // If this is the first platform added, select it
        if (currentPlatforms.length === 1) {
            currentPlatformIndex = 0;
        }
        renderPlatformList();
    } else if (!newPlatformName) {
        showStatus('플랫폼 이름을 입력하세요.', true);
    } else {
        showStatus('이미 존재하는 플랫폼 이름입니다.', true);
    }
}

function deletePlatform(indexToDelete) {
    if (currentPlatforms.length <= 1) {
        showStatus("최소 하나 이상의 플랫폼이 필요합니다.", true);
        return;
    }
    currentPlatforms.splice(indexToDelete, 1);
    // Adjust selected index if necessary
    if (currentPlatformIndex === indexToDelete) {
        currentPlatformIndex = 0; // Select first one if deleted the selected one
    } else if (currentPlatformIndex > indexToDelete) {
        currentPlatformIndex--; // Adjust index if deleted before the selected one
    }
    renderPlatformList();
}

function applyCurrentConfigToPreview() {
    const config = getCurrentConfigFromForm();
    
    // Apply styles using the RGBA strings directly
    previewElements.overlay.style.backgroundColor = config.backgroundColor;
    previewElements.titleEpisode.style.fontSize = config.fontSizeEpisode + 'pt';
    previewElements.titleEpisode.style.color = config.fontColorEpisode;
    previewElements.titleSeries.style.fontSize = config.fontSizeSeries + 'pt';
    previewElements.titleSeries.style.color = config.fontColorSeries;
    previewElements.progressBar.style.backgroundColor = config.progressBarFilledColor;
    previewElements.progressBarContainer.style.backgroundColor = config.progressBarBackgroundColor;
    previewElements.progressDot.style.backgroundColor = config.progressDotColor;
    previewElements.currentTime.style.color = config.fontColorTime;
    previewElements.totalTime.style.color = config.fontColorTime;
    previewElements.progressPercentage.style.color = config.fontColorProgress;

    // Update platform pills preview
    const platformNames = currentPlatforms.length > 0 ? currentPlatforms : ["(플랫폼 없음)"];
    const pillsContainer = document.getElementById('preview-platform-pills-container');
    pillsContainer.innerHTML = ''; 
    platformNames.slice(0, 3).forEach((name, index) => { 
        const pill = document.createElement('span');
        pill.classList.add('preview-platform-pill');
        pill.textContent = name;
        if (index === currentPlatformIndex) { 
            pill.classList.add('active');
            pill.style.backgroundColor = config.pillActiveBackgroundColor; 
            pill.style.color = config.pillActiveFontColor;
        } else { 
            pill.style.backgroundColor = config.pillInactiveBackgroundColor;
            pill.style.color = config.pillInactiveFontColor;
        }
        pillsContainer.appendChild(pill);
    });
}

function getCurrentConfigFromForm() {
    const config = {};
    // Read non-color style settings
    config.fontSizeEpisode = parseInt(configFormElements.fontSizeEpisode.value, 10) || 0;
    config.fontSizeSeries = parseInt(configFormElements.fontSizeSeries.value, 10) || 0;
    
    // Read color settings from Coloris inputs (will be RGBA strings)
    for (const key in configFormElements) {
        const element = configFormElements[key];
        if (element && element.hasAttribute('data-coloris')) {
            config[key] = element.value; // Directly get RGBA string from Coloris input
        } else if (element && (key === 'fontSizeEpisode' || key === 'fontSizeSeries')) {
            // Already handled above, skip to prevent re-parsing as NaN or default
        }
    }

    // Add platform data
    config.platforms = [...currentPlatforms];
    config.currentPlatformIndex = currentPlatformIndex;

    if (config.platforms.length > 0) {
        config.currentPlatformIndex = Math.max(0, Math.min(config.currentPlatformIndex, config.platforms.length - 1));
    } else {
        config.currentPlatformIndex = 0;
    }
    return config;
}

async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        if (!response.ok) throw new Error('Failed to fetch config');
        const loadedConfig = await response.json();

        currentPlatforms = loadedConfig.platforms || ["Default"]; 
        currentPlatformIndex = loadedConfig.currentPlatformIndex || 0;
        renderPlatformList(); 

        // Load basic style settings
        configFormElements.fontSizeEpisode.value = loadedConfig.fontSizeEpisode;
        configFormElements.fontSizeSeries.value = loadedConfig.fontSizeSeries;

        // Load color settings (set RGBA string to Coloris inputs)
        for (const key in configFormElements) {
             const element = configFormElements[key];
             if (element && element.hasAttribute('data-coloris') && loadedConfig[key]) {
                element.value = loadedConfig[key]; // Set RGBA string
                // Trigger an input event for Coloris to pick up the change and update its swatch
                element.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }

        if (serverIpsDiv) {
            if (loadedConfig.serverIPs && loadedConfig.serverIPs.length > 0) {
                serverIpsDiv.innerHTML = loadedConfig.serverIPs.map(ip => `<code>${ip}</code>`).join('<br>');
            } else {
                serverIpsDiv.textContent = '사용 가능한 IP 주소가 없습니다.';
            }
        }
        applyCurrentConfigToPreview(); 
    } catch (error) {
        console.error('Error loading config:', error);
        if (serverIpsDiv) serverIpsDiv.textContent = '서버 정보를 불러오는 데 실패했습니다.';
        showStatus('설정 로드 실패: ' + error.message, true);
    }

    // Initialize Coloris
    Coloris({
        el: '[data-coloris]',
        themeMode: 'light', // 'light' or 'dark'
        alpha: true,
        format: 'mixed',
        swatchesOnly: false,
        swatches: [
            '#264653', '#2a9d8f', '#e9c46a', 'rgb(244,162,97)', 'rgba(231,111,81,0.8)',
            '#D90429', '#EF233C', '#EDF2F4', '#8D99AE', '#2B2D42'
        ],
        // Optional: Set a specific instance if needed for more control, but el targets all.
        // onChange: (color) => { /* This is another way but direct event listener is also fine */ }
    });
}

async function saveConfig() {
    const configToSave = getCurrentConfigFromForm();
    try {
        const response = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(configToSave)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Failed to save config');
        showStatus('설정이 성공적으로 저장되었습니다.', false);
    } catch (error) {
        console.error('Error saving config:', error);
        showStatus('설정 저장 실패: ' + error.message, true);
    }
}

function showStatus(message, isError) {
    if (!statusMessage) return;
    statusMessage.textContent = message;
    statusMessage.className = isError ? 'error' : 'success';
    statusMessage.style.display = 'block';
    setTimeout(() => { statusMessage.style.display = 'none'; }, 5000);
}

// --- Event Listeners --- 
document.addEventListener('DOMContentLoaded', () => {
    // Save Button
    document.getElementById('saveButton').addEventListener('click', saveConfig);
    
    // Platform Add
    addPlatformBtn.addEventListener('click', addPlatform);
    newPlatformInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); 
            addPlatform();
        }
    });
    
    // Server Info Toggle
    if(serverInfoHeader && serverInfoContent) {
        serverInfoHeader.addEventListener('click', () => {
            const isHidden = serverInfoContent.style.display === 'none';
            serverInfoContent.style.display = isHidden ? 'block' : 'none';
            serverInfoHeader.textContent = isHidden ? '서버 정보 (클릭하여 숨기기) ▲' : '서버 정보 (클릭하여 보기/숨기기) ▼';
        });
    }
    
    // Live Preview for Style Settings
    for (const key in configFormElements) {
        if (configFormElements[key]) { 
            if (configFormElements[key].hasAttribute('data-coloris')) {
                // For Coloris fields, listen to the 'input' event, which Coloris dispatches when a new color is selected.
                configFormElements[key].addEventListener('input', (event) => {
                    console.log(`Coloris input event for ${key}:`, event.target.value);
                    applyCurrentConfigToPreview();
                });
            } else {
                // For other fields (like font size), the 'input' event is fine
                configFormElements[key].addEventListener('input', () => {
                    applyCurrentConfigToPreview();
                });
            }
        }
    }
    loadConfig(); // Initial load
}); 