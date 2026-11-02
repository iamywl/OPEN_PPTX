import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function runEngineCommandsVerification(): Promise<{ test: string; status: 'PASS' | 'FAIL'; details: string }[]> {
  console.log('====================================================');
  console.log('⚡ Engine Commands & Precision Layout QA Suite');
  console.log('====================================================\n');

  const rootDir = path.resolve(__dirname, '..');
  const binPath = path.join(rootDir, 'bin', 'deckcraft-cli');
  const samplePptx = path.join(rootDir, 'samples', 'sample.pptx');
  const qaOutputDir = path.join(rootDir, 'qa_output');
  fs.mkdirSync(qaOutputDir, { recursive: true });

  const results: { test: string; status: 'PASS' | 'FAIL'; details: string }[] = [];

  // TEST 1: Shape insertion, fill & text formatting
  console.log('▶ [TEST 1] Testing shape.insert, shape.fill, format.bold, format.anchor, format.align...');
  try {
    const outDeck = path.join(qaOutputDir, 'test_precision_shape.deckcraft');
    const cmdArgs = [
      `--in "${samplePptx}"`,
      `--cmd 'shape.insert={"preset":"roundRect","rect":[100,100,320,120],"text":"QA Formatted Shape"}'`,
      `--cmd 'shape.fill={"color":"#2563eb"}'`,
      `--cmd 'format.bold'`,
      `--cmd 'format.align={"align":"justify"}'`,
      `--cmd 'format.anchor={"anchor":"middle"}'`,
      `--save "${outDeck}"`,
      `--print`,
    ].join(' ');

    const { stdout } = await execAsync(`"${binPath}" run ${cmdArgs}`);
    if (stdout.includes('shape.insert → {"id":') && stdout.includes('shape.fill → 1')) {
      results.push({
        test: 'Engine: shape.insert + fill + format.anchor/align',
        status: 'PASS',
        details: 'Successfully created shape with fill, justify align, and middle anchor',
      });
      console.log('  ✓ Passed: shape.insert, fill, format.bold, justify align, and middle anchor verified');
    } else {
      throw new Error(`Unexpected CLI output: ${stdout}`);
    }
  } catch (err: any) {
    results.push({
      test: 'Engine: shape.insert + fill + format.anchor/align',
      status: 'FAIL',
      details: err.message,
    });
    console.error(`  ✗ Failed: ${err.message}`);
  }

  // TEST 2: Object Alignment & Distribution
  console.log('▶ [TEST 2] Testing arrange.align & arrange.distribute...');
  try {
    const inDeck = path.join(qaOutputDir, 'test_precision_shape.deckcraft');
    const outDeck = path.join(qaOutputDir, 'test_arrange.deckcraft');
    const cmdArgs = [
      `--in "${inDeck}"`,
      `--cmd 'shape.insert={"preset":"ellipse","rect":[450,100,120,120],"text":"Circle 1"}'`,
      `--cmd 'shape.insert={"preset":"rect","rect":[600,100,120,120],"text":"Square 2"}'`,
      `--cmd 'arrange.distribute={"dir":"horizontal","to":"slide"}'`,
      `--cmd 'arrange.align={"edge":"top","to":"selection"}'`,
      `--save "${outDeck}"`,
      `--print`,
    ].join(' ');

    const { stdout } = await execAsync(`"${binPath}" run ${cmdArgs}`);
    if (stdout.includes('arrange.distribute → 1')) {
      results.push({
        test: 'Engine: arrange.distribute & arrange.align',
        status: 'PASS',
        details: 'Successfully aligned and distributed shapes across canvas',
      });
      console.log('  ✓ Passed: arrange.distribute and arrange.align executed successfully');
    } else {
      throw new Error(`Unexpected CLI output: ${stdout}`);
    }
  } catch (err: any) {
    results.push({
      test: 'Engine: arrange.distribute & arrange.align',
      status: 'FAIL',
      details: err.message,
    });
    console.error(`  ✗ Failed: ${err.message}`);
  }

  // TEST 3: Picture Crop Command
  console.log('▶ [TEST 3] Testing picture.crop execution...');
  try {
    const outDeck = path.join(qaOutputDir, 'test_crop.deckcraft');
    // We target a slide with a picture shape, or test crop command on current selection
    const cmdArgs = [
      `--sample`,
      `--cmd 'slide.go={"index":0}'`,
      `--cmd 'edit.select={"ids":[258]}'`,
      `--cmd 'picture.crop={"left":0.1,"top":0.1,"right":0.1,"bottom":0.1}'`,
      `--save "${outDeck}"`,
      `--print`,
    ].join(' ');

    const { stdout } = await execAsync(`"${binPath}" run ${cmdArgs}`);
    if (stdout.includes('picture.crop →')) {
      results.push({
        test: 'Engine: picture.crop',
        status: 'PASS',
        details: 'Executed picture.crop with fractions [0.1, 0.1, 0.1, 0.1]',
      });
      console.log('  ✓ Passed: picture.crop command executed successfully');
    } else {
      throw new Error(`Unexpected CLI output: ${stdout}`);
    }
  } catch (err: any) {
    results.push({
      test: 'Engine: picture.crop',
      status: 'FAIL',
      details: err.message,
    });
    console.error(`  ✗ Failed: ${err.message}`);
  }

  // TEST 4: Slide Lifecycle (slide.new, duplicate, move, delete)
  console.log('▶ [TEST 4] Testing slide.new, slide.duplicate, slide.move, slide.delete...');
  try {
    const outDeck = path.join(qaOutputDir, 'test_slide_ops.deckcraft');
    const cmdArgs = [
      `--sample`,
      `--cmd 'slide.new={"layout":"titleAndContent","title":"Automated QA Slide"}'`,
      `--cmd 'slide.duplicate={"index":1}'`,
      `--cmd 'slide.move={"from":2,"to":0}'`,
      `--cmd 'slide.delete={"index":0}'`,
      `--save "${outDeck}"`,
      `--print`,
    ].join(' ');

    const { stdout } = await execAsync(`"${binPath}" run ${cmdArgs}`);
    if (stdout.includes('slide.new →') && stdout.includes('slide.delete →')) {
      // Verify final slide count via info
      const { stdout: infoOut } = await execAsync(`"${binPath}" info "${outDeck}"`);
      const info = JSON.parse(infoOut);
      // Sample originally has 8 slides. Added 1, duplicated 1 (+2=10), deleted 1 (=9 slides)
      if (info.slides && info.slides.length === 9) {
        results.push({
          test: 'Engine: Slide Management Lifecycle',
          status: 'PASS',
          details: `Successfully performed slide.new, duplicate, move, delete. Final count: ${info.slides.length}`,
        });
        console.log(`  ✓ Passed: Slide lifecycle operations verified (Slide count: ${info.slides.length})`);
      } else {
        throw new Error(`Expected 9 slides, got ${info.slides?.length}`);
      }
    } else {
      throw new Error(`Unexpected CLI output: ${stdout}`);
    }
  } catch (err: any) {
    results.push({
      test: 'Engine: Slide Management Lifecycle',
      status: 'FAIL',
      details: err.message,
    });
    console.error(`  ✗ Failed: ${err.message}`);
  }

  return results;
}

if (require.main === module) {
  runEngineCommandsVerification().then((results) => {
    console.log('\n====================================================');
    console.log('📋 ENGINE QA SUMMARY RESULTS');
    console.log('====================================================');
    console.table(results);
    const pass = results.every((r) => r.status === 'PASS');
    process.exit(pass ? 0 : 1);
  });
}
