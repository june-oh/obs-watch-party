# Watch Party OBS Timer (한국어)

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![GitHub last commit](https://img.shields.io/github/last-commit/june.oh/watch-party-obs-timer)](https://github.com/june.oh/watch-party-obs-timer/commits/main)
[![GitHub issues](https://img.shields.io/github/issues/june.oh/watch-party-obs-timer)](https://github.com/june.oh/watch-party-obs-timer/issues)
[![GitHub stars](https://img.shields.io/github/stars/june.oh/watch-party-obs-timer?style=social)](https://github.com/june.oh/watch-party-obs-timer/stargazers)
<!-- [![GitHub release (latest by date)](https://img.shields.io/github/v/release/june.oh/watch-party-obs-timer)](https://github.com/june.oh/watch-party-obs-timer/releases/latest) -->
<!-- [![Build Status](https://github.com/june.oh/watch-party-obs-timer/actions/workflows/main.yml/badge.svg)](https://github.com/june.oh/watch-party-obs-timer/actions/workflows/main.yml) -->

[View English Version](./README.md)

이 프로젝트는 스트리밍 서비스(초기에는 Laftel을 지원하며, 향후 확장 계획이 있습니다)의 비디오 재생 정보(제목, 부제목, 현재 시간, 총 재생 시간)를 OBS Studio에 직접 표시하여, 동기화된 단체 시청(watch party) 경험을 향상시키거나 개인 스트리밍 중 현재 시청 중인 콘텐츠를 실시간으로 보여주는 데 이상적입니다.

두 가지 주요 구성 요소로 이루어져 있습니다:

1.  **크롬 확장 프로그램 (`my-timer-extension/`)**: 스트리밍 서비스의 웹 플레이어에서 재생 정보를 추출합니다.
    *   [확장 프로그램 상세 README (영문)](./my-timer-extension/README.md)
2.  **Node.js 서버 (`obs_timer_server/`)**: 확장 프로그램으로부터 데이터를 수신하고, OBS에 타이머 및 비디오 상세 정보를 표시하기 위한 사용자 설정 가능한 HTML 오버레이를 제공합니다.
    *   [서버 상세 README (영문)](./obs_timer_server/README.md)

## 주요 기능

*   OBS에서 비디오 제목, 부제목, 현재 재생 시간, 총 재생 시간 실시간 표시.
*   브라우저 확장 프로그램과 로컬 Node.js 서버 간 웹소켓을 통한 원활한 통신.
*   서버에서 제공하는 웹 인터페이스를 통해 OBS 오버레이 표시 옵션(예: 색상, 글꼴 크기) 설정 가능.
*   원컴 및 투컴 스트리밍 환경 모두에서 쉽게 설정 가능하도록 설계.
*   초기 Laftel 지원, 향후 더 많은 플랫폼을 지원하는 것을 목표로 유연하게 설계.

## 기술 스택

*   **크롬 확장 프로그램**: JavaScript, HTML, CSS, Chrome Extension API, WebSockets
*   **Node.js 서버**: Node.js, Express.js (또는 네이티브 http 모듈), WebSocket (예: `ws` 라이브러리)
*   **OBS 표시 화면**: HTML, CSS, JavaScript (클라이언트 측 WebSocket)

## 스크린샷

*(확장 프로그램 작동 모습과 OBS 오버레이 스크린샷이 곧 추가될 예정입니다!)*

## 설치 및 사용법

이 프로젝트를 사용하는 두 가지 주요 방법이 있습니다:

### 1. 일반 사용자 (대부분의 사용자에게 권장)

코드 수정 없이 단순히 워치 파티나 스트리밍에 타이머를 사용하고 싶다면:

*   **서버 애플리케이션**:
    *   미리 빌드된 서버 실행 파일(`obs_timer_server.exe` - Windows용, 다른 OS 버전은 릴리즈 섹션에 제공될 수 있음)을 다운로드합니다.
    *   실행 파일을 실행합니다. Node.js를 별도로 설치할 필요가 없습니다.
    *   자세한 내용은 [서버 README의 "패키징 (실행 파일)" 섹션 (영문)](./obs_timer_server/README.md#packaging-executable)을 참고하세요 (릴리즈가 준비되는 대로).
*   **크롬 확장 프로그램**:
    *   크롬 확장 프로그램을 설치합니다. `.crx` 파일 형태로 제공되거나, `my-timer-extension` 디렉토리에서 압축 해제된 확장 프로그램을 로드하여 사용할 수 있습니다.
    *   [확장 프로그램 README의 "설치 및 사용법" 섹션 (영문)](./my-timer-extension/README.md#setup-and-usage)을 따릅니다.
*   **OBS 설정**: 서버 표시 페이지(예: 서버와 동일한 PC에서 실행 중인 경우 `http://localhost:3000`)를 OBS Studio의 브라우저 소스로 추가합니다.

*(참고: 미리 빌드된 실행 파일 및 확장 프로그램 패키지는 준비가 완료되는 대로 이 저장소의 "Releases" 섹션에 제공될 예정입니다.)*

### 2. 개발자 (또는 소스 코드에서 직접 실행하고 싶은 경우)

코드를 수정하거나, 기여하거나, Node.js를 사용하여 서버를 직접 실행하고 싶다면:

*   **사전 준비물**:
    *   Node.js (`obs_timer_server/README.md`에 명시된 버전)
    *   Git (저장소 복제용)
*   **설정**:
    1.  이 저장소를 복제합니다: `git clone https://github.com/june.oh/watch-party-obs-timer.git`
    2.  `obs_timer_server` 디렉토리로 이동하여 의존성을 설치합니다: `cd obs_timer_server && npm install`
    3.  [서버 README (영문)](./obs_timer_server/README.md#setup-and-usage)의 서버 설정 안내를 따릅니다.
    4.  확장 프로그램의 경우, [확장 프로그램 README (영문)](./my-timer-extension/README.md#setup-and-usage)에 설명된 대로 `my-timer-extension` 디렉토리에서 압축 해제된 확장 프로그램으로 로드합니다.
*   **실행**:
    *   Node.js 서버를 시작합니다: `cd obs_timer_server && node src/server.js` (또는 해당 README에 명시된 대로).
    *   브라우저에서 크롬 확장 프로그램이 활성화되어 있는지 확인합니다.
*   **빌드 (선택 사항)**: 서버 코드를 변경하고 실행 파일을 만들고 싶다면, [서버 README (영문)](./obs_timer_server/README.md#packaging-executable)의 빌드 안내를 따릅니다.

## 향후 계획

*   추가 스트리밍 플랫폼 지원 (예: Netflix, YouTube, Disney+).
*   OBS 오버레이를 위한 향상된 사용자 정의 옵션.
*   확장 프로그램을 위한 더 사용자 친화적인 설정 관리 (예: 옵션 페이지를 통해).
*   다른 언어 지원 (현지화).

## 기여하기

기여를 환영합니다! 새로운 기능, 개선 사항 또는 버그 수정에 대한 아이디어가 있다면 언제든지 다음을 수행해 주세요:

1.  아이디어를 논의하기 위해 이슈를 개설합니다.
2.  저장소를 포크하고 변경 사항에 대한 풀 리퀘스트를 제출합니다.

기존 코딩 스타일을 따르고 변경 사항이 잘 테스트되었는지 확인해 주시기 바랍니다.

## 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다 - 자세한 내용은 [LICENSE](./LICENSE) 파일을 참고하세요. 