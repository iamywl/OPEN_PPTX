import * as path from 'path';
import * as fs from 'fs';

async function verifyVsCodeRuntime() {
  console.log('====================================================');
  console.log('⚡ VS Code Extension Runtime Simulation & Verification');
  console.log('====================================================\n');

  const registeredCommands = new Map<string, (...args: any[]) => any>();
  let registeredCustomEditor: any = null;

  // Mock VS Code API
  const mockVsCode: any = {
    window: {
      registerCustomEditorProvider: (viewType: string, provider: any) => {
        console.log(`  ✓ Registered Custom Editor Provider: "${viewType}"`);
        registeredCustomEditor = { viewType, provider };
        return { dispose: () => {} };
      },
      showInformationMessage: async (msg: string) => {
        console.log(`  [VS Code Info Message]: ${msg}`);
        return undefined;
      },
      showWarningMessage: async (msg: string) => {
        console.log(`  [VS Code Warning]: ${msg}`);
        return undefined;
      },
      showErrorMessage: async (msg: string) => {
        console.error(`  [VS Code Error]: ${msg}`);
        return undefined;
      },
      withProgress: async (_opts: any, task: any) => {
        return task({ report: () => {} });
      },
      createTerminal: (_opts: any) => ({
        sendText: (t: string) => console.log(`  [Terminal Command Sent]: ${t}`),
        show: () => {},
        dispose: () => {},
      }),
      activeTextEditor: undefined,
    },
    commands: {
      registerCommand: (command: string, callback: (...args: any[]) => any) => {
        registeredCommands.set(command, callback);
        return { dispose: () => {} };
      },
      executeCommand: async (command: string, ...args: any[]) => {
        const handler = registeredCommands.get(command);
        if (handler) {
          return handler(...args);
        }
      },
    },
    workspace: {
      workspaceFolders: [
        { uri: { fsPath: path.resolve(__dirname, '..') } }
      ],
      getConfiguration: (_section?: string) => ({
        get: (key: string) => {
          if (key === 'desktopAppPath') return '/Applications/DeckCraft.app';
          if (key === 'renderScale') return 1.5;
          return undefined;
        },
      }),
      createFileSystemWatcher: () => ({
        onDidChange: () => ({ dispose: () => {} }),
        dispose: () => {},
      }),
    },
    Uri: {
      file: (p: string) => ({ fsPath: p, path: p, scheme: 'file' }),
      parse: (s: string) => ({ fsPath: s, path: s, scheme: 'https' }),
    },
    ProgressLocation: {
      Notification: 15,
    },
    ExtensionKind: {
      UI: 1,
      Workspace: 2,
    },
  };

  // Mock global require for 'vscode' when loading extension
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function (id: string) {
    if (id === 'vscode') {
      return mockVsCode;
    }
    return originalRequire.apply(this, arguments);
  };

  const extensionPath = path.resolve(__dirname, '..');
  const extensionModule = require(path.join(extensionPath, 'dist', 'extension.js'));

  const mockContext: any = {
    extensionPath,
    extensionUri: mockVsCode.Uri.file(extensionPath),
    globalStorageUri: mockVsCode.Uri.file(path.join(extensionPath, 'qa_output', 'global_storage')),
    subscriptions: [],
  };

  fs.mkdirSync(mockContext.globalStorageUri.fsPath, { recursive: true });

  console.log('▶ [Step 1] Executing extension activate()...');
  extensionModule.activate(mockContext);
  console.log(`  ✓ activate() completed without error. Subscriptions: ${mockContext.subscriptions.length}`);

  console.log('\n▶ [Step 2] Verifying Registered Commands in VS Code...');
  const expectedCommands = [
    'deckcraft.openSample',
    'deckcraft.newDeck',
    'deckcraft.exportPdf',
    'deckcraft.exportMarkdown',
    'deckcraft.renderSlides',
    'deckcraft.openDesktopApp',
    'deckcraft.startMcpServer',
    'deckcraft.downloadCli',
  ];

  for (const cmd of expectedCommands) {
    if (registeredCommands.has(cmd)) {
      console.log(`  ✓ Command registered: ${cmd}`);
    } else {
      throw new Error(`Command ${cmd} was NOT registered!`);
    }
  }

  console.log('\n▶ [Step 3] Testing "deckcraft.downloadCli" Command execution...');
  await registeredCommands.get('deckcraft.downloadCli')!();

  console.log('\n▶ [Step 4] Testing Custom Editor Provider ("deckcraft.editor")...');
  if (!registeredCustomEditor || registeredCustomEditor.viewType !== 'deckcraft.editor') {
    throw new Error('Custom editor provider was not properly registered!');
  }

  const sampleFile = path.join(extensionPath, 'samples', 'sample.pptx');
  const document = await registeredCustomEditor.provider.openCustomDocument(
    mockVsCode.Uri.file(sampleFile),
    {},
    { isCancellationRequested: false }
  );
  console.log(`  ✓ Custom Document opened for: ${path.basename(document.uri.fsPath)}`);

  console.log('\n▶ [Step 5] Simulating Webview Panel Resolution...');
  let webviewHtml = '';
  const mockPanel: any = {
    webview: {
      options: {},
      asWebviewUri: (uri: any) => `vscode-webview://${uri.fsPath}`,
      cspSource: 'vscode-webview:',
      onDidReceiveMessage: () => ({ dispose: () => {} }),
      set html(val: string) {
        webviewHtml = val;
      },
      get html() {
        return webviewHtml;
      },
    },
    onDidDispose: () => ({ dispose: () => {} }),
  };

  await registeredCustomEditor.provider.resolveCustomEditor(
    document,
    mockPanel,
    { isCancellationRequested: false }
  );

  console.log(`  ✓ resolveCustomEditor() succeeded!`);
  console.log(`  ✓ Generated Webview HTML length: ${webviewHtml.length} bytes`);

  if (!webviewHtml.includes('OPEN_PPTX Studio') || !webviewHtml.includes('Northern Lights')) {
    throw new Error('Webview HTML does not contain expected presentation content!');
  }
  console.log(`  ✓ Verified Webview displays presentation title "Northern Lights"!`);

  console.log('\n====================================================');
  console.log('🎉 VS CODE RUNTIME VERIFICATION 100% SUCCESSFUL!');
  console.log('====================================================\n');
}

verifyVsCodeRuntime().catch((err) => {
  console.error('Fatal runtime verification error:', err);
  process.exit(1);
});
