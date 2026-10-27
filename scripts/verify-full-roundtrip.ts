import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runRoundtripVerification() {
  console.log('====================================================');
  console.log('🔄 Deep End-to-End Presentation Creation & Roundtrip Test');
  console.log('====================================================\n');

  const rootDir = path.resolve(__dirname, '..');
  const binPath = path.join(rootDir, 'bin', 'deckcraft-cli');
  const testDir = path.join(rootDir, 'qa_output', 'roundtrip_test');
  fs.mkdirSync(testDir, { recursive: true });

  const customPptx = path.join(testDir, 'custom_generated.pptx');
  const customPdf = path.join(testDir, 'custom_generated.pdf');
  const customMd = path.join(testDir, 'custom_generated.md');
  const customSlidePng = path.join(testDir, 'custom_slide_0.png');

  // Step 1: Programmatically create a new presentation with shapes and text
  console.log('▶ [Step 1] Programmatically creating a new presentation with deckcraft-cli...');
  const createCmd = `"${binPath}" run ` +
    `--cmd 'slide.new={"layout":"titleOnly","title":"Deep Verification Deck"}' ` +
    `--cmd 'slide.delete={"index":0}' ` +
    `--cmd 'shape.insert={"preset":"roundRect","rect":[100,180,400,140],"text":"Automated Testing"}' ` +
    `--cmd 'format.size={"size":24}' ` +
    `--save "${customPptx}"`;

  await execAsync(createCmd);
  console.log(`  ✓ Created presentation file: ${customPptx} (${fs.statSync(customPptx).size} bytes)`);

  // Step 2: Read info
  console.log('▶ [Step 2] Reading metadata from newly created presentation...');
  const { stdout: infoJson } = await execAsync(`"${binPath}" info "${customPptx}"`);
  const info = JSON.parse(infoJson);
  console.log(`  ✓ Slides found: ${info.slides.length}`);
  console.log(`  ✓ Slide 0 Title: "${info.slides[0]?.title}"`);

  if (!info.slides[0]?.title.includes('Deep Verification Deck')) {
    throw new Error('Title does not match expected created slide title!');
  }

  // Step 3: Render single slide
  console.log('▶ [Step 3] Rendering slide 0 to PNG (scale: 2)...');
  await execAsync(`"${binPath}" render "${customPptx}" --slide 0 --scale 2 "${customSlidePng}"`);
  console.log(`  ✓ Slide 0 rendered to: ${customSlidePng} (${fs.statSync(customSlidePng).size} bytes)`);

  // Step 4: Convert to PDF
  console.log('▶ [Step 4] Converting newly generated presentation to vector PDF...');
  await execAsync(`"${binPath}" convert "${customPptx}" "${customPdf}"`);
  console.log(`  ✓ PDF successfully generated: ${customPdf} (${fs.statSync(customPdf).size} bytes)`);

  // Step 5: Convert to Markdown
  console.log('▶ [Step 5] Extracting outline to Markdown...');
  await execAsync(`"${binPath}" convert "${customPptx}" "${customMd}"`);
  const mdContent = fs.readFileSync(customMd, 'utf8');
  console.log(`  ✓ Markdown extracted:\n${mdContent.trim()}`);

  if (!mdContent.includes('Deep Verification Deck')) {
    throw new Error('Markdown output does not contain expected slide title!');
  }

  console.log('\n====================================================');
  console.log('🎉 FULL ROUNDTRIP VERIFICATION 100% SUCCESSFUL!');
  console.log('====================================================\n');
}

runRoundtripVerification().catch((err) => {
  console.error('Roundtrip verification failed:', err);
  process.exit(1);
});
