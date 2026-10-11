import {describe,expect,it,vi} from 'vitest';
import {AudioDirector,type SoundAdapter} from '../src/audio';
import {makeDemoEvents} from '../src/core';
import type {DirectorSnapshot} from '../src/director';

function fixture(time:number,playing=true):DirectorSnapshot {
 const events=makeDemoEvents('sound-1',13,'success');
 return {mode:'INTERACTIVE',scene:'PROCESSING',phase:'SIGNAL',time,localTime:time,
 progress:0,sceneGeneration:1,playing,quality:'BALANCED',reducedMotion:false,
 selectedAgent:'NEURAL-01',events,visibleEvents:events.filter(e=>e.timeMs<=time),
 status:'DEMO',eventKind:events.filter(e=>e.timeMs<=time).at(-1)?.kind??null,
 outcome:'success',autoPhase:'SCENE'};
}
describe('optional audio director',()=>{
 it('stays silent until user enables sound',async()=>{
  const cue=vi.fn();
  const adapter:SoundAdapter={unlock:async()=>true,play:cue,stop:vi.fn()};
  const a=new AudioDirector(adapter);
  a.sync(fixture(500));expect(cue).not.toHaveBeenCalled();
  await a.enable();
  a.sync(fixture(0));a.sync(fixture(500));
  expect(cue).toHaveBeenCalledTimes(1);
 });
 it('does not replay cues when seeking or pausing',async()=>{
  const cue=vi.fn();
  const a=new AudioDirector({unlock:async()=>true,play:cue,stop:vi.fn()});
  await a.enable();
  a.sync(fixture(400));a.sync(fixture(10000,false));
  expect(cue).toHaveBeenCalledTimes(1);
  a.seek(10000);
  a.sync(fixture(10500));
  expect(cue).toHaveBeenCalledTimes(1);
 });
 it('autoplay denial does not throw',async()=>{
  const a=new AudioDirector({unlock:async()=>false,play:vi.fn(),stop:vi.fn()});
  expect(await a.enable()).toBe(false);
 });
});
