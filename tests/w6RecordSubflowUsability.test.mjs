import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { saveRecordInputWorkspace, restoreRecordInputWorkspace, clearRecordInputWorkspace } from '../ui/recordInputWorkspace.js';

const source = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

test('W6: both embedded record views use the styled scrollable content surface', () => {
  const markup = source('ui/recordEmbeddedSubflows.js');
  const desktop = source('styles/desktop-screen-layouts.css');
  const mobile = source('styles/mobile-screens-responsive.css');
  assert.equal((markup.match(/class="record-subscreen__content"/g) || []).length, 2);
  assert.match(desktop, /\.subscreen > \.record-subscreen__content\s*\{/);
  assert.match(desktop, /\.subscreen > \.record-subscreen__content\s*\{[\s\S]*?overflow-y: auto !important/);
  assert.match(mobile, /body\.record-subflow-open \.screen-layout--record \.mobile-save-bar/);
});

test('W6: contextual back closes embedded record screen instead of navigating Home', () => {
  const events = source('ui/interactions/recordInputInteractions.js');
  assert.match(events, /setRecordSubflowHeaderBack\(true\)/);
  assert.match(events, /link\.setAttribute\("href", "#\/record-input"\)/);
  assert.match(events, /event\.preventDefault\(\);\s*closeRecordSubflow\(form\)/);
  assert.match(events, /form\.__recordSubflowReturnFocus\?\.focus/);
});

test('W6: record optional cards may remain expanded simultaneously', () => {
  const mobile = source('ui/interactions/mobileRecordInputInteractions.js');
  assert.match(mobile, /if \(target instanceof HTMLDetailsElement\) target\.open = true/);
  assert.doesNotMatch(mobile, /details\.open = details === target/);
});

test('W6: opened card state is round-tripped in session workspace, independent of record values', () => {
  const previous = globalThis.sessionStorage;
  const storage = new Map();
  globalThis.sessionStorage = {
    getItem: (k) => storage.get(k) ?? null,
    setItem: (k,v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
  };
  const makeForm = (isOpen) => {
    const field = { name: 'distanceKm', type: 'number', value: '5.0', disabled: false };
    const nodes = [2,3,4].map(stage => ({ dataset: {recordStage: String(stage)}, open: isOpen.includes(stage) }));
    return {
      nodes,field,
      querySelectorAll(selector) {
        if (selector === 'input, select, textarea') return [field];
        if (selector === 'details.stage-card[data-record-stage][open]') return nodes.filter(n=>n.open);
        if (selector === 'details.stage-card[data-record-stage]') return nodes;
        return [];
      },
    };
  };
  try {
    clearRecordInputWorkspace();
    const input = makeForm([2,4]);
    const saved = saveRecordInputWorkspace(input);
    assert.deepEqual(saved.openStages,[2,4]);
    assert.equal(saved.fields.distanceKm,'5.0');
    const returning = makeForm([]);
    returning.field.value = '';
    assert.equal(restoreRecordInputWorkspace(returning), true);
    assert.deepEqual(returning.nodes.filter(n=>n.open).map(n=>Number(n.dataset.recordStage)), [2,4]);
    assert.equal(returning.field.value,'5.0');
  } finally {
    clearRecordInputWorkspace();
    if (previous === undefined) delete globalThis.sessionStorage;
    else globalThis.sessionStorage = previous;
  }
});
