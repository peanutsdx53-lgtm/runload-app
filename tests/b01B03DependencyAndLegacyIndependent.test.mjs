import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// CI reproducible fail-closed complement to the independent TypeScript AST scan.
// Regex below is constrained to actual RunLoad import/export syntax, and the
// initial AST corpus was independently compared against it (502/502 edges).
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const norm = (x) => x.replaceAll('\\', '/');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
function filesIn(subdir, extension) {
  const out = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const p = norm(path.posix.join(dir, entry.name));
      if (entry.isDirectory()) walk(p);
      else if (extension.test(p)) out.push(p);
    }
  }
  walk(subdir);
  return out;
}
const js = new Set(['app.js', 'service-worker.js', ...['ui', 'screens', 'core', 'shared'].flatMap(d => filesIn(d, /\.js$/))]);
const css = new Set(filesIn('styles', /\.css$/));
const sw = read('service-worker.js');
const document = read('index.html');
const platform = read('ui/platformStyles.js');
const importSyntax = /(^\s*import\s+(?:[^;]*?\s+from\s+)?["'](\.{1,2}\/[^"']+)["']|^\s*export\s+(?:\*|\{[^}]*\})\s+from\s*["'](\.{1,2}\/[^"']+)["']|\bimport\s*\(\s*["'](\.{1,2}\/[^"']+)["']\s*\))/gm;

function graph() {
  const dependencies = new Map();
  let total = 0;
  for (const source of js) {
    if (source === 'service-worker.js') continue;
    const matches = [...read(source).matchAll(importSyntax)];
    total += matches.length;
    dependencies.set(source, matches.map(m => path.posix.normalize(path.posix.join(path.posix.dirname(source), m[2] || m[3] || m[4]))));
    // Computed dynamic imports require a new independent route audit.
    const literalCalls = (read(source).match(/\bimport\s*\(\s*["'`]/g) || []).length;
    const allCalls = (read(source).match(/\bimport\s*\(/g) || []).length;
    assert.equal(allCalls, literalCalls, `Non-literal dynamic import needs review: ${source}`);
  }
  return { dependencies, total };
}

test('B-01: every runtime module is reachable from one of five real HTML roots or is the SW entry', () => {
  const htmlRoots = [...document.matchAll(/<script\s+[^>]*src=["']\.\/([^"']+)/g)].map(m => m[1]);
  assert.equal(htmlRoots.length, 5, 'update script-root audit when entry points change');
  const { dependencies, total } = graph();
  const visited = new Set(), queue = [...htmlRoots];
  while (queue.length) {
    const p = queue.shift();
    assert.ok(js.has(p), `missing runtime JS root/import: ${p}`);
    if (visited.has(p)) continue;
    visited.add(p);
    for (const target of dependencies.get(p) || []) {
      assert.ok(js.has(target), `dangling dependency ${p} -> ${target}`);
      queue.push(target);
    }
  }
  assert.ok(total >= 500, `significant import graph change requires review: ${total}`);
  assert.deepEqual([...js].filter(p => p !== 'service-worker.js' && !visited.has(p)), [], 'file may be orphan or a missed dynamic import');
});

test('B-01: all stylesheets are referenced by HTML and/or platform CSS loader', () => {
  const htmlStyles = new Set([...document.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="\.\/([^"]+)"/g)].map(m => m[1]));
  const injectedStyles = new Set([...platform.matchAll(/["']\.\/(styles\/[^"']+\.css)["']/g)].map(m => m[1]));
  for (const style of new Set([...htmlStyles, ...injectedStyles])) assert.ok(css.has(style), `referenced CSS missing: ${style}`);
  assert.deepEqual([...css].filter(p => !htmlStyles.has(p) && !injectedStyles.has(p)), [], 'unlisted CSS needs review');
});

test('B-01: offline SW references every runtime file without broken local URL', () => {
  const references = new Set([...sw.matchAll(/["']\.\/([^"']+)["']/g)].map(m => m[1]));
  const runtime = new Set(['index.html', 'manifest.webmanifest', ...js, ...css, ...filesIn('assets', /\.(?:png|svg|jpg|jpeg|webp)$/), ...filesIn('icons', /\.(?:png|svg|jpg|jpeg|webp)$/)]);
  for (const asset of runtime) if (asset !== 'service-worker.js') assert.ok(references.has(asset), `runtime file not in offline SW asset register: ${asset}`);
  for (const asset of references) assert.ok(fs.existsSync(path.join(root, asset)), `SW refers to absent file: ${asset}`);
});

test('B-03: byte-identical CSS files do not masquerade as separate platform roles', () => {
  const digest = new Map();
  for (const f of css) {
    const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, f))).digest('hex');
    assert.equal(digest.has(hash), false, `duplicate CSS contents ${digest.get(hash)} and ${f}`);
    digest.set(hash, f);
  }
});

test('B-03: historical v3.0 model provenance remains explicitly guarded', () => {
  const validation = read('core/internal/primaryModelResults.js');
  const restore = read('core/internal/restoreInspection.js');
  const workflow = read('core/internal/recordWorkflow.js');
  assert.match(validation, /allowLegacy\s*=\s*false/);
  assert.match(validation, /PREVIOUS_REGIONAL_V3_MODEL_VERSION/);
  assert.match(restore, /allowLegacy:\s*true/);
  assert.match(workflow, /allowLegacy:\s*isPriorResult/);
});
