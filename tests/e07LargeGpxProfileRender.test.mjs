import test from 'node:test';
import assert from 'node:assert/strict';
import { bindGpxAnalysis } from '../ui/interactions/gpxAnalysisInteractions.js';
import { clearGpxCandidate, peekGpxCandidate } from '../ui/flowSessionState.js';

// A valid GPX may contain 100k track points, but JavaScript engines do not
// guarantee that Math.min(...manyPoints) can accept that many arguments.
// Mimic a device with a lower variadic-argument cap without depending on V8's cap.
test('E07: large valid GPX altitude profile remains renderable on constrained JS engines', async () => {
  const saved = { document: globalThis.document, window: globalThis.window,
    DOMParser: globalThis.DOMParser, min: Math.min, max: Math.max };
  const nodes = new Map();
  const parent = {};
  const points = Array.from({ length: 20_000 }, (_, i) => ({
    parentElement: parent,
    getAttribute(key) { return key === 'lat' ? String(35 + i * 1e-6) : key === 'lon' ? '139' : null; },
    querySelector(key) { return key === 'ele' ? { textContent: String(100 + i * 0.001) } : null; },
  }));
  const el = (id) => {
    if (!nodes.has(id)) nodes.set(id, {
      value: '', textContent: '', innerHTML: '', hidden: false, disabled: false,
      files: [], listeners: new Map(),
      addEventListener(type, fn) { this.listeners.set(type, fn); },
    });
    return nodes.get(id);
  };
  const input = el('gpx-file');
  input.files = [{ name: 'valid-large.gpx', size: 600_000, text: async () => '<gpx/>' }];
  el('gpx-return-to').value = '#/record-input';
  globalThis.document = { getElementById: el };
  globalThis.window = { location: { hash: '' } };
  globalThis.DOMParser = class {
    parseFromString() {
      return {
        querySelector() { return null; },
        querySelectorAll(selector) { return selector === 'trkpt, rtept' ? points : []; },
      };
    }
  };
  Math.min = (...args) => {
    if (args.length > 512) throw new RangeError('simulated constrained argument limit');
    return saved.min(...args);
  };
  Math.max = (...args) => {
    if (args.length > 512) throw new RangeError('simulated constrained argument limit');
    return saved.max(...args);
  };
  try {
    clearGpxCandidate();
    bindGpxAnalysis();
    await input.listeners.get('change')();
    assert.equal(el('gpx-status').textContent, '端末内の解析が完了しました。');
    assert.equal(el('gpx-apply').disabled, false);
    assert.equal(el('gpx-result-area').hidden, false);
    assert.match(el('gpx-profile-svg').innerHTML, /<polyline/);
    el('gpx-apply').listeners.get('click')();
    assert.equal(peekGpxCandidate()?.candidate?.gradeKnowledge, 'KNOWN_PROFILE');
  } finally {
    clearGpxCandidate();
    Math.min = saved.min;
    Math.max = saved.max;
    for (const key of ['document', 'window', 'DOMParser']) {
      if (saved[key] === undefined) delete globalThis[key];
      else globalThis[key] = saved[key];
    }
  }
});