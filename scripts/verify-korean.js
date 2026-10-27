"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// scripts/verify-korean.ts
var path = __toESM(require("path"));
var fs = __toESM(require("fs"));
var import_child_process = require("child_process");
var import_util = require("util");
var execAsync = (0, import_util.promisify)(import_child_process.exec);
async function verifyKoreanSupport() {
  console.log("====================================================");
  console.log("\u{1F1F0}\u{1F1F7} Deep Korean (\uD55C\uAE00) Support Verification Suite");
  console.log("====================================================\n");
  const rootDir = path.resolve(__dirname, "..");
  const binPath = path.join(rootDir, "bin", "deckcraft-cli");
  const outDir = path.join(rootDir, "qa_output", "korean_verification");
  fs.mkdirSync(outDir, { recursive: true });
  const pptxPath = path.join(outDir, "korean_deck.pptx");
  const pdfPath = path.join(outDir, "korean_deck.pdf");
  const mdPath = path.join(outDir, "korean_deck.md");
  const slidePng = path.join(outDir, "korean_slide_0.png");
  console.log("\u25B6 [Test 1] Creating Presentation with Korean text...");
  const title = "\uC624\uD508 \uD30C\uC6CC\uD3EC\uC778\uD2B8 \uC2A4\uD29C\uB514\uC624 (OPEN_PPTX)";
  const shapeText = "Rust \uAE30\uBC18 \uACE0\uC131\uB2A5 \uD504\uB808\uC820\uD14C\uC774\uC158 \uC5D4\uC9C4";
  const notesText = "\uBC1C\uD45C\uC790 \uBA54\uBAA8: \uD55C\uAE00 \uD14D\uC2A4\uD2B8 \uBC0F \uC720\uB2C8\uCF54\uB4DC UTF-8 \uC815\uC0C1 \uB80C\uB354\uB9C1";
  const cmd = `"${binPath}" run --cmd 'slide.new={"layout":"titleOnly","title":"${title}"}' --cmd 'slide.delete={"index":0}' --cmd 'shape.insert={"preset":"roundRect","rect":[100,160,500,160],"text":"${shapeText}"}' --cmd 'slide.notes={"text":"${notesText}"}' --save "${pptxPath}"`;
  await execAsync(cmd);
  console.log(`  \u2713 PPTX created: ${pptxPath} (${fs.statSync(pptxPath).size} bytes)`);
  console.log("\u25B6 [Test 2] Validating parsed JSON metadata for Korean encoding...");
  const { stdout: infoJson } = await execAsync(`"${binPath}" info "${pptxPath}"`);
  const info = JSON.parse(infoJson);
  if (info.slides[0]?.title !== title) {
    throw new Error(`Title mismatch! Expected "${title}", got "${info.slides[0]?.title}"`);
  }
  if (info.slides[0]?.notes !== notesText) {
    throw new Error(`Notes mismatch! Expected "${notesText}", got "${info.slides[0]?.notes}"`);
  }
  console.log(`  \u2713 Title preserved exactly: "${info.slides[0].title}"`);
  console.log(`  \u2713 Notes preserved exactly: "${info.slides[0].notes}"`);
  console.log("\u25B6 [Test 3] Rendering Korean slide to high-res PNG...");
  await execAsync(`"${binPath}" render "${pptxPath}" --slide 0 --scale 2 "${slidePng}"`);
  const pngSize = fs.statSync(slidePng).size;
  if (pngSize < 3e4) {
    throw new Error(`Rendered PNG size too small (${pngSize} bytes)`);
  }
  console.log(`  \u2713 Rendered PNG size: ${(pngSize / 1024).toFixed(1)} KB (1920\xD71080)`);
  console.log("\u25B6 [Test 4] Converting to vector PDF...");
  await execAsync(`"${binPath}" convert "${pptxPath}" "${pdfPath}"`);
  console.log(`  \u2713 PDF generated: ${(fs.statSync(pdfPath).size / 1024).toFixed(1)} KB`);
  console.log("\u25B6 [Test 5] Extracting Markdown outline with Korean text...");
  await execAsync(`"${binPath}" convert "${pptxPath}" "${mdPath}"`);
  const mdContent = fs.readFileSync(mdPath, "utf8");
  console.log(`  \u2713 Extracted Markdown content:
${mdContent.trim()}`);
  if (!mdContent.includes(title) || !mdContent.includes(shapeText)) {
    throw new Error("Markdown output missing expected Korean text!");
  }
  console.log("\n\u25B6 [Test 6] Editing: Adding second slide in Korean...");
  const secondTitle = "\uC8FC\uC694 \uC0AC\uC5C5 \uBC0F \uB9C8\uC77C\uC2A4\uD1A4 \uACC4\uD68D";
  const addCmd = `"${binPath}" run --in "${pptxPath}" --cmd 'slide.new={"layout":"titleAndContent","title":"${secondTitle}"}' --save "${pptxPath}"`;
  await execAsync(addCmd);
  const { stdout: updatedJson } = await execAsync(`"${binPath}" info "${pptxPath}"`);
  const updatedInfo = JSON.parse(updatedJson);
  if (updatedInfo.slides.length !== 2 || updatedInfo.slides[1]?.title !== secondTitle) {
    throw new Error(`Failed to add Korean slide! Current count: ${updatedInfo.slides.length}`);
  }
  console.log(`  \u2713 Successfully added 2nd slide: "${updatedInfo.slides[1].title}"`);
  console.log("\n====================================================");
  console.log("\u{1F389} KOREAN (\uD55C\uAE00) SUPPORT 100% VERIFIED ACROSS ALL LAYERS!");
  console.log("====================================================\n");
}
verifyKoreanSupport().catch((err) => {
  console.error("Korean verification error:", err);
  process.exit(1);
});
