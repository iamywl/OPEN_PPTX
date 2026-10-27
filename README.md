# OPEN_PPTX — DeckCraft Presentation Studio for VS Code

<p align="center">
  <img src="assets/icon.png" width="120" height="120" alt="DeckCraft Logo">
</p>

<p align="center">
  <b>VS Code 안에서 PowerPoint (.pptx) 및 DeckCraft 프레젠테이션을 열고, 글래스모피즘 UI로 감상 및 편집하고, PDF/Markdown으로 내보내는 올인원 스튜디오</b>
</p>

<p align="center">
  <img alt="Platform: macOS · Windows · Linux" src="https://img.shields.io/badge/Platforms-macOS%20%C2%B7%20Windows%20%C2%B7%20Linux-blue?style=flat-square">
  <img alt="Engine: Rust" src="https://img.shields.io/badge/Engine-Rust%20(DeckCraft)-orange?style=flat-square">
  <img alt="UI: Glassmorphism" src="https://img.shields.io/badge/UI-Liquid%20Glassmorphism-purple?style=flat-square">
  <img alt="QA: 100% Passed" src="https://img.shields.io/badge/QA%20Verification-100%25%20Passed-brightgreen?style=flat-square">
  <img alt="License: MIT / Apache-2.0" src="https://img.shields.io/badge/License-MIT%20OR%20Apache--2.0-yellow?style=flat-square">
</p>

---

## 📸 프로젝트 스크린샷 갤러리 (Project Screenshots)

> DeckCraft의 강력한 Rust 렌더링 엔진과 유려한 글래스모피즘(Glassmorphism) UI를 통해 VS Code 내에서 프레젠테이션을 직관적으로 확인할 수 있습니다.

### 1. 프레젠테이션 에디터 & 캔버스 (Editor View)
![DeckCraft Editor](assets/images/editor.png)
*슬라이드 썸네일 스트립, 섹션 구조, 텍스트 및 다이어그램 렌더링*

---

### 2. 다크 모드 & 네이티브 차트 (Dark Mode & Native Charts)
![Dark Mode View](assets/images/dark-mode.png)
*시각적으로 편안한 다크 모드와 고품질 네이티브 차트 렌더링*

---

### 3. 슬라이드 분류기 & 화면 전환 효과 (Slide Sorter & Transitions)
![Slide Sorter](assets/images/slide-sorter.png)
*각 슬라이드별 화면 전환 효과(Fade, Push, Wipe, Morph 등)와 전체 구조를 한눈에 조망*

---

### 4. 서식 및 도형 세부 패널 (Shape Format & Format Pane)
| 도형 서식 탭 (Shape Format) | 세부 그라디언트/채우기 패널 (Format Pane) |
|---|---|
| ![Shape Format](assets/images/shape-format.png) | ![Format Pane](assets/images/format-pane.png) |

---

### 5. 빌트인 샘플 덱 렌더링 결과 (Sample Deck Render)
![Sample Deck](assets/images/sample-deck.png)
*`samples/sample.pptx`의 8개 슬라이드 렌더링 결과물 (Northern Lights)*

---

## ✨ 핵심 기능 (Key Features)

1. 🖥️ **VS Code Custom Editor 지원**:
   - `.pptx`, `.deckcraft`, `.ppt` 파일을 클릭만 하면 VS Code 내부에서 즉시 프리뷰 및 스튜디오가 실행됩니다.
2. 💎 **초현대적 글래스모피즘 (Liquid Glassmorphism) UI/UX**:
   - `backdrop-filter: blur(24px)` 프로스티드 글래스 패널, 미려한 앰비언트 글로우 조명, 스펙큘러 테두리.
   - 슬라이드 썸네일 필름스트립, 플로팅 줌 컨트롤(Zoom HUD), 반응형 발표자 노트 서랍.
3. 🎬 **전체화면 프레젠테이션 모드 (Fullscreen Presentation)**:
   - `F5` 또는 `Cmd + Enter`로 즉시 풀스크린 발표 모드 시작.
   - 방향키/스페이스바 전환, 자동 숨김 컨트롤러 HUD 지원.
4. 📑 **고품질 벡터 PDF 및 마크다운 아웃라인 내보내기**:
   - 텍스트 선택이 가능한 고해상도 벡터 PDF 변환 (`.pdf`).
   - 발표 대본 및 목차가 정리된 마크다운 개요 파일 (`.md`) 원클릭 추출.
   - 현재 슬라이드 고해상도 PNG 이미지 저장.
5. 💻 **크로스 플랫폼 네이티브 데스크톱 앱 연동**:
   - macOS (`DeckCraft.app`), Windows (`deckcraft.exe`), Linux (AppImage) 완벽 연동.
   - VS Code 내에서 버튼 하나로 네이티브 앱을 실행하여 고급 편집 수행.
6. 🤖 **AI 에이전트를 위한 MCP (Model Context Protocol) 지원**:
   - Claude Desktop, Cursor, Windsurf, Antigravity 등의 AI 에이전트가 슬라이드를 직접 생성하고 조작할 수 있는 MCP 서버 내장.

---

## 🍏 Mac (macOS) 사용 가이드

OPEN_PPTX는 **Apple Silicon (M1/M2/M3/M4)** 및 **Intel Mac**을 모두 지원하는 Universal 바이너리를 기본 내장하고 있습니다.

### 1. 설치 및 시작하기
1. VS Code에서 이 프로젝트 폴더(`/Users/ywlee/sideproejct/ppt_extention`)를 엽니다.
2. `F5` 키를 누르면 **[Extension Development Host]** 창이 열리며 확장 프로그램이 실행됩니다.
3. 파일 탐색기에서 `samples/sample.pptx`를 클릭하면 즉시 DeckCraft 글래스모피즘 뷰어가 열립니다!

### 2. 커맨드 팔레트 (`Cmd + Shift + P`) 명령어
| 명령어 (Command) | 설명 (Description) |
|---|---|
| `DeckCraft: Open Sample Presentation` | 내장된 오로라 샘플 슬라이드(`sample.pptx`) 열기 |
| `DeckCraft: Create New Presentation` | 제목을 입력하여 새 `.pptx` 또는 `.deckcraft` 프레젠테이션 생성 |
| `DeckCraft: Export Presentation to PDF` | 현재 열린 프레젠테이션을 벡터 PDF로 변환 |
| `DeckCraft: Export Outline to Markdown` | 프레젠테이션의 목차와 본문을 마크다운 파일로 추출 |
| `DeckCraft: Render Slides as PNG Images` | 모든 슬라이드를 고해상도(1440×810) PNG 폴더로 일괄 렌더링 |
| `DeckCraft: Open in macOS Desktop App` | 네이티브 `DeckCraft.app`으로 파일 열기 |
| `DeckCraft: Start MCP Server` | AI 에이전트 연동을 위한 MCP 서버 터미널 실행 또는 설정 JSON 생성 |

### 3. macOS Gatekeeper 보안 권한 안내
터미널에서 직접 CLI를 실행하거나 바이너리를 처음 사용할 때 격리(Quarantine) 속성 해제가 필요한 경우:
```bash
# 확장 프로그램 내 바이너리 실행 권한 부여 및 격리 속성 제거
chmod +x bin/deckcraft-cli
xattr -d com.apple.quarantine bin/deckcraft-cli 2>/dev/null || true
```
*(확장 프로그램 코드 내부에서 자동으로 권한을 확인하고 처리하므로 별도 작업 없이도 동작합니다.)*

### 4. macOS 네이티브 앱 설치 (선택 사항)
GUI를 갖춘 네이티브 맥 앱이 필요한 경우:
- [DeckCraft 최신 릴리스 페이지](https://github.com/storytold/deckcraft/releases/latest)에서 `deckcraft-*-macos-universal.dmg`를 다운로드하여 `/Applications` 폴더에 드래그하면 바로 연동됩니다.

---

## 🪟 Windows 및 🐧 Linux 사용 가이드

| 운영체제 | 실행 파일 / 네이티브 앱 | 다운로드 형식 |
|---|---|---|
| **Windows (x64 / ARM64 / x86)** | `deckcraft-cli.exe` & `deckcraft.exe` | 무설치 포터블 `.zip` 또는 `.msi` 설치 파일 |
| **Linux (x86_64 / aarch64)** | `deckcraft-cli` & `DeckCraft.AppImage` | `.AppImage`, `.deb`, `.rpm`, `.tar.gz` |

확장 프로그램 실행 시 시스템에 CLI가 없으면 `DeckCraft: Check / Update CLI Binary` 명령어를 통해 플랫폼에 맞는 바이너리를 원클릭으로 자동 다운로드합니다.

---

## ⌨️ 단축키 안내 (Keyboard Shortcuts)

| 단축키 (Shortcut) | 기능 (Action) |
|---|---|
| `F5` 또는 `Cmd + Enter` (Mac) / `Ctrl + Enter` (Win) | 전체화면 프레젠테이션 모드 시작 |
| `→` 또는 `Space` 또는 `PageDown` | 다음 슬라이드로 이동 |
| `←` 또는 `Backspace` 또는 `PageUp` | 이전 슬라이드로 이동 |
| `Home` / `End` | 첫 번째 / 마지막 슬라이드로 즉시 이동 |
| `Esc` | 전체화면 프레젠테이션 모드 종료 |
| `+` / `-` / `Fit` | 슬라이드 캔버스 확대/축소 및 화면 맞춤 |

---

## 🤖 AI 에이전트 연동 (MCP: Model Context Protocol)

Claude Desktop, Cursor, Antigravity, Windsurf 등 MCP를 지원하는 AI 에이전트와 완벽히 호환됩니다.

### MCP 설정 예시 (`claude_desktop_config.json` 등):
```json
{
  "mcpServers": {
    "deckcraft": {
      "command": "/Users/ywlee/sideproejct/ppt_extention/bin/deckcraft-cli",
      "args": [
        "mcp",
        "--automation-read-root",
        "/Users/ywlee/sideproejct/ppt_extention",
        "--automation-write-root",
        "/Users/ywlee/sideproejct/ppt_extention"
      ]
    }
  }
}
```

에이전트는 200여 개 이상의 슬라이드 커맨드(`slide.new`, `shape.insert`, `format.size` 등)를 통해 자연어로 프레젠테이션을 생성 및 수정할 수 있습니다.

---

## 🧪 자동화 QA 검증 증명 (Verification Report)

본 확장은 루프 엔지니어링(Loop Engineering) 기반의 엄격한 자동화 테스트를 통과하였습니다:

```
====================================================
📋 QA SUMMARY REPORT
====================================================
┌─────────┬────────────────────────────────────┬────────┬────────────────────────────────────────────────┐
│ (index) │ test                               │ status │ details                                        │
├─────────┼────────────────────────────────────┼────────┼────────────────────────────────────────────────┤
│ 0       │ 'CLI Binary Execution'             │ 'PASS' │ 'Version: deckcraft-cli 0.11.1'                │
│ 1       │ 'Presentation Info Parsing'        │ 'PASS' │ 'Loaded 8 slides, Theme: DeckCraft'            │
│ 2       │ 'High-Res Slide Rendering'         │ 'PASS' │ 'Rendered 8 slide PNGs (1440×810)'             │
│ 3       │ 'Vector PDF Conversion'            │ 'PASS' │ 'Generated PDF size: 862.5 KB'                 │
│ 4       │ 'Markdown Outline Export'          │ 'PASS' │ 'Outline length: 1071 characters'              │
│ 5       │ 'Documentation Asset Verification' │ 'PASS' │ 'Verified 6 high-resolution screenshot assets' │
└─────────┴────────────────────────────────────┴────────┴────────────────────────────────────────────────┘

🎉 ALL QA CHECKS PASSED WITH 100% SUCCESS!
```

---

## 📦 개발 및 빌드 (Development)

```bash
# 의존성 설치
npm install

# TypeScript 타입 검사 및 번들링
npm run compile
npm run build

# 자동화 QA 테스트 실행
npx esbuild scripts/qa-test.ts --bundle --platform=node --outfile=scripts/qa-test.js && node scripts/qa-test.js
```

---

## 📄 라이선스 (License)

- DeckCraft Core & Upstream: Dual-licensed under **MIT** or **Apache-2.0** by Storytold.
- OPEN_PPTX Extension: MIT License.
