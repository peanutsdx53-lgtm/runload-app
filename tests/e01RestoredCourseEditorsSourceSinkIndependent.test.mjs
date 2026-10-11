import test from 'node:test';
import assert from 'node:assert/strict';
import { renderCourseEditorScreen as renderDesktop } from '../screens/desktop/courseEditorScreen.js';
import { renderCourseEditorScreen as renderMobile } from '../screens/mobile/courseEditorScreen.js';
const attacks=['<svg onload=alert(1)>','" autofocus onfocus="alert(1)','<img src=x onerror=alert(1)>','</a><iframe srcdoc="<script>alert(1)</script>"></iframe>'];
for(const [label,render] of [['desktop',renderDesktop],['mobile',renderMobile]]) {
 test(`E01 ${label}: restored course text and URL hash are HTML-attribute safe`,()=>{
  for(const attack of attacks){
   const services={storage:{courses:{findById:()=>({id:'stored-course',name:attack,course:{name:attack,routePattern:attack,upPercent:attack,downPercent:attack,gradeInputMode:'SUMMARY',sections:[]}})}}};
   const html=render({services,context:{parameters:new URLSearchParams('id=stored-course&returnTo='+encodeURIComponent('#/plan?note='+attack))}});
   assert.match(html, /name="courseName"/);
   assert.match(html,/&lt;|&quot;|%3C|%22/i);
   assert.doesNotMatch(html,/<svg\s+onload=|<img\s+src=x\s+onerror=|<iframe\s+srcdoc=/i);
   assert.doesNotMatch(html,/<script\b/i);
  }
 });
}
