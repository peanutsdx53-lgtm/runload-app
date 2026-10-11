import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";

const root = new URL("../", import.meta.url);
const read = file => fs.readFileSync(new URL(file, root), "utf8");
const pattern = /\.innerHTML\s*=|\.insertAdjacentHTML(?:\?\.)?\s*\(|\.outerHTML\s*=|\bdocument\.write\s*\(|\.srcdoc\s*=|\.createContextualFragment\s*\(|\.setHTMLUnsafe\s*\(/g;

// The register has unquoted ID/path/location fields and a 64-hex SHA as its
// final field. Middle columns may contain quoted commas, so don't split them.
function registerRows() {
  return read("docs/E01_HTML_SINK_REGISTER_20261011.csv").trimEnd().split(/\r?\n/).slice(1).map(raw => {
    const m = /^([^,]+),([^,]+),(\d+),([^,]+),(\d+),/.exec(raw);
    const hash = /,([a-f0-9]{64})$/.exec(raw);
    assert.ok(m && hash, `malformed E01 register row ${raw.slice(0, 65)}`);
    return { id:m[1], file:m[2], line:Number(m[3]), column:Number(m[5]), hash:hash[1] };
  });
}

test("E-01: every current HTML parser sink is pinned to one source line and source SHA", () => {
  const rows = registerRows();
  assert.equal(rows.length, 38);
  assert.equal(new Set(rows.map(x => x.id)).size, rows.length);
  assert.ok(!rows.some(x=>["E01-SINK-20","E01-SINK-21"].includes(x.id)), "retired sinks must remain absent");
  const byFile = new Map();
  for (const row of rows) byFile.set(row.file, [...(byFile.get(row.file) || []), row]);
  let measured = 0;
  for (const [file, declared] of byFile) {
    const code = read(file), lines = code.split("\n");
    const actual = [...code.matchAll(pattern)];
    assert.equal(actual.length, declared.length, `HTML sink count changed: ${file}`);
    for (let index=0; index<actual.length; index++) {
      const match = actual[index];
      const line = code.slice(0,match.index).split("\n").length;
      const column = match.index - code.lastIndexOf("\n",match.index);
      assert.equal(declared[index].line, line, `${file} line mismatch`);
      assert.equal(declared[index].column, column, `${file}:${line} column mismatch`);
      const hash=crypto.createHash("sha256").update(lines[line-1]).digest("hex");
      assert.equal(declared[index].hash,hash,`${file}:${line} content changed`);
      measured++;
    }
  }
  assert.equal(measured, 38);
});
