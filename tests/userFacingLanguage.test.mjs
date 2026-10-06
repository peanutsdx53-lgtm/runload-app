import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() && full.endsWith(".js") ? [full] : [];
  });
}

const userFacingFiles = [...walk(path.join(root, "screens")), ...walk(path.join(root, "ui"))];
const rel = (file) => path.relative(root, file).replaceAll("\\", "/");
const read = (file) => fs.readFileSync(file, "utf8");

const forbiddenCopy = [
  /RunLoad/i,
  /RUNNING RECORD/,
  /大画面では/,
  /スマホ限定/,
  /スマホ版/,
  /PC版/,
  /研究計算/,
  /振動API/,
  /Run Fingerprint/i,
  /正式名称：ROF-J/,
];

const forbiddenVisibleLabels = />\s*(?:WORKSPACE|SHARE PREP|COURSE EDITOR|BEGINNER SUPPORT|FILE ASSIST|ROUTE FILE|LOCAL ANALYSIS|ELEVATION|COURSE CANDIDATE|BODY REGION DETAIL|BODY TIMELINE|BODY REGION|RUN LAB|RUN REPLAY|RUN FINGERPRINT|GPS MEASUREMENT|SMARTPHONE TOOL|REST RECORD|ACHIEVEMENTS|NEXT PLAN|PUBLIC SUPPORT|APP GUIDE|LOCAL DATA|CHANGE CONDITIONS|READ THE DIFFERENCE|FATIGUE CHANGE|12 REGIONS|BODY MAP|SAVED RECORDS|CHECKING THREADS|MEASURE|DONE|RESULT|READING|SETTINGS|MORE|PLAN|CHECK|COURSE|ASSIST|DETAIL|RECENT|NEXT|HISTORY|REST|APP|HOME)\s*</;

test("user-facing runtime does not expose branding, platform meta copy, or internal labels", () => {
  const violations = [];
  for (const file of userFacingFiles) {
    const source = read(file);
    for (const pattern of forbiddenCopy) {
      if (pattern.test(source)) violations.push(`${rel(file)}: ${pattern}`);
    }
    if (forbiddenVisibleLabels.test(source)) violations.push(`${rel(file)}: developer-facing visible label`);
  }
  assert.deepEqual(violations, [], violations.join("\n"));
});

test("record input never prints the internal surface class value directly", () => {
  const source = fs.readFileSync(path.join(root, "screens/recordInputScreen.js"), "utf8");
  assert.doesNotMatch(source, /escapeHtml\(course\.modelSurfaceClass\)/);
  assert.doesNotMatch(source, /正式名称：ROF-J/);
});
