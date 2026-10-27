import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import { DeckcraftCli, DeckCraftInfo } from './deckcraftCli';
import { getWebviewContent } from './webview/template';

const execAsync = promisify(exec);

export class DeckcraftEditorProvider implements vscode.CustomReadonlyEditorProvider {
  public static readonly viewType = 'deckcraft.editor';

  constructor(private readonly context: vscode.ExtensionContext) {}

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new DeckcraftEditorProvider(context);
    const providerRegistration = vscode.window.registerCustomEditorProvider(
      DeckcraftEditorProvider.viewType,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
        supportsMultipleEditorsPerDocument: true,
      }
    );
    return providerRegistration;
  }

  public async openCustomDocument(
    uri: vscode.Uri,
    _openContext: vscode.CustomDocumentOpenContext,
    _token: vscode.CancellationToken
  ): Promise<vscode.CustomDocument> {
    return {
      uri,
      dispose: () => {},
    };
  }

  public async resolveCustomEditor(
    document: vscode.CustomDocument,
    webviewPanel: vscode.WebviewPanel,
    token: vscode.CancellationToken
  ): Promise<void> {
    const webview = webviewPanel.webview;
    webview.options = {
      enableScripts: true,
      localResourceRoots: [
        this.context.extensionUri,
        this.context.globalStorageUri,
        vscode.Uri.file('/tmp'),
      ],
    };

    const renderScale = vscode.workspace.getConfiguration('deckcraft').get<number>('renderScale') || 1.5;

    // Use a unique cache dir per document in OS temp or storage
    const docHash = crypto.createHash('md5').update(document.uri.fsPath).digest('hex').slice(0, 10);
    const cacheDir = path.join(this.context.globalStorageUri.fsPath, 'renders', docHash);
    fs.mkdirSync(cacheDir, { recursive: true });

    webview.html = this.getLoadingHtml(path.basename(document.uri.fsPath));

    const loadPresentationData = async (): Promise<{ info: DeckCraftInfo; slideUris: string[] }> => {
      const info = await DeckcraftCli.getInfo(document.uri.fsPath, this.context);
      const slideImages = await DeckcraftCli.renderAll(
        document.uri.fsPath,
        cacheDir,
        renderScale,
        this.context
      );

      // Convert images to Base64 data URIs for 100% reliable rendering without webview CSP/path blocks
      const slideUris = slideImages.map((imgPath) => {
        try {
          const buffer = fs.readFileSync(imgPath);
          return `data:image/png;base64,${buffer.toString('base64')}`;
        } catch (e) {
          console.error(`Failed to read slide image: ${imgPath}`, e);
          return '';
        }
      });

      return { info, slideUris };
    };

    const renderAndUpdate = async () => {
      try {
        const { info, slideUris } = await loadPresentationData();
        if (token.isCancellationRequested) return;

        webview.html = getWebviewContent(
          webview,
          this.context.extensionUri,
          document.uri,
          info,
          slideUris
        );
      } catch (err: any) {
        console.error('Error rendering presentation:', err);
        webview.html = this.getErrorHtml(path.basename(document.uri.fsPath), err?.message || String(err));
      }
    };

    await renderAndUpdate();

    // Listen to messages from webview
    webviewPanel.webview.onDidReceiveMessage(async (message) => {
      const filePath = document.uri.fsPath;

      switch (message.command) {
        case 'refresh': {
          await renderAndUpdate();
          vscode.window.showInformationMessage('DeckCraft: Presentation refreshed.');
          break;
        }

        // --- EDITING COMMANDS ---
        case 'addSlide': {
          try {
            const layout = message.layout || 'titleAndContent';
            const title = message.title || 'New Slide';
            const cmd = JSON.stringify({ layout, title });
            await DeckcraftCli.runCommand([`slide.new=${cmd}`], this.context, filePath, filePath);
            const { info, slideUris } = await loadPresentationData();
            webview.postMessage({ type: 'updateData', info, slideUris, targetIndex: info.slides.length - 1 });
            vscode.window.showInformationMessage(`Added slide "${title}"`);
          } catch (err: any) {
            vscode.window.showErrorMessage(`Failed to add slide: ${err.message}`);
          }
          break;
        }

        case 'deleteSlide': {
          try {
            const index = message.index ?? 0;
            const cmd = JSON.stringify({ index });
            await DeckcraftCli.runCommand([`slide.delete=${cmd}`], this.context, filePath, filePath);
            const { info, slideUris } = await loadPresentationData();
            const nextIdx = Math.max(0, Math.min(index, info.slides.length - 1));
            webview.postMessage({ type: 'updateData', info, slideUris, targetIndex: nextIdx });
            vscode.window.showInformationMessage(`Deleted slide #${index + 1}`);
          } catch (err: any) {
            vscode.window.showErrorMessage(`Failed to delete slide: ${err.message}`);
          }
          break;
        }

        case 'duplicateSlide': {
          try {
            const index = message.index ?? 0;
            const cmd = JSON.stringify({ index });
            await DeckcraftCli.runCommand([`slide.duplicate=${cmd}`], this.context, filePath, filePath);
            const { info, slideUris } = await loadPresentationData();
            webview.postMessage({ type: 'updateData', info, slideUris, targetIndex: index + 1 });
            vscode.window.showInformationMessage(`Duplicated slide #${index + 1}`);
          } catch (err: any) {
            vscode.window.showErrorMessage(`Failed to duplicate slide: ${err.message}`);
          }
          break;
        }

        case 'moveSlide': {
          try {
            const from = message.from;
            const to = message.to;
            const cmd = JSON.stringify({ from, to });
            await DeckcraftCli.runCommand([`slide.move=${cmd}`], this.context, filePath, filePath);
            const { info, slideUris } = await loadPresentationData();
            webview.postMessage({ type: 'updateData', info, slideUris, targetIndex: to });
          } catch (err: any) {
            vscode.window.showErrorMessage(`Failed to move slide: ${err.message}`);
          }
          break;
        }

        case 'renameSlide': {
          try {
            const index = message.index ?? 0;
            const name = message.name || '';
            const cmd = JSON.stringify({ name, index });
            await DeckcraftCli.runCommand([`slide.rename=${cmd}`], this.context, filePath, filePath);
            const { info, slideUris } = await loadPresentationData();
            webview.postMessage({ type: 'updateData', info, slideUris, targetIndex: index });
            vscode.window.showInformationMessage(`Renamed slide #${index + 1}`);
          } catch (err: any) {
            vscode.window.showErrorMessage(`Failed to rename slide: ${err.message}`);
          }
          break;
        }

        case 'insertShape': {
          try {
            const index = message.index ?? 0;
            const preset = message.preset || 'roundRect';
            const text = message.text || '';
            const goCmd = JSON.stringify({ index });
            const shapeCmd = JSON.stringify({
              preset,
              rect: [180, 160, 360, 140],
              text,
            });
            await DeckcraftCli.runCommand(
              [`slide.go=${goCmd}`, `shape.insert=${shapeCmd}`],
              this.context,
              filePath,
              filePath
            );
            const { info, slideUris } = await loadPresentationData();
            webview.postMessage({ type: 'updateData', info, slideUris, targetIndex: index });
            vscode.window.showInformationMessage(`Inserted ${preset} on slide #${index + 1}`);
          } catch (err: any) {
            vscode.window.showErrorMessage(`Failed to insert shape: ${err.message}`);
          }
          break;
        }

        case 'insertTextBox': {
          try {
            const index = message.index ?? 0;
            const text = message.text || 'New Text Box';
            const goCmd = JSON.stringify({ index });
            const shapeCmd = JSON.stringify({
              preset: 'rect',
              rect: [140, 160, 420, 100],
              text,
            });
            await DeckcraftCli.runCommand(
              [
                `slide.go=${goCmd}`,
                `shape.insert=${shapeCmd}`,
                `format.fill={"type":"none"}`,
                `format.line={"type":"none"}`,
              ],
              this.context,
              filePath,
              filePath
            );
            const { info, slideUris } = await loadPresentationData();
            webview.postMessage({ type: 'updateData', info, slideUris, targetIndex: index });
            vscode.window.showInformationMessage(`Added text box to slide #${index + 1}`);
          } catch (err: any) {
            vscode.window.showErrorMessage(`Failed to add text box: ${err.message}`);
          }
          break;
        }

        case 'saveNotes': {
          try {
            const index = message.index ?? 0;
            const text = message.notes || '';
            const cmd = JSON.stringify({ text, index });
            await DeckcraftCli.runCommand([`slide.notes=${cmd}`], this.context, filePath, filePath);
            const { info, slideUris } = await loadPresentationData();
            webview.postMessage({ type: 'updateData', info, slideUris, targetIndex: index });
            vscode.window.showInformationMessage(`Saved speaker notes for slide #${index + 1}`);
          } catch (err: any) {
            vscode.window.showErrorMessage(`Failed to save notes: ${err.message}`);
          }
          break;
        }

        // --- EXPORT & DESKTOP ACTIONS ---
        case 'exportPdf': {
          await this.exportPdf(document.uri);
          break;
        }

        case 'exportMarkdown': {
          await this.exportMarkdown(document.uri);
          break;
        }

        case 'exportSlidePng': {
          await this.exportSlidePng(document.uri, cacheDir, message.index);
          break;
        }

        case 'openDesktopApp': {
          await this.openInDesktopApp(document.uri);
          break;
        }
      }
    });

    // Watch for file changes on disk and reload
    const fileWatcher = vscode.workspace.createFileSystemWatcher(document.uri.fsPath);
    fileWatcher.onDidChange(async () => {
      await renderAndUpdate();
    });

    webviewPanel.onDidDispose(() => {
      fileWatcher.dispose();
    });
  }

  private async exportPdf(documentUri: vscode.Uri): Promise<void> {
    const defaultOut = documentUri.fsPath.replace(/\.(pptx|deckcraft|ppt)$/i, '') + '.pdf';
    const targetUri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(defaultOut),
      filters: { 'PDF Presentation': ['pdf'] },
      saveLabel: 'Export PDF',
    });

    if (!targetUri) return;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'DeckCraft: Exporting presentation to PDF...',
      },
      async () => {
        try {
          await DeckcraftCli.convertTo(documentUri.fsPath, targetUri.fsPath, this.context);
          const openAction = 'Open PDF';
          const selection = await vscode.window.showInformationMessage(
            `PDF successfully exported to: ${path.basename(targetUri.fsPath)}`,
            openAction
          );
          if (selection === openAction) {
            vscode.env.openExternal(targetUri);
          }
        } catch (err: any) {
          vscode.window.showErrorMessage(`PDF Export Failed: ${err.message}`);
        }
      }
    );
  }

  private async exportMarkdown(documentUri: vscode.Uri): Promise<void> {
    const defaultOut = documentUri.fsPath.replace(/\.(pptx|deckcraft|ppt)$/i, '') + '_outline.md';
    const targetUri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(defaultOut),
      filters: { 'Markdown Outline': ['md'] },
      saveLabel: 'Export Outline',
    });

    if (!targetUri) return;

    try {
      await DeckcraftCli.convertTo(documentUri.fsPath, targetUri.fsPath, this.context);
      const doc = await vscode.workspace.openTextDocument(targetUri);
      await vscode.window.showTextDocument(doc);
      vscode.window.showInformationMessage(`Outline exported to: ${path.basename(targetUri.fsPath)}`);
    } catch (err: any) {
      vscode.window.showErrorMessage(`Markdown Export Failed: ${err.message}`);
    }
  }

  private async exportSlidePng(
    documentUri: vscode.Uri,
    cacheDir: string,
    slideIndex: number
  ): Promise<void> {
    const paddedIndex = String(slideIndex + 1).padStart(2, '0');
    const sourcePng = path.join(cacheDir, `slide-${paddedIndex}.png`);

    if (!fs.existsSync(sourcePng)) {
      vscode.window.showErrorMessage(`Slide image ${slideIndex + 1} not found in cache.`);
      return;
    }

    const defaultName = `${path.basename(documentUri.fsPath, path.extname(documentUri.fsPath))}-slide-${slideIndex + 1}.png`;
    const defaultUri = vscode.Uri.file(path.join(path.dirname(documentUri.fsPath), defaultName));

    const targetUri = await vscode.window.showSaveDialog({
      defaultUri,
      filters: { Images: ['png'] },
      saveLabel: 'Save Slide Image',
    });

    if (targetUri) {
      fs.copyFileSync(sourcePng, targetUri.fsPath);
      vscode.window.showInformationMessage(`Saved Slide ${slideIndex + 1} to ${path.basename(targetUri.fsPath)}`);
    }
  }

  private async openInDesktopApp(documentUri: vscode.Uri): Promise<void> {
    const config = vscode.workspace.getConfiguration('deckcraft');
    const customAppPath = config.get<string>('desktopAppPath') || '/Applications/DeckCraft.app';

    if (process.platform === 'darwin') {
      if (fs.existsSync(customAppPath)) {
        await execAsync(`open -a "${customAppPath}" "${documentUri.fsPath}"`);
        vscode.window.showInformationMessage(`Opening in DeckCraft desktop app...`);
      } else {
        const downloadAction = 'Download DeckCraft for Mac';
        const choice = await vscode.window.showWarningMessage(
          `DeckCraft.app not found at ${customAppPath}. Would you like to download it?`,
          downloadAction
        );
        if (choice === downloadAction) {
          vscode.env.openExternal(
            vscode.Uri.parse('https://github.com/storytold/deckcraft/releases/latest')
          );
        }
      }
    } else {
      vscode.window.showInformationMessage(
        'Desktop app opening is currently configured for macOS. Check settings for custom paths.'
      );
    }
  }

  private getLoadingHtml(fileName: string): string {
    return `<!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          background: #12141c;
          color: #e0e0e0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          height: 100vh;
          margin: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }
        .spinner {
          width: 44px;
          height: 44px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: #f26b1d;
          border-radius: 50%;
          animation: spin 0.9s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .title { font-size: 16px; font-weight: 500; }
        .subtitle { font-size: 13px; color: #888; }
      </style>
    </head>
    <body>
      <div class="spinner"></div>
      <div class="title">Rendering ${fileName}&hellip;</div>
      <div class="subtitle">Powered by DeckCraft Rust Engine</div>
    </body>
    </html>`;
  }

  private getErrorHtml(fileName: string, error: string): string {
    return `<!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          background: #12141c;
          color: #e0e0e0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          padding: 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          box-sizing: border-box;
          text-align: center;
        }
        .box {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 60, 60, 0.3);
          border-radius: 8px;
          padding: 24px;
          max-width: 600px;
        }
        h2 { color: #ff6b6b; margin-top: 0; font-size: 18px; }
        pre {
          background: rgba(0, 0, 0, 0.4);
          padding: 12px;
          border-radius: 4px;
          color: #ff9999;
          font-size: 12px;
          overflow-x: auto;
          text-align: left;
        }
      </style>
    </head>
    <body>
      <div class="box">
        <h2>Unable to load presentation</h2>
        <p>Could not render <b>${fileName}</b> with DeckCraft CLI.</p>
        <pre>${error}</pre>
      </div>
    </body>
    </html>`;
  }
}
