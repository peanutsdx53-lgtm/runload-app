import assert from 'node:assert/strict';
import { renderRestoreInspection } from '../ui/restorePreviewPresentation.js';

const payloads = ['<img src=x onerror=alert(1)>', '</section><script>alert(1)</script>', '" onmouseover="alert(1)', '<svg/onload=alert(1)>', "'><iframe srcdoc='<script>x</script>'>"];
let checks=0;
for (const payload of payloads) {
  const cases = [
    { inspection: { status:'SUPPORTED', counts: {}, issues: [], canRestore:true }, fileName:payload },
    { inspection: { status:'REVIEW_REQUIRED', counts: {}, issues: [{ severity:'WARNING',message:payload,itemId:'record-1'}], canRestore:true, requiresAcknowledgement:true }, fileName:'safe.json' },
    { inspection: { status:'blocked', counts: {}, issues: [{ severity:'BLOCKING',message:'invalid',itemId:payload}], canRestore:false }, fileName:'safe.json' },
  ];
  for (const [index,{inspection,fileName}] of cases.entries()) {
    const html = renderRestoreInspection(inspection,fileName);
    assert.ok(!html.includes(payload),`injection must be escaped in case ${index}: ${payload}`);checks++;
    assert.ok(!/<(?:script|iframe|svg|img)\b|<[^>]+\bon(?:error|mouseover|load)\s*=/i.test(html),`active HTML in case ${index}`);checks++;
  }
}
console.log(JSON.stringify({suite:'Backup restore preview dynamic HTML injection boundary',checks,pass:checks,fail:0}));
