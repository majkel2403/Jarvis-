import type {Quality} from './core';

export class QualityGovernor{
 quality:Quality;
 private frameTimes:number[]=[];
 private manual=false;
 private failed=false;
 constructor(initial:Quality='BALANCED'){this.quality=initial;}
 sample(frameMs:number):Quality{
  if(this.manual||this.failed||!Number.isFinite(frameMs)||frameMs<=0)return this.quality;
  // A sliding window deliberately ignores isolated slow frames.
  this.frameTimes.push(Math.min(frameMs,200));
  if(this.frameTimes.length<60)return this.quality;
  if(this.frameTimes.length>60)this.frameTimes.shift();
  const avg=this.frameTimes.reduce((a,b)=>a+b,0)/this.frameTimes.length;
  if(avg>33.5){
   if(this.quality==='ULTRA')this.quality='BALANCED';
   else if(this.quality==='BALANCED')this.quality='LOW';
   this.frameTimes.length=0;
  }
  return this.quality;
 }
 setManual(quality:Quality){this.quality=quality;this.manual=true;this.frameTimes.length=0;}
 contextLost(){this.quality='SAFE_2D';this.failed=true;this.frameTimes.length=0;}
}
