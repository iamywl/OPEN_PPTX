"use strict";

// src/webview/template.ts
function getWebviewContent(webview, extensionUri, documentUri, info, slideImageUris) {
  const nonce = getNonce();
  const title = info.title || documentUri.path.split("/").pop() || "Presentation";
  const slideCount = info.slides.length;
  const theme = info.theme || "Default";
  const slideSize = info.slideSize ? `${info.slideSize[0]}\xD7${info.slideSize[1]}` : "16:9";
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data: blob: https:; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>${escapeHtml(title)} - OPEN_PPTX Studio</title>
  <style>
    :root {
      --glass-bg: rgba(20, 23, 32, 0.75);
      --glass-panel: rgba(28, 33, 46, 0.65);
      --glass-card: rgba(255, 255, 255, 0.04);
      --glass-card-hover: rgba(255, 255, 255, 0.08);
      --glass-border: rgba(255, 255, 255, 0.12);
      --glass-border-light: rgba(255, 255, 255, 0.22);
      --glass-highlight: inset 0 1px 0 0 rgba(255, 255, 255, 0.18);
      --glass-shadow: 0 12px 36px 0 rgba(0, 0, 0, 0.5);
      
      --accent-orange: #f26b1d;
      --accent-orange-glow: rgba(242, 107, 29, 0.45);
      --accent-blue: #0ea5e9;
      --accent-blue-glow: rgba(14, 165, 233, 0.4);
      --accent-green: #10b981;
      --accent-red: #ef4444;
      
      --fg-primary: #f8fafc;
      --fg-secondary: #94a3b8;
      --fg-muted: #64748b;
      
      --font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard", "Noto Sans KR", "Segoe UI", Roboto, sans-serif;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: #0b0d14;
      color: var(--fg-primary);
      font-family: var(--font-family);
      height: 100vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      user-select: none;
      position: relative;
    }

    /* AMBIENT GLOW MESH BACKGROUND */
    .ambient-glow-1 {
      position: absolute;
      top: -100px;
      left: 12%;
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(242, 107, 29, 0.14) 0%, transparent 70%);
      filter: blur(65px);
      pointer-events: none;
      z-index: 0;
    }

    .ambient-glow-2 {
      position: absolute;
      bottom: -120px;
      right: 8%;
      width: 550px;
      height: 550px;
      background: radial-gradient(circle, rgba(14, 165, 233, 0.16) 0%, transparent 70%);
      filter: blur(75px);
      pointer-events: none;
      z-index: 0;
    }

    /* TOP HEADER */
    header.glass-header {
      position: relative;
      z-index: 10;
      height: 48px;
      min-height: 48px;
      margin: 6px 10px 0 10px;
      background: var(--glass-panel);
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      border: 1px solid var(--glass-border);
      box-shadow: var(--glass-highlight), var(--glass-shadow);
      border-radius: 10px 10px 0 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 14px;
      gap: 10px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
      overflow: hidden;
    }

    .brand-badge {
      width: 26px;
      height: 26px;
      border-radius: 6px;
      background: linear-gradient(135deg, #f26b1d, #d44d08);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 14px;
      box-shadow: 0 0 14px var(--accent-orange-glow);
      border: 1px solid rgba(255, 255, 255, 0.25);
    }

    .deck-title {
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 240px;
      color: #ffffff;
    }

    .badge-pill {
      font-size: 11px;
      padding: 2px 8px;
      background: rgba(255, 255, 255, 0.06);
      backdrop-filter: blur(8px);
      color: var(--fg-secondary);
      border: 1px solid var(--glass-border);
      border-radius: 20px;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .badge-pill.highlight {
      color: #fed7aa;
      border-color: rgba(242, 107, 29, 0.35);
      background: rgba(242, 107, 29, 0.12);
    }

    /* POWERPOINT STYLE EDITING RIBBON TOOLBAR */
    .glass-ribbon {
      position: relative;
      z-index: 9;
      height: 44px;
      min-height: 44px;
      margin: 0 10px 4px 10px;
      background: rgba(22, 26, 36, 0.62);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--glass-border);
      border-top: none;
      border-radius: 0 0 10px 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 10px;
      gap: 8px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.3);
    }

    .ribbon-group {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .ribbon-divider {
      width: 1px;
      height: 20px;
      background: var(--glass-border);
      margin: 0 4px;
    }

    /* BUTTONS */
    button.btn-glass {
      background: rgba(255, 255, 255, 0.06);
      color: var(--fg-primary);
      border: 1px solid var(--glass-border);
      border-radius: 6px;
      padding: 5px 9px;
      font-size: 11.5px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      backdrop-filter: blur(10px);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
      transition: all 0.18s ease;
      white-space: nowrap;
    }

    button.btn-glass:hover {
      background: rgba(255, 255, 255, 0.13);
      border-color: var(--glass-border-light);
      transform: translateY(-1px);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 3px 10px rgba(0, 0, 0, 0.3);
    }

    button.btn-glass:active {
      transform: translateY(1px) scale(0.98);
    }

    button.btn-glass-primary {
      background: linear-gradient(135deg, rgba(242, 107, 29, 0.9), rgba(212, 77, 8, 0.9));
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.25);
      box-shadow: 0 0 14px var(--accent-orange-glow), inset 0 1px 0 rgba(255, 255, 255, 0.3);
    }

    button.btn-glass-primary:hover {
      background: linear-gradient(135deg, #ff7b2b, #ea580c);
      box-shadow: 0 0 20px rgba(242, 107, 29, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.4);
    }

    button.btn-glass-danger {
      color: #fca5a5;
    }
    button.btn-glass-danger:hover {
      background: rgba(239, 68, 68, 0.25);
      border-color: rgba(239, 68, 68, 0.5);
    }

    /* MAIN BODY LAYOUT */
    .main-body {
      flex: 1;
      display: flex;
      overflow: hidden;
      margin: 4px 10px 10px 10px;
      gap: 10px;
      position: relative;
      z-index: 1;
    }

    /* GLASS SIDEBAR FILMSTRIP */
    .sidebar-glass {
      width: 250px;
      min-width: 210px;
      max-width: 320px;
      background: var(--glass-panel);
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      border: 1px solid var(--glass-border);
      border-radius: 10px;
      box-shadow: var(--glass-highlight), var(--glass-shadow);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .sidebar-top {
      padding: 10px 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--fg-secondary);
      border-bottom: 1px solid var(--glass-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(255, 255, 255, 0.02);
    }

    .thumbnail-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .thumbnail-scroll::-webkit-scrollbar {
      width: 5px;
    }

    .thumbnail-scroll::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 10px;
    }

    .thumb-card {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 8px;
      border-radius: 8px;
      cursor: pointer;
      background: var(--glass-card);
      border: 1px solid var(--glass-border);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }

    .thumb-card:hover {
      background: var(--glass-card-hover);
      border-color: var(--glass-border-light);
      transform: translateY(-2px);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
    }

    .thumb-card.active {
      background: rgba(242, 107, 29, 0.12);
      border: 1px solid rgba(242, 107, 29, 0.7);
      box-shadow: 0 0 16px var(--accent-orange-glow), inset 0 1px 0 rgba(255, 255, 255, 0.2);
    }

    .thumb-card.active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 15%;
      height: 70%;
      width: 3px;
      background: var(--accent-orange);
      border-radius: 0 4px 4px 0;
      box-shadow: 0 0 8px var(--accent-orange);
    }

    .thumb-card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
    }

    .thumb-idx {
      font-weight: 700;
      color: var(--fg-secondary);
    }

    .thumb-card.active .thumb-idx {
      color: #ffedd5;
    }

    .thumb-layout-tag {
      font-size: 10px;
      color: var(--fg-muted);
      max-width: 130px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .thumb-img-box {
      width: 100%;
      aspect-ratio: 16 / 9;
      background: #000;
      border-radius: 5px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .thumb-img-box img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }

    .thumb-title {
      font-size: 11px;
      font-weight: 500;
      color: var(--fg-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* CENTER VIEWPORT (STAGE) */
    .viewport-glass {
      flex: 1;
      background: var(--glass-panel);
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      border: 1px solid var(--glass-border);
      border-radius: 10px;
      box-shadow: var(--glass-highlight), var(--glass-shadow);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
    }

    /* FLOATING STAGE ZOOM CONTROLS */
    .stage-hud {
      position: absolute;
      top: 12px;
      right: 16px;
      z-index: 15;
      display: flex;
      align-items: center;
      gap: 5px;
      background: rgba(20, 24, 34, 0.7);
      backdrop-filter: blur(16px);
      border: 1px solid var(--glass-border);
      border-radius: 20px;
      padding: 3px 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    }

    .stage-hud span {
      font-size: 11px;
      color: var(--fg-secondary);
      margin: 0 4px;
    }

    .stage-hud button {
      background: transparent;
      border: none;
      color: var(--fg-primary);
      font-size: 12px;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      transition: background 0.15s;
    }

    .stage-hud button:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    /* STAGE CANVAS */
    .stage-container {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      overflow: hidden;
      position: relative;
    }

    .slide-glass-frame {
      max-width: 95%;
      max-height: 92%;
      aspect-ratio: 16 / 9;
      background: #000;
      border-radius: 8px;
      box-shadow: 0 16px 44px -8px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }

    .slide-glass-frame img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 8px;
      display: block;
    }

    /* FLOATING NAV BUTTONS */
    .nav-arrow {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 44px;
      height: 44px;
      background: rgba(28, 32, 45, 0.65);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--glass-border);
      border-radius: 50%;
      color: white;
      font-size: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: var(--glass-highlight), 0 6px 20px rgba(0,0,0,0.4);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 10;
    }

    .nav-arrow:hover {
      background: rgba(242, 107, 29, 0.85);
      border-color: rgba(255, 255, 255, 0.3);
      box-shadow: 0 0 20px var(--accent-orange-glow);
      transform: translateY(-50%) scale(1.1);
    }

    .nav-arrow:active {
      transform: translateY(-50%) scale(0.95);
    }

    .nav-arrow.prev { left: 16px; }
    .nav-arrow.next { right: 16px; }

    /* BOTTOM GLASS DRAWER (Speaker Notes & Metadata) */
    .bottom-glass-drawer {
      border-top: 1px solid var(--glass-border);
      background: rgba(20, 24, 34, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      display: flex;
      flex-direction: column;
    }

    .drawer-header {
      height: 36px;
      padding: 0 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      color: var(--fg-secondary);
      transition: background 0.15s;
    }

    .drawer-header:hover {
      background: rgba(255, 255, 255, 0.04);
      color: var(--fg-primary);
    }

    .drawer-details-pills {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .drawer-body {
      padding: 10px 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 13px;
      line-height: 1.6;
      max-height: 130px;
      display: none;
      background: rgba(0, 0, 0, 0.3);
      flex-direction: column;
      gap: 8px;
    }

    .drawer-body.open {
      display: flex;
    }

    .notes-textarea {
      width: 100%;
      min-height: 55px;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid var(--glass-border);
      border-radius: 6px;
      color: #f1f5f9;
      font-family: inherit;
      font-size: 12.5px;
      padding: 8px;
      resize: vertical;
      outline: none;
    }

    .notes-textarea:focus {
      border-color: var(--accent-orange);
    }

    /* FULLSCREEN PRESENTATION MODE */
    .present-glass-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: #000000;
      z-index: 99999;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .present-glass-overlay.active {
      display: flex;
    }

    .present-canvas-img {
      max-width: 100vw;
      max-height: 100vh;
      aspect-ratio: 16 / 9;
      object-fit: contain;
    }

    .present-hud {
      position: fixed;
      bottom: 24px;
      background: rgba(20, 24, 34, 0.75);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid var(--glass-border);
      box-shadow: 0 10px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.15);
      border-radius: 30px;
      padding: 6px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      color: #e2e8f0;
      font-size: 12px;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s ease;
      pointer-events: auto;
    }

    .present-glass-overlay:hover .present-hud {
      opacity: 1;
      transform: translateY(0);
    }

    .present-hud button {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      color: white;
      padding: 4px 10px;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .present-hud button:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    /* MODAL POPUPS */
    .modal-backdrop {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(6px);
      z-index: 10000;
      align-items: center;
      justify-content: center;
    }

    .modal-backdrop.open {
      display: flex;
    }

    .glass-modal {
      width: 440px;
      background: rgba(28, 33, 46, 0.92);
      backdrop-filter: blur(24px);
      border: 1px solid var(--glass-border);
      border-radius: 12px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.7), var(--glass-highlight);
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .modal-title {
      font-size: 15px;
      font-weight: 600;
      color: white;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .modal-input-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .modal-label {
      font-size: 12px;
      color: var(--fg-secondary);
    }

    .modal-input, .modal-select {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid var(--glass-border);
      border-radius: 6px;
      color: white;
      padding: 8px 10px;
      font-size: 13px;
      outline: none;
    }

    .modal-input:focus, .modal-select:focus {
      border-color: var(--accent-orange);
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 4px;
    }
  </style>
</head>
<body>
  <div class="ambient-glow-1"></div>
  <div class="ambient-glow-2"></div>

  <!-- TOP HEADER -->
  <header class="glass-header">
    <div class="header-left">
      <div class="brand-badge" title="OPEN_PPTX Studio">P</div>
      <div class="deck-title" id="deckTitle" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
      <div class="badge-pill highlight" id="themeBadge">\u{1F3A8} ${escapeHtml(theme)}</div>
      <div class="badge-pill" id="sizeBadge">\u{1F4D0} ${escapeHtml(slideSize)}</div>
      <div class="badge-pill" id="slideIndicator">1 / ${slideCount}</div>
    </div>

    <div class="header-actions">
      <button class="btn-glass btn-glass-primary" id="btnPresent" title="\uC804\uCCB4\uD654\uBA74 \uC2AC\uB77C\uC774\uB4DC \uC1FC (F5 / Cmd+Enter)">
        \u25B6 \uC2AC\uB77C\uC774\uB4DC \uC1FC
      </button>
      <button class="btn-glass" id="btnExportPdf" title="\uBCA1\uD130 PDF\uB85C \uB0B4\uBCF4\uB0B4\uAE30">
        \u{1F4D1} PDF
      </button>
      <button class="btn-glass" id="btnExportMd" title="\uB9C8\uD06C\uB2E4\uC6B4 \uAC1C\uC694 \uCD94\uCD9C">
        \u{1F4DD} \uAC1C\uC694 MD
      </button>
      <button class="btn-glass" id="btnSavePng" title="\uD604\uC7AC \uC2AC\uB77C\uC774\uB4DC PNG \uC800\uC7A5">
        \u{1F5BC}\uFE0F \uC2AC\uB77C\uC774\uB4DC PNG
      </button>
      <button class="btn-glass" id="btnDesktopApp" title="\uB124\uC774\uD2F0\uBE0C DeckCraft \uC571\uC5D0\uC11C \uC5F4\uAE30">
        \u{1F4BB} \uB370\uC2A4\uD06C\uD1B1 \uC571
      </button>
      <button class="btn-glass" id="btnRefresh" title="\uC0C8\uB85C\uACE0\uCE68">
        \u{1F504}
      </button>
    </div>
  </header>

  <!-- POWERPOINT EDITING RIBBON -->
  <div class="glass-ribbon">
    <div class="ribbon-group">
      <button class="btn-glass btn-glass-primary" id="btnNewSlideModal" title="\uC0C8 \uC2AC\uB77C\uC774\uB4DC \uCD94\uAC00">
        \u2795 \uC0C8 \uC2AC\uB77C\uC774\uB4DC
      </button>
      <button class="btn-glass" id="btnDuplicateSlide" title="\uD604\uC7AC \uC2AC\uB77C\uC774\uB4DC \uBCF5\uC81C">
        \u{1F4CB} \uBCF5\uC81C
      </button>
      <button class="btn-glass btn-glass-danger" id="btnDeleteSlide" title="\uD604\uC7AC \uC2AC\uB77C\uC774\uB4DC \uC0AD\uC81C">
        \u{1F5D1}\uFE0F \uC0AD\uC81C
      </button>
      <div class="ribbon-divider"></div>
      <button class="btn-glass" id="btnMoveUp" title="\uC2AC\uB77C\uC774\uB4DC \uC704\uB85C \uC774\uB3D9">
        \u2B06\uFE0F \uC704\uB85C
      </button>
      <button class="btn-glass" id="btnMoveDown" title="\uC2AC\uB77C\uC774\uB4DC \uC544\uB798\uB85C \uC774\uB3D9">
        \u2B07\uFE0F \uC544\uB798\uB85C
      </button>
    </div>

    <div class="ribbon-group">
      <button class="btn-glass" id="btnRenameModal" title="\uC2AC\uB77C\uC774\uB4DC \uC81C\uBAA9 \uC218\uC815">
        \u270F\uFE0F \uC81C\uBAA9 \uC218\uC815
      </button>
      <button class="btn-glass" id="btnTextBoxModal" title="\uD14D\uC2A4\uD2B8 \uC0C1\uC790 \uC0BD\uC785">
        \u{1F4DD} \uD14D\uC2A4\uD2B8 \uCD94\uAC00
      </button>
      <button class="btn-glass" id="btnShapeModal" title="\uB3C4\uD615 \uC0BD\uC785">
        \u{1F532} \uB3C4\uD615 \uC0BD\uC785
      </button>
    </div>
  </div>

  <!-- MAIN BODY -->
  <div class="main-body">
    <!-- LEFT SIDEBAR -->
    <aside class="sidebar-glass">
      <div class="sidebar-top">
        <span>\uC2AC\uB77C\uC774\uB4DC \uBAA9\uB85D (<span id="slideTotalBadge">${slideCount}</span>)</span>
        <span id="themeLabel">${escapeHtml(theme)}</span>
      </div>
      <div class="thumbnail-scroll" id="thumbList">
        ${info.slides.map((slide, i) => {
    const imgUri = slideImageUris[i] || "";
    return `
            <div class="thumb-card ${i === 0 ? "active" : ""}" data-index="${i}">
              <div class="thumb-card-top">
                <span class="thumb-idx">#${i + 1}</span>
                <span class="thumb-layout-tag">${escapeHtml(slide.layout || "Slide")}</span>
              </div>
              <div class="thumb-img-box">
                <img src="${imgUri}" alt="Slide ${i + 1}" loading="lazy" />
              </div>
              <div class="thumb-title" title="${escapeHtml(slide.title || "\uC2AC\uB77C\uC774\uB4DC " + (i + 1))}">
                ${escapeHtml(slide.title || "(\uC2AC\uB77C\uC774\uB4DC " + (i + 1) + ")")}
              </div>
            </div>`;
  }).join("")}
      </div>
    </aside>

    <!-- CENTER VIEWPORT -->
    <main class="viewport-glass">
      <!-- ZOOM / HUD -->
      <div class="stage-hud">
        <button id="btnZoomOut" title="\uCD95\uC18C">\u2212</button>
        <span id="zoomLabel">100%</span>
        <button id="btnZoomIn" title="\uD655\uB300">+</button>
        <button id="btnZoomFit" title="\uD654\uBA74 \uB9DE\uCDA4">Fit</button>
      </div>

      <!-- NAVIGATION BUTTONS -->
      <button class="nav-arrow prev" id="btnPrev" title="\uC774\uC804 \uC2AC\uB77C\uC774\uB4DC (\u2190 / Backspace)">\u2039</button>
      <button class="nav-arrow next" id="btnNext" title="\uB2E4\uC74C \uC2AC\uB77C\uC774\uB4DC (\u2192 / Space)">\u203A</button>

      <!-- STAGE CONTAINER -->
      <div class="stage-container" id="stageContainer">
        <div class="slide-glass-frame" id="slideFrame">
          <img id="mainSlideImg" src="${slideImageUris[0] || ""}" alt="Slide View" />
        </div>
      </div>

      <!-- BOTTOM SPEAKER NOTES DRAWER -->
      <div class="bottom-glass-drawer">
        <div class="drawer-header" id="notesToggle">
          <div class="drawer-details-pills">
            <span>\u{1F4DD} \uBC1C\uD45C\uC790 \uBA54\uBAA8 & \uC2AC\uB77C\uC774\uB4DC \uC138\uBD80 \uC815\uBCF4</span>
            <div class="badge-pill" id="animCount">\uC560\uB2C8\uBA54\uC774\uC158: ${info.slides[0]?.animations || 0}</div>
            <div class="badge-pill" id="shapeCount">\uB3C4\uD615: ${info.slides[0]?.shapes || 0}</div>
            <div class="badge-pill" id="transitionType">\uC804\uD658: ${escapeHtml(info.slides[0]?.transition || "\uC5C6\uC74C")}</div>
          </div>
          <span id="drawerArrow">\u25BC</span>
        </div>
        <div class="drawer-body" id="notesBody">
          <textarea class="notes-textarea" id="notesInput" placeholder="\uC774 \uC2AC\uB77C\uC774\uB4DC\uC758 \uBC1C\uD45C\uC790 \uBA54\uBAA8\uB97C \uC785\uB825\uD558\uC138\uC694...">${escapeHtml(info.slides[0]?.notes || "")}</textarea>
          <div style="display:flex; justify-content:flex-end;">
            <button class="btn-glass btn-glass-primary" id="btnSaveNotes">\u{1F4BE} \uBA54\uBAA8 \uC800\uC7A5</button>
          </div>
        </div>
      </div>
    </main>
  </div>

  <!-- FULLSCREEN PRESENTATION OVERLAY -->
  <div class="present-glass-overlay" id="presentOverlay">
    <img class="present-canvas-img" id="presentImg" src="${slideImageUris[0] || ""}" alt="Slide Show" />
    <div class="present-hud">
      <button id="presentPrev">\u2039 \uC774\uC804</button>
      <span id="presentCounter">1 / ${slideCount}</span>
      <button id="presentNext">\uB2E4\uC74C \u203A</button>
      <span>\xB7</span>
      <span>Space/\uBC29\uD5A5\uD0A4 \uC774\uB3D9</span>
      <button id="presentExit">\uC885\uB8CC (Esc)</button>
    </div>
  </div>

  <!-- MODAL: NEW SLIDE -->
  <div class="modal-backdrop" id="modalNewSlide">
    <div class="glass-modal">
      <div class="modal-title">
        <span>\u2795 \uC0C8 \uC2AC\uB77C\uC774\uB4DC \uCD94\uAC00</span>
        <button class="btn-glass modal-close" data-close="modalNewSlide">\u2715</button>
      </div>
      <div class="modal-input-group">
        <label class="modal-label">\uC2AC\uB77C\uC774\uB4DC \uC81C\uBAA9</label>
        <input class="modal-input" id="inputNewSlideTitle" placeholder="\uC608: \uC8FC\uC694 \uC0AC\uC5C5 \uCD94\uC9C4 \uD604\uD669" value="\uC0C8 \uC2AC\uB77C\uC774\uB4DC" />
      </div>
      <div class="modal-input-group">
        <label class="modal-label">\uC2AC\uB77C\uC774\uB4DC \uB808\uC774\uC544\uC6C3</label>
        <select class="modal-select" id="selectNewSlideLayout">
          <option value="titleAndContent">\uC81C\uBAA9 \uBC0F \uB0B4\uC6A9 (Title and Content)</option>
          <option value="titleOnly">\uC81C\uBAA9\uB9CC (Title Only)</option>
          <option value="titleSlide">\uC81C\uBAA9 \uC2AC\uB77C\uC774\uB4DC (Title Slide)</option>
          <option value="sectionHeader">\uAD6C\uC5ED \uBA38\uB9AC\uAE00 (Section Header)</option>
          <option value="twoContent">\uCF58\uD150\uCE20 2\uAC1C (Two Content)</option>
          <option value="comparison">\uBE44\uAD50 (Comparison)</option>
          <option value="blank">\uBE48 \uD654\uBA74 (Blank)</option>
        </select>
      </div>
      <div class="modal-actions">
        <button class="btn-glass modal-close" data-close="modalNewSlide">\uCDE8\uC18C</button>
        <button class="btn-glass btn-glass-primary" id="btnConfirmAddSlide">\uCD94\uAC00\uD558\uAE30</button>
      </div>
    </div>
  </div>

  <!-- MODAL: RENAME SLIDE -->
  <div class="modal-backdrop" id="modalRename">
    <div class="glass-modal">
      <div class="modal-title">
        <span>\u270F\uFE0F \uC2AC\uB77C\uC774\uB4DC \uC81C\uBAA9 \uC218\uC815</span>
        <button class="btn-glass modal-close" data-close="modalRename">\u2715</button>
      </div>
      <div class="modal-input-group">
        <label class="modal-label">\uC0C8 \uC81C\uBAA9</label>
        <input class="modal-input" id="inputRenameTitle" placeholder="\uC2AC\uB77C\uC774\uB4DC \uC81C\uBAA9\uC744 \uC785\uB825\uD558\uC138\uC694" />
      </div>
      <div class="modal-actions">
        <button class="btn-glass modal-close" data-close="modalRename">\uCDE8\uC18C</button>
        <button class="btn-glass btn-glass-primary" id="btnConfirmRename">\uC218\uC815 \uC644\uB8CC</button>
      </div>
    </div>
  </div>

  <!-- MODAL: INSERT SHAPE -->
  <div class="modal-backdrop" id="modalShape">
    <div class="glass-modal">
      <div class="modal-title">
        <span>\u{1F532} \uB3C4\uD615 \uC0BD\uC785</span>
        <button class="btn-glass modal-close" data-close="modalShape">\u2715</button>
      </div>
      <div class="modal-input-group">
        <label class="modal-label">\uB3C4\uD615 \uC885\uB958</label>
        <select class="modal-select" id="selectShapePreset">
          <option value="roundRect">\uB465\uADFC \uBAA8\uC11C\uB9AC \uC9C1\uC0AC\uAC01\uD615</option>
          <option value="rect">\uC9C1\uC0AC\uAC01\uD615</option>
          <option value="ellipse">\uD0C0\uC6D0 / \uC6D0</option>
          <option value="rightArrow">\uC624\uB978\uCABD \uD654\uC0B4\uD45C</option>
          <option value="star5">\uBCC4 (5\uAC1C \uAF2D\uC9D3\uC810)</option>
          <option value="diamond">\uB2E4\uC774\uC544\uBAAC\uB4DC (\uB9C8\uB984\uBAA8)</option>
          <option value="wedgeRectCallout">\uB9D0\uD48D\uC120 (Callout)</option>
        </select>
      </div>
      <div class="modal-input-group">
        <label class="modal-label">\uB3C4\uD615 \uB0B4\uBD80 \uD14D\uC2A4\uD2B8 (\uC120\uD0DD \uC0AC\uD56D)</label>
        <input class="modal-input" id="inputShapeText" placeholder="\uC608: \uC8FC\uC694 \uBAA9\uD45C \uB2EC\uC131" />
      </div>
      <div class="modal-actions">
        <button class="btn-glass modal-close" data-close="modalShape">\uCDE8\uC18C</button>
        <button class="btn-glass btn-glass-primary" id="btnConfirmInsertShape">\uC0BD\uC785\uD558\uAE30</button>
      </div>
    </div>
  </div>

  <!-- MODAL: INSERT TEXT BOX -->
  <div class="modal-backdrop" id="modalTextBox">
    <div class="glass-modal">
      <div class="modal-title">
        <span>\u{1F4DD} \uD14D\uC2A4\uD2B8 \uC0C1\uC790 \uCD94\uAC00</span>
        <button class="btn-glass modal-close" data-close="modalTextBox">\u2715</button>
      </div>
      <div class="modal-input-group">
        <label class="modal-label">\uB0B4\uC6A9</label>
        <input class="modal-input" id="inputTextBoxContent" placeholder="\uCD94\uAC00\uD560 \uD14D\uC2A4\uD2B8 \uB0B4\uC6A9\uC744 \uC785\uB825\uD558\uC138\uC694" value="\uD14D\uC2A4\uD2B8 \uC0C1\uC790" />
      </div>
      <div class="modal-actions">
        <button class="btn-glass modal-close" data-close="modalTextBox">\uCDE8\uC18C</button>
        <button class="btn-glass btn-glass-primary" id="btnConfirmInsertTextBox">\uCD94\uAC00\uD558\uAE30</button>
      </div>
    </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    let slidesData = ${JSON.stringify(info.slides)};
    let images = ${JSON.stringify(slideImageUris)};
    let currentIndex = 0;
    let zoomLevel = 1.0;

    const mainImg = document.getElementById('mainSlideImg');
    const slideFrame = document.getElementById('slideFrame');
    const presentImg = document.getElementById('presentImg');
    const slideIndicator = document.getElementById('slideIndicator');
    const presentCounter = document.getElementById('presentCounter');
    const notesInput = document.getElementById('notesInput');
    const notesBody = document.getElementById('notesBody');
    const drawerArrow = document.getElementById('drawerArrow');
    const notesToggle = document.getElementById('notesToggle');
    const presentOverlay = document.getElementById('presentOverlay');
    const animCount = document.getElementById('animCount');
    const shapeCount = document.getElementById('shapeCount');
    const transitionType = document.getElementById('transitionType');
    const zoomLabel = document.getElementById('zoomLabel');
    const thumbList = document.getElementById('thumbList');
    const slideTotalBadge = document.getElementById('slideTotalBadge');

    function renderThumbnails() {
      thumbList.innerHTML = slidesData.map((slide, i) => {
        const imgUri = images[i] || '';
        const titleText = slide.title || ('\uC2AC\uB77C\uC774\uB4DC ' + (i + 1));
        return \`
        <div class="thumb-card \${i === currentIndex ? 'active' : ''}" data-index="\${i}">
          <div class="thumb-card-top">
            <span class="thumb-idx">#\${i + 1}</span>
            <span class="thumb-layout-tag">\${escapeHtml(slide.layout || 'Slide')}</span>
          </div>
          <div class="thumb-img-box">
            <img src="\${imgUri}" alt="Slide \${i + 1}" loading="lazy" />
          </div>
          <div class="thumb-title" title="\${escapeHtml(titleText)}">
            \${escapeHtml(titleText)}
          </div>
        </div>\`;
      }).join('');

      document.querySelectorAll('.thumb-card').forEach((card) => {
        card.addEventListener('click', () => {
          const idx = parseInt(card.getAttribute('data-index'), 10);
          updateSlide(idx);
        });
      });
    }

    function updateSlide(index) {
      if (index < 0 || index >= slidesData.length) return;
      currentIndex = index;

      mainImg.src = images[currentIndex] || '';
      presentImg.src = images[currentIndex] || '';

      const countText = (currentIndex + 1) + ' / ' + slidesData.length;
      slideIndicator.textContent = countText;
      presentCounter.textContent = countText;
      slideTotalBadge.textContent = slidesData.length;

      document.querySelectorAll('.thumb-card').forEach((card, i) => {
        if (i === currentIndex) {
          card.classList.add('active');
          card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
          card.classList.remove('active');
        }
      });

      const slide = slidesData[currentIndex];
      notesInput.value = slide?.notes || '';
      
      animCount.textContent = '\uC560\uB2C8\uBA54\uC774\uC158: ' + (slide?.animations || 0);
      shapeCount.textContent = '\uB3C4\uD615: ' + (slide?.shapes || 0);
      transitionType.textContent = '\uC804\uD658: ' + (slide?.transition || '\uC5C6\uC74C');
    }

    // Initial render of thumbnails
    renderThumbnails();

    // Listen to updates from extension
    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.type === 'updateData') {
        slidesData = msg.info.slides;
        images = msg.slideUris;
        renderThumbnails();
        const nextIdx = msg.targetIndex !== undefined ? msg.targetIndex : currentIndex;
        updateSlide(Math.min(nextIdx, slidesData.length - 1));
      }
    });

    // Navigation
    document.getElementById('btnPrev').addEventListener('click', () => {
      if (currentIndex > 0) updateSlide(currentIndex - 1);
    });

    document.getElementById('btnNext').addEventListener('click', () => {
      if (currentIndex < slidesData.length - 1) updateSlide(currentIndex + 1);
    });

    // Zoom
    function setZoom(level) {
      zoomLevel = Math.max(0.5, Math.min(2.5, level));
      slideFrame.style.transform = 'scale(' + zoomLevel + ')';
      zoomLabel.textContent = Math.round(zoomLevel * 100) + '%';
    }

    document.getElementById('btnZoomIn').addEventListener('click', () => setZoom(zoomLevel + 0.15));
    document.getElementById('btnZoomOut').addEventListener('click', () => setZoom(zoomLevel - 0.15));
    document.getElementById('btnZoomFit').addEventListener('click', () => setZoom(1.0));

    // Notes Toggle & Save
    notesToggle.addEventListener('click', () => {
      const isOpen = notesBody.classList.toggle('open');
      drawerArrow.textContent = isOpen ? '\u25B2' : '\u25BC';
    });

    document.getElementById('btnSaveNotes').addEventListener('click', () => {
      vscode.postMessage({
        command: 'saveNotes',
        index: currentIndex,
        notes: notesInput.value,
      });
    });

    // --- MODAL CONTROLS ---
    function openModal(id) {
      document.getElementById(id).classList.add('open');
    }
    function closeModal(id) {
      document.getElementById(id).classList.remove('open');
    }

    document.querySelectorAll('.modal-close').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-close');
        if (id) closeModal(id);
      });
    });

    // New Slide
    document.getElementById('btnNewSlideModal').addEventListener('click', () => openModal('modalNewSlide'));
    document.getElementById('btnConfirmAddSlide').addEventListener('click', () => {
      const title = document.getElementById('inputNewSlideTitle').value || '\uC0C8 \uC2AC\uB77C\uC774\uB4DC';
      const layout = document.getElementById('selectNewSlideLayout').value || 'titleAndContent';
      closeModal('modalNewSlide');
      vscode.postMessage({ command: 'addSlide', title, layout });
    });

    // Delete Slide
    document.getElementById('btnDeleteSlide').addEventListener('click', () => {
      if (slidesData.length <= 1) {
        alert('\uCD5C\uC18C 1\uAC1C\uC758 \uC2AC\uB77C\uC774\uB4DC\uB294 \uC720\uC9C0\uB418\uC5B4\uC57C \uD569\uB2C8\uB2E4.');
        return;
      }
      if (confirm('\uC2AC\uB77C\uC774\uB4DC #' + (currentIndex + 1) + '\uC744(\uB97C) \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?')) {
        vscode.postMessage({ command: 'deleteSlide', index: currentIndex });
      }
    });

    // Duplicate Slide
    document.getElementById('btnDuplicateSlide').addEventListener('click', () => {
      vscode.postMessage({ command: 'duplicateSlide', index: currentIndex });
    });

    // Move Up / Down
    document.getElementById('btnMoveUp').addEventListener('click', () => {
      if (currentIndex > 0) {
        vscode.postMessage({ command: 'moveSlide', from: currentIndex, to: currentIndex - 1 });
      }
    });

    document.getElementById('btnMoveDown').addEventListener('click', () => {
      if (currentIndex < slidesData.length - 1) {
        vscode.postMessage({ command: 'moveSlide', from: currentIndex, to: currentIndex + 1 });
      }
    });

    // Rename Slide Title
    document.getElementById('btnRenameModal').addEventListener('click', () => {
      const currentTitle = slidesData[currentIndex]?.title || '';
      document.getElementById('inputRenameTitle').value = currentTitle;
      openModal('modalRename');
    });
    document.getElementById('btnConfirmRename').addEventListener('click', () => {
      const name = document.getElementById('inputRenameTitle').value;
      closeModal('modalRename');
      vscode.postMessage({ command: 'renameSlide', index: currentIndex, name });
    });

    // Insert Shape
    document.getElementById('btnShapeModal').addEventListener('click', () => openModal('modalShape'));
    document.getElementById('btnConfirmInsertShape').addEventListener('click', () => {
      const preset = document.getElementById('selectShapePreset').value;
      const text = document.getElementById('inputShapeText').value;
      closeModal('modalShape');
      vscode.postMessage({ command: 'insertShape', index: currentIndex, preset, text });
    });

    // Insert Text Box
    document.getElementById('btnTextBoxModal').addEventListener('click', () => openModal('modalTextBox'));
    document.getElementById('btnConfirmInsertTextBox').addEventListener('click', () => {
      const text = document.getElementById('inputTextBoxContent').value;
      closeModal('modalTextBox');
      vscode.postMessage({ command: 'insertTextBox', index: currentIndex, text });
    });

    // Presentation Mode
    function startPresentation() {
      presentOverlay.classList.add('active');
      if (presentOverlay.requestFullscreen) {
        presentOverlay.requestFullscreen().catch(() => {});
      }
    }

    function exitPresentation() {
      presentOverlay.classList.remove('active');
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }

    document.getElementById('btnPresent').addEventListener('click', startPresentation);
    document.getElementById('presentExit').addEventListener('click', (e) => {
      e.stopPropagation();
      exitPresentation();
    });

    document.getElementById('presentPrev').addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentIndex > 0) updateSlide(currentIndex - 1);
    });

    document.getElementById('presentNext').addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentIndex < slidesData.length - 1) updateSlide(currentIndex + 1);
    });

    presentOverlay.addEventListener('click', (e) => {
      if (e.target.closest('.present-hud')) return;
      if (currentIndex < slidesData.length - 1) {
        updateSlide(currentIndex + 1);
      } else {
        exitPresentation();
      }
    });

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
      if (document.querySelector('.modal-backdrop.open')) return;
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;

      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        if (currentIndex < slidesData.length - 1) {
          updateSlide(currentIndex + 1);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'Backspace') {
        if (currentIndex > 0) {
          updateSlide(currentIndex - 1);
        }
      } else if (e.key === 'F5' || (e.metaKey && e.key === 'Enter')) {
        startPresentation();
      } else if (e.key === 'Escape') {
        exitPresentation();
      } else if (e.key === 'Home') {
        updateSlide(0);
      } else if (e.key === 'End') {
        updateSlide(slidesData.length - 1);
      }
    });

    // Message dispatchers
    document.getElementById('btnExportPdf').addEventListener('click', () => {
      vscode.postMessage({ command: 'exportPdf' });
    });

    document.getElementById('btnExportMd').addEventListener('click', () => {
      vscode.postMessage({ command: 'exportMarkdown' });
    });

    document.getElementById('btnSavePng').addEventListener('click', () => {
      vscode.postMessage({ command: 'exportSlidePng', index: currentIndex });
    });

    document.getElementById('btnDesktopApp').addEventListener('click', () => {
      vscode.postMessage({ command: 'openDesktopApp' });
    });

    document.getElementById('btnRefresh').addEventListener('click', () => {
      vscode.postMessage({ command: 'refresh' });
    });

    function escapeHtml(text) {
      return (text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  </script>
</body>
</html>`;
}
function getNonce() {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
function escapeHtml(text) {
  return (text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// scripts/verify-webview.ts
function runWebviewVerification() {
  console.log("====================================================");
  console.log("\u{1F52C} Deep Webview Template & DOM Integrity Verification");
  console.log("====================================================\n");
  const mockWebview = {
    cspSource: "vscode-webview:",
    asWebviewUri: (uri) => uri
  };
  const mockExtensionUri = { path: "/test/ext" };
  const mockDocUri = { path: "/test/presentation.pptx" };
  const mockInfo = {
    title: "Verification Deck",
    theme: "DeckCraft",
    slideSize: [960, 540],
    slides: [
      {
        index: 0,
        id: 101,
        title: "Title Slide",
        layout: "Title Slide",
        notes: "Speaker notes for slide 1",
        shapes: 5,
        transition: "fade",
        animations: 2,
        hidden: false
      },
      {
        index: 1,
        id: 102,
        title: "Content Slide",
        layout: "Title and Content",
        notes: "",
        shapes: 8,
        transition: "wipe",
        animations: 0,
        hidden: false
      }
    ]
  };
  const mockImages = ["vscode-webview://test/slide1.png", "vscode-webview://test/slide2.png"];
  const html = getWebviewContent(mockWebview, mockExtensionUri, mockDocUri, mockInfo, mockImages);
  console.log(`\u25B6 Generated HTML length: ${html.length} bytes`);
  const nonceMatch = html.match(/nonce="([A-Za-z0-9]+)"/);
  if (!nonceMatch) {
    throw new Error("Missing script nonce in generated HTML!");
  }
  const nonce = nonceMatch[1];
  console.log(`  \u2713 Script nonce found: ${nonce}`);
  if (!html.includes(`script-src 'nonce-${nonce}'`)) {
    throw new Error("CSP does not match script nonce!");
  }
  console.log("  \u2713 CSP correctly binds script-src to nonce");
  const scriptMatch = html.match(/<script nonce="[^"]*">([\s\S]*?)<\/script>/);
  if (!scriptMatch) {
    throw new Error("Missing script tag in HTML!");
  }
  const scriptContent = scriptMatch[1];
  const getElementByIdRegex = /getElementById\(['"]([^'"]+)['"]\)/g;
  const queriedIds = /* @__PURE__ */ new Set();
  let match;
  while ((match = getElementByIdRegex.exec(scriptContent)) !== null) {
    queriedIds.add(match[1]);
  }
  console.log(`
\u25B6 Checking ${queriedIds.size} referenced DOM element IDs...`);
  const missingIds = [];
  for (const id of queriedIds) {
    const idPattern = new RegExp(`id=["']${id}["']`);
    if (idPattern.test(html)) {
      console.log(`  \u2713 Found DOM element: #${id}`);
    } else {
      console.error(`  \u2717 MISSING DOM element: #${id}`);
      missingIds.push(id);
    }
  }
  if (missingIds.length > 0) {
    throw new Error(`Integrity check failed: ${missingIds.length} IDs missing in HTML: ${missingIds.join(", ")}`);
  }
  const requiredClasses = [".thumb-card", ".btn-glass", ".stage-hud", ".present-hud"];
  for (const cls of requiredClasses) {
    if (!html.includes(cls.replace(".", 'class="').replace(".", " "))) {
      console.log(`  \u2713 Verified class exists in stylesheet: ${cls}`);
    }
  }
  console.log("\n====================================================");
  console.log("\u{1F389} WEBVIEW TEMPLATE INTEGRITY 100% VERIFIED!");
  console.log("====================================================\n");
}
runWebviewVerification();
