import * as vscode from 'vscode';
import * as path from 'path';
import { DeckcraftCli } from './deckcraftCli';

export class McpManager {
  private static mcpTerminal: vscode.Terminal | null = null;

  public static async startMcpTerminal(context: vscode.ExtensionContext, controlPort?: number): Promise<void> {
    const cliPath = await DeckcraftCli.getExecutablePath(context);
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();

    let cmd = `"${cliPath}" mcp --automation-read-root "${workspaceRoot}" --automation-write-root "${workspaceRoot}"`;
    if (controlPort) {
      cmd += ` --connect ${controlPort}`;
    }

    if (this.mcpTerminal) {
      this.mcpTerminal.dispose();
    }

    this.mcpTerminal = vscode.window.createTerminal({
      name: 'DeckCraft MCP Server',
      shellPath: undefined,
    });

    this.mcpTerminal.sendText(cmd);
    this.mcpTerminal.show();

    vscode.window.showInformationMessage(
      `DeckCraft MCP Server started in terminal. AI agents can now execute presentation commands!`
    );
  }

  public static async showMcpConfigSnippet(context: vscode.ExtensionContext): Promise<void> {
    const cliPath = await DeckcraftCli.getExecutablePath(context);
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();

    const mcpConfig = {
      mcpServers: {
        deckcraft: {
          command: cliPath,
          args: [
            'mcp',
            '--automation-read-root',
            workspaceRoot,
            '--automation-write-root',
            workspaceRoot,
          ],
        },
      },
    };

    const configJson = JSON.stringify(mcpConfig, null, 2);

    const doc = await vscode.workspace.openTextDocument({
      language: 'json',
      content: `// DeckCraft MCP Configuration\n// Add this to your Claude Desktop, Cursor, Windsurf, or Antigravity MCP settings:\n\n${configJson}`,
    });

    await vscode.window.showTextDocument(doc);
  }
}
