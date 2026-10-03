import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const script = fs.readFileSync(new URL("../ui/mobileSettingsHomeRepairV57.js", import.meta.url), "utf8");
const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

function makeStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

function makeLink(href, classes = []) {
  return {
    href,
    textContent: "",
    removed: false,
    classList: { contains(name) { return classes.includes(name); } },
    setAttribute(name, value) { if (name === "href") this.href = value; },
    getAttribute(name) { return name === "href" ? this.href : null; },
    remove() { this.removed = true; },
  };
}

function runRepair({ layout = null, about = false } = {}) {
  const backTop = makeLink("#/more", ["mobile-topbar__back"]);
  const backInner = makeLink("#/more", ["secondary-derived-back"]);
  const moreNav = makeLink("#/more", []);
  const guideLinks = {
    inserted: null,
    querySelector() { return this.inserted; },
    prepend(node) { this.inserted = node; },
  };
  const settings = { querySelector(selector) { return selector === ".settings-guide-links" ? guideLinks : null; } };
  const aboutScreen = about ? {} : null;
  const appRoot = {};
  const bodyListeners = new Map();
  const document = {
    querySelector(selector) {
      if (selector === ".screen--settings") return about ? null : settings;
      if (selector === ".screen--about") return aboutScreen;
      return null;
    },
    querySelectorAll(selector) {
      if (selector.includes('a[href="#/more"]')) return [backTop, backInner];
      if (selector === ".mobile-topbar__back, .screen--about .secondary-derived-back") return about ? [backTop, backInner] : [];
      if (selector === '.primary-navigation [data-navigation-screen="more"]') return [moreNav];
      return [];
    },
    createElement() {
      return {
        className: "",
        dataset: {},
        href: "",
        innerHTML: "",
      };
    },
    addEventListener(type, fn) { bodyListeners.set(type, fn); },
    getElementById(id) { return id === "app" ? appRoot : null; },
  };
  const localStorage = makeStorage(layout ? { "running-record-mobile-home-layout-v1": JSON.stringify(layout) } : {});
  const location = { hash: "#/more" };
  const history = { state: null, replaceState(_s, _t, hash) { location.hash = hash; } };
  const context = {
    console,
    URLSearchParams,
    document,
    localStorage,
    location,
    history,
    innerWidth: 393,
    matchMedia: () => ({ matches: true }),
    addEventListener() {},
    queueMicrotask(fn) { fn(); },
    MutationObserver: class { constructor(fn) { this.fn = fn; } observe() {} },
  };
  context.globalThis = context;
  vm.runInNewContext(`(()=>{${script}\n})()`, context);
  return { localStorage, location, backTop, backInner, moreNav, guideLinks };
}

assert.ok(index.includes('mobileHomeInitialLayoutV32.js'));
assert.ok(index.includes('mobileSettingsHomeRepairV57.js'));
assert.ok(index.indexOf('mobileHomeInitialLayoutV32.js') < index.indexOf('mobileSettingsHomeRepairV57.js'));
assert.ok(index.indexOf('mobileSettingsHomeRepairV57.js') < index.indexOf('./app.js'));

const migrated = runRepair();
const layout = JSON.parse(migrated.localStorage.getItem("running-record-mobile-home-layout-v1"));
assert.equal(migrated.location.hash, "#/home");
assert.equal(layout.pages.length, 2);
assert.deepEqual(Array.from(layout.pages[1]), [
  "app:share", "app:location-note", "app:quick-note", "app:gear-note",
  "app:departure-check", "app:fuel-note", "app:photo-note", "app:pace-tool",
]);
assert.equal(migrated.backTop.href, "#/home");
assert.equal(migrated.backInner.href, "#/home");
assert.equal(migrated.moreNav.removed, true);
assert.equal(migrated.guideLinks.inserted?.href, "#/about?returnTo=%23%2Fsettings");

const customLayout = {
  version: 4,
  pages: [["widget:today", "widget:plan", "widget:changes", "widget:checkpoint", "app:settings", "app:share"]],
  dock: ["record", "measure", "history", "course"],
  activePage: 0,
};
const preserved = runRepair({ layout: customLayout });
assert.deepEqual(JSON.parse(preserved.localStorage.getItem("running-record-mobile-home-layout-v1")), customLayout);
assert.equal(preserved.localStorage.getItem("running-record-mobile-home-feature-layout-v57"), "custom-preserved");

const about = runRepair({ about: true });
assert.equal(about.backTop.href, "#/settings");
assert.equal(about.backInner.href, "#/settings");

console.log("mobileSettingsHomeRepairV57.test.mjs: PASS");
