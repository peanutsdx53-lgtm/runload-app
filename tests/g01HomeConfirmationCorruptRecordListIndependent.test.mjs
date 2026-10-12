import test from 'node:test';
import assert from 'node:assert/strict';
import { homeConfirmationTheme } from '../screens/shared/homeScreenSupport.js';

function services(allExperiences) {
  return { workflows:{ records:{loadAllExperiences:()=>allExperiences}}, storage:{selfUnderstandingThreads:{loadAll:()=>[]}},fatigue:{summarizeRun:()=>null}};
}

test('G01: corrupt object in saved experience collection never crashes home confirmation', () => {
  assert.equal(homeConfirmationTheme(services({length:1,records:[{record:{id:'unexpected'}}]})), null);
});

test('G01: invalid non-array scalar persisted experience list recovers without creating a false theme', () => {
  assert.equal(homeConfirmationTheme(services('not-an-array')), null);
});

test('G01: legitimate empty records and null entries preserve no-confirmation state', () => {
  assert.equal(homeConfirmationTheme(services([])), null);
  assert.equal(homeConfirmationTheme(services([null])), null);
});
