import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import { DeckcraftCli, DeckCraftInfo, DeckCraftShape } from './deckcraftCli';
import { getWebviewContent } from './webview/template';
import { PlatformHelper } from './platformHelper';

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
    const localRoots: vscode.Uri[] = [
      this.context.extensionUri,
      this.context.globalStorageUri,
      vscode.Uri.file('/tmp'),
      vscode.Uri.file(path.dirname(document.uri.fsPath)),
    ];
    for (const fontDir of ['/Library/Fonts', '/System/Library/Fonts', 'C:\\Windows\\Fonts', '/usr/share/fonts']) {
      if (fs.existsSync(fontDir)) {
        localRoots.push(vscode.Uri.file(fontDir));
      }
    }
    webview.options = {
      enableScripts: true,
      localResourceRoots: localRoots,
    };

    const renderScale = vscode.workspace.getConfiguration('deckcraft').get<number>('renderScale') || 1.5;
    let lastSavedByWasmAt = 0;

    // Locate a system Korean TTF font so the WASM vector engine can shape & render Hangul
    const koreanFontCandidates = [
      '/Library/Fonts/LGSmHaR.ttf',
      '/System/Library/Fonts/Supplemental/AppleGothic.ttf',
      'C:\\Windows\\Fonts\\malgun.ttf',
      '/usr/share/fonts/truetype/nanum/NanumGothic.ttf',
    ];
    let koreanFontWebviewUri = '';
    for (const candidate of koreanFontCandidates) {
      if (fs.existsSync(candidate)) {
        koreanFontWebviewUri = webview.asWebviewUri(vscode.Uri.file(candidate)).toString();
        break;
      }
    }

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

      // Pre-load shapes for the initial slide
      info.slideShapes = {};
      try {
        info.slideShapes[0] = await DeckcraftCli.inspectSlide(document.uri.fsPath, 0, this.context);
      } catch (e) {
        info.slideShapes[0] = [];
      }

      return { info, slideUris };
    };

    const renderAndUpdate = async () => {
      try {
        const { info, slideUris } = await loadPresentationData();
        if (token.isCancellationRequested) return;

        let initialFileBase64 = '';
        try {
          initialFileBase64 = fs.readFileSync(document.uri.fsPath).toString('base64');
        } catch (readErr) {
          console.error('Failed to read raw file bytes for WASM engine:', readErr);
        }

        const wasmJsUri = webview
          .asWebviewUri(vscode.Uri.file(path.join(this.context.extensionUri.fsPath, 'assets', 'wasm', 'deckcraft-web.js')))
          .toString();
        const wasmBgUri = webview
          .asWebviewUri(vscode.Uri.file(path.join(this.context.extensionUri.fsPath, 'assets', 'wasm', 'deckcraft-web_bg.wasm')))
          .toString();

        webview.html = getWebviewContent(
          webview,
          this.context.extensionUri,
          document.uri,
          info,
          slideUris,
          initialFileBase64,
          koreanFontWebviewUri,
          wasmJsUri,
          wasmBgUri
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

        case 'fetchSlideShapes': {
          try {
            const index = message.index ?? 0;
            const shapes = await DeckcraftCli.inspectSlide(filePath, index, this.context);
            webview.postMessage({ type: 'shapesLoaded', index, shapes });
          } catch (e) {
            webview.postMessage({ type: 'shapesLoaded', index: message.index ?? 0, shapes: [] });
          }
          break;
        }

        // --- DIRECT WYSIWYG CANVAS EDITING ---
        case 'setText': {
          try {
            const index = message.index ?? 0;
            const shapeId = message.shapeId;
            const text = message.text ?? '';
            const goCmd = JSON.stringify({ index });
            const setCmd = JSON.stringify({ id: shapeId, text });
            await DeckcraftCli.runCommand([`slide.go=${goCmd}`, `text.set=${setCmd}`], this.context, filePath, filePath);
            
            const { info, slideUris } = await loadPresentationData();
            info.slideShapes![index] = await DeckcraftCli.inspectSlide(filePath, index, this.context);
            webview.postMessage({ type: 'updateData', info, slideUris, targetIndex: index });
            vscode.window.showInformationMessage(`텍스트 수정 완료: "${text.slice(0, 20)}..."`);
          } catch (err: any) {
            vscode.window.showErrorMessage(`텍스트 수정 실패: ${err.message}`);
          }
          break;
        }

        case 'moveShape': {
          try {
            const index = message.index ?? 0;
            const shapeId = message.shapeId;
            const { x, y, w, h } = message;
            const goCmd = JSON.stringify({ index });
            const setCmd = JSON.stringify({ x, y, w, h, ids: [shapeId] });
            await DeckcraftCli.runCommand([`slide.go=${goCmd}`, `shape.setBounds=${setCmd}`], this.context, filePath, filePath);
            
            const { info, slideUris } = await loadPresentationData();
            info.slideShapes![index] = await DeckcraftCli.inspectSlide(filePath, index, this.context);
            webview.postMessage({ type: 'updateData', info, slideUris, targetIndex: index });
          } catch (err: any) {
            vscode.window.showErrorMessage(`도형 이동 실패: ${err.message}`);
          }
          break;
        }

        case 'deleteShape': {
          try {
            const index = message.index ?? 0;
            const shapeId = message.shapeId;
            const goCmd = JSON.stringify({ index });
            const delCmd = JSON.stringify({ ids: [shapeId] });
            await DeckcraftCli.runCommand([`slide.go=${goCmd}`, `edit.delete=${delCmd}`], this.context, filePath, filePath);
            
            const { info, slideUris } = await loadPresentationData();
            info.slideShapes![index] = await DeckcraftCli.inspectSlide(filePath, index, this.context);
            webview.postMessage({ type: 'updateData', info, slideUris, targetIndex: index });
            vscode.window.showInformationMessage(`도형 #${shapeId} 삭제 완료`);
          } catch (err: any) {
            vscode.window.showErrorMessage(`도형 삭제 실패: ${err.message}`);
          }
          break;
        }

        // --- SLIDE MANAGEMENT ---
        case 'addSlide': {
          try {
            const layout = message.layout || 'titleAndContent';
            const title = message.title || '새 슬라이드';
            const cmd = JSON.stringify({ layout, title });
            await DeckcraftCli.runCommand([`slide.new=${cmd}`], this.context, filePath, filePath);
            const { info, slideUris } = await loadPresentationData();
            const newIndex = info.slides.length - 1;
            info.slideShapes![newIndex] = await DeckcraftCli.inspectSlide(filePath, newIndex, this.context);
            webview.postMessage({ type: 'updateData', info, slideUris, targetIndex: newIndex });
            vscode.window.showInformationMessage(`새 슬라이드 "${title}" 추가 완료`);
          } catch (err: any) {
            vscode.window.showErrorMessage(`슬라이드 추가 실패: ${err.message}`);
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
            info.slideShapes![nextIdx] = await DeckcraftCli.inspectSlide(filePath, nextIdx, this.context);
            webview.postMessage({ type: 'updateData', info, slideUris, targetIndex: nextIdx });
            vscode.window.showInformationMessage(`슬라이드 #${index + 1} 삭제 완료`);
          } catch (err: any) {
            vscode.window.showErrorMessage(`슬라이드 삭제 실패: ${err.message}`);
          }
          break;
        }

        case 'duplicateSlide': {
          try {
            const index = message.index ?? 0;
            const cmd = JSON.stringify({ index });
            await DeckcraftCli.runCommand([`slide.duplicate=${cmd}`], this.context, filePath, filePath);
            const { info, slideUris } = await loadPresentationData();
            const targetIdx = index + 1;
            info.slideShapes![targetIdx] = await DeckcraftCli.inspectSlide(filePath, targetIdx, this.context);
            webview.postMessage({ type: 'updateData', info, slideUris, targetIndex: targetIdx });
            vscode.window.showInformationMessage(`슬라이드 #${index + 1} 복제 완료`);
          } catch (err: any) {
            vscode.window.showErrorMessage(`슬라이드 복제 실패: ${err.message}`);
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
            info.slideShapes![to] = await DeckcraftCli.inspectSlide(filePath, to, this.context);
            webview.postMessage({ type: 'updateData', info, slideUris, targetIndex: to });
          } catch (err: any) {
            vscode.window.showErrorMessage(`슬라이드 이동 실패: ${err.message}`);
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
            info.slideShapes![index] = await DeckcraftCli.inspectSlide(filePath, index, this.context);
            webview.postMessage({ type: 'updateData', info, slideUris, targetIndex: index });
            vscode.window.showInformationMessage(`슬라이드 #${index + 1} 제목 수정 완료`);
          } catch (err: any) {
            vscode.window.showErrorMessage(`제목 수정 실패: ${err.message}`);
          }
          break;
        }

        case 'insertShape': {
          try {
            const index = message.index ?? 0;
            const preset = message.preset || 'roundRect';
            const text = message.text || '';
            const rect = message.rect ? message.rect.map((v: number) => Math.round(v)) : [200, 180, 360, 140];
            const goCmd = JSON.stringify({ index });
            const shapeCmd = JSON.stringify({
              preset,
              rect,
              text,
            });
            await DeckcraftCli.runCommand(
              [`slide.go=${goCmd}`, `shape.insert=${shapeCmd}`],
              this.context,
              filePath,
              filePath
            );
            const { info, slideUris } = await loadPresentationData();
            info.slideShapes![index] = await DeckcraftCli.inspectSlide(filePath, index, this.context);
            webview.postMessage({ type: 'updateData', info, slideUris, targetIndex: index });
            vscode.window.showInformationMessage(`슬라이드 #${index + 1}에 도형 추가 완료`);
          } catch (err: any) {
            vscode.window.showErrorMessage(`도형 삽입 실패: ${err.message}`);
          }
          break;
        }

        case 'insertTextBox': {
          try {
            const index = message.index ?? 0;
            const text = message.text || '새 텍스트 상자';
            const rect = message.rect ? message.rect.map((v: number) => Math.round(v)) : [160, 180, 360, 80];
            const goCmd = JSON.stringify({ index });
            const shapeCmd = JSON.stringify({
              preset: 'rect',
              rect,
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
            info.slideShapes![index] = await DeckcraftCli.inspectSlide(filePath, index, this.context);
            webview.postMessage({ type: 'updateData', info, slideUris, targetIndex: index });
            vscode.window.showInformationMessage(`텍스트 상자 추가 완료`);
          } catch (err: any) {
            vscode.window.showErrorMessage(`텍스트 추가 실패: ${err.message}`);
          }
          break;
        }

        case 'formatShape': {
          try {
            const index = message.index ?? 0;
            const shapeId = message.shapeId;
            const commands: string[] = [
              `slide.go=${JSON.stringify({ index })}`,
              `edit.select=${JSON.stringify({ ids: [shapeId] })}`,
            ];
            if (message.bold !== undefined) {
              commands.push('format.bold');
            }
            if (message.italic !== undefined) {
              commands.push('format.italic');
            }
            if (message.underline !== undefined) {
              commands.push('format.underline');
            }
            if (message.grow) {
              commands.push('format.grow');
            }
            if (message.shrink) {
              commands.push('format.shrink');
            }
            if (message.family) {
              commands.push(`format.font=${JSON.stringify({ family: message.family })}`);
            }
            if (message.size) {
              commands.push(`format.size=${JSON.stringify({ size: message.size })}`);
            }
            if (message.color) {
              commands.push(`format.color=${JSON.stringify({ color: message.color })}`);
            }
            if (message.fill) {
              commands.push(`shape.fill=${JSON.stringify({ color: message.fill })}`);
            }
            if (message.align) {
              commands.push(`format.align=${JSON.stringify({ align: message.align })}`);
            }
            await DeckcraftCli.runCommand(commands, this.context, filePath, filePath);
            const { info, slideUris } = await loadPresentationData();
            info.slideShapes![index] = await DeckcraftCli.inspectSlide(filePath, index, this.context);
            webview.postMessage({ type: 'updateData', info, slideUris, targetIndex: index });
          } catch (err: any) {
            vscode.window.showErrorMessage(`서식 변경 실패: ${err.message}`);
          }
          break;
        }

        case 'duplicateShape': {
          try {
            const index = message.index ?? 0;
            const shapeId = message.shapeId;
            const goCmd = JSON.stringify({ index });
            const dupCmd = JSON.stringify({ ids: [shapeId] });
            await DeckcraftCli.runCommand(
              [`slide.go=${goCmd}`, `edit.duplicate=${dupCmd}`],
              this.context,
              filePath,
              filePath
            );
            const { info, slideUris } = await loadPresentationData();
            info.slideShapes![index] = await DeckcraftCli.inspectSlide(filePath, index, this.context);
            webview.postMessage({ type: 'updateData', info, slideUris, targetIndex: index });
            vscode.window.showInformationMessage(`도형 #${shapeId} 복제 완료`);
          } catch (err: any) {
            vscode.window.showErrorMessage(`도형 복제 실패: ${err.message}`);
          }
          break;
        }

        case 'arrangeShape': {
          try {
            const index = message.index ?? 0;
            const shapeId = message.shapeId;
            const action = message.action || 'bringToFront';
            const goCmd = JSON.stringify({ index });
            const arrCmd = JSON.stringify({ ids: [shapeId] });
            await DeckcraftCli.runCommand(
              [`slide.go=${goCmd}`, `arrange.${action}=${arrCmd}`],
              this.context,
              filePath,
              filePath
            );
            const { info, slideUris } = await loadPresentationData();
            info.slideShapes![index] = await DeckcraftCli.inspectSlide(filePath, index, this.context);
            webview.postMessage({ type: 'updateData', info, slideUris, targetIndex: index });
          } catch (err: any) {
            vscode.window.showErrorMessage(`레이어 순서 변경 실패: ${err.message}`);
          }
          break;
        }

        case 'undo': {
          try {
            await DeckcraftCli.runCommand(['edit.undo'], this.context, filePath, filePath);
            const { info, slideUris } = await loadPresentationData();
            const currIdx = message.index ?? 0;
            info.slideShapes![currIdx] = await DeckcraftCli.inspectSlide(filePath, currIdx, this.context);
            webview.postMessage({ type: 'updateData', info, slideUris, targetIndex: currIdx });
          } catch (err: any) {
            vscode.window.showErrorMessage(`실행 취소 실패: ${err.message}`);
          }
          break;
        }

        case 'redo': {
          try {
            await DeckcraftCli.runCommand(['edit.redo'], this.context, filePath, filePath);
            const { info, slideUris } = await loadPresentationData();
            const currIdx = message.index ?? 0;
            info.slideShapes![currIdx] = await DeckcraftCli.inspectSlide(filePath, currIdx, this.context);
            webview.postMessage({ type: 'updateData', info, slideUris, targetIndex: currIdx });
          } catch (err: any) {
            vscode.window.showErrorMessage(`다시 실행 실패: ${err.message}`);
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
            vscode.window.showInformationMessage(`발표자 메모 저장 완료`);
          } catch (err: any) {
            vscode.window.showErrorMessage(`메모 저장 실패: ${err.message}`);
          }
          break;
        }

        // --- NATIVE APPLICATION LAUNCHERS ---
        case 'openDesktopApp': {
          await this.openInDesktopApp(document.uri);
          break;
        }

        case 'openInPowerPoint': {
          await this.openInPowerPoint(document.uri);
          break;
        }

        // --- EXPORT ACTIONS ---
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

        // --- NATIVE WASM ENGINE FILE BRIDGE ---
        case 'saveFileBytes': {
          try {
            const bytes = Buffer.from(message.base64 || '', 'base64');
            if (bytes.length > 0) {
              lastSavedByWasmAt = Date.now();
              fs.writeFileSync(filePath, bytes);
            }
          } catch (err: any) {
            vscode.window.showErrorMessage(`파일 저장 실패: ${err.message}`);
          }
          break;
        }

        case 'exportFileBytes': {
          try {
            const suggestedName = message.name || path.basename(filePath);
            const defaultUri = vscode.Uri.file(path.join(path.dirname(filePath), suggestedName));
            const targetUri = await vscode.window.showSaveDialog({
              defaultUri,
              saveLabel: 'Save Presentation / Export',
            });
            if (targetUri && message.base64) {
              const bytes = Buffer.from(message.base64, 'base64');
              if (targetUri.fsPath === filePath) {
                lastSavedByWasmAt = Date.now();
              }
              fs.writeFileSync(targetUri.fsPath, bytes);
              vscode.window.showInformationMessage(`저장 완료: ${path.basename(targetUri.fsPath)}`);
            }
          } catch (err: any) {
            vscode.window.showErrorMessage(`내보내기 실패: ${err.message}`);
          }
          break;
        }

        case 'pickFile': {
          try {
            const purpose = message.purpose || 'open';
            const requestId = message.requestId ?? 0;
            let filters: { [name: string]: string[] } = {
              Presentations: ['pptx', 'deckcraft', 'potx', 'ppsx', 'md', 'txt'],
            };
            if (purpose === 'picture') {
              filters = { Pictures: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'] };
            } else if (purpose === 'audio') {
              filters = { Audio: ['wav', 'mp3', 'm4a', 'aac', 'flac', 'ogg'] };
            } else if (purpose === 'video') {
              filters = { Video: ['mp4', 'm4v', 'mov', 'webm'] };
            } else if (purpose === 'theme') {
              filters = { Themes: ['thmx', 'pptx', 'potx'] };
            }
            const picked = await vscode.window.showOpenDialog({
              canSelectMany: false,
              filters,
              defaultUri: vscode.Uri.file(path.dirname(filePath)),
            });
            if (picked && picked.length > 0) {
              const pickedPath = picked[0].fsPath;
              const bytes = fs.readFileSync(pickedPath);
              webview.postMessage({
                type: 'pickedFile',
                requestId,
                purpose,
                name: path.basename(pickedPath),
                base64: bytes.toString('base64'),
              });
            } else {
              webview.postMessage({
                type: 'pickedFileCancel',
                requestId,
              });
            }
          } catch (err: any) {
            webview.postMessage({
              type: 'pickedFileCancel',
              requestId: message.requestId ?? 0,
            });
          }
          break;
        }

        // --- UNIVERSAL 327 ENGINE COMMAND DISPATCHER ---
        case 'runEngineCommand': {
          try {
            const cmdId = message.cmdId;
            const params = message.params ? `=${JSON.stringify(message.params)}` : '';
            const index = message.index ?? 0;
            const commands = [`slide.go=${JSON.stringify({ index })}`, `${cmdId}${params}`];
            await DeckcraftCli.runCommand(commands, this.context, filePath, filePath);
            const { info, slideUris } = await loadPresentationData();
            info.slideShapes![index] = await DeckcraftCli.inspectSlide(filePath, index, this.context);
            webview.postMessage({ type: 'updateData', info, slideUris, targetIndex: index });
          } catch (err: any) {
            vscode.window.showErrorMessage(`엔진 명령 실행 실패 (${message.cmdId}): ${err.message}`);
          }
          break;
        }
      }
    });

    const fileWatcher = vscode.workspace.createFileSystemWatcher(document.uri.fsPath);
    fileWatcher.onDidChange(async () => {
      if (Date.now() - lastSavedByWasmAt < 3000) {
        return;
      }
      await renderAndUpdate();
    });

    webviewPanel.onDidDispose(() => {
      fileWatcher.dispose();
    });
  }

  private async openInPowerPoint(documentUri: vscode.Uri): Promise<void> {
    const pptApp = '/Applications/Microsoft PowerPoint.app';
    if (process.platform === 'darwin' && fs.existsSync(pptApp)) {
      await execAsync(`open -a "${pptApp}" "${documentUri.fsPath}"`);
      vscode.window.showInformationMessage('Microsoft PowerPoint에서 프레젠테이션을 열었습니다.');
    } else if (process.platform === 'win32') {
      await execAsync(`cmd /c start "" "${documentUri.fsPath}"`);
      vscode.window.showInformationMessage('Microsoft PowerPoint / 기본 앱에서 프레젠테이션을 열었습니다.');
    } else if (process.platform === 'darwin') {
      await execAsync(`open "${documentUri.fsPath}"`);
      vscode.window.showInformationMessage('기본 프레젠테이션 앱에서 열었습니다.');
    } else {
      await execAsync(`xdg-open "${documentUri.fsPath}"`);
      vscode.window.showInformationMessage('기본 프레젠테이션 앱에서 열었습니다.');
    }
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
    const platformConfig = PlatformHelper.getPlatformConfig();
    const bundledGlassApp = path.join(this.context.extensionUri.fsPath, 'bin', 'DeckCraft.app');
    const userGlassApp = path.join(process.env.HOME || '', 'Applications', 'DeckCraft.app');
    const configuredApp = config.get<string>('desktopAppPath');
    const customAppPath =
      configuredApp && configuredApp !== '/Applications/DeckCraft.app' && fs.existsSync(configuredApp)
        ? configuredApp
        : process.platform === 'darwin' && fs.existsSync(bundledGlassApp)
        ? bundledGlassApp
        : process.platform === 'darwin' && fs.existsSync(userGlassApp)
        ? userGlassApp
        : platformConfig.desktopAppDefaultPath;

    if (fs.existsSync(customAppPath)) {
      await PlatformHelper.openNativeApp(customAppPath, documentUri.fsPath);
      vscode.window.showInformationMessage(`Opening in DeckCraft native desktop app (${platformConfig.os})...`);
    } else {
      const downloadAction = `Download DeckCraft for ${platformConfig.os}`;
      const choice = await vscode.window.showWarningMessage(
        `DeckCraft desktop app not found at ${customAppPath}. Would you like to download it?`,
        downloadAction
      );
      if (choice === downloadAction) {
        vscode.env.openExternal(vscode.Uri.parse(platformConfig.desktopAppDownloadUrl));
      }
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
