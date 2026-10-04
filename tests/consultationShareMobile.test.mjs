import fs from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

const interactions = fs.readFileSync("ui/interactions/consultationInteractions.js", "utf8");
const utility = fs.readFileSync("ui/interactions/browserUtilities.js", "utf8");
const css = fs.readFileSync("styles/consultation-share-mobile.css", "utf8");
const index = fs.readFileSync("index.html", "utf8");

test("all share outputs remain available when question is empty", () => {
  assert.ok(interactions.includes("updateQuestionGuidance"));
  assert.ok(interactions.includes('questionRequirement.textContent = "推奨"'));
  assert.ok(interactions.includes('question?.removeAttribute("required")'));
  assert.ok(!interactions.includes("if (!ensureQuestion()) return"));
  assert.ok(interactions.includes('data-action="open-consult-viewer"'));
  assert.ok(interactions.includes('data-action="print-consultation-report"'));
  assert.ok(interactions.includes('data-action="copy-consultation-report"'));
});

test("consultation binding does not shadow the browser document", () => {
  assert.ok(!interactions.includes("const document = root.querySelector"));
  assert.ok(interactions.includes("const shareDocument = root.querySelector"));
  assert.ok(interactions.includes("globalThis.document.documentElement"));
});

test("clipboard falls back when Clipboard API rejects", () => {
  assert.ok(utility.includes("try {"));
  assert.ok(utility.includes('document.execCommand("copy")'));
  assert.ok(utility.includes("setSelectionRange"));
});

test("narrow A4 preview stacks header metadata without overlap", () => {
  assert.ok(index.indexOf("consultation-share-v54.css") < index.indexOf("consultation-share-mobile.css"));
  assert.match(css, /max-width:\s*35rem/);
  assert.match(css, /share-sheet-head\s*\{[\s\S]*display:\s*grid/);
  assert.match(css, /share-sheet-head dl\s*\{[\s\S]*width:\s*100%/);
  assert.match(css, /grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
});
