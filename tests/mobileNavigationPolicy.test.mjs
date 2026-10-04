import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const script = fs.readFileSync(new URL("../ui/mobileNavigationPolicy.js", import.meta.url), "utf8");
const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

function makeLink(href, classes = []) {
  return {
    href,
    textContent: "",
    removed: false,
    classList: { contains(name) { return classes.includes(name); } },
    setAttribute(name, value) { if (name === "href") this.href = value; },
    remove() { this.removed = true; },
  };
}

function runPolicy({ about = false } = {}) {
  const backTop = makeLink("#/more", ["mobile-topbar__back"]);
  const backInner = makeLink("#/more", ["secondary-derived-back"]);
  const moreNav = makeLink("#/more");
  const guideLinks = {
    inserted: null,
    querySelector() { return this.inserted; },
    prepend(node) { this.inserted = node; },
  };
  const settings = { querySelector(selector) { return selector === ".settings-guide-links" ? guideLinks : null; } };
  const aboutScreen = about ? {} : null;
  const appRoot = {};
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
    createElement() { return { className: "", dataset: {}, href: "", innerHTML: "" }; },
    addEventListener() {},
    getElementById(id) { return id === "app" ? appRoot : null; },
  };
  const location = { hash: "#/more" };
  const history = { state: null, replaceState(_s, _t, hash) { location.hash = hash; } };
  const context = {
    console, document, location, history, innerWidth: 393,
    matchMedia: () => ({ matches: true }),
    addEventListener() {},
    queueMicrotask(fn) { fn(); },
    MutationObserver: class { observe() {} },
  };
  context.globalThis = context;
  vm.runInNewContext(`(()=>{${script}\n})()`, context);
  return { location, backTop, backInner, moreNav, guideLinks };
}

assert.ok(!index.includes('mobileHomeInitialLayoutV32.js'));
assert.ok(index.includes('mobileNavigationPolicy.js'));
assert.ok(index.indexOf('mobileNavigationPolicy.js') < index.indexOf('./app.js'));
assert.doesNotMatch(script, /localStorage|MIGRATION_KEY|OLD_DEFAULT_APP_SETS|migrateGeneratedHomeLayout/);

const normal = runPolicy();
assert.equal(normal.location.hash, "#/home");
assert.equal(normal.backTop.href, "#/home");
assert.equal(normal.backInner.href, "#/home");
assert.equal(normal.moreNav.removed, true);
assert.equal(normal.guideLinks.inserted?.href, "#/about?returnTo=%23%2Fsettings");

const about = runPolicy({ about: true });
assert.equal(about.backTop.href, "#/settings");
assert.equal(about.backInner.href, "#/settings");

console.log("mobileNavigationPolicy.test.mjs: PASS");
