import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const results = [];

function walk(dir, output = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, output);
    else output.push(path.relative(root, full).split(path.sep).join('/'));
  }
  return output;
}

async function test(id, fn) {
  try {
    await fn();
    results.push({ id, status: 'PASS' });
  } catch (error) {
    results.push({ id, status: 'FAIL', message: error?.stack || String(error) });
  }
}

await test('MOBILE-VISUAL-ASSET-POLICY-IS-DOCUMENTED', () => {
  const policy = read('docs/VISUAL_ASSET_POLICY.md');
  assert.ok(policy.includes('AI-generated images or illustrations'));
  assert.ok(policy.includes('Unicode emoji'));
  assert.ok(policy.includes('user-created asset'));
  assert.ok(policy.includes('icons/icon-192.png'));
  assert.ok(policy.includes('icons/icon-512.png'));
});

await test('BUNDLED-IMAGE-ASSETS-ARE-EXPLICITLY-ACCOUNTED-FOR', () => {
  const imageAssets = walk(root)
    .filter((rel) => /\.(png|jpe?g|webp|gif|svg)$/i.test(rel))
    .sort();
  assert.deepEqual(imageAssets, ['icons/icon-192.png', 'icons/icon-512.png']);
});

await test('SMARTPHONE-HOME-LAUNCHERS-USE-UNICODE-EMOJI', () => {
  const home = read('screens/homeScreen.js');
  for (const emoji of ['⚖️', '📅', '📖', '📤', '⚙️', '📒', '⏱️', '🕘', '🗺️', '📍', '📝', '🎒', '✅', '💧', '📷', '🧮']) {
    assert.ok(home.includes(`emoji: "${emoji}"`), `missing emoji ${emoji}`);
  }
  assert.ok(!home.includes('function mobileHomeIcon'));
  assert.ok(!home.includes('<svg viewBox="0 0 24 24"'));
});

await test('QUICK-TOOL-DELETIONS-REQUIRE-CONFIRMATION', () => {
  const interactions = read('ui/interactions/mobileQuickToolsInteractions.js');
  assert.ok(interactions.includes('function confirmDelete(tool)'));
  assert.ok(interactions.includes('globalThis.confirm(`${label}を削除しますか？`)'));
  assert.ok(interactions.includes('if (!confirmDelete(tool)) return;'));
  for (const label of ['地点メモ', '1分メモ', '装備メモ', '出発チェック', '補給メモ']) {
    assert.ok(interactions.includes(`"${label}"`));
  }
});

const failed = results.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  suite: 'Mobile Visual Asset Policy',
  total: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  status: failed.length ? 'FAIL' : 'PASS',
  results,
}, null, 2));
if (failed.length) process.exitCode = 1;
