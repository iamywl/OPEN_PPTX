import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runQa() {
  console.log('====================================================');
  console.log('🚀 DeckCraft Extension Automated QA Test Suite');
  console.log('====================================================\n');

  const rootDir = path.resolve(__dirname, '..');
  const binPath = path.join(rootDir, 'bin', 'deckcraft-cli');
  const samplePptx = path.join(rootDir, 'samples', 'sample.pptx');
  const qaOutputDir = path.join(rootDir, 'qa_output');

  fs.mkdirSync(qaOutputDir, { recursive: true });

  const results: { test: string; status: 'PASS' | 'FAIL'; details: string }[] = [];

  // TEST 1: Binary Existence & Execution
  console.log('▶ [TEST 1] Verifying DeckCraft CLI Binary...');
  try {
    const { stdout } = await execAsync(`"${binPath}" --version`);
    const version = stdout.trim();
    if (version.includes('deckcraft-cli')) {
      results.push({ test: 'CLI Binary Execution', status: 'PASS', details: `Version: ${version}` });
      console.log(`  ✓ Passed: ${version}`);
    } else {
      throw new Error(`Unexpected output: ${version}`);
    }
  } catch (err: any) {
    results.push({ test: 'CLI Binary Execution', status: 'FAIL', details: err.message });
    console.error(`  ✗ Failed: ${err.message}`);
  }

  // TEST 2: Parsing Presentation Info
  console.log('▶ [TEST 2] Parsing Presentation Info JSON from sample.pptx...');
  try {
    const { stdout } = await execAsync(`"${binPath}" info "${samplePptx}"`);
    const info = JSON.parse(stdout);
    if (info.slides && info.slides.length === 8) {
      results.push({
        test: 'Presentation Info Parsing',
        status: 'PASS',
        details: `Loaded ${info.slides.length} slides, Theme: ${info.theme}`,
      });
      console.log(`  ✓ Passed: ${info.slides.length} slides parsed successfully (Theme: ${info.theme})`);
    } else {
      throw new Error(`Invalid slide count: ${info.slides?.length}`);
    }
  } catch (err: any) {
    results.push({ test: 'Presentation Info Parsing', status: 'FAIL', details: err.message });
    console.error(`  ✗ Failed: ${err.message}`);
  }

  // TEST 3: Rendering All Slides to High-Res PNG
  console.log('▶ [TEST 3] Rendering Slides to PNG Images (Scale: 1.5)...');
  try {
    const slidesDir = path.join(qaOutputDir, 'rendered_slides');
    fs.mkdirSync(slidesDir, { recursive: true });
    await execAsync(`"${binPath}" render "${samplePptx}" --all --scale 1.5 "${slidesDir}"`);
    const files = fs.readdirSync(slidesDir).filter((f) => f.endsWith('.png'));
    if (files.length === 8) {
      results.push({
        test: 'High-Res Slide Rendering',
        status: 'PASS',
        details: `Rendered ${files.length} slide PNGs (1440×810)`,
      });
      console.log(`  ✓ Passed: ${files.length} slide PNGs rendered to ${slidesDir}`);
    } else {
      throw new Error(`Expected 8 PNG slides, got ${files.length}`);
    }
  } catch (err: any) {
    results.push({ test: 'High-Res Slide Rendering', status: 'FAIL', details: err.message });
    console.error(`  ✗ Failed: ${err.message}`);
  }

  // TEST 4: Converting PPTX to Vector PDF
  console.log('▶ [TEST 4] Exporting Presentation to Vector PDF...');
  try {
    const pdfPath = path.join(qaOutputDir, 'qa_sample.pdf');
    await execAsync(`"${binPath}" convert "${samplePptx}" "${pdfPath}"`);
    const stats = fs.statSync(pdfPath);
    if (stats.size > 100000) {
      results.push({
        test: 'Vector PDF Conversion',
        status: 'PASS',
        details: `Generated PDF size: ${(stats.size / 1024).toFixed(1)} KB`,
      });
      console.log(`  ✓ Passed: PDF generated successfully (${(stats.size / 1024).toFixed(1)} KB)`);
    } else {
      throw new Error(`PDF file size too small: ${stats.size} bytes`);
    }
  } catch (err: any) {
    results.push({ test: 'Vector PDF Conversion', status: 'FAIL', details: err.message });
    console.error(`  ✗ Failed: ${err.message}`);
  }

  // TEST 5: Exporting Presentation Outline to Markdown
  console.log('▶ [TEST 5] Exporting Presentation Outline to Markdown...');
  try {
    const mdPath = path.join(qaOutputDir, 'qa_outline.md');
    await execAsync(`"${binPath}" convert "${samplePptx}" "${mdPath}"`);
    const content = fs.readFileSync(mdPath, 'utf8');
    if (content.includes('Northern Lights') && content.includes('The Science')) {
      results.push({
        test: 'Markdown Outline Export',
        status: 'PASS',
        details: `Outline length: ${content.length} characters`,
      });
      console.log(`  ✓ Passed: Markdown outline extracted with valid slide headers`);
    } else {
      throw new Error('Markdown outline missing expected slide headers');
    }
  } catch (err: any) {
    results.push({ test: 'Markdown Outline Export', status: 'FAIL', details: err.message });
    console.error(`  ✗ Failed: ${err.message}`);
  }

  // TEST 6: Verifying Assets & Screenshots
  console.log('▶ [TEST 6] Verifying Documentation Assets & UI Screenshots...');
  try {
    const requiredImages = [
      'editor.png',
      'sample-deck.png',
      'dark-mode.png',
      'slide-sorter.png',
      'format-pane.png',
      'shape-format.png',
    ];
    for (const img of requiredImages) {
      const imgPath = path.join(rootDir, 'assets', 'images', img);
      if (!fs.existsSync(imgPath)) {
        throw new Error(`Missing screenshot asset: ${img}`);
      }
      const stats = fs.statSync(imgPath);
      if (stats.size < 50000) {
        throw new Error(`Asset ${img} appears corrupted or too small (${stats.size} bytes)`);
      }
    }
    results.push({
      test: 'Documentation Asset Verification',
      status: 'PASS',
      details: `Verified ${requiredImages.length} high-resolution screenshot assets`,
    });
    console.log(`  ✓ Passed: All ${requiredImages.length} screenshots verified`);
  } catch (err: any) {
    results.push({ test: 'Documentation Asset Verification', status: 'FAIL', details: err.message });
    console.error(`  ✗ Failed: ${err.message}`);
  }

  console.log('\n====================================================');
  console.log('📋 QA SUMMARY REPORT');
  console.log('====================================================');
  console.table(results);

  const allPassed = results.every((r) => r.status === 'PASS');
  if (allPassed) {
    console.log('\n🎉 ALL QA CHECKS PASSED WITH 100% SUCCESS!\n');
  } else {
    console.log('\n⚠️ SOME QA CHECKS FAILED. Review errors above.\n');
    process.exit(1);
  }
}

runQa().catch((err) => {
  console.error('Fatal QA error:', err);
  process.exit(1);
});
