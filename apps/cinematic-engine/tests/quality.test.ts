import {describe,expect,it} from 'vitest';
import {QualityGovernor} from '../src/quality';

describe('adaptive visual quality',()=>{
 it('does not downgrade from one slow frame',()=>{
  const q=new QualityGovernor('BALANCED');
  q.sample(180);
  expect(q.quality).toBe('BALANCED');
 });
 it('downgrades after sustained slow frames',()=>{
  const q=new QualityGovernor('BALANCED');
  for(let i=0;i<90;i++)q.sample(55);
  expect(q.quality).toBe('LOW');
 });
 it('respects manual selection and permanently falls back on WebGL loss',()=>{
  const q=new QualityGovernor('ULTRA');
  q.setManual('BALANCED');
  for(let i=0;i<90;i++)q.sample(60);
  expect(q.quality).toBe('BALANCED');
  q.contextLost();
  expect(q.quality).toBe('SAFE_2D');
 });
});
