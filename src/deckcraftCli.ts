import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { PlatformHelper } from './platformHelper';

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

export interface DeckCraftShape {
  id: number;
  box: [number, number, number, number]; // [x, y, w, h] in 960x540 pt
  name?: string;
  kind?: string;
  preset?: string;
  text?: string;
  fill?: string;
  rotation?: number;
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
  slideShapes?: Record<number, DeckCraftShape[]>; // slideIndex -> shapes
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

    const platformConfig = PlatformHelper.getPlatformConfig();
    const binName = platformConfig.cliBinaryName;

    // 1. Check extension bundled binary (bin/deckcraft-cli or bin/deckcraft-cli.exe)
    const bundledPath = path.join(context.extensionPath, 'bin', binName);
    if (fs.existsSync(bundledPath)) {
      await this.ensureExecutable(bundledPath);
      this.cachedCliPath = bundledPath;
      return bundledPath;
    }

    // 2. Check system PATH (cross-platform: 'where' on Windows, 'which' on macOS/Linux)
    try {
      const locateCmd = process.platform === 'win32' ? `where ${binName}` : `which ${binName}`;
      const { stdout } = await execAsync(locateCmd);
      const systemPath = stdout.split(/\r?\n/)[0].trim();
      if (systemPath && fs.existsSync(systemPath)) {
        this.cachedCliPath = systemPath;
        return systemPath;
      }
    } catch {
      // not in system PATH
    }

    // 3. Check common OS-specific paths (macOS, Windows, Linux)
    const commonPaths =
      process.platform === 'win32'
        ? [
            path.join(process.env.LOCALAPPDATA || 'C:\\Program Files', 'DeckCraft', binName),
            path.join('C:\\Program Files', 'DeckCraft', binName),
            path.join(process.env.USERPROFILE || '', '.cargo', 'bin', binName),
          ]
        : [
            '/usr/local/bin/deckcraft-cli',
            '/opt/homebrew/bin/deckcraft-cli',
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
      `DeckCraft CLI executable (${binName}) not found for ${platformConfig.os}-${platformConfig.arch}.`
    );
  }

  public static async ensureExecutable(filePath: string): Promise<void> {
    try {
      fs.chmodSync(filePath, 0o755);
      if (process.platform === 'darwin') {
        await execAsync(`xattr -d com.apple.quarantine "${filePath}" 2>/dev/null || true`);
      }
    } catch (e) {
      console.warn('Failed to set execute permissions or clear quarantine:', e);
    }
  }

  public static async getInfo(filePath: string, context: vscode.ExtensionContext): Promise<DeckCraftInfo> {
    const cli = await this.getExecutablePath(context);
    const { stdout, stderr } = await execAsync(`"${cli}" info "${filePath}"`, {
      maxBuffer: 20 * 1024 * 1024,
    });

    if (!stdout.trim()) {
      throw new Error(`Failed to read presentation info: ${stderr}`);
    }

    const info = JSON.parse(stdout) as DeckCraftInfo;
    return info;
  }

  public static async inspectSlide(
    filePath: string,
    slideIndex: number,
    context: vscode.ExtensionContext
  ): Promise<DeckCraftShape[]> {
    const cli = await this.getExecutablePath(context);
    const cmd = JSON.stringify({ index: slideIndex });
    const { stdout } = await execAsync(
      `"${cli}" run --in "${filePath}" --print --cmd 'slide.inspect=${cmd}'`,
      { maxBuffer: 10 * 1024 * 1024 }
    );

    const match = stdout.match(/slide\.inspect\s*→\s*(\{[\s\S]*\})/);
    if (match) {
      const data = JSON.parse(match[1]);
      return (data.shapes || []) as DeckCraftShape[];
    }
    return [];
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
      maxBuffer: 20 * 1024 * 1024,
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
      maxBuffer: 20 * 1024 * 1024,
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
    const platformConfig = PlatformHelper.getPlatformConfig();
    const binDir = path.join(context.extensionPath, 'bin');
    fs.mkdirSync(binDir, { recursive: true });
    const targetBinary = path.join(binDir, platformConfig.cliBinaryName);

    const downloadUrl = platformConfig.downloadArchiveUrl;
    const isTarGz = downloadUrl.endsWith('.tar.gz');
    const tempArchive = path.join(binDir, isTarGz ? 'temp_cli.tar.gz' : 'temp_cli.zip');

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Downloading DeckCraft CLI for ${platformConfig.os} (${platformConfig.arch})...`,
        cancellable: false,
      },
      async (progress) => {
        progress.report({ message: 'Fetching release archive from GitHub...' });
        await execAsync(`curl -L -o "${tempArchive}" "${downloadUrl}"`);

        progress.report({ message: `Extracting ${platformConfig.cliBinaryName}...` });
        const tempExtractDir = path.join(binDir, 'temp_extract');
        fs.mkdirSync(tempExtractDir, { recursive: true });

        if (process.platform === 'win32') {
          await execAsync(
            `powershell -Command "Expand-Archive -Force '${tempArchive}' '${tempExtractDir}'"`
          );
        } else if (isTarGz) {
          await execAsync(`tar -xzf "${tempArchive}" -C "${tempExtractDir}"`);
        } else {
          await execAsync(`unzip -q -o "${tempArchive}" -d "${tempExtractDir}"`);
        }

        const findBinaryRecursive = (dir: string): string | null => {
          for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              const found = findBinaryRecursive(full);
              if (found) return found;
            } else if (entry.name === platformConfig.cliBinaryName) {
              return full;
            }
          }
          return null;
        };

        const extractedBin = findBinaryRecursive(tempExtractDir);
        if (extractedBin && fs.existsSync(extractedBin)) {
          fs.copyFileSync(extractedBin, targetBinary);
          await this.ensureExecutable(targetBinary);
        }

        try {
          fs.unlinkSync(tempArchive);
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
