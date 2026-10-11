import {describe,expect,it} from 'vitest';
import {CinematicDirector} from '../src/director';

describe('Cinematic Director',()=>{
 it('abandons AUTO play upon switching to INTERACTIVE',()=>{
  const d=new CinematicDirector();
  d.tick(1000);
  d.setMode('INTERACTIVE');
  const time=d.snapshot.time;
  d.tick(1000);
  expect(d.snapshot.time).toBe(time);
  expect(d.snapshot.mode).toBe('INTERACTIVE');
 });
 it('skips boot atomically and never re-enters it on the next tick',()=>{
  const d=new CinematicDirector();
  d.skipIntro();
  expect(d.snapshot.scene).toBe('PROCESSING');
  d.tick(10);
  expect(d.snapshot.scene).toBe('PROCESSING');
 });
 it('replays the same result without emitting new events',()=>{
  const d=new CinematicDirector();
  d.setMode('INTERACTIVE');d.setScene('PROCESSING');d.runTask('success');
  d.seek(16000);
  const before=d.snapshot.events.map(e=>e.eventId);
  d.replay();
  expect(d.snapshot.events.map(e=>e.eventId)).toEqual(before);
 });
});
