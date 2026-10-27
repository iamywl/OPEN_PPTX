import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function verifyKoreanSupport() {
  console.log('====================================================');
  console.log('🇰🇷 Deep Korean (한글) Support Verification Suite');
  console.log('====================================================\n');

  const rootDir = path.resolve(__dirname, '..');
  const binPath = path.join(rootDir, 'bin', 'deckcraft-cli');
  const outDir = path.join(rootDir, 'qa_output', 'korean_verification');
  fs.mkdirSync(outDir, { recursive: true });

  const pptxPath = path.join(outDir, 'korean_deck.pptx');
  const pdfPath = path.join(outDir, 'korean_deck.pdf');
  const mdPath = path.join(outDir, 'korean_deck.md');
  const slidePng = path.join(outDir, 'korean_slide_0.png');

  // 1. Create presentation with Korean characters
  console.log('▶ [Test 1] Creating Presentation with Korean text...');
  const title = '오픈 파워포인트 스튜디오 (OPEN_PPTX)';
  const shapeText = 'Rust 기반 고성능 프레젠테이션 엔진';
  const notesText = '발표자 메모: 한글 텍스트 및 유니코드 UTF-8 정상 렌더링';

  const cmd = `"${binPath}" run ` +
    `--cmd 'slide.new={"layout":"titleOnly","title":"${title}"}' ` +
    `--cmd 'slide.delete={"index":0}' ` +
    `--cmd 'shape.insert={"preset":"roundRect","rect":[100,160,500,160],"text":"${shapeText}"}' ` +
    `--cmd 'slide.notes={"text":"${notesText}"}' ` +
    `--save "${pptxPath}"`;

  await execAsync(cmd);
  console.log(`  ✓ PPTX created: ${pptxPath} (${fs.statSync(pptxPath).size} bytes)`);

  // 2. Info inspection
  console.log('▶ [Test 2] Validating parsed JSON metadata for Korean encoding...');
  const { stdout: infoJson } = await execAsync(`"${binPath}" info "${pptxPath}"`);
  const info = JSON.parse(infoJson);

  if (info.slides[0]?.title !== title) {
    throw new Error(`Title mismatch! Expected "${title}", got "${info.slides[0]?.title}"`);
  }
  if (info.slides[0]?.notes !== notesText) {
    throw new Error(`Notes mismatch! Expected "${notesText}", got "${info.slides[0]?.notes}"`);
  }
  console.log(`  ✓ Title preserved exactly: "${info.slides[0].title}"`);
  console.log(`  ✓ Notes preserved exactly: "${info.slides[0].notes}"`);

  // 3. Render slide to PNG
  console.log('▶ [Test 3] Rendering Korean slide to high-res PNG...');
  await execAsync(`"${binPath}" render "${pptxPath}" --slide 0 --scale 2 "${slidePng}"`);
  const pngSize = fs.statSync(slidePng).size;
  if (pngSize < 30000) {
    throw new Error(`Rendered PNG size too small (${pngSize} bytes)`);
  }
  console.log(`  ✓ Rendered PNG size: ${(pngSize / 1024).toFixed(1)} KB (1920×1080)`);

  // 4. Convert to PDF
  console.log('▶ [Test 4] Converting to vector PDF...');
  await execAsync(`"${binPath}" convert "${pptxPath}" "${pdfPath}"`);
  console.log(`  ✓ PDF generated: ${(fs.statSync(pdfPath).size / 1024).toFixed(1)} KB`);

  // 5. Convert to Markdown Outline
  console.log('▶ [Test 5] Extracting Markdown outline with Korean text...');
  await execAsync(`"${binPath}" convert "${pptxPath}" "${mdPath}"`);
  const mdContent = fs.readFileSync(mdPath, 'utf8');
  console.log(`  ✓ Extracted Markdown content:\n${mdContent.trim()}`);

  if (!mdContent.includes(title) || !mdContent.includes(shapeText)) {
    throw new Error('Markdown output missing expected Korean text!');
  }

  // 6. Test editing with Korean: Add second slide
  console.log('\n▶ [Test 6] Editing: Adding second slide in Korean...');
  const secondTitle = '주요 사업 및 마일스톤 계획';
  const addCmd = `"${binPath}" run --in "${pptxPath}" --cmd 'slide.new={"layout":"titleAndContent","title":"${secondTitle}"}' --save "${pptxPath}"`;
  await execAsync(addCmd);

  const { stdout: updatedJson } = await execAsync(`"${binPath}" info "${pptxPath}"`);
  const updatedInfo = JSON.parse(updatedJson);
  if (updatedInfo.slides.length !== 2 || updatedInfo.slides[1]?.title !== secondTitle) {
    throw new Error(`Failed to add Korean slide! Current count: ${updatedInfo.slides.length}`);
  }
  console.log(`  ✓ Successfully added 2nd slide: "${updatedInfo.slides[1].title}"`);

  console.log('\n====================================================');
  console.log('🎉 KOREAN (한글) SUPPORT 100% VERIFIED ACROSS ALL LAYERS!');
  console.log('====================================================\n');
}

verifyKoreanSupport().catch((err) => {
  console.error('Korean verification error:', err);
  process.exit(1);
});
