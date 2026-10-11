import test from "node:test";
import assert from "node:assert/strict";
import { writeSafeCourseSummaryLine } from "../ui/interactions/recordInputInteractions.js";

function fakeDocument() {
  return {
    createElement(name) {
      assert.equal(name, "strong");
      return { nodeType: 1, tagName: name.toUpperCase(), textContent: "" };
    },
    createTextNode(text) { return { nodeType: 3, textContent: String(text) }; },
  };
}

test("E-01: hostile saved-course summaries are inserted only as inert text nodes", () => {
  const old = globalThis.document;
  globalThis.document = fakeDocument();
  try {
    for (const payload of [
      '<img src="https://attacker.invalid/collect" onerror="window.__evil=1">',
      '<svg onload="window.__evil=1">',
      '\"><iframe srcdoc="<script>window.__evil=1</script>"></iframe>',
      '<a href="javascript:window.__evil=1">attack</a>',
      '&amp; <script>alert(1)</script>',
    ]) {
      const paragraph = {
        children: [],
        replaceChildren(...children) { this.children = children; },
        set innerHTML(_) { throw Error("HTML parser must never be called"); },
      };
      writeSafeCourseSummaryLine(paragraph, "主な路面：", payload);
      assert.deepEqual(paragraph.children.map(x => x.nodeType), [1,3]);
      assert.equal(paragraph.children[0].tagName, "STRONG");
      assert.equal(paragraph.children[0].textContent, "主な路面：");
      assert.equal(paragraph.children[1].textContent, payload);
    }
    writeSafeCourseSummaryLine(null, "坂道：", "input");
  } finally { globalThis.document = old; }
});
