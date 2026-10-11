import { describe, expect, it } from 'vitest';
import { AUTO_DURATION, sceneAt, VirtualClock, makeDemoEvents, projectAt, validateEvent, seededRandom } from '../src/core';

describe('Cinematic Engine domain', () => {
  it('splits AUTO SHOWCASE into exactly 35 seconds', () => {
    expect(AUTO_DURATION).toBe(35000);
    expect(sceneAt(0).scene).toBe('BOOT');
    expect(sceneAt(4200).scene).toBe('PROCESSING');
    expect(sceneAt(20200).scene).toBe('COMMAND');
    expect(sceneAt(32200).phase).toBe('OUTRO');
    expect(sceneAt(34200).phase).toBe('RESET');
  });
  it('handles pause, rate and clamped seeking without drift', () => {
    const clock = new VirtualClock();
    clock.rate = 1.5;
    clock.advance(200); expect(clock.time).toBe(300);
    clock.pause(); clock.advance(300); expect(clock.time).toBe(300);
    clock.resume(); clock.seek(50000, 35000); expect(clock.time).toBe(35000);
    clock.seek(-15, 35000); expect(clock.time).toBe(0);
  });
  it('generates repeatable demo log and safe projections', () => {
    const a = makeDemoEvents('run-1', 23, 'success');
    const b = makeDemoEvents('run-1', 23, 'success');
    expect(a).toEqual(b);
    expect(projectAt(a, 1e6).phase).toBe('SUCCESS');
    expect(projectAt(a, -100).phase).toBe('IDLE');
    expect(makeDemoEvents('run-2', 23, 'error').at(-1)?.kind).toBe('task.failed');
  });
  it('rejects duplicates within a run, allows identical id across runs', () => {
    const [evt] = makeDemoEvents('run-1', 12, 'success');
    const first = validateEvent(evt, new Set());
    expect(first.ok).toBe(true);
    const seen = new Set([evt.runId + ':' + evt.eventId]);
    expect(validateEvent(evt, seen).ok).toBe(false);
    expect(validateEvent({...evt, runId:'run-2'}, seen).ok).toBe(true);
  });
  it('uses stable seeded values', () => {
    const a = seededRandom(123), b = seededRandom(123);
    expect([a(),a(),a()]).toEqual([b(),b(),b()]);
  });
});
