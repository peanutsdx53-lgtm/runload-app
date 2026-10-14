import test from 'node:test';
import assert from 'node:assert/strict';
import { renderResultScreen } from '../screens/desktop/resultScreen.js';

const experience = Object.freeze({
  record: Object.freeze({id:'legacy-&-record',date:'2026-10-14',activityType:'run',distanceKm:5,durationMinutes:30}),
  regionalV2ResultRecord:null,
});
const services={workflows:{records:{
  loadLatestExperience:()=>experience,
  loadExperience:id=>id===experience.record.id?experience:null,
  loadAllExperiences:()=>[experience],
}}};
test('F01/F04 desktop stored record with no current-model snapshot is not blank',()=>{
  const html=renderResultScreen({services,context:{parameters:new URLSearchParams()}});
  assert.match(html,/この記録の部位別結果は表示できません/);
  assert.match(html,/保存済みの記録は変更していません/);
  assert.match(html,/#\/history\?view=records&recordId=legacy-%26-record/);
  assert.doesNotMatch(html,/NaN|undefined|<script/);
});
