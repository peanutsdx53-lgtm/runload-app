import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const runtimeDirs = ["core", "ui", "screens", "shared"];

function collectJs(dir) {
  const out = [];
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectJs(rel));
    else if (entry.isFile() && entry.name.endsWith(".js")) out.push(rel);
  }
  return out;
}

const runtimeFiles = [...runtimeDirs.flatMap(collectJs), "app.js"].sort();
const runtimeSet = new Set(runtimeFiles);

function relativeImports(rel) {
  const source = read(rel);
  const specs = [];
  const matcher = /(?:\bimport\s+(?:[^'"()]+?\s+from\s+)?|\bimport\s*\()\s*["']([^"']+)["']/g;
  for (const match of source.matchAll(matcher)) {
    const spec = match[1];
    if (!spec?.startsWith(".")) continue;
    let resolved = path.posix.normalize(path.posix.join(path.posix.dirname(rel), spec));
    if (!path.posix.extname(resolved)) resolved += ".js";
    if (runtimeSet.has(resolved)) specs.push(resolved);
  }
  return specs;
}

function indexRuntimeRoots() {
  const index = read("index.html");
  const roots = [];
  for (const match of index.matchAll(/<script\b[^>]*\bsrc=["']([^"']+\.js)["'][^>]*>/g)) {
    const rel = match[1].replace(/^\.\//, "");
    if (runtimeSet.has(rel)) roots.push(rel);
  }
  return roots;
}

function reachableRuntimeFiles() {
  const seen = new Set();
  const stack = [...indexRuntimeRoots()];
  while (stack.length) {
    const rel = stack.pop();
    if (seen.has(rel)) continue;
    seen.add(rel);
    stack.push(...relativeImports(rel));
  }
  return seen;
}

function importBindings(statement) {
  if (/^\s*import\s*["']/.test(statement) || /^\s*import\s*\(/.test(statement)) return [];
  const beforeFrom = statement.replace(/^\s*import\s+/, "").split(/\s+from\s+/)[0].trim();
  const bindings = [];
  const named = beforeFrom.match(/\{([\s\S]*?)\}/);
  if (named) {
    for (const part of named[1].split(",")) {
      const item = part.trim();
      if (!item) continue;
      bindings.push(item.split(/\s+as\s+/).at(-1).trim());
    }
  }
  const namespace = beforeFrom.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
  if (namespace) bindings.push(namespace[1]);
  const defaultPart = beforeFrom.split(",")[0].trim();
  if (/^[A-Za-z_$][\w$]*$/.test(defaultPart)) bindings.push(defaultPart);
  return bindings;
}

function unusedImports(rel) {
  const source = read(rel);
  const importPattern = /^\s*import\s+(?!\()[\s\S]*?;\s*$/gm;
  const statements = [...source.matchAll(importPattern)];
  const body = source.replace(importPattern, "");
  const unused = [];
  for (const match of statements) {
    for (const binding of importBindings(match[0])) {
      const pattern = new RegExp(`(?<![\\w$])${binding.replace(/[$]/g, "\\$")}(?![\\w$])`);
      if (!pattern.test(body)) unused.push(binding);
    }
  }
  return unused;
}

function unreferencedLocalFunctions(rel) {
  const source = read(rel);
  const dead = [];
  const declaration = /^\s*(?!export\s)(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
  for (const match of source.matchAll(declaration)) {
    const name = match[1];
    const occurrences = source.match(new RegExp(`(?<![\\w$])${name.replace(/[$]/g, "\\$")}(?![\\w$])`, "g"))?.length || 0;
    if (occurrences === 1) dead.push(name);
  }
  return dead;
}

test("all runtime modules are reachable from current index entry scripts", () => {
  const reachable = reachableRuntimeFiles();
  const unreachable = runtimeFiles.filter((rel) => !reachable.has(rel));
  assert.deepEqual(unreachable, [], `unreachable runtime modules: ${unreachable.join(", ")}`);
});

test("runtime modules contain no unused static imports", () => {
  const failures = runtimeFiles.flatMap((rel) => unusedImports(rel).map((name) => `${rel}:${name}`));
  assert.deepEqual(failures, [], `unused imports: ${failures.join(", ")}`);
});

test("runtime modules contain no unreferenced local function declarations", () => {
  const failures = runtimeFiles.flatMap((rel) => unreferencedLocalFunctions(rel).map((name) => `${rel}:${name}`));
  assert.deepEqual(failures, [], `unreferenced local functions: ${failures.join(", ")}`);
});
