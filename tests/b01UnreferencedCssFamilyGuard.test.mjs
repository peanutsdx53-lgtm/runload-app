import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const deadFamilies = Object.freeze([
  'interpretation-pc', 'mobile-photo', 'report-sheet', 'share-viewer',
  'report-period', 'report-section',
  'workspace-navigation',
]);
function collect(dir, ext) {
  const here = path.join(root, dir);
  return fs.readdirSync(here, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.posix.join(dir, entry.name);
    return entry.isDirectory() ? collect(relative, ext)
      : entry.name.endsWith(ext) ? [relative] : [];
  });
}
const runtime = [
  'app.js', 'service-worker.js', 'index.html',
  ...['ui', 'screens', 'core', 'shared'].flatMap(dir => collect(dir, '.js')),
];
const styles = collect('styles', '.css');
const containsFamily = (source, family) =>
  new RegExp(`\\b${family}(?:-|__|\\b)`).test(source);

test('B01: no remaining CSS rules rely on seven independently unreferenced component families', () => {
  assert.equal(styles.length, 111, 'No stylesheet file removed; loaders/offline cache remain valid');
  assert.ok(runtime.length >= 210);
  const runtimeSource = runtime.map(file => fs.readFileSync(path.join(root,file), 'utf8')).join('\n');
  const cssSource = styles.map(file => fs.readFileSync(path.join(root,file), 'utf8')).join('\n');
  for (const family of deadFamilies) {
    assert.equal(containsFamily(runtimeSource, family), false,
      `Dynamic/runtime reference to ${family} appeared; reassess deletion`);
    assert.equal(containsFamily(cssSource, family), false,
      `Unreachable component CSS ${family} remains; reassess ownership`);
  }
});
