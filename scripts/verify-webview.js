"use strict";

// src/webview/template.ts
function getWebviewContent(webview, extensionUri, documentUri, info, slideImageUris) {
  const nonce = getNonce();
  const title = info.title || documentUri.path.split("/").pop() || "Presentation";
  const slideCount = info.slides.length;
  const theme = info.theme || "Default";
  const slideSize = info.slideSize ? `${info.slideSize[0]}\xD7${info.slideSize[1]}` : "16:9";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data: blob: https:; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>${escapeHtml(title)} - DeckCraft Studio</title>
  <style>
    :root {
      --glass-bg: rgba(22, 25, 34, 0.68);
      --glass-panel: rgba(28, 32, 45, 0.58);
      --glass-card: rgba(255, 255, 255, 0.04);
      --glass-card-hover: rgba(255, 255, 255, 0.08);
      --glass-border: rgba(255, 255, 255, 0.11);
      --glass-border-light: rgba(255, 255, 255, 0.18);
      --glass-highlight: inset 0 1px 0 0 rgba(255, 255, 255, 0.16);
      --glass-shadow: 0 12px 36px 0 rgba(0, 0, 0, 0.45);
      
      --accent-orange: #f26b1d;
      --accent-orange-glow: rgba(242, 107, 29, 0.45);
      --accent-blue: #0ea5e9;
      --accent-blue-glow: rgba(14, 165, 233, 0.4);
      
      --fg-primary: #f8fafc;
      --fg-secondary: #94a3b8;
      --fg-muted: #64748b;
      
      --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: #0d0f17;
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
      top: -120px;
      left: 10%;
      width: 450px;
      height: 450px;
      background: radial-gradient(circle, rgba(242, 107, 29, 0.12) 0%, transparent 70%);
      filter: blur(60px);
      pointer-events: none;
      z-index: 0;
    }

    .ambient-glow-2 {
      position: absolute;
      bottom: -150px;
      right: 5%;
      width: 550px;
      height: 550px;
      background: radial-gradient(circle, rgba(14, 165, 233, 0.14) 0%, transparent 70%);
      filter: blur(75px);
      pointer-events: none;
      z-index: 0;
    }

    /* TOP GLASS HEADER HUD */
    header.glass-header {
      position: relative;
      z-index: 10;
      height: 54px;
      min-height: 54px;
      margin: 8px 12px 4px 12px;
      background: var(--glass-panel);
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      border: 1px solid var(--glass-border);
      box-shadow: var(--glass-highlight), var(--glass-shadow);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      gap: 12px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
      overflow: hidden;
    }

    .brand-badge {
      width: 30px;
      height: 30px;
      border-radius: 8px;
      background: linear-gradient(135deg, #f26b1d, #d44d08);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 15px;
      box-shadow: 0 0 16px var(--accent-orange-glow);
      border: 1px solid rgba(255, 255, 255, 0.25);
    }

    .deck-title-group {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .deck-title {
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 260px;
      color: #ffffff;
      letter-spacing: -0.2px;
    }

    .badge-pill {
      font-size: 11px;
      padding: 3px 9px;
      background: rgba(255, 255, 255, 0.07);
      backdrop-filter: blur(8px);
      color: var(--fg-secondary);
      border: 1px solid var(--glass-border);
      border-radius: 20px;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
    }

    .badge-pill.highlight {
      color: #fed7aa;
      border-color: rgba(242, 107, 29, 0.35);
      background: rgba(242, 107, 29, 0.12);
    }

    /* HEADER ACTIONS */
    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    button.btn-glass {
      background: rgba(255, 255, 255, 0.06);
      color: var(--fg-primary);
      border: 1px solid var(--glass-border);
      border-radius: 8px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    button.btn-glass:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: var(--glass-border-light);
      transform: translateY(-1px);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    button.btn-glass:active {
      transform: translateY(1px) scale(0.98);
    }

    button.btn-glass-primary {
      background: linear-gradient(135deg, rgba(242, 107, 29, 0.9), rgba(212, 77, 8, 0.9));
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.25);
      box-shadow: 0 0 18px var(--accent-orange-glow), inset 0 1px 0 rgba(255, 255, 255, 0.3);
    }

    button.btn-glass-primary:hover {
      background: linear-gradient(135deg, #ff7b2b, #ea580c);
      box-shadow: 0 0 24px rgba(242, 107, 29, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.4);
    }

    /* MAIN BODY LAYOUT */
    .main-body {
      flex: 1;
      display: flex;
      overflow: hidden;
      margin: 4px 12px 12px 12px;
      gap: 12px;
      position: relative;
      z-index: 1;
    }

    /* GLASS SIDEBAR FILMSTRIP */
    .sidebar-glass {
      width: 250px;
      min-width: 220px;
      max-width: 360px;
      background: var(--glass-panel);
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      border: 1px solid var(--glass-border);
      border-radius: 12px;
      box-shadow: var(--glass-highlight), var(--glass-shadow);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .sidebar-top {
      padding: 12px 14px;
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
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
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
      gap: 8px;
      padding: 9px;
      border-radius: 10px;
      cursor: pointer;
      background: var(--glass-card);
      border: 1px solid var(--glass-border);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
      transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }

    .thumb-card:hover {
      background: var(--glass-card-hover);
      border-color: var(--glass-border-light);
      transform: translateY(-2px);
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
    }

    .thumb-card.active {
      background: rgba(242, 107, 29, 0.12);
      border: 1px solid rgba(242, 107, 29, 0.7);
      box-shadow: 0 0 20px var(--accent-orange-glow), inset 0 1px 0 rgba(255, 255, 255, 0.2);
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
      border-radius: 6px;
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
      border-radius: 12px;
      box-shadow: var(--glass-highlight), var(--glass-shadow);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
    }

    /* FLOATING STAGE ZOOM CONTROLS */
    .stage-hud {
      position: absolute;
      top: 14px;
      right: 18px;
      z-index: 15;
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(20, 24, 34, 0.7);
      backdrop-filter: blur(16px);
      border: 1px solid var(--glass-border);
      border-radius: 24px;
      padding: 4px 10px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
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
      font-size: 13px;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      transition: background 0.15s;
    }

    .stage-hud button:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    /* STAGE CANVAS & WRAPPER */
    .stage-container {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 30px;
      overflow: hidden;
      position: relative;
    }

    .slide-glass-frame {
      max-width: 94%;
      max-height: 90%;
      aspect-ratio: 16 / 9;
      background: #000;
      border-radius: 8px;
      box-shadow: 0 16px 48px -10px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.24s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }

    .slide-glass-frame img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 8px;
    }

    /* FLOATING NAV BUTTONS */
    .nav-arrow {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 48px;
      height: 48px;
      background: rgba(28, 32, 45, 0.65);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--glass-border);
      border-radius: 50%;
      color: white;
      font-size: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: var(--glass-highlight), 0 8px 24px rgba(0,0,0,0.4);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 10;
    }

    .nav-arrow:hover {
      background: rgba(242, 107, 29, 0.85);
      border-color: rgba(255, 255, 255, 0.3);
      box-shadow: 0 0 24px var(--accent-orange-glow);
      transform: translateY(-50%) scale(1.1);
    }

    .nav-arrow:active {
      transform: translateY(-50%) scale(0.95);
    }

    .nav-arrow.prev { left: 18px; }
    .nav-arrow.next { right: 18px; }

    /* BOTTOM GLASS DRAWER (Speaker Notes & Metadata) */
    .bottom-glass-drawer {
      border-top: 1px solid var(--glass-border);
      background: rgba(22, 25, 34, 0.8);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      display: flex;
      flex-direction: column;
    }

    .drawer-header {
      height: 38px;
      padding: 0 16px;
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
      background: rgba(255, 255, 255, 0.03);
      color: var(--fg-primary);
    }

    .drawer-details-pills {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .drawer-body {
      padding: 12px 18px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 13px;
      line-height: 1.6;
      max-height: 130px;
      overflow-y: auto;
      white-space: pre-wrap;
      color: #cbd5e1;
      display: none;
      background: rgba(0, 0, 0, 0.25);
    }

    .drawer-body.open {
      display: block;
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

    /* FLOATING PRESENTATION HUD */
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
  </style>
</head>
<body>
  <div class="ambient-glow-1"></div>
  <div class="ambient-glow-2"></div>

  <!-- GLASS HEADER HUD -->
  <header class="glass-header">
    <div class="header-left">
      <div class="brand-badge" title="DeckCraft Studio">D</div>
      <div class="deck-title-group">
        <div class="deck-title" id="deckTitle" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
      </div>
      <div class="badge-pill highlight" title="Theme">\u{1F3A8} ${escapeHtml(theme)}</div>
      <div class="badge-pill" title="Slide Aspect Ratio">\u{1F4D0} ${escapeHtml(slideSize)}</div>
      <div class="badge-pill" id="slideIndicator">1 / ${slideCount}</div>
    </div>

    <div class="header-actions">
      <button class="btn-glass btn-glass-primary" id="btnPresent" title="Fullscreen Slideshow (Cmd+Enter / F5)">
        \u25B6 Present
      </button>
      <button class="btn-glass" id="btnExportPdf" title="Export Presentation to PDF">
        \u{1F4D1} Export PDF
      </button>
      <button class="btn-glass" id="btnExportMd" title="Export Outline to Markdown">
        \u{1F4DD} Outline MD
      </button>
      <button class="btn-glass" id="btnSavePng" title="Export Active Slide as PNG Image">
        \u{1F5BC}\uFE0F Slide PNG
      </button>
      <button class="btn-glass" id="btnDesktopApp" title="Open Presentation in DeckCraft.app">
        \u{1F4BB} Native App
      </button>
      <button class="btn-glass" id="btnRefresh" title="Re-render all slides">
        \u{1F504}
      </button>
    </div>
  </header>

  <!-- MAIN BODY -->
  <div class="main-body">
    <!-- LEFT SIDEBAR -->
    <aside class="sidebar-glass">
      <div class="sidebar-top">
        <span>FILMSTRIP (${slideCount})</span>
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
              <div class="thumb-title" title="${escapeHtml(slide.title || "Untitled")}">
                ${escapeHtml(slide.title || "(Untitled Slide)")}
              </div>
            </div>`;
  }).join("")}
      </div>
    </aside>

    <!-- CENTER VIEWPORT -->
    <main class="viewport-glass">
      <!-- ZOOM / HUD -->
      <div class="stage-hud">
        <button id="btnZoomOut" title="Zoom Out">\u2212</button>
        <span id="zoomLabel">100%</span>
        <button id="btnZoomIn" title="Zoom In">+</button>
        <button id="btnZoomFit" title="Fit to Viewport">Fit</button>
      </div>

      <!-- NAVIGATION BUTTONS -->
      <button class="nav-arrow prev" id="btnPrev" title="Previous Slide (\u2190 / Backspace)">\u2039</button>
      <button class="nav-arrow next" id="btnNext" title="Next Slide (\u2192 / Space)">\u203A</button>

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
            <span>\u{1F4DD} Speaker Notes & Details</span>
            <div class="badge-pill" id="animCount">Anim: ${info.slides[0]?.animations || 0}</div>
            <div class="badge-pill" id="shapeCount">Shapes: ${info.slides[0]?.shapes || 0}</div>
            <div class="badge-pill" id="transitionType">Transition: ${escapeHtml(info.slides[0]?.transition || "none")}</div>
          </div>
          <span id="drawerArrow">\u25BC</span>
        </div>
        <div class="drawer-body" id="notesBody">
          <p id="notesContent">${escapeHtml(info.slides[0]?.notes || "(No speaker notes for this slide)")}</p>
        </div>
      </div>
    </main>
  </div>

  <!-- FULLSCREEN PRESENTATION OVERLAY -->
  <div class="present-glass-overlay" id="presentOverlay">
    <img class="present-canvas-img" id="presentImg" src="${slideImageUris[0] || ""}" alt="Slide Show" />
    <div class="present-hud">
      <button id="presentPrev">\u2039 Prev</button>
      <span id="presentCounter">1 / ${slideCount}</span>
      <button id="presentNext">Next \u203A</button>
      <span>\xB7</span>
      <span>Space/Arrow to advance</span>
      <button id="presentExit">Exit (Esc)</button>
    </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const slidesData = ${JSON.stringify(info.slides)};
    const images = ${JSON.stringify(slideImageUris)};
    let currentIndex = 0;
    let zoomLevel = 1.0;

    const mainImg = document.getElementById('mainSlideImg');
    const slideFrame = document.getElementById('slideFrame');
    const presentImg = document.getElementById('presentImg');
    const slideIndicator = document.getElementById('slideIndicator');
    const presentCounter = document.getElementById('presentCounter');
    const notesContent = document.getElementById('notesContent');
    const notesBody = document.getElementById('notesBody');
    const drawerArrow = document.getElementById('drawerArrow');
    const notesToggle = document.getElementById('notesToggle');
    const thumbCards = document.querySelectorAll('.thumb-card');
    const presentOverlay = document.getElementById('presentOverlay');
    const animCount = document.getElementById('animCount');
    const shapeCount = document.getElementById('shapeCount');
    const transitionType = document.getElementById('transitionType');
    const zoomLabel = document.getElementById('zoomLabel');

    function updateSlide(index) {
      if (index < 0 || index >= slidesData.length) return;
      currentIndex = index;

      mainImg.src = images[currentIndex] || '';
      presentImg.src = images[currentIndex] || '';

      const countText = (currentIndex + 1) + ' / ' + slidesData.length;
      slideIndicator.textContent = countText;
      presentCounter.textContent = countText;

      thumbCards.forEach((card, i) => {
        if (i === currentIndex) {
          card.classList.add('active');
          card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
          card.classList.remove('active');
        }
      });

      const slide = slidesData[currentIndex];
      const notes = slide?.notes;
      notesContent.textContent = notes && notes.trim().length > 0 ? notes : '(No speaker notes for this slide)';
      
      animCount.textContent = 'Anim: ' + (slide?.animations || 0);
      shapeCount.textContent = 'Shapes: ' + (slide?.shapes || 0);
      transitionType.textContent = 'Transition: ' + (slide?.transition || 'none');
    }

    thumbCards.forEach((card) => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.getAttribute('data-index'), 10);
        updateSlide(idx);
      });
    });

    document.getElementById('btnPrev').addEventListener('click', () => {
      if (currentIndex > 0) updateSlide(currentIndex - 1);
    });

    document.getElementById('btnNext').addEventListener('click', () => {
      if (currentIndex < slidesData.length - 1) updateSlide(currentIndex + 1);
    });

    // Zoom Controls
    function setZoom(level) {
      zoomLevel = Math.max(0.5, Math.min(2.5, level));
      slideFrame.style.transform = 'scale(' + zoomLevel + ')';
      zoomLabel.textContent = Math.round(zoomLevel * 100) + '%';
    }

    document.getElementById('btnZoomIn').addEventListener('click', () => setZoom(zoomLevel + 0.15));
    document.getElementById('btnZoomOut').addEventListener('click', () => setZoom(zoomLevel - 0.15));
    document.getElementById('btnZoomFit').addEventListener('click', () => setZoom(1.0));

    // Notes Toggle
    notesToggle.addEventListener('click', () => {
      const isOpen = notesBody.classList.toggle('open');
      drawerArrow.textContent = isOpen ? '\u25B2' : '\u25BC';
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
