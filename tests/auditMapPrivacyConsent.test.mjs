import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRunMeasurementMap } from '../ui/runMeasurementMap.js';

const initial = {
  document: globalThis.document,
  HTMLElement: globalThis.HTMLElement,
  navigator: Object.getOwnPropertyDescriptor(globalThis, 'navigator'),
};
class Element {
  constructor(tag) {
    this.tagName = tag;
    this.children = [];
    this.listeners = new Map();
    this.hidden = false;
    this.style = {};
    this.classList = { add() {} };
    this.clientWidth = 320;
    this.clientHeight = 360;
  }
  append(...items) { this.children.push(...items); }
  insertBefore(item, next) { const index = this.children.indexOf(next); if (index >= 0) this.children.splice(index, 0, item); else this.children.push(item); }
  replaceChildren(...items) { this.children = [...items]; }
  setAttribute() {}
  remove() {}
  querySelectorAll() { return []; }
  addEventListener(type, fn) { this.listeners.set(type, fn); }
}
try {
  const calls = [];
  globalThis.HTMLElement = Element;
  globalThis.document = {
    createElement: (tag) => {
      const element = new Element(tag);
      if (tag === 'img') {
        Object.defineProperty(element, 'src', {set(value) {calls.push(value);}, get() {return calls.at(-1);} });
      }
      return element;
    },
    createElementNS: (_ns, tag) => new Element(tag),
  };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {onLine: true} });
  const outer = new Element('div');
  const map = createRunMeasurementMap(outer);
  const consent = outer.children.find(e => e.className === 'run-map__tile-consent');
  assert.ok(consent, 'visible map permission prompt');
  assert.equal(consent.hidden, false);
  assert.match(consent.children[1].textContent, /地図提供元/);
  const grant = consent.children[0];
  map.setCenter({lat:35.68,lon:139.76});
  map.setTrack([{lat:35.68,lon:139.76},{lat:35.69,lon:139.77}]);
  map.setZoom(17);
  assert.equal(calls.length, 0, 'GPS/viewed location must not leave by tile request without consent');
  grant.listeners.get('click')();
  assert.equal(consent.hidden, true);
  assert.ok(calls.length > 0, 'consent may request map imagery');
  assert.ok(calls.every(url=> /^https:\/\/tile\.openstreetmap\.org\/\d+\/\d+\/\d+\.png$/.test(url)));
  map.destroy();

  calls.length = 0;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {onLine: false} });
  const offlineContainer = new Element('div');
  const offlineMap = createRunMeasurementMap(offlineContainer);
  offlineMap.setCenter({lat:35.68,lon:139.76});
  const offlinePrompt = offlineContainer.children.find(e=>e.className === 'run-map__tile-consent');
  offlinePrompt.children[0].listeners.get('click')();
  assert.equal(offlinePrompt.hidden, false);
  assert.match(offlinePrompt.children[1].textContent, /オフライン/);
  assert.equal(calls.length, 0, 'offline must not request tiles');
  offlineMap.destroy();

  const csp = readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(csp, /img-src 'self' data: https:\/\/tile\.openstreetmap\.org/);
  assert.match(csp, /script-src 'self'/);
  assert.doesNotMatch(csp, /script-src[^;]*'unsafe-inline'/);
  console.log('PASS map explicit tile consent, no implicit GPS tile request, offline safe, CSP constrained');
} finally {
  globalThis.document = initial.document;
  globalThis.HTMLElement = initial.HTMLElement;
  if (initial.navigator) Object.defineProperty(globalThis, 'navigator', initial.navigator);
  else delete globalThis.navigator;
}
