import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function walk(dir, predicate) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, predicate));
    else if (predicate(full)) out.push(full);
  }
  return out;
}

const presentationFiles = [...walk("ui", (p) => p.endsWith(".js")), ...walk("screens", (p) => p.endsWith(".js"))];
for (const file of presentationFiles) {
  const source = fs.readFileSync(file, "utf8");
  assert.doesNotMatch(source, /from\s+["'][^"']*core\/internal\//, `${file} imports core/internal directly`);
  assert.doesNotMatch(source, /import\s+["'][^"']*core\/internal\//, `${file} imports core/internal directly`);
}


const presentationGenerationPattern = /(?:[.#]|data-|--)[A-Za-z0-9_-]*v(?:16|53|54)(?:[A-Za-z0-9_-]*)(?=[\s.{:#\[="']|$)/i;
for (const file of [...presentationFiles, ...walk("styles", (p) => p.endsWith(".css"))]) {
  const source = fs.readFileSync(file, "utf8");
  assert.doesNotMatch(source, presentationGenerationPattern, `${file} contains a temporary presentation-generation identifier`);
}

const history = fs.readFileSync("core/internal/historyWorkflow.js", "utf8");
assert.doesNotMatch(history, /secondPillarRofJ|secondPillarLifecycle/, "retired pre-release history aliases must stay absent");
assert.doesNotMatch(fs.readFileSync("ui/interactions/homeInteractions.js", "utf8"), /legacyApps|parsed\.apps/, "retired mobile-home layout conversion must stay absent");
assert.doesNotMatch(fs.readFileSync("styles/self-understanding.css", "utf8"), /self-understanding-legacy/, "unused retired self-understanding styles must stay absent");

for (const file of walk(".github/workflows", (p) => p.endsWith(".yml") || p.endsWith(".yaml"))) {
  const source = fs.readFileSync(file, "utf8");
  assert.doesNotMatch(source, /styles\/pc-\*\.css|screens\/courseEditorScreen\.js/, `${file} contains retired paths`);
  assert.doesNotMatch(source, /\.v(?:16|53|54)-[A-Za-z0-9_-]+/, `${file} contains a retired presentation-generation selector`);
}

const temporaryAuditWorkflows = walk(".github/workflows", (p) => /(?:^|[\/\\]).*audit\.ya?ml$/i.test(p));
assert.deepEqual(temporaryAuditWorkflows, [], "temporary audit workflows must not remain in the current tree");

const fixture = "tests/fixtures/desktop-interpretation-compare.html";
const fixtureSource = fs.readFileSync(fixture, "utf8");
for (const href of fixtureSource.matchAll(/href="([^\"]+\.css)"/g)) {
  const resolved = path.resolve(path.dirname(fixture), href[1]);
  assert.equal(fs.existsSync(resolved), true, `fixture references missing stylesheet: ${href[1]}`);
}
assert.doesNotMatch(fixtureSource, /href="[^"]*styles\/(?:mobile-|consultation-share-mobile\.css)/, "desktop fixture must not load smartphone-only styles");

console.log("codebaseArchitecture.test.mjs: PASS");

const indexSource = fs.readFileSync("index.html", "utf8");
const platformStylesSource = fs.readFileSync("ui/platformStyles.js", "utf8");
const bootstrapSource = fs.readFileSync("ui/platformBootstrap.js", "utf8");
const serviceWorkerSource = fs.readFileSync("service-worker.js", "utf8");

assert.doesNotMatch(
  indexSource,
  /href="\.\/styles\/(?:mobile(?:-|\.css)|desktop(?:-|\.css)|consultation-share-mobile\.css)/,
  "index.html must not directly load platform-only styles",
);
assert.match(bootstrapSource, /await loadPlatformStyles\(platform\)/, "platform styles must load before app startup");
assert.ok(
  bootstrapSource.indexOf("await loadPlatformStyles(platform)") < bootstrapSource.indexOf("await import(\"../app.js\")"),
  "platform styles must finish loading before app.js",
);

function sourceArray(source, name) {
  const start = source.indexOf(`const ${name} = [`);
  assert.notEqual(start, -1, `${name} must exist`);
  const end = source.indexOf("];", start);
  assert.notEqual(end, -1, `${name} must terminate`);
  return [...source.slice(start, end + 2).matchAll(/"(\.\/[^\"]+)"/g)].map((match) => match[1]);
}

const commonCacheAssets = sourceArray(serviceWorkerSource, "COMMON_PRECACHE_URLS");
const mobileCacheAssets = sourceArray(serviceWorkerSource, "MOBILE_PLATFORM_URLS");
const desktopCacheAssets = sourceArray(serviceWorkerSource, "DESKTOP_PLATFORM_URLS");
const commonCacheSet = new Set(commonCacheAssets);
const mobileCacheSet = new Set(mobileCacheAssets);
const desktopCacheSet = new Set(desktopCacheAssets);

assert.match(serviceWorkerSource, /cache\.addAll\(COMMON_PRECACHE_URLS\)/, "install must precache shared assets only");
assert.match(serviceWorkerSource, /event\.data\?\.type !== "CACHE_PLATFORM"/, "service worker must support explicit platform caching");
assert.match(serviceWorkerSource, /PLATFORM_URLS\[event\.data\?\.platform\]/, "platform cache selection must be explicit");

for (const item of mobileCacheSet) {
  assert.equal(desktopCacheSet.has(item), false, `mobile/desktop cache overlap: ${item}`);
}

const allStyleFiles = fs.readdirSync("styles").filter((name) => name.endsWith(".css"));
const mobileStyleFiles = allStyleFiles.filter((name) => name.startsWith("mobile-") || name === "consultation-share-mobile.css");
const desktopStyleFiles = allStyleFiles.filter((name) => name.startsWith("desktop-"));
for (const name of mobileStyleFiles) {
  const url = `./styles/${name}`;
  assert.ok(platformStylesSource.includes(`"${url}"`), `mobile style missing from platform loader: ${url}`);
  assert.ok(mobileCacheSet.has(url), `mobile style missing from mobile cache: ${url}`);
  assert.equal(commonCacheSet.has(url), false, `mobile style leaked into common precache: ${url}`);
  assert.equal(desktopCacheSet.has(url), false, `mobile style leaked into desktop cache: ${url}`);
}
for (const name of desktopStyleFiles) {
  const url = `./styles/${name}`;
  assert.ok(platformStylesSource.includes(`"${url}"`), `desktop style missing from platform loader: ${url}`);
  assert.ok(desktopCacheSet.has(url), `desktop style missing from desktop cache: ${url}`);
  assert.equal(commonCacheSet.has(url), false, `desktop style leaked into common precache: ${url}`);
  assert.equal(mobileCacheSet.has(url), false, `desktop style leaked into mobile cache: ${url}`);
}

const importPattern = /(?:\b(?:import|export)\s+(?:[^'\"]*?\s+from\s+)?|\bimport\s*\()\s*["']([^"']+)["']/g;
function resolveModule(file, specifier) {
  if (!specifier.startsWith(".")) return null;
  let resolved = path.normalize(path.join(path.dirname(file), specifier)).replaceAll("\\", "/");
  if (!path.extname(resolved)) resolved += ".js";
  return fs.existsSync(resolved) ? resolved : null;
}
function platformDependencies(file, platform) {
  const source = fs.readFileSync(file, "utf8");
  const dependencies = new Set();
  for (const match of source.matchAll(importPattern)) {
    const resolved = resolveModule(file, match[1]);
    if (resolved) dependencies.add(resolved);
  }
  const replaceConditional = (candidates, selected) => {
    for (const candidate of candidates) dependencies.delete(candidate);
    if (selected) dependencies.add(selected);
  };
  if (file === "ui/platformBootstrap.js") {
    replaceConditional(["ui/mobileRuntimeEntry.js", "ui/desktopRuntimeEntry.js"], `ui/${platform}RuntimeEntry.js`);
  } else if (file === "app.js") {
    replaceConditional(["ui/mobileAppRuntime.js", "ui/desktopAppRuntime.js"], `ui/${platform}AppRuntime.js`);
  } else if (file === "screens/screenRegistry.js") {
    replaceConditional(["screens/mobileScreenRegistry.js", "screens/desktopScreenRegistry.js"], `screens/${platform}ScreenRegistry.js`);
  } else if (file === "ui/screenInteractions.js") {
    replaceConditional(["ui/mobileScreenInteractionBinders.js"], platform === "mobile" ? "ui/mobileScreenInteractionBinders.js" : null);
  }
  return [...dependencies];
}
function platformGraph(platform) {
  const starts = [
    "ui/readingRuntimeGuard.js",
    "ui/bootRecovery.js",
    "ui/appVersionStatus.js",
    "ui/rofJPresentation.js",
    "ui/platformBootstrap.js",
  ];
  const visited = new Set();
  const pending = [...starts];
  while (pending.length) {
    const file = pending.pop();
    if (visited.has(file)) continue;
    visited.add(file);
    for (const dependency of platformDependencies(file, platform)) {
      if (!visited.has(dependency)) pending.push(dependency);
    }
  }
  return visited;
}

const mobileGraph = platformGraph("mobile");
const desktopGraph = platformGraph("desktop");
for (const file of mobileGraph) {
  if (desktopGraph.has(file)) continue;
  const url = `./${file}`;
  assert.ok(mobileCacheSet.has(url), `mobile-only runtime module missing from mobile cache: ${url}`);
  assert.equal(commonCacheSet.has(url), false, `mobile-only runtime module leaked into common precache: ${url}`);
  assert.equal(desktopCacheSet.has(url), false, `mobile-only runtime module leaked into desktop cache: ${url}`);
}
for (const file of desktopGraph) {
  if (mobileGraph.has(file)) continue;
  const url = `./${file}`;
  assert.ok(desktopCacheSet.has(url), `desktop-only runtime module missing from desktop cache: ${url}`);
  assert.equal(commonCacheSet.has(url), false, `desktop-only runtime module leaked into common precache: ${url}`);
  assert.equal(mobileCacheSet.has(url), false, `desktop-only runtime module leaked into mobile cache: ${url}`);
}
