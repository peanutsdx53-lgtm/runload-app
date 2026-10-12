import test from 'node:test';
import assert from 'node:assert/strict';
import { measurementNotificationCapabilities, createRunMeasurementNotifier } from '../ui/runMeasurementNotifications.js';

const throwingGetter = (obj,key) => Object.defineProperty(obj,key,{
  configurable:true,get(){throw Object.assign(new Error('browser denied'),{name:'SecurityError'});}
});
for(const [label,target] of [
  ['AudioContext',throwingGetter({navigator:{vibrate(){return true}}},'AudioContext')],
  ['webkitAudioContext',throwingGetter({navigator:{}},'webkitAudioContext')],
  ['navigator',throwingGetter({},'navigator')],
  ['vibrate',{navigator:throwingGetter({},'vibrate')}],
]) {
  test('E07 denied capability getter '+label+' cannot crash measurement init',async()=>{
    assert.doesNotThrow(()=>measurementNotificationCapabilities(target));
    const notifier=createRunMeasurementNotifier(target,{measurementSoundEnabled:false,measurementVibrationEnabled:false});
    assert.equal((await notifier.prepare()).soundReady,false);
    assert.equal(notifier.notify('pace').sound,false);
    assert.equal(notifier.notify('pace').vibration,false);
    await assert.doesNotReject(notifier.close());
  });
}
test('E07 denied sound getter does not suppress valid vibration capability',()=>{
  const target=throwingGetter({navigator:{vibrate(){return true}}},'AudioContext');
  const capabilities=measurementNotificationCapabilities(target);
  assert.equal(capabilities.sound,false);
  assert.equal(capabilities.vibration,true);
  const notifier=createRunMeasurementNotifier(target,{measurementSoundEnabled:false});
  assert.equal(notifier.notify('preview-vibration').vibration,true);
});
test('E07 nominal sound and vibration capabilities remain enabled',()=>{
  const target={AudioContext:function FakeAudio(){},navigator:{vibrate(){return true}}};
  assert.deepEqual(measurementNotificationCapabilities(target),{sound:true,vibration:true});
});
