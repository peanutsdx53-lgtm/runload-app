import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

function walk(rel, predicate = () => true) {
  const base = path.join(root, rel);
  const out = [];
  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    const child = path.posix.join(rel, entry.name);
    if (entry.isDirectory()) out.push(...walk(child, predicate));
    else if (predicate(child)) out.push(child);
  }
  return out;
}

const runtimeRoots = ["core", "ui", "screens", "shared"];
const runtimeFiles = runtimeRoots.flatMap((dir) => walk(dir, (rel) => /\.(?:js|mjs)$/.test(rel)));
const presentationFiles = [...walk("ui", (rel) => rel.endsWith(".js")), ...walk("screens", (rel) => rel.endsWith(".js"))];
const styleFiles = walk("styles", (rel) => rel.endsWith(".css"));

function resolveRelativeModule(from, specifier) {
  let rel = path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier));
  if (!path.posix.extname(rel)) rel += ".js";
  return rel;
}

function sourceArray(source, name) {
  const start = source.indexOf(`const ${name} = [`);
  assert.notEqual(start, -1, `${name} must exist`);
  const end = source.indexOf("];", start);
  assert.notEqual(end, -1, `${name} must terminate`);
  return [...source.slice(start, end + 2).matchAll(/"(\.\/[^\"]+)"/g)].map((match) => match[1]);
}

function platformStyleUrls(source) {
  const urls = [];
  for (const group of source.matchAll(/urls:\s*Object\.freeze\(\[([\s\S]*?)\]\)/g)) {
    urls.push(...[...group[1].matchAll(/"(\.\/styles\/[^\"]+\.css)"/g)].map((match) => match[1]));
  }
  return urls;
}

function extractFunctionDeclarations(source) {
  const declarations = [];
  const matcher = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\([^\n{]*\)\s*\{/gm;
  for (const match of source.matchAll(matcher)) {
    const start = match.index;
    let index = start + match[0].length - 1;
    let depth = 0;
    let state = "code";
    let quote = "";
    let escaped = false;
    for (; index < source.length; index += 1) {
      const char = source[index];
      const next = source[index + 1] || "";
      if (state === "code") {
        if (char === "'" || char === '"' || char === "`") { state = "string"; quote = char; escaped = false; }
        else if (char === "/" && next === "/") { state = "line-comment"; index += 1; }
        else if (char === "/" && next === "*") { state = "block-comment"; index += 1; }
        else if (char === "{") depth += 1;
        else if (char === "}") {
          depth -= 1;
          if (depth === 0) {
            const text = source.slice(start, index + 1);
            declarations.push({ name: match[1], text, lines: text.split("\n").length });
            break;
          }
        }
      } else if (state === "string") {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === quote) state = "code";
      } else if (state === "line-comment") {
        if (char === "\n") state = "code";
      } else if (state === "block-comment" && char === "*" && next === "/") {
        state = "code";
        index += 1;
      }
    }
  }
  return declarations;
}

test("current runtime has no historical generation or temporary filenames", () => {
  const currentFiles = [...runtimeFiles, ...styleFiles];
  const numbered = currentFiles.filter((rel) => /(?:^|[-_.])v\d+(?:[-_.]|$)/i.test(path.posix.basename(rel)));
  const temporary = currentFiles.filter((rel) => /(?:^|[-_.])(?:tmp|temp|draft|candidate|archive|obsolete|deprecated|scratch|wip)(?:[-_.]|$)/i.test(path.posix.basename(rel)));
  assert.deepEqual(numbered, [], `numbered current files: ${numbered.join(", ")}`);
  assert.deepEqual(temporary, [], `temporary current files: ${temporary.join(", ")}`);
});

test("current runtime contains no legacy implementation marker", () => {
  const marked = [...runtimeFiles, ...styleFiles].filter((rel) => /\blegacy\b/i.test(read(rel)));
  assert.deepEqual(marked, [], `legacy implementation markers: ${marked.join(", ")}`);
});

test("all runtime relative imports resolve to current files", () => {
  const missing = [];
  const importPattern = /(?:\b(?:import|export)\s+(?:[^'\"]*?\s+from\s+)?|\bimport\s*\()\s*["']([^"']+)["']/g;
  for (const rel of [...runtimeFiles, "app.js"]) {
    const source = read(rel);
    for (const match of source.matchAll(importPattern)) {
      if (!match[1].startsWith(".")) continue;
      const resolved = resolveRelativeModule(rel, match[1]);
      if (!fs.existsSync(path.join(root, resolved))) missing.push(`${rel} -> ${match[1]}`);
    }
  }
  assert.deepEqual(missing, [], `missing relative imports: ${missing.join(", ")}`);
});

test("each stylesheet has exactly one load owner", () => {
  const index = read("index.html");
  const platformStyles = read("ui/platformStyles.js");
  const shared = [...index.matchAll(/href="(\.\/styles\/[^\"]+\.css)"/g)].map((match) => match[1]);
  const platform = platformStyleUrls(platformStyles);
  const owned = [...shared, ...platform];
  const expected = styleFiles.map((rel) => `./${rel}`).sort();
  assert.deepEqual([...new Set(owned)].sort(), expected, "stylesheet ownership must cover the current styles directory exactly");
  assert.equal(owned.length, new Set(owned).size, "a stylesheet must not have multiple load owners");
});

test("index manifest and service-worker local asset references exist", () => {
  const missing = [];
  const index = read("index.html");
  for (const match of index.matchAll(/(?:href|src)="(\.\/[^\"?#]+)"/g)) {
    if (!fs.existsSync(path.join(root, match[1].slice(2)))) missing.push(`index.html -> ${match[1]}`);
  }
  const manifest = JSON.parse(read("manifest.webmanifest"));
  for (const icon of manifest.icons || []) {
    const src = String(icon.src || "");
    if (src.startsWith("./") && !fs.existsSync(path.join(root, src.slice(2)))) missing.push(`manifest.webmanifest -> ${src}`);
  }
  const worker = read("service-worker.js");
  for (const name of ["COMMON_PRECACHE_URLS", "MOBILE_PLATFORM_URLS", "DESKTOP_PLATFORM_URLS"]) {
    const urls = sourceArray(worker, name);
    assert.equal(urls.length, new Set(urls).size, `${name} must not contain duplicate assets`);
    for (const url of urls) {
      if (!fs.existsSync(path.join(root, url.slice(2)))) missing.push(`service-worker.js:${name} -> ${url}`);
    }
  }
  assert.deepEqual(missing, [], `missing local assets: ${missing.join(", ")}`);
});

test("presentation layer does not reach into internal core modules", () => {
  const violations = presentationFiles.filter((rel) => /(?:from\s+|import\s+)["'][^"']*core\/internal\//.test(read(rel)));
  assert.deepEqual(violations, [], `presentation/internal boundary violations: ${violations.join(", ")}`);
});

test("runtime has no repeated substantive function implementation", () => {
  const byImplementation = new Map();
  for (const rel of runtimeFiles) {
    for (const declaration of extractFunctionDeclarations(read(rel))) {
      if (declaration.lines < 4) continue;
      const normalized = declaration.text.replace(/\s+/g, " ").trim();
      const entries = byImplementation.get(normalized) || [];
      entries.push(`${rel}:${declaration.name}`);
      byImplementation.set(normalized, entries);
    }
  }
  const duplicates = [...byImplementation.values()].filter((entries) => entries.length > 1);
  assert.deepEqual(duplicates, [], `repeated substantive functions: ${JSON.stringify(duplicates)}`);
});

function stripCssComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "");
}

function readCssBlock(source, openIndex) {
  let depth = 1;
  let quote = "";
  let escaped = false;
  for (let index = openIndex + 1; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "'" || char === '"') quote = char;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return source.length - 1;
}

function cssRuleSignatures(source, context = []) {
  const rules = [];
  let index = 0;
  const css = stripCssComments(source);
  while (index < css.length) {
    while (/\s/.test(css[index] || "")) index += 1;
    if (index >= css.length) break;

    let cursor = index;
    let quote = "";
    let escaped = false;
    let parens = 0;
    let openIndex = -1;
    for (; cursor < css.length; cursor += 1) {
      const char = css[cursor];
      if (quote) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === quote) quote = "";
        continue;
      }
      if (char === "'" || char === '"') quote = char;
      else if (char === "(") parens += 1;
      else if (char === ")") parens = Math.max(0, parens - 1);
      else if (char === ";" && parens === 0) break;
      else if (char === "{" && parens === 0) { openIndex = cursor; break; }
    }

    if (openIndex < 0) {
      index = cursor + 1;
      continue;
    }

    const head = css.slice(index, openIndex).replace(/\s+/g, " ").trim();
    const closeIndex = readCssBlock(css, openIndex);
    const body = css.slice(openIndex + 1, closeIndex);
    if (head.startsWith("@")) {
      const lower = head.toLowerCase();
      if (/^@(media|supports|layer|container)\b/.test(lower)) {
        rules.push(...cssRuleSignatures(body, [...context, head]));
      }
    } else if (head) {
      const declarations = body
        .split(";")
        .map((part) => part.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .join(";");
      rules.push(`${context.join(" > ")}||${head}||${declarations}`);
    }
    index = closeIndex + 1;
  }
  return rules;
}

test("stylesheets contain no exact cross-file duplicate rules", () => {
  const owners = new Map();
  for (const rel of styleFiles) {
    for (const signature of cssRuleSignatures(read(rel))) {
      const files = owners.get(signature) || new Set();
      files.add(rel);
      owners.set(signature, files);
    }
  }
  const duplicates = [...owners.entries()]
    .filter(([, files]) => files.size > 1)
    .map(([signature, files]) => `${[...files].join(", ")} :: ${signature}`);
  assert.deepEqual(duplicates, [], `exact duplicate CSS rules: ${duplicates.join("\n")}`);
});
