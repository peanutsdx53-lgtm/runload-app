import assert from 'node:assert/strict';
import { bindInterpretationRoom } from '../ui/interactions/interpretationRoomInteractions.js';
import { loadInterpretationReferenceHistory } from '../ui/interpretationReferenceHistory.js';

function fixture({ articleId = 'goals-and-recording-differ', shownArticleId = articleId, failWrite = false } = {}) {
  const data = new Map();
  let writes = 0;
  let warning = null;
  let onClick = null;
  const gateway = {
    readJson: (key, fallback) => data.get(key) ?? fallback,
    writeJson: (key, value) => {
      writes++;
      if (failWrite) return { ok: false, code: 'QUOTA_EXCEEDED' };
      data.set(key, value);
      return { ok: true };
    },
  };
  const room = {
    dataset: { interpretationFlowStage: 'focus' },
    matches: (selector) => selector === '.interpretation-flow-room',
    querySelector: (selector) => {
      if (selector === '.interpretation-context-reference[data-interpretation-reference-article-id]')
        return shownArticleId ? { dataset: { interpretationReferenceArticleId: shownArticleId } } : null;
      if (selector.startsWith('[data-interpretation-flow-step=')) return { scrollIntoView: () => {} };
      return null;
    },
  };
  const screen = {
    dataset: { interpretationAutoReadingId: articleId },
    matches: () => false,
    contains: () => true,
    querySelector: (selector) => selector === '.interpretation-flow-room' ? room
      : selector === '[data-interpretation-history-save-warning]' ? warning : null,
    insertAdjacentHTML: (where, text) => {
      assert.equal(where, 'afterbegin');
      assert.match(text, /提示履歴を保存できませんでした/);
      warning = { remove: () => { warning = null; } };
    },
    addEventListener: (event, listener) => { assert.equal(event, 'click'); onClick = listener; },
    removeEventListener: () => { onClick = null; },
  };
  const services = {
    workflows: { records: { loadExperience: () => ({ record: { id: 'current-record' } }) } },
    storage: { gateway },
  };
  const context = { parameters: new URLSearchParams('recordId=current-record') };
  const unbind = bindInterpretationRoom({ root: screen, services, context });
  function click(nextStage) {
    const button = { dataset: { nextStage } };
    onClick({ target: { closest: (selector) => selector === '[data-action="interpretation-flow-flow-stage"]' ? button : null }, preventDefault() {} });
  }
  return { gateway, click, unbind, get writes() { return writes; }, get warning() { return !!warning; }, get stage() { return room.dataset.interpretationFlowStage; } };
}

// Regression: the CSS-hidden Reading card does not become "presented" on initial focus.
{
  const f = fixture();
  assert.deepEqual(loadInterpretationReferenceHistory(f.gateway), []);
  assert.equal(f.writes, 0);
  f.click('focus');
  assert.equal(f.writes, 0);
  f.click('compare');
  assert.equal(f.stage, 'compare');
  assert.deepEqual(loadInterpretationReferenceHistory(f.gateway), [
    { recordId: 'current-record', articleId: 'goals-and-recording-differ' },
  ]);
  assert.equal(f.writes, 1);
  f.click('focus');
  f.click('compare');
  assert.equal(f.writes, 1, 'reopening the same reference must not cause a duplicate write');
  f.unbind();
}

// The article must actually exist in the rendered compare panel.
for (const values of [{ articleId: '' }, { shownArticleId: null }, { shownArticleId: 'different-article' }]) {
  const f = fixture(values);
  f.click('compare');
  assert.equal(f.writes, 0);
  assert.deepEqual(loadInterpretationReferenceHistory(f.gateway), []);
}

// Failed storage is not reported as success. Reentering compare can retry.
{
  const f = fixture({ failWrite: true });
  f.click('compare');
  assert.equal(f.writes, 1);
  assert.equal(f.warning, true);
  assert.deepEqual(loadInterpretationReferenceHistory(f.gateway), []);
  f.click('focus'); f.click('compare');
  assert.equal(f.writes, 2);
  assert.equal(f.warning, true);
}
console.log('auditInterpretationVisibleStageHistory.test.mjs: PASS (focus/compare/revisit/absent/mismatch/storage-failure)');
