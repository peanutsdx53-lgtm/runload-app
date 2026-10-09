import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const roots = ['core','screens','ui','styles','assets','icons','shared'];
const files = ['index.html','manifest.webmanifest','app.js','service-worker.js','.nojekyll'];
function collect(dir) {
  for (const item of fs.readdirSync(dir, {withFileTypes:true})) {
    const name = path.join(dir,item.name);
    if (item.isDirectory()) collect(name);
    else if (item.isFile()) files.push(name);
  }
}
roots.forEach(collect);
files.sort();
const patterns = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/],
  ['GitHub token', /(?:ghp_|gho_|ghu_|ghs_|ghr_|github_pat_)[A-Za-z0-9_]{24,}/],
  ['AWS access ID', /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
  ['API bearer', /authorization\s*[:=]\s*['"]?bearer\s+[A-Za-z0-9._-]{18,}/i],
  ['API key', /\bsk-[a-zA-Z0-9]{20,}\b/],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{12,}\b/],
];
let checks=0;
assert.equal(files.length,332,'runtime asset inventory must match distribution'); checks++;
for (const file of files) {
  assert.ok(!file.startsWith('tests/') && !file.startsWith('docs/'));checks++;
  const bytes=fs.readFileSync(file);
  const text=bytes.toString('utf8');
  for (const [label,p] of patterns) {
    assert.ok(!p.test(text), `runtime file embeds apparent ${label}: ${file}`);checks++;
  }
  if (file.endsWith('.png')) {
    assert.ok(!bytes.includes(Buffer.from('eXIf')),`PNG EXIF metadata in ${file}`);checks++;
    assert.ok(!bytes.includes(Buffer.from('GPSInfo')),`GPS metadata in ${file}`);checks++;
  }
  if (file.endsWith('.svg')) {
    assert.ok(!/<script|onload\s*=|javascript:/i.test(text),`active SVG content in ${file}`);checks++;
  }
}
console.log(JSON.stringify({suite:'Distributed runtime credential and fixed image metadata audit',runtimeFiles:files.length,checks,pass:checks,fail:0}));
