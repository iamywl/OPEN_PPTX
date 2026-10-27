import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface DeckCraftSlide {
  index: number;
  id: number;
  title: string;
  layout: string;
  notes: string;
  shapes: number;
  transition: string;
  animations: number;
  hidden: boolean;
}

export interface DeckCraftSection {
  name: string;
  slides: number;
}

export interface DeckCraftLayout {
  id: number;
  name: string;
}

export interface DeckCraftInfo {
  title?: string;
  path?: string;
  theme?: string;
  slideSize?: [number, number];
  fonts?: {
    major: string;
    minor: string;
  };
  sections?: DeckCraftSection[];
  layouts?: DeckCraftLayout[];
  slides: DeckCraftSlide[];
}

export class DeckcraftCli {
  private static cachedCliPath: string | null = null;

  public static async getExecutablePath(context: vscode.ExtensionContext): Promise<string> {
    if (this.cachedCliPath && fs.existsSync(this.cachedCliPath)) {
      return this.cachedCliPath;
    }

    const config = vscode.workspace.getConfiguration('deckcraft');
    const userConfiguredPath = config.get<string>('cliPath');
    if (userConfiguredPath && fs.existsSync(userConfiguredPath)) {
      this.cachedCliPath = userConfiguredPath;
      return userConfiguredPath;
    }

    // 1. Check extension bundled binary (bin/deckcraft-cli)
    const bundledPath = path.join(context.extensionPath, 'bin', 'deckcraft-cli');
    if (fs.existsSync(bundledPath)) {
      await this.ensureExecutable(bundledPath);
      this.cachedCliPath = bundledPath;
      return bundledPath;
    }

    // 2. Check system PATH
    try {
      const { stdout } = await execAsync('which deckcraft-cli');
      const systemPath = stdout.trim();
      if (systemPath && fs.existsSync(systemPath)) {
        this.cachedCliPath = systemPath;
        return systemPath;
      }
    } catch {
      // not in system PATH
    }

    // 3. Check common macOS paths
    const commonPaths = [
      '/usr/local/bin/deckcraft-cli',
      path.join(process.env.HOME || '', '.local/bin/deckcraft-cli'),
      path.join(process.env.HOME || '', '.cargo/bin/deckcraft-cli'),
    ];

    for (const p of commonPaths) {
      if (fs.existsSync(p)) {
        this.cachedCliPath = p;
        return p;
      }
    }

    throw new Error(
      'DeckCraft CLI executable not found. Please install or download deckcraft-cli for macOS.'
    );
  }

  public static async ensureExecutable(filePath: string): Promise<void> {
    try {
      fs.chmodSync(filePath, 0o755);
      if (process.platform === 'darwin') {
        // Remove macOS Gatekeeper quarantine attribute if present
        await execAsync(`xattr -d com.apple.quarantine "${filePath}" 2>/dev/null || true`);
      }
    } catch (e) {
      console.warn('Failed to set execute permissions or clear quarantine:', e);
    }
  }

  public static async getInfo(filePath: string, context: vscode.ExtensionContext): Promise<DeckCraftInfo> {
    const cli = await this.getExecutablePath(context);
    const { stdout, stderr } = await execAsync(`"${cli}" info "${filePath}"`, {
      maxBuffer: 10 * 1024 * 1024,
    });

    if (!stdout.trim()) {
      throw new Error(`Failed to read presentation info: ${stderr}`);
    }

    return JSON.parse(stdout) as DeckCraftInfo;
  }

  public static async renderAll(
    filePath: string,
    outDir: string,
    scale: number,
    context: vscode.ExtensionContext
  ): Promise<string[]> {
    const cli = await this.getExecutablePath(context);
    fs.mkdirSync(outDir, { recursive: true });

    await execAsync(`"${cli}" render "${filePath}" --all --scale ${scale} "${outDir}"`, {
      maxBuffer: 10 * 1024 * 1024,
    });

    const files = fs.readdirSync(outDir)
      .filter((f) => f.startsWith('slide-') && f.endsWith('.png'))
      .sort()
      .map((f) => path.join(outDir, f));

    return files;
  }

  public static async convertTo(
    filePath: string,
    outPath: string,
    context: vscode.ExtensionContext
  ): Promise<void> {
    const cli = await this.getExecutablePath(context);
    const outDir = path.dirname(outPath);
    fs.mkdirSync(outDir, { recursive: true });

    await execAsync(`"${cli}" convert "${filePath}" "${outPath}"`, {
      maxBuffer: 20 * 1024 * 1024,
    });
  }

  public static async runCommand(
    commands: string[],
    context: vscode.ExtensionContext,
    savePath?: string,
    inPath?: string
  ): Promise<string> {
    const cli = await this.getExecutablePath(context);
    let cmdLine = `"${cli}" run`;
    if (inPath) {
      cmdLine += ` --in "${inPath}"`;
    }
    for (const cmd of commands) {
      cmdLine += ` --cmd '${cmd}'`;
    }
    if (savePath) {
      cmdLine += ` --save "${savePath}"`;
    }
    cmdLine += ' --print';

    const { stdout } = await execAsync(cmdLine, {
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout;
  }

  public static async createSample(outPath: string, context: vscode.ExtensionContext): Promise<void> {
    const cli = await this.getExecutablePath(context);
    const outDir = path.dirname(outPath);
    fs.mkdirSync(outDir, { recursive: true });
    await execAsync(`"${cli}" run --sample --save "${outPath}"`);
  }

  public static async createNew(title: string, outPath: string, context: vscode.ExtensionContext): Promise<void> {
    const cli = await this.getExecutablePath(context);
    const outDir = path.dirname(outPath);
    fs.mkdirSync(outDir, { recursive: true });
    const cmd = JSON.stringify({ layout: 'titleOnly', title });
    await execAsync(`"${cli}" run --cmd 'slide.new=${cmd}' --cmd 'slide.delete={"index":0}' --save "${outPath}"`);
  }

  public static async downloadBinary(context: vscode.ExtensionContext): Promise<string> {
    const binDir = path.join(context.extensionPath, 'bin');
    fs.mkdirSync(binDir, { recursive: true });
    const targetBinary = path.join(binDir, 'deckcraft-cli');

    const downloadUrl =
      'https://github.com/storytold/deckcraft/releases/download/v0.11.1/deckcraft-cli-0.11.1-macos-universal.zip';

    const tempZip = path.join(binDir, 'temp_cli.zip');

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Downloading DeckCraft Universal CLI for macOS...',
        cancellable: false,
      },
      async (progress) => {
        progress.report({ message: 'Fetching zip archive from GitHub...' });
        await execAsync(`curl -L -o "${tempZip}" "${downloadUrl}"`);

        progress.report({ message: 'Extracting deckcraft-cli executable...' });
        const tempExtractDir = path.join(binDir, 'temp_extract');
        fs.mkdirSync(tempExtractDir, { recursive: true });
        await execAsync(`unzip -q -o "${tempZip}" -d "${tempExtractDir}"`);

        const extractedBin = path.join(
          tempExtractDir,
          'deckcraft-cli-0.11.1-macos-universal',
          'deckcraft-cli'
        );

        if (fs.existsSync(extractedBin)) {
          fs.copyFileSync(extractedBin, targetBinary);
          await this.ensureExecutable(targetBinary);
        }

        // Clean up
        try {
          fs.unlinkSync(tempZip);
          fs.rmSync(tempExtractDir, { recursive: true, force: true });
        } catch {
          // ignore
        }
      }
    );

    this.cachedCliPath = targetBinary;
    return targetBinary;
  }
}
