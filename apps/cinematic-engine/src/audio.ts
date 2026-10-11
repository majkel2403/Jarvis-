import type {DemoEvent} from './core';
import type {DirectorSnapshot} from './director';

export interface SoundAdapter {
 unlock():Promise<boolean>;
 play(kind:DemoEvent['kind']):void;
 stop():void;
}
class WebSoundAdapter implements SoundAdapter {
 private context:AudioContext|null=null;
 async unlock():Promise<boolean>{
  try{
   if(typeof window==='undefined'||!('AudioContext' in window))return false;
   if(!this.context)this.context=new window.AudioContext();
   if(this.context.state==='suspended')await this.context.resume();
   return this.context.state==='running';
  }catch{return false;}
 }
 play(kind:DemoEvent['kind']){
  const ctx=this.context;if(!ctx||ctx.state!=='running')return;
  const tones:Partial<Record<DemoEvent['kind'],number>>={
   'signal.detected':420,'analysis.started':530,'agent.delegated':640,
   'tool.started':360,'tool.completed':720,'verification.started':580,
   'task.succeeded':860,'task.failed':190
  };
  const freq=tones[kind];if(!freq)return;
  const osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.type=kind==='task.failed'?'sawtooth':'sine';
  osc.frequency.setValueAtTime(freq,ctx.currentTime);
  gain.gain.setValueAtTime(0,ctx.currentTime);
  gain.gain.linearRampToValueAtTime(kind==='task.failed'?.018:.027,ctx.currentTime+.014);
  gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.14);
  osc.connect(gain);gain.connect(ctx.destination);
  osc.start();osc.stop(ctx.currentTime+.17);
 }
 stop(){if(this.context?.state==='running')void this.context.suspend().catch(()=>{});}
}
export class AudioDirector {
 private enabled=false;
 private seen=new Set<string>();
 private generation=-1;
 private lastTime=0;
 constructor(private readonly adapter:SoundAdapter=new WebSoundAdapter()){}
 async enable():Promise<boolean> {
  try{this.enabled=await this.adapter.unlock();return this.enabled;}
  catch{this.enabled=false;return false;}
 }
 mute(){this.enabled=false;this.adapter.stop();}
 seek(timeMs:number){this.lastTime=timeMs;}
 sync(snapshot:DirectorSnapshot){
  if(snapshot.sceneGeneration!==this.generation){
   this.generation=snapshot.sceneGeneration;
   this.seen.clear();this.lastTime=0;
  }
  if(!this.enabled)return;
  if(!snapshot.playing){this.lastTime=snapshot.localTime;return;}
  if(snapshot.localTime<this.lastTime){this.lastTime=snapshot.localTime;this.seen.clear();return;}
  for(const e of snapshot.visibleEvents){
   const key=e.runId+':'+e.eventId;
   if(e.timeMs>this.lastTime && e.timeMs<=snapshot.localTime && !this.seen.has(key)){
    this.adapter.play(e.kind);this.seen.add(key);
   }
  }
  this.lastTime=snapshot.localTime;
 }
}
