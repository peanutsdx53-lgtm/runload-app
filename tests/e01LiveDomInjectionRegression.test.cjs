'use strict';
// This suite is a bounded E-01 browser regression. It is not an all-sink proof.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      const file = path.resolve(ROOT, `.${url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)}`);
      if (!file.startsWith(`${ROOT}${path.sep}`)) { res.writeHead(403).end(); return; }
      const data = await fs.readFile(file);
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(data);
    } catch { res.writeHead(404).end(); }
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ server, origin: `http://127.0.0.1:${server.address().port}` })));
}
const ATTACKS = [
  '<img src=x onerror="window.__runloadInjected=1">',
  '<svg onload="window.__runloadInjected=1"></svg>',
  '</section><script>window.__runloadInjected=1</script>',
  '" autofocus onfocus="window.__runloadInjected=1',
  '\'><iframe srcdoc="<script>window.__runloadInjected=1</script>"></iframe>',
  '<a href="javascript:window.__runloadInjected=1">click</a>',
];
async function audit(browser, origin, viewport) {
  const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
  const outgoing = [];
  await context.route('**/*', route => {
    if (route.request().url().startsWith(`${origin}/`)) return route.continue();
    outgoing.push(route.request().url()); return route.abort('blockedbyclient');
  });
  try {
    const page = await context.newPage();
    const boot = await page.goto(`${origin}/index.html`, {waitUntil:'domcontentloaded'});
    assert.equal(boot.status(), 200);
    const result = await page.evaluate(async attacks => {
      const restore = await import('/ui/restorePreviewPresentation.js');
      const course = await import('/screens/shared/courseEditorScreen.js');
      const forms = await import('/ui/interactions/formUtilities.js');
      let checks = 0;
      const errors = [];
      const host = document.createElement('div');
      host.id = 'e01-live-dom-audit'; document.body.append(host);
      const exercise = (label, html, expected, expectedAttribute=null) => {
        host.innerHTML = html;
        const unsafe = host.querySelectorAll('script, iframe, svg[onload], img[onerror], [onerror], [onload], [onfocus], [onclick], a[href^="javascript:"], input[autofocus]');
        if (unsafe.length) errors.push(`${label}: unsafe elements/handlers: ${unsafe.length}`);
        if (!host.textContent.includes(expected) && !(expectedAttribute && host.querySelector(expectedAttribute)?.getAttribute('value') === expected)) {
          errors.push(`${label}: user string not retained as escaped text/attribute`);
        }
        if (window.__runloadInjected !== undefined) errors.push(`${label}: script executed`);
        checks += 3;
      };
      for (const input of attacks) {
        const filename = `backup-${input}.json`;
        exercise('restore-filename',restore.renderRestoreInspection({ status:'SUPPORTED',counts:{records:1},issues:[],canRestore:true },filename),filename);
        exercise('restore-blocking',restore.renderRestoreInspection({ status:'blocked',counts:{},issues:[{severity:'BLOCKING',message:input,itemId:input}],canRestore:false },'audit.json'),input);
        exercise('restore-warning',restore.renderRestoreInspection({ status:'REVIEW_REQUIRED',counts:{},issues:[{severity:'WARNING',message:input,itemId:'x'}],canRestore:true,requiresAcknowledgement:true },'audit.json'),input);
        const courseData = {name:input,pavedPercent:input,trackPercent:0,sections:[{sharePercent:input,gradeDirection:'UPHILL',gradePercent:2}]};
        exercise('surfaceMix',course.surfaceMix(courseData),input,'input[name="pavedPercent"]');
        exercise('surfaceMixCompact',course.surfaceMixCompact(courseData),input,'input[name="pavedPercent"]');
        exercise('sectionRows',course.sectionRows(courseData), '区間 1');
        exercise('sectionRowsCompact',course.sectionRowsCompact(courseData), '区間 1');
        host.innerHTML = '<form><div data-form-messages></div></form><div data-data-management-messages></div>';
        const form = host.querySelector('form');
        forms.showFormMessages(form,[input], 'error');
        const message = form.querySelector('[data-form-messages]');
        if (message.querySelector('img, svg, iframe, script, [onerror],[onload],[onfocus]')) errors.push('showFormMessages: active markup');
        if (!message.textContent.includes(input)) errors.push('showFormMessages: source text missing');
        checks += 2;
        // showDataMessage queries the real document by design.
        forms.showDataMessage([input], 'error');
        const dataMsg = document.querySelector('[data-data-management-messages]');
        if (dataMsg.querySelector('img, svg, iframe, script,[onerror],[onload],[onfocus]')) errors.push('showDataMessage: active markup');
        if (!dataMsg.textContent.includes(input)) errors.push('showDataMessage: source text missing');
        checks += 2;
      }
      host.remove();
      return {checks, errors, executed: window.__runloadInjected===1};
    },ATTACKS);
    assert.deepEqual(result.errors,[],JSON.stringify({viewport,...result}));
    assert.equal(result.executed,false);
    assert.equal(result.checks, ATTACKS.length * (7 * 3 + 4));
    assert.equal(outgoing.length,0,'Live DOM test must not transmit test values off-origin');
    console.log(JSON.stringify({viewport,checks:result.checks,externalRequests:outgoing.length,status:'PASS',scope:'restore/course/form DOM sinks, not all 43'}));
  } finally { await context.close(); }
}
(async()=>{
  const {server,origin}=await startServer();let browser;
  try {
    browser=await chromium.launch({headless:true,args:['--no-sandbox']});
    for(const viewport of [{width:1440,height:900},{width:390,height:844}]) await audit(browser,origin,viewport);
    console.log('E01_BOUNDED_LIVE_DOM_ATTACK_REGRESSION_PASS');
  } finally { await browser?.close();await new Promise(r=>server.close(r)); }
})().catch(err=>{console.error(err);process.exitCode=1});
