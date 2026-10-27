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

// scripts/qa-test.ts
var path = __toESM(require("path"));
var fs = __toESM(require("fs"));
var import_child_process = require("child_process");
var import_util = require("util");
var execAsync = (0, import_util.promisify)(import_child_process.exec);
async function runQa() {
  console.log("====================================================");
  console.log("\u{1F680} DeckCraft Extension Automated QA Test Suite");
  console.log("====================================================\n");
  const rootDir = path.resolve(__dirname, "..");
  const binPath = path.join(rootDir, "bin", "deckcraft-cli");
  const samplePptx = path.join(rootDir, "samples", "sample.pptx");
  const qaOutputDir = path.join(rootDir, "qa_output");
  fs.mkdirSync(qaOutputDir, { recursive: true });
  const results = [];
  console.log("\u25B6 [TEST 1] Verifying DeckCraft CLI Binary...");
  try {
    const { stdout } = await execAsync(`"${binPath}" --version`);
    const version = stdout.trim();
    if (version.includes("deckcraft-cli")) {
      results.push({ test: "CLI Binary Execution", status: "PASS", details: `Version: ${version}` });
      console.log(`  \u2713 Passed: ${version}`);
    } else {
      throw new Error(`Unexpected output: ${version}`);
    }
  } catch (err) {
    results.push({ test: "CLI Binary Execution", status: "FAIL", details: err.message });
    console.error(`  \u2717 Failed: ${err.message}`);
  }
  console.log("\u25B6 [TEST 2] Parsing Presentation Info JSON from sample.pptx...");
  try {
    const { stdout } = await execAsync(`"${binPath}" info "${samplePptx}"`);
    const info = JSON.parse(stdout);
    if (info.slides && info.slides.length === 8) {
      results.push({
        test: "Presentation Info Parsing",
        status: "PASS",
        details: `Loaded ${info.slides.length} slides, Theme: ${info.theme}`
      });
      console.log(`  \u2713 Passed: ${info.slides.length} slides parsed successfully (Theme: ${info.theme})`);
    } else {
      throw new Error(`Invalid slide count: ${info.slides?.length}`);
    }
  } catch (err) {
    results.push({ test: "Presentation Info Parsing", status: "FAIL", details: err.message });
    console.error(`  \u2717 Failed: ${err.message}`);
  }
  console.log("\u25B6 [TEST 3] Rendering Slides to PNG Images (Scale: 1.5)...");
  try {
    const slidesDir = path.join(qaOutputDir, "rendered_slides");
    fs.mkdirSync(slidesDir, { recursive: true });
    await execAsync(`"${binPath}" render "${samplePptx}" --all --scale 1.5 "${slidesDir}"`);
    const files = fs.readdirSync(slidesDir).filter((f) => f.endsWith(".png"));
    if (files.length === 8) {
      results.push({
        test: "High-Res Slide Rendering",
        status: "PASS",
        details: `Rendered ${files.length} slide PNGs (1440\xD7810)`
      });
      console.log(`  \u2713 Passed: ${files.length} slide PNGs rendered to ${slidesDir}`);
    } else {
      throw new Error(`Expected 8 PNG slides, got ${files.length}`);
    }
  } catch (err) {
    results.push({ test: "High-Res Slide Rendering", status: "FAIL", details: err.message });
    console.error(`  \u2717 Failed: ${err.message}`);
  }
  console.log("\u25B6 [TEST 4] Exporting Presentation to Vector PDF...");
  try {
    const pdfPath = path.join(qaOutputDir, "qa_sample.pdf");
    await execAsync(`"${binPath}" convert "${samplePptx}" "${pdfPath}"`);
    const stats = fs.statSync(pdfPath);
    if (stats.size > 1e5) {
      results.push({
        test: "Vector PDF Conversion",
        status: "PASS",
        details: `Generated PDF size: ${(stats.size / 1024).toFixed(1)} KB`
      });
      console.log(`  \u2713 Passed: PDF generated successfully (${(stats.size / 1024).toFixed(1)} KB)`);
    } else {
      throw new Error(`PDF file size too small: ${stats.size} bytes`);
    }
  } catch (err) {
    results.push({ test: "Vector PDF Conversion", status: "FAIL", details: err.message });
    console.error(`  \u2717 Failed: ${err.message}`);
  }
  console.log("\u25B6 [TEST 5] Exporting Presentation Outline to Markdown...");
  try {
    const mdPath = path.join(qaOutputDir, "qa_outline.md");
    await execAsync(`"${binPath}" convert "${samplePptx}" "${mdPath}"`);
    const content = fs.readFileSync(mdPath, "utf8");
    if (content.includes("Northern Lights") && content.includes("The Science")) {
      results.push({
        test: "Markdown Outline Export",
        status: "PASS",
        details: `Outline length: ${content.length} characters`
      });
      console.log(`  \u2713 Passed: Markdown outline extracted with valid slide headers`);
    } else {
      throw new Error("Markdown outline missing expected slide headers");
    }
  } catch (err) {
    results.push({ test: "Markdown Outline Export", status: "FAIL", details: err.message });
    console.error(`  \u2717 Failed: ${err.message}`);
  }
  console.log("\u25B6 [TEST 6] Verifying Documentation Assets & UI Screenshots...");
  try {
    const requiredImages = [
      "editor.png",
      "sample-deck.png",
      "dark-mode.png",
      "slide-sorter.png",
      "format-pane.png",
      "shape-format.png"
    ];
    for (const img of requiredImages) {
      const imgPath = path.join(rootDir, "assets", "images", img);
      if (!fs.existsSync(imgPath)) {
        throw new Error(`Missing screenshot asset: ${img}`);
      }
      const stats = fs.statSync(imgPath);
      if (stats.size < 5e4) {
        throw new Error(`Asset ${img} appears corrupted or too small (${stats.size} bytes)`);
      }
    }
    results.push({
      test: "Documentation Asset Verification",
      status: "PASS",
      details: `Verified ${requiredImages.length} high-resolution screenshot assets`
    });
    console.log(`  \u2713 Passed: All ${requiredImages.length} screenshots verified`);
  } catch (err) {
    results.push({ test: "Documentation Asset Verification", status: "FAIL", details: err.message });
    console.error(`  \u2717 Failed: ${err.message}`);
  }
  console.log("\n====================================================");
  console.log("\u{1F4CB} QA SUMMARY REPORT");
  console.log("====================================================");
  console.table(results);
  const allPassed = results.every((r) => r.status === "PASS");
  if (allPassed) {
    console.log("\n\u{1F389} ALL QA CHECKS PASSED WITH 100% SUCCESS!\n");
  } else {
    console.log("\n\u26A0\uFE0F SOME QA CHECKS FAILED. Review errors above.\n");
    process.exit(1);
  }
}
runQa().catch((err) => {
  console.error("Fatal QA error:", err);
  process.exit(1);
});
