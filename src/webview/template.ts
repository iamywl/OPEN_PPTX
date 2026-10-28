import * as vscode from 'vscode';
import { DeckCraftInfo, DeckCraftShape } from '../deckcraftCli';

export function getWebviewContent(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  documentUri: vscode.Uri,
  info: DeckCraftInfo,
  slideImageUris: string[],
  initialFileBase64: string = '',
  koreanFontWebviewUri: string = '',
  wasmJsUri: string = '',
  wasmBgUri: string = ''
): string {
  const nonce = getNonce();
  const fileName = documentUri.path.split('/').pop() || 'presentation.pptx';
  const filePath = (documentUri as any).fsPath || documentUri.path || fileName;
  const title = info.title || fileName || 'Presentation';
  const slideCount = info.slides.length;
  const theme = info.theme || 'Default';
  const slideSize = info.slideSize ? `${info.slideSize[0]}×${info.slideSize[1]}` : '16:9';
  const initialShapes = info.slideShapes || {};

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data: blob: https:; style-src 'unsafe-inline'; font-src ${webview.cspSource} data: https:; connect-src ${webview.cspSource} https: data: blob:; script-src 'nonce-${nonce}' 'wasm-unsafe-eval' ${webview.cspSource};">
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

    /* ========================================================
       MICROSOFT POWERPOINT OFFICIAL OFFICE RIBBON & SHELL
       ======================================================== */
    .office-titlebar {
      height: 40px;
      min-height: 40px;
      background: #1a1d26;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 12px;
      gap: 10px;
      z-index: 100;
    }

    .office-titlebar-left {
      display: flex;
      align-items: center;
      gap: 10px;
      overflow: hidden;
    }

    .office-brand-badge {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      background: linear-gradient(135deg, #d24726, #b0361a);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 800;
      font-size: 14px;
      box-shadow: 0 2px 6px rgba(210, 71, 38, 0.4);
      flex-shrink: 0;
    }

    .office-doc-title {
      font-size: 13px;
      font-weight: 600;
      color: #f1f5f9;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 260px;
    }

    .office-quick-access {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .office-quick-btn {
      background: transparent;
      border: 1px solid transparent;
      border-radius: 4px;
      color: #94a3b8;
      width: 26px;
      height: 26px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.15s;
    }
    .office-quick-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.15);
    }

    .office-titlebar-right {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* RIBBON TABS (홈, 삽입, 디자인, 전환, 애니메이션, 슬라이드 쇼, 검토, 보기) */
    .office-ribbon-tabs {
      height: 32px;
      min-height: 32px;
      background: #161822;
      display: flex;
      align-items: center;
      padding: 0 10px;
      gap: 2px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      z-index: 90;
    }

    .ribbon-tab {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 12px;
      font-weight: 500;
      padding: 6px 14px;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.15s;
    }
    .ribbon-tab:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.04);
    }
    .ribbon-tab.active {
      color: #ffffff;
      font-weight: 600;
      border-bottom: 2px solid #ea580c;
      background: rgba(255, 255, 255, 0.06);
    }

    /* RIBBON CONTENT PANELS (OFFICE TOOLBAR) */
    .office-ribbon-content {
      background: #202430;
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
      z-index: 80;
      height: 92px;
      min-height: 92px;
      position: relative;
    }

    .ribbon-tab-pane {
      display: none;
      height: 100%;
      align-items: stretch;
      padding: 4px 10px;
      gap: 6px;
      overflow-x: auto;
    }
    .ribbon-tab-pane.active {
      display: flex;
    }

    /* RIBBON GROUP BOX */
    .ribbon-group-box {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      padding: 0 8px 3px 8px;
      border-right: 1px solid rgba(255, 255, 255, 0.1);
      flex-shrink: 0;
    }

    .ribbon-group-items {
      display: flex;
      align-items: center;
      gap: 4px;
      flex: 1;
    }

    .ribbon-group-title {
      font-size: 9.5px;
      color: #64748b;
      letter-spacing: 0.3px;
      font-weight: 500;
      user-select: none;
    }

    /* LARGE RIBBON BUTTON */
    .ribbon-btn-large {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 4px;
      padding: 4px 8px;
      min-width: 52px;
      height: 58px;
      cursor: pointer;
      color: #e2e8f0;
      gap: 3px;
      transition: all 0.15s;
    }
    .ribbon-btn-large:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.15);
      color: #ffffff;
    }
    .ribbon-btn-large .btn-icon {
      font-size: 20px;
    }
    .ribbon-btn-large .btn-label {
      font-size: 11px;
      white-space: nowrap;
    }

    /* 2-ROW GRID & SMALL BUTTONS */
    .ribbon-col-group {
      display: flex;
      flex-direction: column;
      gap: 3px;
      justify-content: center;
    }

    .ribbon-row-group {
      display: flex;
      align-items: center;
      gap: 3px;
    }

    .ribbon-btn-small {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      color: #cbd5e1;
      font-size: 11px;
      padding: 3px 7px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
      height: 25px;
      transition: all 0.15s;
    }
    .ribbon-btn-small:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.2);
      color: #ffffff;
    }

    .ribbon-tool-btn {
      width: 25px;
      height: 25px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      color: #cbd5e1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 11.5px;
      font-weight: 600;
      transition: all 0.15s;
    }
    .ribbon-tool-btn:hover {
      background: rgba(255, 255, 255, 0.15);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.25);
    }
    .ribbon-tool-btn.active {
      background: rgba(234, 88, 12, 0.25);
      border-color: #ea580c;
      color: #fed7aa;
    }

    .ribbon-select {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #f1f5f9;
      border-radius: 3px;
      padding: 2px 6px;
      font-size: 11.5px;
      height: 25px;
      outline: none;
    }

    /* COLOR PICKER LABEL */
    .ribbon-color-box {
      width: 25px;
      height: 25px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      position: relative;
    }
    .ribbon-color-box:hover {
      background: rgba(255, 255, 255, 0.15);
    }
    .ribbon-color-box span {
      font-size: 10px;
      font-weight: 700;
    }
    .color-bar {
      width: 14px;
      height: 3px;
      margin-top: 1px;
      background: #f26b1d;
      border-radius: 1px;
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
      margin: 4px 10px 4px 10px;
      gap: 10px;
      position: relative;
      z-index: 1;
    }

    /* ========================================================
       MICROSOFT POWERPOINT STATUS BAR (BOTTOM)
       ======================================================== */
    .office-status-bar {
      height: 28px;
      min-height: 28px;
      background: #181b24;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 12px;
      font-size: 11px;
      color: #94a3b8;
      z-index: 100;
      user-select: none;
    }

    .status-left, .status-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .status-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      cursor: default;
    }

    .status-separator {
      color: rgba(255, 255, 255, 0.15);
    }

    .status-btn {
      background: transparent;
      border: 1px solid transparent;
      border-radius: 3px;
      color: #94a3b8;
      font-size: 11px;
      padding: 2px 7px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s;
    }
    .status-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.15);
    }

    .status-zoom-group {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .status-zoom-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      width: 18px;
      height: 18px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 2px;
    }
    .status-zoom-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
    }

    .status-zoom-slider {
      width: 80px;
      height: 4px;
      accent-color: #ea580c;
      cursor: pointer;
    }

    .status-zoom-pct {
      min-width: 38px;
      text-align: right;
      color: #cbd5e1;
      font-weight: 500;
    }

    /* THUMBNAIL ROW (SIDE NUMBER COLUMN) */
    .thumb-row {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      width: 100%;
    }

    .thumb-num {
      font-size: 11px;
      font-weight: 600;
      color: #94a3b8;
      min-width: 16px;
      text-align: right;
      padding-top: 6px;
      user-select: none;
    }

    .thumb-row.active .thumb-num {
      color: #ea580c;
      font-weight: 700;
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

    /* STAGE CANVAS & INTERACTIVE OVERLAY */
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
      pointer-events: none;
    }

    /* INTERACTIVE WYSIWYG SHAPE OVERLAY LAYER */
    .shape-overlay-layer {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: auto;
    }

    .shape-box-overlay {
      position: absolute;
      border: 1.5px dashed rgba(14, 165, 233, 0.4);
      border-radius: 4px;
      cursor: move;
      transition: border-color 0.15s, background 0.15s;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      user-select: none;
    }

    .shape-box-overlay:hover {
      border-color: rgba(14, 165, 233, 0.9);
      background: rgba(14, 165, 233, 0.08);
    }

    .shape-box-overlay.selected {
      border: 2px solid var(--accent-orange) !important;
      background: rgba(242, 107, 29, 0.08) !important;
      box-shadow: 0 0 14px var(--accent-orange-glow);
    }

    .shape-box-overlay.dragging {
      opacity: 0.85;
      border-style: solid;
      border-color: #38bdf8 !important;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
    }

    /* 8-POINT RESIZE HANDLES */
    .resize-handle {
      position: absolute;
      width: 9px;
      height: 9px;
      background: #ffffff;
      border: 2px solid var(--accent-orange);
      border-radius: 50%;
      z-index: 30;
      display: none;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
    }

    .shape-box-overlay.selected .resize-handle {
      display: block;
    }

    .handle-nw { top: -5px; left: -5px; cursor: nwse-resize; }
    .handle-n  { top: -5px; left: calc(50% - 5px); cursor: ns-resize; }
    .handle-ne { top: -5px; right: -5px; cursor: nesw-resize; }
    .handle-e  { top: calc(50% - 5px); right: -5px; cursor: ew-resize; }
    .handle-se { bottom: -5px; right: -5px; cursor: nwse-resize; }
    .handle-s  { bottom: -5px; left: calc(50% - 5px); cursor: ns-resize; }
    .handle-sw { bottom: -5px; left: -5px; cursor: nesw-resize; }
    .handle-w  { top: calc(50% - 5px); left: -5px; cursor: ew-resize; }

    /* INLINE DIRECT TEXT EDITING */
    .inline-text-editor {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      outline: 2px solid #0ea5e9;
      background: rgba(15, 23, 42, 0.95);
      color: #ffffff;
      padding: 6px 8px;
      font-family: var(--font-family);
      font-size: 14px;
      line-height: 1.35;
      cursor: text;
      overflow-y: auto;
      word-break: break-word;
      white-space: pre-wrap;
      border-radius: 4px;
      user-select: text;
      -webkit-user-select: text;
      z-index: 50;
      box-shadow: 0 0 16px rgba(14, 165, 233, 0.6);
      box-sizing: border-box;
    }

    .shape-quick-bar {
      position: absolute;
      top: -36px;
      left: 0;
      background: rgba(20, 24, 34, 0.95);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid var(--glass-border);
      border-radius: 6px;
      padding: 3px 6px;
      display: none;
      align-items: center;
      gap: 4px;
      z-index: 60;
      white-space: nowrap;
      box-shadow: 0 6px 18px rgba(0,0,0,0.6);
    }

    .shape-box-overlay.selected .shape-quick-bar {
      display: flex;
    }

    .shape-quick-bar button {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 4px;
      color: white;
      font-size: 11px;
      padding: 2px 7px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 3px;
      transition: background 0.15s;
    }
    .shape-quick-bar button:hover {
      background: rgba(255, 255, 255, 0.25);
    }
    .shape-quick-bar button.btn-del-shape:hover {
      background: rgba(239, 68, 68, 0.5);
      border-color: rgba(239, 68, 68, 0.8);
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

    /* NATIVE WASM ENGINE FULL-STUDIO CONTAINER */
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .wasm-studio-container {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      z-index: 500;
      background: #0b0e17;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .wasm-studio-container.hidden {
      display: none !important;
    }

    #deckcraft_canvas {
      width: 100%;
      height: 100%;
      display: block;
      outline: none;
    }

    #deckcraft_loading {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 14px;
      background: radial-gradient(circle at 50% 35%, rgba(28, 34, 52, 0.94), rgba(11, 14, 23, 0.98));
      backdrop-filter: blur(24px);
      color: #f1f5f9;
      z-index: 510;
      font-size: 14px;
      letter-spacing: 0.3px;
    }

    .engine-mode-switcher {
      position: fixed;
      bottom: 3px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 600;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(17, 21, 34, 0.84);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(86, 122, 184, 0.42);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16), 0 6px 20px rgba(0, 0, 0, 0.55);
      font-size: 11px;
      color: #cbd5e1;
    }

    .engine-mode-btn {
      background: transparent;
      border: 1px solid transparent;
      color: #94a3b8;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 999px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .engine-mode-btn:hover {
      color: #f8fafc;
      background: rgba(56, 189, 248, 0.14);
    }

    .engine-mode-btn.active {
      background: linear-gradient(135deg, #f26b1d, #d9530f);
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(242, 107, 29, 0.45);
    }
  </style>
</head>
<body>
  <div class="ambient-glow-1"></div>
  <div class="ambient-glow-2"></div>

  <!-- 100% NATIVE DECKCRAFT RUST/EGUI WASM ENGINE CONTAINER -->
  <div class="wasm-studio-container" id="wasmStudioContainer">
    <div id="deckcraft_loading">
      <div style="width:38px;height:38px;border:3px solid rgba(56,189,248,0.2);border-top-color:#f26b1d;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
      <div>⚡ DeckCraft Native Engine (WASM + Glassmorphism UI) 로딩 중&hellip;</div>
    </div>
    <canvas id="deckcraft_canvas"></canvas>
  </div>

  <!-- FLOATING GLASS ENGINE SWITCHER HUD -->
  <div class="engine-mode-switcher" id="engineModeSwitcher">
    <button class="engine-mode-btn active" id="btnModeWasm" title="네이티브 앱과 100% 동일한 Rust egui/WebGL2 엔진">⚡ Native Engine (1:1)</button>
    <button class="engine-mode-btn" id="btnModeClassic" title="HTML 글래스모피즘 리본 모드">🪟 Webview UI</button>
    <button class="engine-mode-btn" id="btnModeNativeApp" title="macOS DeckCraft.app 데스크톱 앱 실행">💻 DeckCraft.app</button>
  </div>

  <!-- TOP OFFICE TITLEBAR -->
  <header class="office-titlebar">
    <div class="office-titlebar-left">
      <div class="office-brand-badge" title="OPEN_PPTX Studio (PowerPoint Engine)">P</div>
      <div class="office-doc-title" id="deckTitle" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
      <div class="badge-pill highlight" id="themeBadge">🎨 ${escapeHtml(theme)}</div>
      <div class="badge-pill" id="sizeBadge">📐 ${escapeHtml(slideSize)}</div>
      <div class="badge-pill" id="slideIndicator">1 / ${slideCount}</div>
      <div class="office-quick-access">
        <button class="office-quick-btn" id="btnQuickUndo" title="실행 취소 (Cmd+Z)">↩️</button>
        <button class="office-quick-btn" id="btnQuickRedo" title="다시 실행 (Cmd+Y)">↪️</button>
      </div>
    </div>

    <div class="office-titlebar-right">
      <button class="btn-glass btn-glass-primary" id="btnPresent" title="전체화면 슬라이드 쇼 (F5 / Cmd+Enter)">
        ▶ 슬라이드 쇼
      </button>
      <button class="btn-glass" id="btnPowerPointApp" title="Microsoft PowerPoint 앱에서 열기">
        📊 PowerPoint 앱
      </button>
      <button class="btn-glass" id="btnDesktopApp" title="네이티브 DeckCraft 앱에서 열기">
        💻 DeckCraft 앱
      </button>
      <button class="btn-glass" id="btnExportPdf" title="벡터 PDF로 내보내기">
        📑 PDF
      </button>
      <button class="btn-glass" id="btnExportMd" title="마크다운 개요 추출">
        📝 개요 MD
      </button>
      <button class="btn-glass" id="btnSavePng" title="현재 슬라이드 PNG 저장">
        🖼️ 슬라이드 PNG
      </button>
      <button class="btn-glass" id="btnRefresh" title="새로고침">
        🔄
      </button>
    </div>
  </header>

  <!-- MICROSOFT POWERPOINT RIBBON TABS -->
  <nav class="office-ribbon-tabs">
    <button class="ribbon-tab active" data-tab="tabHome">홈</button>
    <button class="ribbon-tab" data-tab="tabInsert">삽입</button>
    <button class="ribbon-tab" data-tab="tabDesign">디자인</button>
    <button class="ribbon-tab" data-tab="tabTransitions">전환</button>
    <button class="ribbon-tab" data-tab="tabSlideshow">슬라이드 쇼</button>
    <button class="ribbon-tab" data-tab="tabView">보기</button>
  </nav>

  <!-- MICROSOFT POWERPOINT RIBBON TOOLBAR PANELS -->
  <div class="office-ribbon-content">
    <!-- TAB 1: 홈 (HOME) -->
    <div class="ribbon-tab-pane active" id="tabHome">
      <!-- GROUP: 슬라이드 -->
      <div class="ribbon-group-box">
        <div class="ribbon-group-items">
          <button class="ribbon-btn-large" id="btnNewSlideModal" title="새 슬라이드 추가 (Cmd+M)">
            <span class="btn-icon">➕</span>
            <span class="btn-label">새 슬라이드</span>
          </button>
          <div class="ribbon-col-group">
            <button class="ribbon-btn-small" id="btnDuplicateSlide" title="현재 슬라이드 복제 (Cmd+D)">📋 슬라이드 복제</button>
            <button class="ribbon-btn-small" id="btnDeleteSlide" title="현재 슬라이드 삭제">🗑️ 슬라이드 삭제</button>
            <button class="ribbon-btn-small" id="btnRenameModal" title="슬라이드 제목 수정">🏷️ 제목 수정</button>
          </div>
        </div>
        <span class="ribbon-group-title">슬라이드</span>
      </div>

      <!-- GROUP: 글꼴 -->
      <div class="ribbon-group-box">
        <div class="ribbon-group-items">
          <div class="ribbon-col-group">
            <div class="ribbon-row-group">
              <select class="ribbon-select" id="ribbonFontFamily" title="글꼴 선택" style="width: 140px;">
                <option value="Pretendard">Pretendard</option>
                <option value="Apple SD Gothic Neo">Apple SD 산돌고딕 Neo</option>
                <option value="Malgun Gothic">맑은 고딕</option>
                <option value="Arial">Arial</option>
                <option value="Georgia">Georgia</option>
              </select>
              <select class="ribbon-select" id="ribbonFontSize" title="글꼴 크기" style="width: 58px;">
                <option value="12">12</option>
                <option value="14">14</option>
                <option value="16">16</option>
                <option value="18" selected>18</option>
                <option value="20">20</option>
                <option value="24">24</option>
                <option value="28">28</option>
                <option value="32">32</option>
                <option value="40">40</option>
                <option value="54">54</option>
                <option value="72">72</option>
              </select>
              <button class="ribbon-tool-btn" id="btnRibbonGrow" title="글자 확대 (Cmd+])">가+</button>
              <button class="ribbon-tool-btn" id="btnRibbonShrink" title="글자 축소 (Cmd+[)">가-</button>
            </div>
            <div class="ribbon-row-group">
              <button class="ribbon-tool-btn font-bold" id="btnRibbonBold" title="굵게 (Cmd+B)"><b>B</b></button>
              <button class="ribbon-tool-btn font-italic" id="btnRibbonItalic" title="기울임꼴 (Cmd+I)"><i>I</i></button>
              <button class="ribbon-tool-btn font-underline" id="btnRibbonUnderline" title="밑줄 (Cmd+U)"><u>U</u></button>
              <button class="ribbon-tool-btn" id="btnRibbonShadow" title="텍스트 그림자">S</button>
              <label class="ribbon-color-box" title="글자 색상 변경">
                <span>Aa</span>
                <div class="color-bar" id="fontColorBar"></div>
                <input type="color" id="ribbonFontColor" value="#f26b1d" style="opacity:0; position:absolute; width:1px; height:1px;" />
              </label>
              <label class="ribbon-color-box" title="도형 채우기 색상">
                <span>🎨</span>
                <div class="color-bar" id="fillColorBar" style="background:#0ea5e9;"></div>
                <input type="color" id="ribbonFillColor" value="#0ea5e9" style="opacity:0; position:absolute; width:1px; height:1px;" />
              </label>
            </div>
          </div>
        </div>
        <span class="ribbon-group-title">글꼴 및 서식</span>
      </div>

      <!-- GROUP: 단락 -->
      <div class="ribbon-group-box">
        <div class="ribbon-group-items">
          <div class="ribbon-col-group">
            <div class="ribbon-row-group">
              <button class="ribbon-tool-btn" id="btnAlignLeft" title="왼쪽 맞춤">⫷</button>
              <button class="ribbon-tool-btn" id="btnAlignCenter" title="가운데 맞춤">≡</button>
              <button class="ribbon-tool-btn" id="btnAlignRight" title="오른쪽 맞춤">⫸</button>
            </div>
            <div class="ribbon-row-group">
              <button class="ribbon-btn-small" id="btnEditTextOverlay" title="선택 텍스트 직접 편집 (Enter)">✏️ 인라인 수정</button>
            </div>
          </div>
        </div>
        <span class="ribbon-group-title">단락</span>
      </div>

      <!-- GROUP: 그리기 -->
      <div class="ribbon-group-box">
        <div class="ribbon-group-items">
          <button class="ribbon-btn-large" id="btnTextBoxModal" title="텍스트 상자 삽입">
            <span class="btn-icon">📝</span>
            <span class="btn-label">텍스트 상자</span>
          </button>
          <button class="ribbon-btn-large" id="btnShapeModal" title="도형 삽입">
            <span class="btn-icon">🔲</span>
            <span class="btn-label">도형 삽입</span>
          </button>
          <div class="ribbon-col-group">
            <button class="ribbon-btn-small" id="btnQuickRect" title="직사각형 삽입">⬜ 직사각형</button>
            <button class="ribbon-btn-small" id="btnQuickEllipse" title="타원 삽입">⭕ 타원</button>
          </div>
          <div class="ribbon-col-group">
            <button class="ribbon-btn-small" id="btnBringFront" title="맨 앞으로 가져오기">⬆️ 맨 앞</button>
            <button class="ribbon-btn-small" id="btnSendBack" title="맨 뒤로 보내기">⬇️ 맨 뒤</button>
          </div>
        </div>
        <span class="ribbon-group-title">그리기</span>
      </div>
    </div>

    <!-- TAB 2: 삽입 (INSERT) -->
    <div class="ribbon-tab-pane" id="tabInsert">
      <div class="ribbon-group-box">
        <div class="ribbon-group-items">
          <button class="ribbon-btn-large" onclick="document.getElementById('btnNewSlideModal').click()">
            <span class="btn-icon">➕</span>
            <span class="btn-label">새 슬라이드</span>
          </button>
          <button class="ribbon-btn-large" onclick="document.getElementById('btnTextBoxModal').click()">
            <span class="btn-icon">📝</span>
            <span class="btn-label">텍스트 상자</span>
          </button>
          <button class="ribbon-btn-large" onclick="document.getElementById('btnShapeModal').click()">
            <span class="btn-icon">🔲</span>
            <span class="btn-label">도형 삽입</span>
          </button>
        </div>
        <span class="ribbon-group-title">요소 삽입</span>
      </div>
      <div class="ribbon-group-box">
        <div class="ribbon-group-items">
          <button class="ribbon-btn-large" onclick="document.getElementById('btnExportPdf').click()">
            <span class="btn-icon">📑</span>
            <span class="btn-label">PDF 변환</span>
          </button>
          <button class="ribbon-btn-large" onclick="document.getElementById('btnExportMd').click()">
            <span class="btn-icon">📝</span>
            <span class="btn-label">마크다운</span>
          </button>
          <button class="ribbon-btn-large" onclick="document.getElementById('btnSavePng').click()">
            <span class="btn-icon">🖼️</span>
            <span class="btn-label">슬라이드 PNG</span>
          </button>
        </div>
        <span class="ribbon-group-title">내보내기</span>
      </div>
    </div>

    <!-- TAB 3: 디자인 (DESIGN) -->
    <div class="ribbon-tab-pane" id="tabDesign">
      <div class="ribbon-group-box">
        <div class="ribbon-group-items">
          <button class="ribbon-btn-small" onclick="alert('테마: DeckCraft가 적용되어 있습니다.')">🎨 기본 테마</button>
          <button class="ribbon-btn-small" onclick="alert('슬라이드 배경 서식이 적용되어 있습니다.')">🌌 모던 테마</button>
        </div>
        <span class="ribbon-group-title">테마</span>
      </div>
      <div class="ribbon-group-box">
        <div class="ribbon-group-items">
          <button class="ribbon-btn-small">📐 16:9 와이드스크린 (기본)</button>
          <button class="ribbon-btn-small">📐 4:3 표준</button>
        </div>
        <span class="ribbon-group-title">슬라이드 크기</span>
      </div>
    </div>

    <!-- TAB 4: 전환 (TRANSITIONS) -->
    <div class="ribbon-tab-pane" id="tabTransitions">
      <div class="ribbon-group-box">
        <div class="ribbon-group-items">
          <button class="ribbon-btn-small">없음</button>
          <button class="ribbon-btn-small" style="color:#38bdf8;">페이드 (Fade)</button>
          <button class="ribbon-btn-small">밀어내기 (Push)</button>
          <button class="ribbon-btn-small">닦아내기 (Wipe)</button>
          <button class="ribbon-btn-small">분할 (Split)</button>
        </div>
        <span class="ribbon-group-title">이 슬라이드로 전환</span>
      </div>
    </div>

    <!-- TAB 5: 슬라이드 쇼 (SLIDE SHOW) -->
    <div class="ribbon-tab-pane" id="tabSlideshow">
      <div class="ribbon-group-box">
        <div class="ribbon-group-items">
          <button class="ribbon-btn-large" onclick="document.getElementById('btnPresent').click()">
            <span class="btn-icon">▶</span>
            <span class="btn-label">처음부터 (F5)</span>
          </button>
          <div class="ribbon-col-group">
            <button class="ribbon-btn-small" id="btnMoveUp" title="슬라이드 위로 이동">⬆️ 슬라이드 위로</button>
            <button class="ribbon-btn-small" id="btnMoveDown" title="슬라이드 아래로 이동">⬇️ 슬라이드 아래로</button>
          </div>
        </div>
        <span class="ribbon-group-title">슬라이드 쇼 시작</span>
      </div>
    </div>

    <!-- TAB 6: 보기 (VIEW) -->
    <div class="ribbon-tab-pane" id="tabView">
      <div class="ribbon-group-box">
        <div class="ribbon-group-items">
          <button class="ribbon-btn-small" onclick="document.getElementById('btnZoomFit').click()">화면 맞춤 (Fit)</button>
          <button class="ribbon-btn-small" onclick="document.getElementById('btnZoomIn').click()">확대 (+)</button>
          <button class="ribbon-btn-small" onclick="document.getElementById('btnZoomOut').click()">축소 (-)</button>
          <button class="ribbon-btn-small" onclick="document.getElementById('notesToggle').click()">📝 메모 서랍 토글</button>
        </div>
        <span class="ribbon-group-title">확대/축소 및 표시</span>
      </div>
    </div>
  </div>

  <!-- MAIN BODY -->
  <div class="main-body">
    <!-- LEFT SIDEBAR -->
    <aside class="sidebar-glass">
      <div class="sidebar-top">
        <span>슬라이드 목록 (<span id="slideTotalBadge">${slideCount}</span>)</span>
        <span id="themeLabel">${escapeHtml(theme)}</span>
      </div>
      <div class="thumbnail-scroll" id="thumbList">
        ${info.slides
          .map((slide, i) => {
            const imgUri = slideImageUris[i] || '';
            const titleText = slide.title || ('슬라이드 ' + (i + 1));
            return `
            <div class="thumb-card ${i === 0 ? 'active' : ''}" data-index="${i}">
              <div class="thumb-card-top">
                <span class="thumb-idx">#${i + 1}</span>
                <span class="thumb-layout-tag">${escapeHtml(slide.layout || 'Slide')}</span>
              </div>
              <div class="thumb-img-box">
                <img src="${imgUri}" alt="Slide ${i + 1}" loading="lazy" />
              </div>
              <div class="thumb-title" title="${escapeHtml(titleText)}">
                ${escapeHtml(titleText)}
              </div>
            </div>`;
          })
          .join('')}
      </div>
    </aside>

    <!-- CENTER VIEWPORT -->
    <main class="viewport-glass">
      <!-- ZOOM / HUD -->
      <div class="stage-hud">
        <button id="btnZoomOut" title="축소">−</button>
        <span id="zoomLabel">100%</span>
        <button id="btnZoomIn" title="확대">+</button>
        <button id="btnZoomFit" title="화면 맞춤">Fit</button>
      </div>

      <!-- NAVIGATION BUTTONS -->
      <button class="nav-arrow prev" id="btnPrev" title="이전 슬라이드 (← / Backspace)">‹</button>
      <button class="nav-arrow next" id="btnNext" title="다음 슬라이드 (→ / Space)">›</button>

      <!-- STAGE CONTAINER -->
      <div class="stage-container" id="stageContainer">
        <div class="slide-glass-frame" id="slideFrame">
          <img id="mainSlideImg" src="${slideImageUris[0] || ''}" alt="Slide View" />
          <!-- INTERACTIVE WYSIWYG OVERLAY LAYER -->
          <div class="shape-overlay-layer" id="shapeOverlayLayer"></div>
        </div>
      </div>

      <!-- BOTTOM SPEAKER NOTES DRAWER -->
      <div class="bottom-glass-drawer">
        <div class="drawer-header" id="notesToggle">
          <div class="drawer-details-pills">
            <span>📝 발표자 메모 & 슬라이드 세부 정보</span>
            <div class="badge-pill" id="animCount">애니메이션: ${info.slides[0]?.animations || 0}</div>
            <div class="badge-pill" id="shapeCount">도형: ${info.slides[0]?.shapes || 0}</div>
            <div class="badge-pill" id="transitionType">전환: ${escapeHtml(info.slides[0]?.transition || '없음')}</div>
          </div>
          <span id="drawerArrow">▼</span>
        </div>
        <div class="drawer-body" id="notesBody">
          <textarea class="notes-textarea" id="notesInput" placeholder="이 슬라이드의 발표자 메모를 입력하세요...">${escapeHtml(info.slides[0]?.notes || '')}</textarea>
          <div style="display:flex; justify-content:flex-end;">
            <button class="btn-glass btn-glass-primary" id="btnSaveNotes">💾 메모 저장</button>
          </div>
        </div>
      </div>
    </main>
  </div>

  <!-- MICROSOFT POWERPOINT OFFICE BOTTOM STATUS BAR -->
  <footer class="office-status-bar">
    <div class="status-left">
      <span class="status-item" id="statusSlideIndex">슬라이드 1 / ${slideCount}</span>
      <span class="status-separator">|</span>
      <span class="status-item">한국어</span>
      <span class="status-separator">|</span>
      <span class="status-item" id="statusAccessibility">접근성: 검토 완료</span>
    </div>
    <div class="status-right">
      <button class="status-btn" id="btnStatusNotes" title="슬라이드 메모 보기/숨기기">📝 메모</button>
      <button class="status-btn" id="btnStatusPresent" title="슬라이드 쇼 시작 (F5)">▶ 슬라이드 쇼</button>
      <div class="status-zoom-group">
        <button class="status-zoom-btn" id="btnStatusZoomOut" title="축소">-</button>
        <input type="range" min="50" max="250" value="100" class="status-zoom-slider" id="statusZoomSlider" title="확대/축소 슬라이더" />
        <button class="status-zoom-btn" id="btnStatusZoomIn" title="확대">+</button>
        <span class="status-zoom-pct" id="statusZoomPct">100%</span>
        <button class="status-btn" id="btnStatusZoomFit" title="현재 창에 맞춤">⛶ 맞춤</button>
      </div>
    </div>
  </footer>

  <!-- FULLSCREEN PRESENTATION OVERLAY -->
  <div class="present-glass-overlay" id="presentOverlay">
    <img class="present-canvas-img" id="presentImg" src="${slideImageUris[0] || ''}" alt="Slide Show" />
    <div class="present-hud">
      <button id="presentPrev">‹ 이전</button>
      <span id="presentCounter">1 / ${slideCount}</span>
      <button id="presentNext">다음 ›</button>
      <span>·</span>
      <span>Space/방향키 이동</span>
      <button id="presentExit">종료 (Esc)</button>
    </div>
  </div>

  <!-- MODAL: DIRECT TEXT EDIT (WYSIWYG) -->
  <div class="modal-backdrop" id="modalEditText">
    <div class="glass-modal">
      <div class="modal-title">
        <span>✏️ 슬라이드 텍스트 직접 수정</span>
        <button class="btn-glass modal-close" data-close="modalEditText">✕</button>
      </div>
      <div class="modal-input-group">
        <label class="modal-label">선택된 요소 내용</label>
        <textarea class="notes-textarea" id="inputEditTextContent" style="min-height:90px;" placeholder="텍스트를 입력하세요"></textarea>
      </div>
      <div class="modal-actions">
        <button class="btn-glass modal-close" data-close="modalEditText">취소</button>
        <button class="btn-glass btn-glass-primary" id="btnConfirmEditText">적용하기</button>
      </div>
    </div>
  </div>

  <!-- MODAL: NEW SLIDE -->
  <div class="modal-backdrop" id="modalNewSlide">
    <div class="glass-modal">
      <div class="modal-title">
        <span>➕ 새 슬라이드 추가</span>
        <button class="btn-glass modal-close" data-close="modalNewSlide">✕</button>
      </div>
      <div class="modal-input-group">
        <label class="modal-label">슬라이드 제목</label>
        <input class="modal-input" id="inputNewSlideTitle" placeholder="예: 주요 사업 추진 현황" value="새 슬라이드" />
      </div>
      <div class="modal-input-group">
        <label class="modal-label">슬라이드 레이아웃</label>
        <select class="modal-select" id="selectNewSlideLayout">
          <option value="titleAndContent">제목 및 내용 (Title and Content)</option>
          <option value="titleOnly">제목만 (Title Only)</option>
          <option value="titleSlide">제목 슬라이드 (Title Slide)</option>
          <option value="sectionHeader">구역 머리글 (Section Header)</option>
          <option value="twoContent">콘텐츠 2개 (Two Content)</option>
          <option value="comparison">비교 (Comparison)</option>
          <option value="blank">빈 화면 (Blank)</option>
        </select>
      </div>
      <div class="modal-actions">
        <button class="btn-glass modal-close" data-close="modalNewSlide">취소</button>
        <button class="btn-glass btn-glass-primary" id="btnConfirmAddSlide">추가하기</button>
      </div>
    </div>
  </div>

  <!-- MODAL: RENAME SLIDE -->
  <div class="modal-backdrop" id="modalRename">
    <div class="glass-modal">
      <div class="modal-title">
        <span>🏷️ 슬라이드 제목 수정</span>
        <button class="btn-glass modal-close" data-close="modalRename">✕</button>
      </div>
      <div class="modal-input-group">
        <label class="modal-label">새 제목</label>
        <input class="modal-input" id="inputRenameTitle" placeholder="슬라이드 제목을 입력하세요" />
      </div>
      <div class="modal-actions">
        <button class="btn-glass modal-close" data-close="modalRename">취소</button>
        <button class="btn-glass btn-glass-primary" id="btnConfirmRename">수정 완료</button>
      </div>
    </div>
  </div>

  <!-- MODAL: INSERT SHAPE -->
  <div class="modal-backdrop" id="modalShape">
    <div class="glass-modal">
      <div class="modal-title">
        <span>🔲 도형 삽입</span>
        <button class="btn-glass modal-close" data-close="modalShape">✕</button>
      </div>
      <div class="modal-input-group">
        <label class="modal-label">도형 종류</label>
        <select class="modal-select" id="selectShapePreset">
          <option value="roundRect">둥근 모서리 직사각형</option>
          <option value="rect">직사각형</option>
          <option value="ellipse">타원 / 원</option>
          <option value="rightArrow">오른쪽 화살표</option>
          <option value="star5">별 (5개 꼭짓점)</option>
          <option value="diamond">다이아몬드 (마름모)</option>
          <option value="wedgeRectCallout">말풍선 (Callout)</option>
        </select>
      </div>
      <div class="modal-input-group">
        <label class="modal-label">도형 내부 텍스트 (선택 사항)</label>
        <input class="modal-input" id="inputShapeText" placeholder="예: 주요 목표 달성" />
      </div>
      <div class="modal-actions">
        <button class="btn-glass modal-close" data-close="modalShape">취소</button>
        <button class="btn-glass btn-glass-primary" id="btnConfirmInsertShape">삽입하기</button>
      </div>
    </div>
  </div>

  <!-- MODAL: INSERT TEXT BOX -->
  <div class="modal-backdrop" id="modalTextBox">
    <div class="glass-modal">
      <div class="modal-title">
        <span>📝 텍스트 상자 추가</span>
        <button class="btn-glass modal-close" data-close="modalTextBox">✕</button>
      </div>
      <div class="modal-input-group">
        <label class="modal-label">내용</label>
        <input class="modal-input" id="inputTextBoxContent" placeholder="추가할 텍스트 내용을 입력하세요" value="텍스트 상자" />
      </div>
      <div class="modal-actions">
        <button class="btn-glass modal-close" data-close="modalTextBox">취소</button>
        <button class="btn-glass btn-glass-primary" id="btnConfirmInsertTextBox">추가하기</button>
      </div>
    </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    let slidesData = ${JSON.stringify(info.slides)};
    let images = ${JSON.stringify(slideImageUris)};
    let shapesCache = ${JSON.stringify(initialShapes)};
    let currentIndex = 0;
    let zoomLevel = 1.0;
    let selectedShape = null;

    const mainImg = document.getElementById('mainSlideImg');
    const slideFrame = document.getElementById('slideFrame');
    const shapeOverlayLayer = document.getElementById('shapeOverlayLayer');
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
        const titleText = slide.title || ('슬라이드 ' + (i + 1));
        return \`
        <div class="thumb-row \${i === currentIndex ? 'active' : ''}" data-index="\${i}">
          <div class="thumb-num">\${i + 1}</div>
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
          </div>
        </div>\`;
      }).join('');

      document.querySelectorAll('.thumb-row').forEach((row) => {
        row.addEventListener('click', () => {
          const idx = parseInt(row.getAttribute('data-index'), 10);
          updateSlide(idx);
        });
      });
    }

    let isEditingText = false;
    const baseW = 960.0;
    const baseH = 540.0;

    function renderShapeOverlays() {
      shapeOverlayLayer.innerHTML = '';
      selectedShape = null;

      const shapes = shapesCache[currentIndex] || [];

      shapes.forEach((shape) => {
        if (!shape.box || shape.box.length < 4) return;
        const [x, y, w, h] = shape.box;
        const leftPct = (x / baseW) * 100;
        const topPct = (y / baseH) * 100;
        const widthPct = (w / baseW) * 100;
        const heightPct = (h / baseH) * 100;

        const el = document.createElement('div');
        el.className = 'shape-box-overlay';
        el.style.left = leftPct + '%';
        el.style.top = topPct + '%';
        el.style.width = widthPct + '%';
        el.style.height = heightPct + '%';
        el.setAttribute('data-id', shape.id);
        el.setAttribute('title', (shape.text || shape.name || '도형') + ' (더블클릭하여 인라인 편집 / 드래그 이동)');

        // 8 Resize Handles
        const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
        handles.forEach((hName) => {
          const hEl = document.createElement('div');
          hEl.className = 'resize-handle handle-' + hName;
          hEl.setAttribute('data-handle', hName);
          el.appendChild(hEl);

          hEl.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            startResize(e, shape, el, hName);
          });
        });

        // Quick action floating bar
        const quickBar = document.createElement('div');
        quickBar.className = 'shape-quick-bar';
        quickBar.innerHTML = \`
          <button class="btn-inline-edit" title="텍스트 직접 수정 (Enter)">✏️ 직접 수정</button>
          <button class="btn-quick-bold" title="굵게 (Cmd+B)"><b>B</b></button>
          <button class="btn-quick-italic" title="기울임 (Cmd+I)"><i>I</i></button>
          <button class="btn-quick-underline" title="밑줄 (Cmd+U)"><u>U</u></button>
          <button class="btn-quick-grow" title="글자 확대 (Cmd+])">A+</button>
          <button class="btn-quick-shrink" title="글자 축소 (Cmd+[)">A-</button>
          <button class="btn-quick-dup" title="도형 복제 (Cmd+D)">📋 복제</button>
          <button class="btn-quick-front" title="맨 앞으로 가져오기">⬆️ 앞</button>
          <button class="btn-quick-back" title="맨 뒤로 보내기">⬇️ 뒤</button>
          <button class="btn-quick-modal" title="모달 편집">🪟</button>
          <button class="btn-del-shape" title="도형 삭제 (Del)">🗑️</button>
        \`;
        el.appendChild(quickBar);

        // Select on click & start dragging
        el.addEventListener('mousedown', (e) => {
          if (e.target.classList.contains('resize-handle') || e.target.closest('.shape-quick-bar') || e.target.classList.contains('inline-text-editor')) {
            return;
          }
          e.stopPropagation();
          selectShape(shape, el);
          startMove(e, shape, el);
        });

        // Double click: Inline Editing right on the slide!
        el.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          startInlineEdit(shape, el);
        });

        quickBar.querySelector('.btn-inline-edit').addEventListener('click', (e) => {
          e.stopPropagation();
          startInlineEdit(shape, el);
        });

        quickBar.querySelector('.btn-quick-bold').addEventListener('click', (e) => {
          e.stopPropagation();
          vscode.postMessage({ command: 'formatShape', index: currentIndex, shapeId: shape.id, bold: true });
        });

        quickBar.querySelector('.btn-quick-italic').addEventListener('click', (e) => {
          e.stopPropagation();
          vscode.postMessage({ command: 'formatShape', index: currentIndex, shapeId: shape.id, italic: true });
        });

        quickBar.querySelector('.btn-quick-underline').addEventListener('click', (e) => {
          e.stopPropagation();
          vscode.postMessage({ command: 'formatShape', index: currentIndex, shapeId: shape.id, underline: true });
        });

        quickBar.querySelector('.btn-quick-grow').addEventListener('click', (e) => {
          e.stopPropagation();
          vscode.postMessage({ command: 'formatShape', index: currentIndex, shapeId: shape.id, grow: true });
        });

        quickBar.querySelector('.btn-quick-shrink').addEventListener('click', (e) => {
          e.stopPropagation();
          vscode.postMessage({ command: 'formatShape', index: currentIndex, shapeId: shape.id, shrink: true });
        });

        quickBar.querySelector('.btn-quick-dup').addEventListener('click', (e) => {
          e.stopPropagation();
          vscode.postMessage({ command: 'duplicateShape', index: currentIndex, shapeId: shape.id });
        });

        quickBar.querySelector('.btn-quick-front').addEventListener('click', (e) => {
          e.stopPropagation();
          vscode.postMessage({ command: 'arrangeShape', index: currentIndex, shapeId: shape.id, action: 'bringToFront' });
        });

        quickBar.querySelector('.btn-quick-back').addEventListener('click', (e) => {
          e.stopPropagation();
          vscode.postMessage({ command: 'arrangeShape', index: currentIndex, shapeId: shape.id, action: 'sendToBack' });
        });

        quickBar.querySelector('.btn-quick-modal').addEventListener('click', (e) => {
          e.stopPropagation();
          openTextEditModal(shape);
        });

        quickBar.querySelector('.btn-del-shape').addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm('선택한 도형/텍스트를 삭제하시겠습니까?')) {
            vscode.postMessage({ command: 'deleteShape', index: currentIndex, shapeId: shape.id });
          }
        });

        shapeOverlayLayer.appendChild(el);
      });
    }

    function selectShape(shape, el) {
      document.querySelectorAll('.shape-box-overlay').forEach((o) => o.classList.remove('selected'));
      el.classList.add('selected');
      selectedShape = shape;
    }

    function startInlineEdit(shape, el) {
      if (el.querySelector('.inline-text-editor')) return;
      isEditingText = true;

      const editor = document.createElement('div');
      editor.className = 'inline-text-editor';
      editor.contentEditable = 'true';
      editor.spellcheck = false;
      editor.innerText = shape.text || '';
      el.appendChild(editor);

      editor.focus();

      try {
        const range = document.createRange();
        range.selectNodeContents(editor);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (err) {}

      let committed = false;
      function commitAndClose() {
        if (committed) return;
        committed = true;
        isEditingText = false;
        const newText = editor.innerText.trim();
        if (editor.parentNode) {
          editor.parentNode.removeChild(editor);
        }
        if (newText !== shape.text) {
          shape.text = newText;
          vscode.postMessage({
            command: 'setText',
            index: currentIndex,
            shapeId: shape.id,
            text: newText,
          });
        }
      }

      editor.addEventListener('blur', () => {
        commitAndClose();
      });

      editor.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Escape') {
          commitAndClose();
        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          commitAndClose();
        }
      });
    }

    function startMove(startEvent, shape, el) {
      const stageRect = shapeOverlayLayer.getBoundingClientRect();
      const startMouseX = startEvent.clientX;
      const startMouseY = startEvent.clientY;
      const [origX, origY, origW, origH] = shape.box;
      let hasMoved = false;
      let finalX = origX;
      let finalY = origY;

      el.classList.add('dragging');

      function onMouseMove(moveEvent) {
        hasMoved = true;
        const deltaPxX = moveEvent.clientX - startMouseX;
        const deltaPxY = moveEvent.clientY - startMouseY;
        const deltaX = (deltaPxX / stageRect.width) * baseW;
        const deltaY = (deltaPxY / stageRect.height) * baseH;

        finalX = Math.round(Math.max(0, Math.min(baseW - origW, origX + deltaX)));
        finalY = Math.round(Math.max(0, Math.min(baseH - origH, origY + deltaY)));

        el.style.left = (finalX / baseW) * 100 + '%';
        el.style.top = (finalY / baseH) * 100 + '%';
      }

      function onMouseUp() {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        el.classList.remove('dragging');

        if (hasMoved) {
          shape.box = [finalX, finalY, origW, origH];
          vscode.postMessage({
            command: 'moveShape',
            index: currentIndex,
            shapeId: shape.id,
            x: finalX,
            y: finalY,
            w: origW,
            h: origH,
          });
        }
      }

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }

    function startResize(startEvent, shape, el, handleName) {
      const stageRect = shapeOverlayLayer.getBoundingClientRect();
      const startMouseX = startEvent.clientX;
      const startMouseY = startEvent.clientY;
      const [origX, origY, origW, origH] = shape.box;
      let currentBox = [origX, origY, origW, origH];

      el.classList.add('dragging');

      function onMouseMove(moveEvent) {
        const deltaPxX = moveEvent.clientX - startMouseX;
        const deltaPxY = moveEvent.clientY - startMouseY;
        const deltaX = (deltaPxX / stageRect.width) * baseW;
        const deltaY = (deltaPxY / stageRect.height) * baseH;

        let nx = origX;
        let ny = origY;
        let nw = origW;
        let nh = origH;

        if (handleName.includes('e')) {
          nw = Math.max(30, origW + deltaX);
        }
        if (handleName.includes('s')) {
          nh = Math.max(20, origH + deltaY);
        }
        if (handleName.includes('w')) {
          const potW = origW - deltaX;
          if (potW >= 30) {
            nx = origX + deltaX;
            nw = potW;
          }
        }
        if (handleName.includes('n')) {
          const potH = origH - deltaY;
          if (potH >= 20) {
            ny = origY + deltaY;
            nh = potH;
          }
        }

        currentBox = [Math.round(nx), Math.round(ny), Math.round(nw), Math.round(nh)];
        el.style.left = (currentBox[0] / baseW) * 100 + '%';
        el.style.top = (currentBox[1] / baseH) * 100 + '%';
        el.style.width = (currentBox[2] / baseW) * 100 + '%';
        el.style.height = (currentBox[3] / baseH) * 100 + '%';
      }

      function onMouseUp() {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        el.classList.remove('dragging');

        shape.box = currentBox;
        vscode.postMessage({
          command: 'moveShape',
          index: currentIndex,
          shapeId: shape.id,
          x: currentBox[0],
          y: currentBox[1],
          w: currentBox[2],
          h: currentBox[3],
        });
      }

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }

    // Double-click empty canvas to insert text box
    shapeOverlayLayer.addEventListener('dblclick', (e) => {
      if (e.target !== shapeOverlayLayer) return;
      const rect = shapeOverlayLayer.getBoundingClientRect();
      const clickX = Math.round(((e.clientX - rect.left) / rect.width) * baseW);
      const clickY = Math.round(((e.clientY - rect.top) / rect.height) * baseH);
      vscode.postMessage({
        command: 'insertTextBox',
        index: currentIndex,
        rect: [Math.max(20, clickX - 100), Math.max(20, clickY - 25), 260, 60],
        text: '새 텍스트 상자',
      });
    });

    // UNIFIED MASTER KEYBOARD SHORTCUT ROUTER
    window.addEventListener('keydown', (e) => {
      // 1. Guard against active text inputs and open modals
      if (isEditingText) return;
      if (document.querySelector('.modal-backdrop.open')) return;
      const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '');
      if (isInput) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const mod = isMac ? e.metaKey : e.ctrlKey;

      // 2. Fullscreen Presentation Mode shortcuts
      const isPresenting = presentOverlay.classList.contains('active');
      if (isPresenting) {
        if (e.key === 'Escape') {
          e.preventDefault();
          exitPresentation();
        } else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown' || e.key === 'Enter') {
          e.preventDefault();
          if (currentIndex < slidesData.length - 1) updateSlide(currentIndex + 1);
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'Backspace') {
          e.preventDefault();
          if (currentIndex > 0) updateSlide(currentIndex - 1);
        } else if (e.key === 'Home') {
          e.preventDefault();
          updateSlide(0);
        } else if (e.key === 'End') {
          e.preventDefault();
          updateSlide(slidesData.length - 1);
        } else if (e.key.toLowerCase() === 'b') {
          e.preventDefault();
          presentImg.style.visibility = presentImg.style.visibility === 'hidden' ? 'visible' : 'hidden';
        } else if (e.key.toLowerCase() === 'w') {
          e.preventDefault();
          presentOverlay.style.background = presentOverlay.style.background === 'white' ? '#000000' : 'white';
        }
        return;
      }

      // 3. Presentation Launch (F5 / Cmd+Enter)
      if (e.key === 'F5' || (mod && e.key === 'Enter')) {
        e.preventDefault();
        startPresentation();
        return;
      }

      // 4. Undo / Redo
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          vscode.postMessage({ command: 'redo', index: currentIndex });
        } else {
          vscode.postMessage({ command: 'undo', index: currentIndex });
        }
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        vscode.postMessage({ command: 'redo', index: currentIndex });
        return;
      }

      // 5. Slide Management: Cmd+M (New Slide)
      if (mod && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        openModal('modalNewSlide');
        return;
      }

      // 6. Duplicate (Cmd+D): Shape if selected, else Slide!
      if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (selectedShape) {
          vscode.postMessage({
            command: 'duplicateShape',
            index: currentIndex,
            shapeId: selectedShape.id,
          });
        } else {
          vscode.postMessage({
            command: 'duplicateSlide',
            index: currentIndex,
          });
        }
        return;
      }

      // 7. Select All (Cmd+A)
      if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const shapes = shapesCache[currentIndex] || [];
        if (shapes.length > 0) {
          const firstEl = shapeOverlayLayer.querySelector(\`[data-id="\${shapes[0].id}"]\`);
          if (firstEl) selectShape(shapes[0], firstEl);
        }
        return;
      }

      // 8. Shape-Specific Shortcuts (when a shape is selected)
      if (selectedShape) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          vscode.postMessage({
            command: 'deleteShape',
            index: currentIndex,
            shapeId: selectedShape.id,
          });
          selectedShape = null;
          return;
        }

        if (e.key === 'Enter') {
          e.preventDefault();
          const el = shapeOverlayLayer.querySelector(\`[data-id="\${selectedShape.id}"]\`);
          if (el) startInlineEdit(selectedShape, el);
          return;
        }

        if (e.key.startsWith('Arrow')) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : (e.altKey ? 1 : 2);
          const [sx, sy, sw, sh] = selectedShape.box;
          let nx = sx;
          let ny = sy;
          if (e.key === 'ArrowLeft') nx = Math.max(0, sx - step);
          if (e.key === 'ArrowRight') nx = Math.min(baseW - sw, sx + step);
          if (e.key === 'ArrowUp') ny = Math.max(0, sy - step);
          if (e.key === 'ArrowDown') ny = Math.min(baseH - sh, sy + step);

          selectedShape.box = [nx, ny, sw, sh];
          renderShapeOverlays();
          vscode.postMessage({
            command: 'moveShape',
            index: currentIndex,
            shapeId: selectedShape.id,
            x: nx,
            y: ny,
            w: sw,
            h: sh,
          });
          return;
        }

        // Formatting
        if (mod && e.key.toLowerCase() === 'b') {
          e.preventDefault();
          vscode.postMessage({ command: 'formatShape', index: currentIndex, shapeId: selectedShape.id, bold: true });
          return;
        }
        if (mod && e.key.toLowerCase() === 'i') {
          e.preventDefault();
          vscode.postMessage({ command: 'formatShape', index: currentIndex, shapeId: selectedShape.id, italic: true });
          return;
        }
        if (mod && e.key.toLowerCase() === 'u') {
          e.preventDefault();
          vscode.postMessage({ command: 'formatShape', index: currentIndex, shapeId: selectedShape.id, underline: true });
          return;
        }
        if (mod && (e.key === ']' || (e.shiftKey && e.key === '>'))) {
          e.preventDefault();
          vscode.postMessage({ command: 'formatShape', index: currentIndex, shapeId: selectedShape.id, grow: true });
          return;
        }
        if (mod && (e.key === '[' || (e.shiftKey && e.key === '<'))) {
          e.preventDefault();
          vscode.postMessage({ command: 'formatShape', index: currentIndex, shapeId: selectedShape.id, shrink: true });
          return;
        }
        if (mod && e.shiftKey && (e.key === '}' || e.key === ']')) {
          e.preventDefault();
          vscode.postMessage({ command: 'arrangeShape', index: currentIndex, shapeId: selectedShape.id, action: 'bringToFront' });
          return;
        }
        if (mod && e.shiftKey && (e.key === '{' || e.key === '[')) {
          e.preventDefault();
          vscode.postMessage({ command: 'arrangeShape', index: currentIndex, shapeId: selectedShape.id, action: 'sendToBack' });
          return;
        }

        if (e.key === 'Escape') {
          e.preventDefault();
          document.querySelectorAll('.shape-box-overlay').forEach((o) => o.classList.remove('selected'));
          selectedShape = null;
          return;
        }
      }

      // 9. Slide Reorder Shortcuts (Alt/Option + Up/Down)
      if (e.altKey && e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentIndex > 0) {
          vscode.postMessage({ command: 'moveSlide', from: currentIndex, to: currentIndex - 1 });
        }
        return;
      }
      if (e.altKey && e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentIndex < slidesData.length - 1) {
          vscode.postMessage({ command: 'moveSlide', from: currentIndex, to: currentIndex + 1 });
        }
        return;
      }

      // 10. General Slide Navigation (when no shape is selected)
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        if (currentIndex < slidesData.length - 1) {
          updateSlide(currentIndex + 1);
        }
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        if (currentIndex > 0) {
          updateSlide(currentIndex - 1);
        }
        return;
      }
      if (e.key === 'Home') {
        e.preventDefault();
        updateSlide(0);
        return;
      }
      if (e.key === 'End') {
        e.preventDefault();
        updateSlide(slidesData.length - 1);
        return;
      }
    });

    function openTextEditModal(shape) {
      selectedShape = shape;
      document.getElementById('inputEditTextContent').value = shape.text || '';
      openModal('modalEditText');
    }

    document.getElementById('btnConfirmEditText').addEventListener('click', () => {
      if (!selectedShape) return;
      const newText = document.getElementById('inputEditTextContent').value;
      closeModal('modalEditText');
      vscode.postMessage({
        command: 'setText',
        index: currentIndex,
        shapeId: selectedShape.id,
        text: newText,
      });
    });

    document.getElementById('btnEditTextOverlay').addEventListener('click', () => {
      if (selectedShape) {
        const el = shapeOverlayLayer.querySelector(\`[data-id="\${selectedShape.id}"]\`);
        if (el) {
          startInlineEdit(selectedShape, el);
        } else {
          openTextEditModal(selectedShape);
        }
      } else {
        const shapes = shapesCache[currentIndex] || [];
        if (shapes.length > 0) {
          const firstEl = shapeOverlayLayer.querySelector(\`[data-id="\${shapes[0].id}"]\`);
          if (firstEl) {
            selectShape(shapes[0], firstEl);
            startInlineEdit(shapes[0], firstEl);
          } else {
            openTextEditModal(shapes[0]);
          }
        } else {
          openModal('modalTextBox');
        }
      }
    });

    // Deselect shape on background click
    shapeOverlayLayer.addEventListener('click', (e) => {
      if (e.target === shapeOverlayLayer) {
        document.querySelectorAll('.shape-box-overlay').forEach((o) => o.classList.remove('selected'));
        selectedShape = null;
      }
    });

    function updateSlide(index) {
      if (index < 0 || index >= slidesData.length) return;
      currentIndex = index;

      mainImg.src = images[currentIndex] || '';
      presentImg.src = images[currentIndex] || '';

      const countText = (currentIndex + 1) + ' / ' + slidesData.length;
      slideIndicator.textContent = countText;
      presentCounter.textContent = countText;
      slideTotalBadge.textContent = slidesData.length;

      const statusSlideIndex = document.getElementById('statusSlideIndex');
      if (statusSlideIndex) {
        statusSlideIndex.textContent = '슬라이드 ' + (currentIndex + 1) + ' / ' + slidesData.length;
      }

      document.querySelectorAll('.thumb-row').forEach((row, i) => {
        const card = row.querySelector('.thumb-card');
        if (i === currentIndex) {
          row.classList.add('active');
          if (card) card.classList.add('active');
          row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
          row.classList.remove('active');
          if (card) card.classList.remove('active');
        }
      });

      const slide = slidesData[currentIndex];
      notesInput.value = slide?.notes || '';
      
      animCount.textContent = '애니메이션: ' + (slide?.animations || 0);
      shapeCount.textContent = '도형: ' + (slide?.shapes || 0);
      transitionType.textContent = '전환: ' + (slide?.transition || '없음');

      if (!shapesCache[currentIndex]) {
        vscode.postMessage({ command: 'fetchSlideShapes', index: currentIndex });
      } else {
        renderShapeOverlays();
      }
    }

    // Initial render
    renderThumbnails();
    renderShapeOverlays();

    // Listen to updates from extension
    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.type === 'updateData') {
        slidesData = msg.info.slides;
        images = msg.slideUris;
        if (msg.info.slideShapes) {
          shapesCache = { ...shapesCache, ...msg.info.slideShapes };
        }
        renderThumbnails();
        const nextIdx = msg.targetIndex !== undefined ? msg.targetIndex : currentIndex;
        updateSlide(Math.min(nextIdx, slidesData.length - 1));
      } else if (msg.type === 'shapesLoaded') {
        shapesCache[msg.index] = msg.shapes;
        if (msg.index === currentIndex) {
          renderShapeOverlays();
        }
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
      const pct = Math.round(zoomLevel * 100) + '%';
      zoomLabel.textContent = pct;
      const statusZoomPct = document.getElementById('statusZoomPct');
      if (statusZoomPct) statusZoomPct.textContent = pct;
      const statusZoomSlider = document.getElementById('statusZoomSlider');
      if (statusZoomSlider) statusZoomSlider.value = Math.round(zoomLevel * 100);
    }

    document.getElementById('btnZoomIn').addEventListener('click', () => setZoom(zoomLevel + 0.15));
    document.getElementById('btnZoomOut').addEventListener('click', () => setZoom(zoomLevel - 0.15));
    document.getElementById('btnZoomFit').addEventListener('click', () => setZoom(1.0));

    // Status Bar controls
    document.getElementById('btnStatusNotes')?.addEventListener('click', () => {
      notesToggle.click();
    });
    document.getElementById('btnStatusPresent')?.addEventListener('click', () => {
      document.getElementById('btnPresent')?.click();
    });
    document.getElementById('btnStatusZoomIn')?.addEventListener('click', () => {
      setZoom(zoomLevel + 0.15);
    });
    document.getElementById('btnStatusZoomOut')?.addEventListener('click', () => {
      setZoom(zoomLevel - 0.15);
    });
    document.getElementById('btnStatusZoomFit')?.addEventListener('click', () => {
      setZoom(1.0);
    });
    document.getElementById('statusZoomSlider')?.addEventListener('input', (e) => {
      setZoom(parseInt(e.target.value, 10) / 100);
    });

    // --- MICROSOFT POWERPOINT RIBBON INTERACTION ---
    document.querySelectorAll('.ribbon-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.ribbon-tab').forEach((t) => t.classList.remove('active'));
        document.querySelectorAll('.ribbon-tab-pane').forEach((p) => p.classList.remove('active'));
        tab.classList.add('active');
        const targetId = tab.getAttribute('data-tab');
        if (targetId) {
          const pane = document.getElementById(targetId);
          if (pane) pane.classList.add('active');
        }
      });
    });

    function getTargetShape() {
      if (selectedShape) return selectedShape;
      const shapes = shapesCache[currentIndex] || [];
      if (shapes.length > 0) {
        const el = shapeOverlayLayer.querySelector(\`[data-id="\${shapes[0].id}"]\`);
        if (el) selectShape(shapes[0], el);
        return shapes[0];
      }
      return null;
    }

    // Font Family & Size
    const ribbonFontFamily = document.getElementById('ribbonFontFamily');
    if (ribbonFontFamily) {
      ribbonFontFamily.addEventListener('change', () => {
        const sh = getTargetShape();
        if (sh) {
          vscode.postMessage({ command: 'formatShape', index: currentIndex, shapeId: sh.id, family: ribbonFontFamily.value });
        }
      });
    }

    const ribbonFontSize = document.getElementById('ribbonFontSize');
    if (ribbonFontSize) {
      ribbonFontSize.addEventListener('change', () => {
        const sh = getTargetShape();
        if (sh) {
          vscode.postMessage({ command: 'formatShape', index: currentIndex, shapeId: sh.id, size: parseInt(ribbonFontSize.value, 10) });
        }
      });
    }

    // Grow / Shrink Font
    document.getElementById('btnRibbonGrow')?.addEventListener('click', () => {
      const sh = getTargetShape();
      if (sh) vscode.postMessage({ command: 'formatShape', index: currentIndex, shapeId: sh.id, grow: true });
    });
    document.getElementById('btnRibbonShrink')?.addEventListener('click', () => {
      const sh = getTargetShape();
      if (sh) vscode.postMessage({ command: 'formatShape', index: currentIndex, shapeId: sh.id, shrink: true });
    });

    // Bold / Italic / Underline
    document.getElementById('btnRibbonBold')?.addEventListener('click', () => {
      const sh = getTargetShape();
      if (sh) vscode.postMessage({ command: 'formatShape', index: currentIndex, shapeId: sh.id, bold: true });
    });
    document.getElementById('btnRibbonItalic')?.addEventListener('click', () => {
      const sh = getTargetShape();
      if (sh) vscode.postMessage({ command: 'formatShape', index: currentIndex, shapeId: sh.id, italic: true });
    });
    document.getElementById('btnRibbonUnderline')?.addEventListener('click', () => {
      const sh = getTargetShape();
      if (sh) vscode.postMessage({ command: 'formatShape', index: currentIndex, shapeId: sh.id, underline: true });
    });

    // Font & Shape Fill Color Pickers
    const ribbonFontColor = document.getElementById('ribbonFontColor');
    if (ribbonFontColor) {
      ribbonFontColor.addEventListener('input', () => {
        const fontColorBar = document.getElementById('fontColorBar');
        if (fontColorBar) fontColorBar.style.background = ribbonFontColor.value;
        const sh = getTargetShape();
        if (sh) vscode.postMessage({ command: 'formatShape', index: currentIndex, shapeId: sh.id, color: ribbonFontColor.value });
      });
    }

    const ribbonFillColor = document.getElementById('ribbonFillColor');
    if (ribbonFillColor) {
      ribbonFillColor.addEventListener('input', () => {
        const fillColorBar = document.getElementById('fillColorBar');
        if (fillColorBar) fillColorBar.style.background = ribbonFillColor.value;
        const sh = getTargetShape();
        if (sh) vscode.postMessage({ command: 'formatShape', index: currentIndex, shapeId: sh.id, fill: ribbonFillColor.value });
      });
    }

    // Paragraph Alignment
    document.getElementById('btnAlignLeft')?.addEventListener('click', () => {
      const sh = getTargetShape();
      if (sh) vscode.postMessage({ command: 'formatShape', index: currentIndex, shapeId: sh.id, align: 'left' });
    });
    document.getElementById('btnAlignCenter')?.addEventListener('click', () => {
      const sh = getTargetShape();
      if (sh) vscode.postMessage({ command: 'formatShape', index: currentIndex, shapeId: sh.id, align: 'center' });
    });
    document.getElementById('btnAlignRight')?.addEventListener('click', () => {
      const sh = getTargetShape();
      if (sh) vscode.postMessage({ command: 'formatShape', index: currentIndex, shapeId: sh.id, align: 'right' });
    });

    // Quick Shapes & Arrange
    document.getElementById('btnQuickRect')?.addEventListener('click', () => {
      vscode.postMessage({ command: 'insertShape', index: currentIndex, preset: 'rect', text: '' });
    });
    document.getElementById('btnQuickEllipse')?.addEventListener('click', () => {
      vscode.postMessage({ command: 'insertShape', index: currentIndex, preset: 'ellipse', text: '' });
    });
    document.getElementById('btnBringFront')?.addEventListener('click', () => {
      const sh = getTargetShape();
      if (sh) vscode.postMessage({ command: 'arrangeShape', index: currentIndex, shapeId: sh.id, action: 'bringToFront' });
    });
    document.getElementById('btnSendBack')?.addEventListener('click', () => {
      const sh = getTargetShape();
      if (sh) vscode.postMessage({ command: 'arrangeShape', index: currentIndex, shapeId: sh.id, action: 'sendToBack' });
    });

    // Notes Toggle & Save
    notesToggle.addEventListener('click', () => {
      const isOpen = notesBody.classList.toggle('open');
      drawerArrow.textContent = isOpen ? '▲' : '▼';
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
      const title = document.getElementById('inputNewSlideTitle').value || '새 슬라이드';
      const layout = document.getElementById('selectNewSlideLayout').value || 'titleAndContent';
      closeModal('modalNewSlide');
      vscode.postMessage({ command: 'addSlide', title, layout });
    });

    // Delete Slide
    document.getElementById('btnDeleteSlide').addEventListener('click', () => {
      if (slidesData.length <= 1) {
        alert('최소 1개의 슬라이드는 유지되어야 합니다.');
        return;
      }
      if (confirm('슬라이드 #' + (currentIndex + 1) + '을(를) 삭제하시겠습니까?')) {
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

    document.getElementById('btnPowerPointApp').addEventListener('click', () => {
      vscode.postMessage({ command: 'openInPowerPoint' });
    });

    document.getElementById('btnRefresh').addEventListener('click', () => {
      vscode.postMessage({ command: 'refresh' });
    });

    // =========================================================================
    // 100% NATIVE DECKCRAFT WASM ENGINE (SlideApp + WebGPU/WebGL2) BRIDGE
    // =========================================================================
    const wasmStudioContainer = document.getElementById('wasmStudioContainer');
    const btnModeWasm = document.getElementById('btnModeWasm');
    const btnModeClassic = document.getElementById('btnModeClassic');
    const btnModeNativeApp = document.getElementById('btnModeNativeApp');

    const initialFileBase64 = ${JSON.stringify(initialFileBase64)};
    const initialFileName = ${JSON.stringify(fileName)};
    const initialFilePath = ${JSON.stringify(filePath)};
    const koreanFontUri = ${JSON.stringify(koreanFontWebviewUri)};
    const wasmJsUri = ${JSON.stringify(wasmJsUri)};
    const wasmBgUri = ${JSON.stringify(wasmBgUri)};

    function base64ToUint8Array(b64) {
      if (!b64) return new Uint8Array(0);
      const bin = atob(b64);
      const len = bin.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = bin.charCodeAt(i);
      }
      return bytes;
    }

    function uint8ArrayToBase64(bytes) {
      let binary = '';
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
      }
      return btoa(binary);
    }

    window.__DECKCRAFT_VSCODE__ = true;
    window.__DECKCRAFT_QUEUE__ = [];
    window.__deckcraft_shift_msg = function() {
      if (window.__DECKCRAFT_QUEUE__ && window.__DECKCRAFT_QUEUE__.length > 0) {
        return window.__DECKCRAFT_QUEUE__.shift();
      }
      return null;
    };

    window.__deckcraft_on_save = function(pathOrName, bytes) {
      const b64 = uint8ArrayToBase64(bytes);
      vscode.postMessage({
        command: 'saveFileBytes',
        path: pathOrName,
        base64: b64
      });
    };

    window.__deckcraft_on_export = function(name, bytes) {
      const b64 = uint8ArrayToBase64(bytes);
      vscode.postMessage({
        command: 'exportFileBytes',
        name: name,
        base64: b64
      });
    };

    window.__deckcraft_pick_file = function(purpose, requestId) {
      vscode.postMessage({
        command: 'pickFile',
        purpose: purpose,
        requestId: requestId
      });
    };

    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (!msg) return;
      if (msg.type === 'pickedFile') {
        window.__DECKCRAFT_QUEUE__.push({
          kind: 'inbox',
          requestId: msg.requestId,
          purpose: msg.purpose,
          name: msg.name,
          data: base64ToUint8Array(msg.base64)
        });
      } else if (msg.type === 'pickedFileCancel') {
        window.__DECKCRAFT_QUEUE__.push({
          kind: 'inbox_cancel',
          requestId: msg.requestId
        });
      }
    });

    btnModeWasm.addEventListener('click', () => {
      wasmStudioContainer.classList.remove('hidden');
      btnModeWasm.classList.add('active');
      btnModeClassic.classList.remove('active');
    });

    btnModeClassic.addEventListener('click', () => {
      wasmStudioContainer.classList.add('hidden');
      btnModeClassic.classList.add('active');
      btnModeWasm.classList.remove('active');
    });

    btnModeNativeApp.addEventListener('click', () => {
      vscode.postMessage({ command: 'openDesktopApp' });
    });

    async function bootNativeWasmEngine() {
      if (!wasmJsUri || !wasmBgUri) {
        wasmStudioContainer.classList.add('hidden');
        btnModeClassic.classList.add('active');
        btnModeWasm.classList.remove('active');
        return;
      }
      try {
        // 1. Pre-load system Korean font into FontDb before opening presentation so Hangul shapes & renders crisply
        if (koreanFontUri) {
          try {
            const fontResp = await fetch(koreanFontUri);
            if (fontResp.ok) {
              const fontBuf = await fontResp.arrayBuffer();
              window.__DECKCRAFT_QUEUE__.push({
                kind: 'font',
                data: new Uint8Array(fontBuf)
              });
            }
          } catch (fontErr) {
            console.warn('Optional system Korean font preload skipped:', fontErr);
          }
        }

        // 2. Enqueue the active presentation file bytes for SlideApp
        if (initialFileBase64) {
          window.__DECKCRAFT_QUEUE__.push({
            kind: 'open',
            name: initialFileName,
            path: initialFilePath,
            data: base64ToUint8Array(initialFileBase64)
          });
        }

        // 3. Dynamically import and initialize the compiled deckcraft-web WASM module
        const mod = await import(wasmJsUri);
        await mod.default({ module_or_path: wasmBgUri });
      } catch (err) {
        console.error('Failed to boot DeckCraft WASM engine, falling back to Classic UI:', err);
        wasmStudioContainer.classList.add('hidden');
        btnModeClassic.classList.add('active');
        btnModeWasm.classList.remove('active');
      }
    }

    bootNativeWasmEngine();

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

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function escapeHtml(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
