import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { DeckcraftEditorProvider } from './deckcraftEditor';
import { DeckcraftCli } from './deckcraftCli';
import { McpManager } from './mcpManager';
import { PlatformHelper } from './platformHelper';

export function activate(context: vscode.ExtensionContext) {
  console.log('DeckCraft VS Code Extension is now active!');

  // Register Custom Editor Provider for .pptx, .deckcraft, .ppt
  context.subscriptions.push(DeckcraftEditorProvider.register(context));

  // Command: Open Sample Presentation
  context.subscriptions.push(
    vscode.commands.registerCommand('deckcraft.openSample', async () => {
      const samplePath = path.join(context.extensionPath, 'samples', 'sample.pptx');
      if (fs.existsSync(samplePath)) {
        await vscode.commands.executeCommand('vscode.openWith', vscode.Uri.file(samplePath), DeckcraftEditorProvider.viewType);
      } else {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
        const targetPath = path.join(workspaceFolder, 'sample_deckcraft.pptx');
        await DeckcraftCli.createSample(targetPath, context);
        await vscode.commands.executeCommand('vscode.openWith', vscode.Uri.file(targetPath), DeckcraftEditorProvider.viewType);
      }
    })
  );

  // Command: Create New Presentation
  context.subscriptions.push(
    vscode.commands.registerCommand('deckcraft.newDeck', async () => {
      const title = await vscode.window.showInputBox({
        prompt: 'Enter the title for your new presentation',
        value: 'My New Presentation',
      });
      if (!title) return;

      const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
      const sanitized = title.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      const defaultUri = vscode.Uri.file(path.join(workspaceFolder, `${sanitized}.pptx`));

      const targetUri = await vscode.window.showSaveDialog({
        defaultUri,
        filters: {
          'PowerPoint Presentation': ['pptx'],
          'DeckCraft Presentation': ['deckcraft'],
        },
        saveLabel: 'Create Presentation',
      });

      if (!targetUri) return;

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Creating presentation "${title}"...`,
        },
        async () => {
          await DeckcraftCli.createNew(title, targetUri.fsPath, context);
          await vscode.commands.executeCommand(
            'vscode.openWith',
            targetUri,
            DeckcraftEditorProvider.viewType
          );
        }
      );
    })
  );

  // Command: Export PDF
  context.subscriptions.push(
    vscode.commands.registerCommand('deckcraft.exportPdf', async (uri?: vscode.Uri) => {
      const targetDocUri = uri || vscode.window.activeTextEditor?.document.uri;
      if (!targetDocUri) {
        vscode.window.showWarningMessage('Please select or open a presentation file first.');
        return;
      }
      const outDefault = targetDocUri.fsPath.replace(/\.(pptx|deckcraft|ppt)$/i, '') + '.pdf';
      const outUri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(outDefault),
        filters: { 'PDF Document': ['pdf'] },
      });
      if (!outUri) return;

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Exporting presentation to PDF...',
        },
        async () => {
          await DeckcraftCli.convertTo(targetDocUri.fsPath, outUri.fsPath, context);
          const openAction = 'Open PDF';
          const choice = await vscode.window.showInformationMessage(
            `Exported to ${path.basename(outUri.fsPath)}`,
            openAction
          );
          if (choice === openAction) {
            vscode.env.openExternal(outUri);
          }
        }
      );
    })
  );

  // Command: Export Outline (Markdown)
  context.subscriptions.push(
    vscode.commands.registerCommand('deckcraft.exportMarkdown', async (uri?: vscode.Uri) => {
      const targetDocUri = uri || vscode.window.activeTextEditor?.document.uri;
      if (!targetDocUri) {
        vscode.window.showWarningMessage('Please select or open a presentation file first.');
        return;
      }
      const outDefault = targetDocUri.fsPath.replace(/\.(pptx|deckcraft|ppt)$/i, '') + '_outline.md';
      const outUri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(outDefault),
        filters: { 'Markdown Outline': ['md'] },
      });
      if (!outUri) return;

      await DeckcraftCli.convertTo(targetDocUri.fsPath, outUri.fsPath, context);
      const doc = await vscode.workspace.openTextDocument(outUri);
      await vscode.window.showTextDocument(doc);
    })
  );

  // Command: Render Slides as PNGs
  context.subscriptions.push(
    vscode.commands.registerCommand('deckcraft.renderSlides', async (uri?: vscode.Uri) => {
      const targetDocUri = uri || vscode.window.activeTextEditor?.document.uri;
      if (!targetDocUri) {
        vscode.window.showWarningMessage('Please select or open a presentation file first.');
        return;
      }

      const defaultFolder = path.join(path.dirname(targetDocUri.fsPath), 'rendered_slides');
      const folderUris = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        defaultUri: vscode.Uri.file(defaultFolder),
        openLabel: 'Select Output Directory',
      });

      if (!folderUris || folderUris.length === 0) return;
      const outDir = folderUris[0].fsPath;

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Rendering slides to PNG...',
        },
        async () => {
          const files = await DeckcraftCli.renderAll(targetDocUri.fsPath, outDir, 2, context);
          vscode.window.showInformationMessage(
            `Successfully rendered ${files.length} slides to ${path.basename(outDir)}`
          );
        }
      );
    })
  );

  // Command: Open in Native Desktop App
  context.subscriptions.push(
    vscode.commands.registerCommand('deckcraft.openDesktopApp', async (uri?: vscode.Uri) => {
      const targetDocUri = uri || vscode.window.activeTextEditor?.document.uri;
      const platformConfig = PlatformHelper.getPlatformConfig();

      const config = vscode.workspace.getConfiguration('deckcraft');
      const appPath = config.get<string>('desktopAppPath') || platformConfig.desktopAppDefaultPath;

      if (!fs.existsSync(appPath)) {
        const downloadAction = 'Download Desktop App';
        const choice = await vscode.window.showWarningMessage(
          `Native DeckCraft app was not found at ${appPath}. Would you like to download it?`,
          downloadAction
        );
        if (choice === downloadAction) {
          vscode.env.openExternal(vscode.Uri.parse(platformConfig.desktopAppDownloadUrl));
        }
        return;
      }

      const filePath = targetDocUri ? targetDocUri.fsPath : '';
      await PlatformHelper.openNativeApp(appPath, filePath);
      vscode.window.showInformationMessage('Launched DeckCraft desktop application.');
    })
  );

  // Command: Start MCP Server
  context.subscriptions.push(
    vscode.commands.registerCommand('deckcraft.startMcpServer', async () => {
      const items: vscode.QuickPickItem[] = [
        {
          label: 'Launch MCP Server in Terminal',
          description: 'Run deckcraft-cli mcp over stdio for connected AI agents',
        },
        {
          label: 'Generate MCP Configuration JSON',
          description: 'For Claude Desktop, Cursor, Windsurf, or Antigravity config',
        },
      ];

      const selection = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select an MCP action',
      });

      if (!selection) return;

      if (selection.label.startsWith('Launch')) {
        await McpManager.startMcpTerminal(context);
      } else {
        await McpManager.showMcpConfigSnippet(context);
      }
    })
  );

  // Command: Download / Check CLI Binary
  context.subscriptions.push(
    vscode.commands.registerCommand('deckcraft.downloadCli', async () => {
      try {
        const binPath = await DeckcraftCli.getExecutablePath(context);
        vscode.window.showInformationMessage(`DeckCraft CLI is ready at: ${binPath}`);
      } catch {
        await DeckcraftCli.downloadBinary(context);
        vscode.window.showInformationMessage('DeckCraft CLI has been installed successfully!');
      }
    })
  );
}

export function deactivate() {}
