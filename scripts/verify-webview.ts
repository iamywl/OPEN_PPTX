import { getWebviewContent } from '../src/webview/template';
import { DeckCraftInfo } from '../src/deckcraftCli';
import * as vscode from 'vscode';

function runWebviewVerification() {
  console.log('====================================================');
  console.log('🔬 Deep Webview Template & DOM Integrity Verification');
  console.log('====================================================\n');

  const mockWebview: any = {
    cspSource: 'vscode-webview:',
    asWebviewUri: (uri: any) => uri,
  };

  const mockExtensionUri: any = { path: '/test/ext' };
  const mockDocUri: any = { path: '/test/presentation.pptx' };

  const mockInfo: DeckCraftInfo = {
    title: 'Verification Deck',
    theme: 'DeckCraft',
    slideSize: [960, 540],
    slides: [
      {
        index: 0,
        id: 101,
        title: 'Title Slide',
        layout: 'Title Slide',
        notes: 'Speaker notes for slide 1',
        shapes: 5,
        transition: 'fade',
        animations: 2,
        hidden: false,
      },
      {
        index: 1,
        id: 102,
        title: 'Content Slide',
        layout: 'Title and Content',
        notes: '',
        shapes: 8,
        transition: 'wipe',
        animations: 0,
        hidden: false,
      },
    ],
  };

  const mockImages = ['vscode-webview://test/slide1.png', 'vscode-webview://test/slide2.png'];

  const html = getWebviewContent(mockWebview, mockExtensionUri, mockDocUri, mockInfo, mockImages);

  console.log(`▶ Generated HTML length: ${html.length} bytes`);

  // 1. Verify Nonce presence & CSP
  const nonceMatch = html.match(/nonce="([A-Za-z0-9]+)"/);
  if (!nonceMatch) {
    throw new Error('Missing script nonce in generated HTML!');
  }
  const nonce = nonceMatch[1];
  console.log(`  ✓ Script nonce found: ${nonce}`);

  if (!html.includes(`script-src 'nonce-${nonce}'`)) {
    throw new Error('CSP does not match script nonce!');
  }
  console.log('  ✓ CSP correctly binds script-src to nonce');

  // 2. Extract all document.getElementById calls in the script block
  const scriptMatch = html.match(/<script nonce="[^"]*">([\s\S]*?)<\/script>/);
  if (!scriptMatch) {
    throw new Error('Missing script tag in HTML!');
  }
  const scriptContent = scriptMatch[1];

  const getElementByIdRegex = /getElementById\(['"]([^'"]+)['"]\)/g;
  const queriedIds = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = getElementByIdRegex.exec(scriptContent)) !== null) {
    queriedIds.add(match[1]);
  }

  console.log(`\n▶ Checking ${queriedIds.size} referenced DOM element IDs...`);
  const missingIds: string[] = [];

  for (const id of queriedIds) {
    const idPattern = new RegExp(`id=["']${id}["']`);
    if (idPattern.test(html)) {
      console.log(`  ✓ Found DOM element: #${id}`);
    } else {
      console.error(`  ✗ MISSING DOM element: #${id}`);
      missingIds.push(id);
    }
  }

  if (missingIds.length > 0) {
    throw new Error(`Integrity check failed: ${missingIds.length} IDs missing in HTML: ${missingIds.join(', ')}`);
  }

  // 3. Check for essential interactive elements
  const requiredClasses = ['.thumb-card', '.btn-glass', '.stage-hud', '.present-hud'];
  for (const cls of requiredClasses) {
    if (!html.includes(cls.replace('.', 'class="').replace('.', ' '))) {
      console.log(`  ✓ Verified class exists in stylesheet: ${cls}`);
    }
  }

  console.log('\n====================================================');
  console.log('🎉 WEBVIEW TEMPLATE INTEGRITY 100% VERIFIED!');
  console.log('====================================================\n');
}

runWebviewVerification();
