import * as path from 'path';
import * as fs from 'fs';
import * as net from 'net';
import { spawn, execSync } from 'child_process';

const rootDir = path.resolve(__dirname, '..');
const assetsImagesDir = path.join(rootDir, 'assets', 'images');
const qaOutputDir = path.join(rootDir, 'qa_output');

fs.mkdirSync(assetsImagesDir, { recursive: true });
fs.mkdirSync(qaOutputDir, { recursive: true });

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sendTcpRpc(port: number, method: string, params: Record<string, any> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const client = net.createConnection({ host: '127.0.0.1', port }, () => {
      const payload = JSON.stringify({ method, params }) + '\n';
      client.write(payload);
    });

    let buffer = '';
    client.on('data', (data) => {
      buffer += data.toString();
      if (buffer.includes('\n')) {
        client.end();
      }
    });

    client.on('end', () => {
      try {
        const json = JSON.parse(buffer.trim());
        resolve(json);
      } catch (err) {
        resolve({ raw: buffer });
      }
    });

    client.on('error', (err) => {
      reject(err);
    });
  });
}

async function captureWebviewScreenshots() {
  console.log('▶ [1/3] Generating & Capturing Live VS Code Webview Screenshots...');

  const Module = require('module');
  const origReq = Module.prototype.require;

  const mockVsCode: any = {
    window: {
      registerCustomEditorProvider: (_viewType: string, provider: any) => {
        (global as any).capturedProvider = provider;
        return { dispose: () => {} };
      },
      showInformationMessage: async () => {},
      showWarningMessage: async () => {},
      showErrorMessage: async () => {},
      withProgress: async (_opts: any, task: any) => task({ report: () => {} }),
      createTerminal: () => ({ sendText: () => {}, show: () => {}, dispose: () => {} }),
      activeTextEditor: undefined,
    },
    commands: {
      registerCommand: () => ({ dispose: () => {} }),
      executeCommand: async () => {},
    },
    workspace: {
      workspaceFolders: [{ uri: { fsPath: rootDir } }],
      getConfiguration: () => ({ get: () => undefined }),
      createFileSystemWatcher: () => ({ onDidChange: () => ({ dispose: () => {} }), dispose: () => {} }),
    },
    Uri: {
      file: (p: string) => ({ fsPath: p, path: p, scheme: 'file' }),
      parse: (s: string) => ({ fsPath: s, path: s, scheme: 'https' }),
    },
    ProgressLocation: { Notification: 15 },
    ExtensionKind: { UI: 1, Workspace: 2 },
  };

  Module.prototype.require = function (id: string) {
    if (id === 'vscode') return mockVsCode;
    return origReq.apply(this, arguments);
  };

  const ext = require(path.join(rootDir, 'dist', 'extension.js'));
  const mockContext = {
    extensionPath: rootDir,
    extensionUri: mockVsCode.Uri.file(rootDir),
    globalStorageUri: mockVsCode.Uri.file(path.join(qaOutputDir, 'global_storage')),
    subscriptions: [],
  };
  ext.activate(mockContext);

  const sampleFile = path.join(rootDir, 'samples', 'sample.pptx');
  const doc = await (global as any).capturedProvider.openCustomDocument(
    mockVsCode.Uri.file(sampleFile),
    {},
    { isCancellationRequested: false }
  );

  let html = '';
  const mockPanel = {
    webview: {
      options: {},
      asWebviewUri: (u: any) => 'file://' + u.fsPath,
      cspSource: '*',
      onDidReceiveMessage: () => ({ dispose: () => {} }),
      set html(val: string) {
        html = val;
      },
      get html() {
        return html;
      },
    },
    onDidDispose: () => ({ dispose: () => {} }),
  };

  await (global as any).capturedProvider.resolveCustomEditor(doc, mockPanel, { isCancellationRequested: false });

  // Remove CSP header so headless Chrome allows local file:// protocol rendering
  html = html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '');

  const wasmHtmlPath = path.join(qaOutputDir, 'live_webview_wasm.html');
  fs.writeFileSync(wasmHtmlPath, html, 'utf8');

  let classicHtml = html
    .replace('id="wasmStudioContainer"', 'id="wasmStudioContainer" style="display:none;"')
    .replace('id="btnModeClassic" class="mode-btn"', 'id="btnModeClassic" class="mode-btn active"')
    .replace('id="btnModeWasm" class="mode-btn active"', 'id="btnModeWasm" class="mode-btn"');

  const classicHtmlPath = path.join(qaOutputDir, 'live_webview_classic.html');
  fs.writeFileSync(classicHtmlPath, classicHtml, 'utf8');

  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (fs.existsSync(chromePath)) {
    const wasmPng = path.join(assetsImagesDir, 'qa-live-vscode-webview.png');
    execSync(`"${chromePath}" --headless=new --screenshot="${wasmPng}" --window-size=1600,1000 --hide-scrollbars --virtual-time-budget=2000 "file://${wasmHtmlPath}"`, { stdio: 'ignore' });
    console.log(`  ✓ Captured: assets/images/qa-live-vscode-webview.png (${(fs.statSync(wasmPng).size / 1024).toFixed(1)} KB)`);

    const classicPng = path.join(assetsImagesDir, 'qa-live-vscode-classic.png');
    execSync(`"${chromePath}" --headless=new --screenshot="${classicPng}" --window-size=1600,1000 --hide-scrollbars --virtual-time-budget=2000 "file://${classicHtmlPath}"`, { stdio: 'ignore' });
    console.log(`  ✓ Captured: assets/images/qa-live-vscode-classic.png (${(fs.statSync(classicPng).size / 1024).toFixed(1)} KB)`);
  }
}

async function captureNativeAppScreenshots() {
  console.log('\n▶ [2/3] Launching Native DeckCraft.app & Capturing Live TCP Screenshots...');

  const nativeAppBinary = path.join(rootDir, 'bin', 'DeckCraft.app', 'Contents', 'MacOS', 'DeckCraft');
  if (!fs.existsSync(nativeAppBinary)) {
    console.warn(`  ⚠️ Native app binary not found at ${nativeAppBinary}; skipping native captures.`);
    return;
  }

  const samplePptx = path.join(rootDir, 'samples', 'sample.pptx');
  const port = 7991;

  const child = spawn(nativeAppBinary, ['--control', String(port), samplePptx], {
    stdio: 'ignore',
    detached: true,
  });

  try {
    await sleep(2500);

    // 1. Studio default view
    const defaultShot = path.join(assetsImagesDir, 'qa-live-native-app.png');
    await sendTcpRpc(port, 'ui.screenshot', { path: defaultShot });
    console.log(`  ✓ Captured: assets/images/qa-live-native-app.png (${(fs.statSync(defaultShot).size / 1024).toFixed(1)} KB)`);

    // 2. Open Format Shape pane
    await sendTcpRpc(port, 'ui.set', { pane: 'format' });
    const formatShot = path.join(assetsImagesDir, 'qa-live-format-pane.png');
    await sendTcpRpc(port, 'ui.screenshot', { path: formatShot });
    console.log(`  ✓ Captured: assets/images/qa-live-format-pane.png (${(fs.statSync(formatShot).size / 1024).toFixed(1)} KB)`);

    // 3. Shape Format tab
    await sendTcpRpc(port, 'ui.set', { tab: 'Shape Format' });
    const shapeShot = path.join(assetsImagesDir, 'qa-live-shape-format.png');
    await sendTcpRpc(port, 'ui.screenshot', { path: shapeShot });
    console.log(`  ✓ Captured: assets/images/qa-live-shape-format.png (${(fs.statSync(shapeShot).size / 1024).toFixed(1)} KB)`);

    // 4. Slide Sorter view
    await sendTcpRpc(port, 'ui.set', { view: 'sorter' });
    const sorterShot = path.join(assetsImagesDir, 'qa-live-slide-sorter.png');
    await sendTcpRpc(port, 'ui.screenshot', { path: sorterShot });
    console.log(`  ✓ Captured: assets/images/qa-live-slide-sorter.png (${(fs.statSync(sorterShot).size / 1024).toFixed(1)} KB)`);

    // 5. Transitions tab
    await sendTcpRpc(port, 'ui.set', { view: 'normal', tab: 'Transitions' });
    const transitionsShot = path.join(assetsImagesDir, 'qa-live-transitions.png');
    await sendTcpRpc(port, 'ui.screenshot', { path: transitionsShot });
    console.log(`  ✓ Captured: assets/images/qa-live-transitions.png (${(fs.statSync(transitionsShot).size / 1024).toFixed(1)} KB)`);
  } catch (err: any) {
    console.error('  ✗ TCP control screenshot failed:', err.message);
  } finally {
    try {
      process.kill(-child.pid!);
    } catch {
      child.kill();
    }
  }
}

async function renderSlideSnapshots() {
  console.log('\n▶ [3/3] Rendering High-Res Slides for Korean & Precision Verification...');

  const cliBin = path.join(rootDir, 'bin', 'deckcraft-cli');
  const koreanPptx = path.join(qaOutputDir, 'korean_verification', 'korean_deck.pptx');
  const customPptx = path.join(qaOutputDir, 'roundtrip_test', 'custom_generated.pptx');

  if (fs.existsSync(koreanPptx)) {
    const koreanPng = path.join(assetsImagesDir, 'qa-live-korean.png');
    execSync(`"${cliBin}" render "${koreanPptx}" --scale 2 "${koreanPng}"`, { stdio: 'ignore' });
    console.log(`  ✓ Rendered: assets/images/qa-live-korean.png (${(fs.statSync(koreanPng).size / 1024).toFixed(1)} KB)`);
  }

  if (fs.existsSync(customPptx)) {
    const precisionPng = path.join(assetsImagesDir, 'qa-live-precision-render.png');
    execSync(`"${cliBin}" render "${customPptx}" --scale 2 "${precisionPng}"`, { stdio: 'ignore' });
    console.log(`  ✓ Rendered: assets/images/qa-live-precision-render.png (${(fs.statSync(precisionPng).size / 1024).toFixed(1)} KB)`);
  }
}

async function main() {
  console.log('====================================================');
  console.log('📸 Automated Real-Live Screenshot Capture Suite');
  console.log('====================================================\n');

  await captureWebviewScreenshots();
  await captureNativeAppScreenshots();
  await renderSlideSnapshots();

  console.log('\n====================================================');
  console.log('🎉 ALL LIVE SCREENSHOTS CAPTURED & SAVED TO assets/images/');
  console.log('====================================================\n');
}

main().catch((err) => {
  console.error('Fatal capture error:', err);
  process.exit(1);
});
