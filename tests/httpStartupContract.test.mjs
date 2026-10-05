import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mime = Object.freeze({
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
});

function sourceArray(source, name) {
  const start = source.indexOf(`const ${name} = [`);
  assert.notEqual(start, -1, `${name} must exist`);
  const end = source.indexOf("];", start);
  assert.notEqual(end, -1, `${name} must terminate`);
  return [...source.slice(start, end + 2).matchAll(/"(\.\/[^\"]+)"/g)].map((match) => match[1]);
}

async function createServer() {
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      const requestPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
      const target = path.resolve(root, `.${requestPath}`);
      if (target !== path.join(root, "index.html") && !target.startsWith(`${root}${path.sep}`)) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      const body = await fs.readFile(target);
      response.writeHead(200, {
        "content-type": mime[path.extname(target)] || "application/octet-stream",
        "cache-control": "no-store",
      });
      response.end(body);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return server;
}

function indexAssets(source) {
  return [...source.matchAll(/(?:href|src)="(\.\/[^\"?#]+)"/g)].map((match) => match[1]);
}

function manifestAssets(source) {
  const manifest = JSON.parse(source);
  return (manifest.icons || []).map((icon) => String(icon.src || "")).filter((src) => src.startsWith("./"));
}

test("current startup and PWA assets are servable over HTTP", async () => {
  const [index, manifest, worker] = await Promise.all([
    fs.readFile(path.join(root, "index.html"), "utf8"),
    fs.readFile(path.join(root, "manifest.webmanifest"), "utf8"),
    fs.readFile(path.join(root, "service-worker.js"), "utf8"),
  ]);
  const assets = new Set([
    "./index.html",
    "./manifest.webmanifest",
    "./service-worker.js",
    ...indexAssets(index),
    ...manifestAssets(manifest),
    ...sourceArray(worker, "COMMON_PRECACHE_URLS"),
    ...sourceArray(worker, "MOBILE_PLATFORM_URLS"),
    ...sourceArray(worker, "DESKTOP_PLATFORM_URLS"),
  ]);

  const server = await createServer();
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;
  try {
    for (const asset of [...assets].sort()) {
      const response = await fetch(`${base}/${asset.replace(/^\.\//, "")}`, { cache: "no-store" });
      assert.equal(response.status, 200, `${asset} returned HTTP ${response.status}`);
      const body = new Uint8Array(await response.arrayBuffer());
      assert.ok(body.byteLength > 0, `${asset} returned an empty response`);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
