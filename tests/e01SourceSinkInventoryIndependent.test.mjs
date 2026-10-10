import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INVENTORY = Object.freeze([
  ['app.js', 2],
  ['core/internal/platformInfrastructure.js', 1],
  ['ui/appVersionStatus.js', 1],
  ['ui/desktopBodyTimelineWorkspace.js', 1],
  ['ui/desktopFirstUse.js', 1],
  ['ui/desktopHistoryWorkspace.js', 1],
  ['ui/desktopHomeWorkspace.js', 3],
  ['ui/interactions/consultationInteractions.js', 1],
  ['ui/interactions/formUtilities.js', 2],
  ['ui/interactions/gpxAnalysisInteractions.js', 1],
  ['ui/interactions/interpretationRoomInteractions.js', 1],
  ['ui/interactions/mobileHomeEditPresentation.js', 2],
  ['ui/interactions/mobileHomeInteractions.js', 1],
  ['ui/interactions/mobilePaceCalculatorInteractions.js', 1],
  ['ui/interactions/recordInputInteractions.js', 4],
  ['ui/interactions/settingsInteractions.js', 2],
  ['ui/interactions/simulationInteractions.js', 3],
  ['ui/mobileMeasurementRecordAutofill.js', 1],
  ['ui/mobileNavigationPolicy.js', 1],
  ['ui/mobileWalkJogHistoryUi.js', 1],
  ['ui/mobileWalkJogMeasurementWiring.js', 3],
  ['ui/mobileWalkJogRecordStore.js', 1],
  ['ui/rofJPresentation.js', 2],
  ['ui/runMeasurementMap.js', 1],
  ['ui/screenTutorial.js', 2],
]);
// Static source statement guard: deliberately broader than a regex for `innerHTML =`.
// Excludes tests/docs; manual sink register covers provenance, not an XSS PASS certification.
const SINK = /\.innerHTML\s*=|\.insertAdjacentHTML(?:\?\.)?\s*\(|\.outerHTML\s*=|\bdocument\.write\s*\(|\.srcdoc\s*=|\.createContextualFragment\s*\(|\.setHTMLUnsafe\s*\(/g;
const forbidden = /\beval\s*\(|\bnew\s+Function\s*\(/g;
function sources(folder) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap(ent => {
    if (['tests', 'node_modules', '.git'].includes(ent.name)) return [];
    const full = path.join(folder, ent.name);
    return ent.isDirectory() ? sources(full) : ent.name.endsWith('.js') ? [full] : [];
  });
}
const found = new Map();
for (const full of sources(ROOT)) {
  const rel = path.relative(ROOT, full).split(path.sep).join('/');
  const source = fs.readFileSync(full, 'utf8');
  const count = [...source.matchAll(SINK)].length;
  if (count) found.set(rel, count);
  assert.equal([...source.matchAll(forbidden)].length, 0, `No eval/Function in ${rel}`);
}
test('E01 inventory: all direct HTML insertion statements have declared provenance owners', () => {
  assert.deepEqual([...found.entries()].sort((a,b) => a[0].localeCompare(b[0])),
    [...INVENTORY].sort((a,b) => a[0].localeCompare(b[0])));
  assert.equal([...found.values()].reduce((s,n) => s+n, 0), 40);
});
test('E01 contract: localStorage/URL input is not directly interpolated into core delegated shell assignments', () => {
  const src = fs.readFileSync(path.join(ROOT,'app.js'),'utf8');
  assert.match(src, /appRoot\.innerHTML\s*=\s*platformShell\.renderPlatformShell/);
  assert.match(src, /platformHeaderRoot\.innerHTML\s*=\s*\["interpretation-room", "run-measurement"\]/);
});
test('E01 privacy: only the explicit map source contains tile provider URL', () => {
  const refs = sources(ROOT).filter(f => fs.readFileSync(f,'utf8').includes('tile.openstreetmap.org'));
  assert.ok(refs.length > 0, 'Map provider must be consciously reviewed');
  assert.ok(refs.every(f => /runMeasurementMap|map/i.test(f)), `Unexpected OSM tile URL: ${refs.join(',')}`);
});
