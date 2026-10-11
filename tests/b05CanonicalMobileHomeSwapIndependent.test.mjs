import test from "node:test";
import assert from "node:assert/strict";
import { swapMobileHomeSiblingElements } from "../ui/mobileHomeGridUtilities.js";

test("B05: canonical sibling swap preserves both historical marker labels", () => {
  const original = globalThis.document;
  const captured = [];
  const parent = { children: [] };
  function make(id) {
    const node = { id, parentNode: parent, replaceWith(other) {
      const i = parent.children.indexOf(this);
      assert.ok(i >= 0);
      const j = parent.children.indexOf(other);
      if (j >= 0) parent.children.splice(j, 1);
      parent.children.splice(j >= 0 && j < i ? i - 1 : i, 1, other);
      other.parentNode = parent;
      this.parentNode = null;
    } };
    parent.children.push(node);
    return node;
  }
  globalThis.document = { createComment(label) {
    captured.push(label);
    return make("temporary");
  } };
  try {
    for (const label of ["mobile-home-owned-swap", "mobile-home-icon-swap"]) {
      parent.children = [];
      const first = make("A"), second = make("B");
      swapMobileHomeSiblingElements(first, second, label);
      assert.deepEqual(parent.children.map(x=>x.id), ["B","A"]);
    }
    assert.deepEqual(captured,["mobile-home-owned-swap","mobile-home-icon-swap"]);
  } finally { globalThis.document=original; }
});

test("B05: cross-parent, self and missing swaps are no-ops", () => {
  const a = {parentNode: {}}, b = {parentNode: {}};
  swapMobileHomeSiblingElements(a,b);
  swapMobileHomeSiblingElements(a,a);
  swapMobileHomeSiblingElements(null,b);
});
