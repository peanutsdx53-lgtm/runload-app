import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn, spawnSync } from "node:child_process";
import assert from "node:assert/strict";

const ROOT = process.cwd();
const MIME = Object.freeze({
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chromeExecutable() {
  for (const name of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]) {
    const found = spawnSync("which", [name], { encoding: "utf8" });
    if (found.status === 0 && found.stdout.trim()) return found.stdout.trim();
  }
  throw new Error("Chrome/Chromium executable was not found on the runner");
}

async function createServer() {
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      const rawPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
      const filePath = path.resolve(ROOT, `.${rawPath}`);
      if (!filePath.startsWith(`${ROOT}${path.sep}`) && filePath !== path.join(ROOT, "index.html")) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      const content = await fs.readFile(filePath);
      response.writeHead(200, {
        "content-type": MIME[path.extname(filePath)] || "application/octet-stream",
        "cache-control": "no-store",
      });
      response.end(content);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return server;
}

async function waitForDevToolsPort(userDataDir, attempts = 100) {
  const file = path.join(userDataDir, "DevToolsActivePort");
  for (let index = 0; index < attempts; index += 1) {
    try {
      const [port] = (await fs.readFile(file, "utf8")).trim().split(/\s+/);
      if (port) return Number(port);
    } catch {}
    await sleep(50);
  }
  throw new Error("Chrome DevTools port was not created");
}

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.sequence = 0;
    this.pending = new Map();
    socket.addEventListener("message", (event) => {
      const payload = JSON.parse(String(event.data));
      if (!payload.id) return;
      const waiter = this.pending.get(payload.id);
      if (!waiter) return;
      this.pending.delete(payload.id);
      if (payload.error) waiter.reject(new Error(payload.error.message || "CDP error"));
      else waiter.resolve(payload.result || {});
    });
  }

  send(method, params = {}) {
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Browser evaluation failed");
    return result.result?.value;
  }
}

async function waitFor(client, expression, message, attempts = 100) {
  for (let index = 0; index < attempts; index += 1) {
    if (await client.evaluate(Boolean(expression) ? `Boolean(${expression})` : "false")) return;
    await sleep(50);
  }
  throw new Error(message);
}

async function navigate(client, url) {
  await client.send("Page.navigate", { url });
  await waitFor(client, "document.readyState === 'complete'", `navigation did not complete: ${url}`);
  await sleep(120);
}

async function run() {
  assert.equal(typeof WebSocket, "function", "Node 22 WebSocket global is required");
  const server = await createServer();
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "runload-browser-"));
  const chrome = spawn(chromeExecutable(), [
    "--headless=new",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=0",
    `--user-data-dir=${userDataDir}`,
    "about:blank",
  ], { stdio: "ignore" });

  let socket;
  try {
    const debugPort = await waitForDevToolsPort(userDataDir);
    const targets = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then((response) => response.json());
    const target = targets.find((item) => item.type === "page");
    assert.ok(target?.webSocketDebuggerUrl, "page DevTools target was not found");
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", reject, { once: true });
    });
    const client = new CdpClient(socket);
    await client.send("Page.enable");
    await client.send("Runtime.enable");

    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true,
    });
    await navigate(client, `${baseUrl}/#/run-measurement`);
    await waitFor(client, 'document.querySelector("[name=mobileActivityIdentity][value=WALK]")', "mobile activity selector did not render");

    await client.evaluate('document.querySelector("[name=mobileActivityIdentity][value=WALK]").click()');
    await waitFor(client, 'document.querySelector(".run-measurement-prep__intro h1")?.textContent === "今日はどう動きますか"', "WALK copy did not switch");
    assert.equal(await client.evaluate('document.querySelector("[data-measurement-mode-label]")?.textContent'), "自由に測る");
    assert.equal(await client.evaluate('document.querySelector(".run-measurement-active__map-toolbar strong")?.textContent'), "移動地図");

    await client.evaluate('document.querySelector("[name=mobileActivityIdentity][value=RUNNING_CURRENT]").click()');
    await waitFor(client, 'document.querySelector(".run-measurement-prep__intro h1")?.textContent === "今日はどう走りますか"', "RUNNING copy did not restore");
    assert.equal(await client.evaluate('document.querySelector("[data-measurement-mode-label]")?.textContent'), "自由に走る");
    assert.equal(await client.evaluate('document.querySelector(".run-measurement-active__map-toolbar strong")?.textContent'), "走行地図");

    const extensionRecord = {
      version: 1,
      modelVersion: "2026-09-30.v1.3",
      id: "mobile-activity-browser-audit",
      createdAt: "2026-09-30T04:00:00.000Z",
      activityId: "MIXED",
      distanceKm: 1.2,
      durationMinutes: 10,
      energyEstimate: null,
      analysis: {
        activityId: "MIXED",
        segments: [
          {
            gaitId: "WALK",
            distanceKm: 0.45,
            durationSeconds: 300,
            speedKmh: 5.4,
            coverage: {
              strictAll12: true,
              availableRegionCount: 12,
              regions: [{ regionId: "R01", index: 100, evidenceTier: "WITHIN_SOURCE_INTERPOLATION", outputStatus: "OK" }],
            },
          },
          {
            gaitId: "RUNNING_CURRENT",
            distanceKm: 0.75,
            durationSeconds: 300,
            speedKmh: 9,
            coverage: { outputStatus: "USE_EXISTING_RUNNING_CURRENT_ENGINE", regions: null },
          },
        ],
      },
      authority: {
        scope: "SMARTPHONE_EXTENSION_ONLY",
        pcThesisCurrent: "UNCHANGED",
        runningCurrentInvoked: false,
        regionalAggregation: "NO_CROSS_GAIT_OR_CROSS_CONSTRUCT_AGGREGATION",
        provisionalEnabled: false,
      },
    };
    await client.evaluate(`localStorage.setItem("runner-load-app-mobile-walk-jog-records-v1.3", JSON.stringify([${JSON.stringify(extensionRecord)}])); location.hash = "#/history?mobileActivity=1"`);
    await waitFor(client, 'document.querySelector(".mobile-activity-history-full")', "isolated activity history did not render");
    assert.equal(await client.evaluate('document.querySelectorAll(".mobile-activity-record-card").length'), 1);
    assert.equal(await client.evaluate('document.querySelector(".mobile-activity-record-card strong")?.textContent'), "歩き＋走り");
    assert.equal(await client.evaluate('Array.from(document.querySelector(".screen-layout--history").children).filter((node) => !node.classList.contains("page-head") && !node.matches("[data-mobile-activity-history]")).every((node) => node.hidden)'), true);

    await client.evaluate('location.hash = "#/history?mobileActivity=1&mobileActivityRecordId=mobile-activity-browser-audit"');
    await waitFor(client, 'document.querySelector(".mobile-activity-history-detail")', "activity detail did not render");
    assert.equal(await client.evaluate('document.querySelectorAll(".mobile-activity-segment").length'), 2);
    assert.equal(await client.evaluate('document.body.innerText.includes("異なる運動様式・異なる構成概念の12部位値は、合算・平均しません")'), true);
    assert.equal(await client.evaluate('document.body.innerText.includes("既存ランニングエンジンを再計算せず")'), true);
    assert.equal(await client.evaluate('document.querySelectorAll(".mobile-activity-region-row").length'), 1);
    assert.equal(await client.evaluate('document.querySelector(".mobile-activity-history-detail").innerText.includes("kcal")'), false);

    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await navigate(client, `${baseUrl}/#/history?mobileActivity=1`);
    await waitFor(client, 'document.querySelector(".screen-layout--history")', "desktop history did not render");
    await sleep(150);
    assert.equal(await client.evaluate('Boolean(document.querySelector("[data-mobile-activity-history]"))'), false);

    console.log("PASS\tMOBILE-COPY-WALK-AND-RUNNING-RESTORE");
    console.log("PASS\tMOBILE-ISOLATED-HISTORY-AND-MIXED-DETAIL");
    console.log("PASS\tDESKTOP-NON-INTERFERENCE");
  } finally {
    try { socket?.close(); } catch {}
    chrome.kill("SIGKILL");
    server.close();
    await fs.rm(userDataDir, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(`FAIL\tMOBILE-BROWSER-FLOW\t${error?.stack || error}`);
  process.exitCode = 1;
});
