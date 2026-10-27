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

    // Storage path for cached slide images
    const docHash = crypto.createHash('md5').update(document.uri.fsPath).digest('hex').slice(0, 10);
    const cacheDir = path.join(this.context.globalStorageUri.fsPath, 'renders', docHash);
    fs.mkdirSync(cacheDir, { recursive: true });

    // Show initial loading state
    webview.html = this.getLoadingHtml(path.basename(document.uri.fsPath));

    const renderAndUpdate = async () => {
      try {
        const info = await DeckcraftCli.getInfo(document.uri.fsPath, this.context);
        if (token.isCancellationRequested) return;

        const slideImages = await DeckcraftCli.renderAll(
          document.uri.fsPath,
          cacheDir,
          renderScale,
          this.context
        );
        if (token.isCancellationRequested) return;

        const slideUris = slideImages.map((imgPath) =>
          webview.asWebviewUri(vscode.Uri.file(imgPath)).toString()
        );

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
      switch (message.command) {
        case 'refresh': {
          await renderAndUpdate();
          vscode.window.showInformationMessage('DeckCraft: Presentation refreshed.');
          break;
        }

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
          background: #18191f;
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
          background: #18191f;
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
