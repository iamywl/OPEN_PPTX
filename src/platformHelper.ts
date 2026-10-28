import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface PlatformConfig {
  os: 'darwin' | 'win32' | 'linux';
  arch: string;
  cliBinaryName: string;
  desktopAppDefaultPath: string;
  downloadArchiveUrl: string;
  desktopAppDownloadUrl: string;
}

export class PlatformHelper {
  public static getPlatformConfig(): PlatformConfig {
    const platform = process.platform;
    const arch = process.arch;

    if (platform === 'darwin') {
      const userApp = path.join(os.homedir(), 'Applications', 'DeckCraft.app');
      return {
        os: 'darwin',
        arch,
        cliBinaryName: 'deckcraft-cli',
        desktopAppDefaultPath: fs.existsSync(userApp) ? userApp : '/Applications/DeckCraft.app',
        downloadArchiveUrl:
          'https://github.com/storytold/deckcraft/releases/download/v0.11.1/deckcraft-cli-0.11.1-macos-universal.zip',
        desktopAppDownloadUrl:
          'https://github.com/storytold/deckcraft/releases/download/v0.11.1/deckcraft-0.11.1-macos-universal.dmg',
      };
    } else if (platform === 'win32') {
      const isArm = arch === 'arm64';
      const is32 = arch === 'ia32';
      const archiveName = isArm
        ? 'deckcraft-0.11.1-windows-arm64-portable.zip'
        : is32
        ? 'deckcraft-0.11.1-windows-x86-portable.zip'
        : 'deckcraft-0.11.1-windows-x64-portable.zip';

      const msiName = isArm
        ? 'deckcraft-0.11.1-windows-arm64.msi'
        : is32
        ? 'deckcraft-0.11.1-windows-x86.msi'
        : 'deckcraft-0.11.1-windows-x64.msi';

      const defaultWinPath = path.join(
        process.env.LOCALAPPDATA || 'C:\\Program Files',
        'DeckCraft',
        'deckcraft.exe'
      );

      return {
        os: 'win32',
        arch,
        cliBinaryName: 'deckcraft-cli.exe',
        desktopAppDefaultPath: defaultWinPath,
        downloadArchiveUrl: `https://github.com/storytold/deckcraft/releases/download/v0.11.1/${archiveName}`,
        desktopAppDownloadUrl: `https://github.com/storytold/deckcraft/releases/download/v0.11.1/${msiName}`,
      };
    } else {
      // Linux
      const isArm = arch === 'arm64' || arch === 'arm' || (arch as string) === 'aarch64';
      const tarName = isArm
        ? 'deckcraft-0.11.1-linux-aarch64.tar.gz'
        : 'deckcraft-0.11.1-linux-x86_64.tar.gz';
      const appImageName = isArm
        ? 'deckcraft-0.11.1-linux-aarch64.AppImage'
        : 'deckcraft-0.11.1-linux-x86_64.AppImage';

      return {
        os: 'linux',
        arch,
        cliBinaryName: 'deckcraft-cli',
        desktopAppDefaultPath: path.join(os.homedir(), '.local/bin/deckcraft'),
        downloadArchiveUrl: `https://github.com/storytold/deckcraft/releases/download/v0.11.1/${tarName}`,
        desktopAppDownloadUrl: `https://github.com/storytold/deckcraft/releases/download/v0.11.1/${appImageName}`,
      };
    }
  }

  public static async openNativeApp(appPath: string, filePath: string): Promise<void> {
    const platform = process.platform;
    if (platform === 'darwin') {
      await execAsync(`open -a "${appPath}" "${filePath}"`);
    } else if (platform === 'win32') {
      await execAsync(`powershell -Command "Start-Process '${appPath}' -ArgumentList '\\"${filePath}\\"' -WorkingDirectory (Split-Path '${appPath}')"`);
    } else {
      // Linux
      if (fs.existsSync(appPath)) {
        await execAsync(`"${appPath}" "${filePath}" >/dev/null 2>&1 &`);
      } else {
        await execAsync(`xdg-open "${filePath}"`);
      }
    }
  }
}
