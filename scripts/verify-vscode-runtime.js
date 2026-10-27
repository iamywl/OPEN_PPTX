"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// scripts/verify-vscode-runtime.ts
var path = __toESM(require("path"));
var fs = __toESM(require("fs"));
async function verifyVsCodeRuntime() {
  console.log("====================================================");
  console.log("\u26A1 VS Code Extension Runtime Simulation & Verification");
  console.log("====================================================\n");
  const registeredCommands = /* @__PURE__ */ new Map();
  let registeredCustomEditor = null;
  const mockVsCode = {
    window: {
      registerCustomEditorProvider: (viewType, provider) => {
        console.log(`  \u2713 Registered Custom Editor Provider: "${viewType}"`);
        registeredCustomEditor = { viewType, provider };
        return { dispose: () => {
        } };
      },
      showInformationMessage: async (msg) => {
        console.log(`  [VS Code Info Message]: ${msg}`);
        return void 0;
      },
      showWarningMessage: async (msg) => {
        console.log(`  [VS Code Warning]: ${msg}`);
        return void 0;
      },
      showErrorMessage: async (msg) => {
        console.error(`  [VS Code Error]: ${msg}`);
        return void 0;
      },
      withProgress: async (_opts, task) => {
        return task({ report: () => {
        } });
      },
      createTerminal: (_opts) => ({
        sendText: (t) => console.log(`  [Terminal Command Sent]: ${t}`),
        show: () => {
        },
        dispose: () => {
        }
      }),
      activeTextEditor: void 0
    },
    commands: {
      registerCommand: (command, callback) => {
        registeredCommands.set(command, callback);
        return { dispose: () => {
        } };
      },
      executeCommand: async (command, ...args) => {
        const handler = registeredCommands.get(command);
        if (handler) {
          return handler(...args);
        }
      }
    },
    workspace: {
      workspaceFolders: [
        { uri: { fsPath: path.resolve(__dirname, "..") } }
      ],
      getConfiguration: (_section) => ({
        get: (key) => {
          if (key === "desktopAppPath")
            return "/Applications/DeckCraft.app";
          if (key === "renderScale")
            return 1.5;
          return void 0;
        }
      }),
      createFileSystemWatcher: () => ({
        onDidChange: () => ({ dispose: () => {
        } }),
        dispose: () => {
        }
      })
    },
    Uri: {
      file: (p) => ({ fsPath: p, path: p, scheme: "file" }),
      parse: (s) => ({ fsPath: s, path: s, scheme: "https" })
    },
    ProgressLocation: {
      Notification: 15
    },
    ExtensionKind: {
      UI: 1,
      Workspace: 2
    }
  };
  const Module = require("module");
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function(id) {
    if (id === "vscode") {
      return mockVsCode;
    }
    return originalRequire.apply(this, arguments);
  };
  const extensionPath = path.resolve(__dirname, "..");
  const extensionModule = require(path.join(extensionPath, "dist", "extension.js"));
  const mockContext = {
    extensionPath,
    extensionUri: mockVsCode.Uri.file(extensionPath),
    globalStorageUri: mockVsCode.Uri.file(path.join(extensionPath, "qa_output", "global_storage")),
    subscriptions: []
  };
  fs.mkdirSync(mockContext.globalStorageUri.fsPath, { recursive: true });
  console.log("\u25B6 [Step 1] Executing extension activate()...");
  extensionModule.activate(mockContext);
  console.log(`  \u2713 activate() completed without error. Subscriptions: ${mockContext.subscriptions.length}`);
  console.log("\n\u25B6 [Step 2] Verifying Registered Commands in VS Code...");
  const expectedCommands = [
    "deckcraft.openSample",
    "deckcraft.newDeck",
    "deckcraft.exportPdf",
    "deckcraft.exportMarkdown",
    "deckcraft.renderSlides",
    "deckcraft.openDesktopApp",
    "deckcraft.startMcpServer",
    "deckcraft.downloadCli"
  ];
  for (const cmd of expectedCommands) {
    if (registeredCommands.has(cmd)) {
      console.log(`  \u2713 Command registered: ${cmd}`);
    } else {
      throw new Error(`Command ${cmd} was NOT registered!`);
    }
  }
  console.log('\n\u25B6 [Step 3] Testing "deckcraft.downloadCli" Command execution...');
  await registeredCommands.get("deckcraft.downloadCli")();
  console.log('\n\u25B6 [Step 4] Testing Custom Editor Provider ("deckcraft.editor")...');
  if (!registeredCustomEditor || registeredCustomEditor.viewType !== "deckcraft.editor") {
    throw new Error("Custom editor provider was not properly registered!");
  }
  const sampleFile = path.join(extensionPath, "samples", "sample.pptx");
  const document = await registeredCustomEditor.provider.openCustomDocument(
    mockVsCode.Uri.file(sampleFile),
    {},
    { isCancellationRequested: false }
  );
  console.log(`  \u2713 Custom Document opened for: ${path.basename(document.uri.fsPath)}`);
  console.log("\n\u25B6 [Step 5] Simulating Webview Panel Resolution...");
  let webviewHtml = "";
  const mockPanel = {
    webview: {
      options: {},
      asWebviewUri: (uri) => `vscode-webview://${uri.fsPath}`,
      cspSource: "vscode-webview:",
      onDidReceiveMessage: () => ({ dispose: () => {
      } }),
      set html(val) {
        webviewHtml = val;
      },
      get html() {
        return webviewHtml;
      }
    },
    onDidDispose: () => ({ dispose: () => {
    } })
  };
  await registeredCustomEditor.provider.resolveCustomEditor(
    document,
    mockPanel,
    { isCancellationRequested: false }
  );
  console.log(`  \u2713 resolveCustomEditor() succeeded!`);
  console.log(`  \u2713 Generated Webview HTML length: ${webviewHtml.length} bytes`);
  if (!webviewHtml.includes("OPEN_PPTX Studio") || !webviewHtml.includes("Northern Lights")) {
    throw new Error("Webview HTML does not contain expected presentation content!");
  }
  console.log(`  \u2713 Verified Webview displays presentation title "Northern Lights"!`);
  console.log("\n====================================================");
  console.log("\u{1F389} VS CODE RUNTIME VERIFICATION 100% SUCCESSFUL!");
  console.log("====================================================\n");
}
verifyVsCodeRuntime().catch((err) => {
  console.error("Fatal runtime verification error:", err);
  process.exit(1);
});
