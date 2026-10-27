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

// scripts/verify-full-roundtrip.ts
var path = __toESM(require("path"));
var fs = __toESM(require("fs"));
var import_child_process = require("child_process");
var import_util = require("util");
var execAsync = (0, import_util.promisify)(import_child_process.exec);
async function runRoundtripVerification() {
  console.log("====================================================");
  console.log("\u{1F504} Deep End-to-End Presentation Creation & Roundtrip Test");
  console.log("====================================================\n");
  const rootDir = path.resolve(__dirname, "..");
  const binPath = path.join(rootDir, "bin", "deckcraft-cli");
  const testDir = path.join(rootDir, "qa_output", "roundtrip_test");
  fs.mkdirSync(testDir, { recursive: true });
  const customPptx = path.join(testDir, "custom_generated.pptx");
  const customPdf = path.join(testDir, "custom_generated.pdf");
  const customMd = path.join(testDir, "custom_generated.md");
  const customSlidePng = path.join(testDir, "custom_slide_0.png");
  console.log("\u25B6 [Step 1] Programmatically creating a new presentation with deckcraft-cli...");
  const createCmd = `"${binPath}" run --cmd 'slide.new={"layout":"titleOnly","title":"Deep Verification Deck"}' --cmd 'slide.delete={"index":0}' --cmd 'shape.insert={"preset":"roundRect","rect":[100,180,400,140],"text":"Automated Testing"}' --cmd 'format.size={"size":24}' --save "${customPptx}"`;
  await execAsync(createCmd);
  console.log(`  \u2713 Created presentation file: ${customPptx} (${fs.statSync(customPptx).size} bytes)`);
  console.log("\u25B6 [Step 2] Reading metadata from newly created presentation...");
  const { stdout: infoJson } = await execAsync(`"${binPath}" info "${customPptx}"`);
  const info = JSON.parse(infoJson);
  console.log(`  \u2713 Slides found: ${info.slides.length}`);
  console.log(`  \u2713 Slide 0 Title: "${info.slides[0]?.title}"`);
  if (!info.slides[0]?.title.includes("Deep Verification Deck")) {
    throw new Error("Title does not match expected created slide title!");
  }
  console.log("\u25B6 [Step 3] Rendering slide 0 to PNG (scale: 2)...");
  await execAsync(`"${binPath}" render "${customPptx}" --slide 0 --scale 2 "${customSlidePng}"`);
  console.log(`  \u2713 Slide 0 rendered to: ${customSlidePng} (${fs.statSync(customSlidePng).size} bytes)`);
  console.log("\u25B6 [Step 4] Converting newly generated presentation to vector PDF...");
  await execAsync(`"${binPath}" convert "${customPptx}" "${customPdf}"`);
  console.log(`  \u2713 PDF successfully generated: ${customPdf} (${fs.statSync(customPdf).size} bytes)`);
  console.log("\u25B6 [Step 5] Extracting outline to Markdown...");
  await execAsync(`"${binPath}" convert "${customPptx}" "${customMd}"`);
  const mdContent = fs.readFileSync(customMd, "utf8");
  console.log(`  \u2713 Markdown extracted:
${mdContent.trim()}`);
  if (!mdContent.includes("Deep Verification Deck")) {
    throw new Error("Markdown output does not contain expected slide title!");
  }
  console.log("\n====================================================");
  console.log("\u{1F389} FULL ROUNDTRIP VERIFICATION 100% SUCCESSFUL!");
  console.log("====================================================\n");
}
runRoundtripVerification().catch((err) => {
  console.error("Roundtrip verification failed:", err);
  process.exit(1);
});
