import assert from 'node:assert/strict';
import { buildConditionDifferenceSummary } from '../core/interpretationBase.js';
import { compareExperienceRecordChronology } from '../shared/recordUtilities.js';

const make = (id, date='2026-10-09', createdAt='2026-10-09T08:00:00Z', kind='run') => ({
 record:{id,date,createdAt,activityType:kind,distanceKm:5,durationMinutes:28,runningFormat:'CONTINUOUS_RUN', course:{name:'test-course'}},
});
const cases = [
 ['a','A'],['A','a'],['record-1','record_2'],['record_2','record-1'],
 ['Z','a'],['a','Z'],['b','B'],['B','b'],['k-1','k_1'],['X9','X1'],
 ['2026-record-2','2026-record_2'],['person.1','person_1'],
];
let checks=0;
for(const [currentId,otherId] of cases){
 const current=make(currentId),other=make(otherId);
 const expected=compareExperienceRecordChronology(other,current)<0?otherId:'';
 for(const records of [[other,current],[current,other],[other,current,other]]){
  const got=buildConditionDifferenceSummary(current, records);
  assert.equal(got.previousRecordId,expected,`current=${currentId},other=${otherId}`);
  checks++;
 }
}
for(const curDate of ['2026-10-08','2026-10-09']){
 const current=make('current',curDate);
 const history=[make('EARLIER','2026-10-07'),make('later','2026-10-10'),make('rest','2026-10-07','2026-10-07T07:00:00Z','rest')];
 const result=buildConditionDifferenceSummary(current,[...history,current]);
 assert.equal(result.previousRecordId,'EARLIER'); checks++;
}
for(let a=0;a<20;a++){
 const current=make(`current-${a}`);
 const ids=[`A-${a}`,`a-${a}`,`x_${a}`,`x-${a}`,`Z${a}`];
 const prev=ids.map(x=>make(x));
 const expected=prev.filter(x=>compareExperienceRecordChronology(x,current)<0).sort(compareExperienceRecordChronology).at(-1)?.record.id||'';
 const actual=buildConditionDifferenceSummary(current,[current,...prev]).previousRecordId;
 assert.equal(actual,expected);checks++;
}
console.log(JSON.stringify({suite:'A07 chronology consistency',checks,pass:checks,fail:0}));

// Stable keys persisted by self-understanding must share the same per-field order.
const { compareStableRecordKeys } = await import('../shared/recordUtilities.js');
const { buildSelfUnderstandingView, SELF_UNDERSTANDING_TYPES, selfUnderstandingStableRecordKey } = await import('../core/selfUnderstandingCore.js');
const mkThread=(source)=>({id:'thread-1',type:SELF_UNDERSTANDING_TYPES.contextQuestion,userState:'WATCHING',subject:{focusKey:'PACE_CONTEXT',prompt:'前の状態との比較'},createdAt:'2026-10-08T07:00:00Z',createdFromRecordId:source.record.id,createdFromStableRecordKey:selfUnderstandingStableRecordKey(source.record),lastReviewedStableRecordKey:selfUnderstandingStableRecordKey(source.record)});
for(const [sourceId, targetId] of cases){
 const source=make(sourceId), target=make(targetId), key=x=>selfUnderstandingStableRecordKey(x.record);
 const expected=compareExperienceRecordChronology(source,target)<0;
 assert.equal(Math.sign(compareStableRecordKeys(key(source),key(target))),Math.sign(compareExperienceRecordChronology(source,target)));
 const view=buildSelfUnderstandingView({targetExperience:target,allExperiences:[source,target],threads:[mkThread(source)]});
 assert.equal(view.threads.length,1);
 assert.equal(view.threads[0].newEpisodes.some(x=>x.recordId===targetId),expected,`${sourceId} vs ${targetId}`);
 checks+=2;
}
console.log(JSON.stringify({suite:'A07 self-understanding chronology',checks:cases.length*2,pass:cases.length*2,fail:0}));
