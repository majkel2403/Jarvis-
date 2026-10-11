import {
 AUTO_DURATION,BOOT_DURATION,PROCESS_DURATION,COMMAND_DURATION,VirtualClock,
 makeDemoEvents,projectAt,sceneAt,type DemoEvent,type Mode,type SceneId,
 type ProcessPhase,type Outcome,type Quality,type EventKind
} from './core';

export interface DirectorSnapshot{
 mode:Mode;scene:SceneId;phase:ProcessPhase;time:number;localTime:number;
 progress:number;sceneGeneration:number;playing:boolean;quality:Quality;
 reducedMotion:boolean; selectedAgent:string; events:DemoEvent[];
 visibleEvents:DemoEvent[];status:string; eventKind:EventKind|null;
 outcome:Outcome; autoPhase:'SCENE'|'OUTRO'|'RESET';
}
export class CinematicDirector{
 private clock=new VirtualClock();
 private mode:Mode='AUTO_SHOWCASE';private scene:SceneId='BOOT';
 private generation=0;private quality:Quality='BALANCED';private reducedMotion=false;
 private selectedAgent='NEURAL-01';private outcome:Outcome='success';
 private events=makeDemoEvents('showcase-01',108,'success');
 private manualTime=0;
 get snapshot():DirectorSnapshot{
  const loc=this.mode==='AUTO_SHOWCASE'?sceneAt(this.clock.time):{
   scene:this.scene,phase:'SCENE' as const,localTime:this.clock.time};
  const scene=loc.scene;
  const processTime=scene==='PROCESSING'?loc.localTime:scene==='COMMAND'?PROCESS_DURATION:0;
  const projected=projectAt(this.events,processTime);
  const phase=scene==='BOOT'?'IDLE':projected.phase;
  const duration=scene==='BOOT'?BOOT_DURATION:scene==='PROCESSING'?PROCESS_DURATION:COMMAND_DURATION;
  const progress=Math.min(100,Math.round(100*loc.localTime/duration));
  return {mode:this.mode,scene,phase,time:this.clock.time,localTime:loc.localTime,progress,
   sceneGeneration:this.generation,playing:this.clock.playing,quality:this.quality,
   reducedMotion:this.reducedMotion,selectedAgent:this.selectedAgent,events:[...this.events],
   visibleEvents:scene==='PROCESSING'||scene==='COMMAND'?projected.visible:[],
   status:loc.phase==='OUTRO'?'DEACTIVATING':loc.phase==='RESET'?'RESETTING':
   scene==='BOOT'?(loc.localTime>=3300?'SYSTEM ONLINE':'INITIALIZING'):phase==='ERROR'?'TASK FAILED':
   phase==='SUCCESS'?'TASK COMPLETED':phase==='IDLE'?'AWAITING INPUT':phase,
   eventKind:projected.lastEvent?.kind??null,outcome:this.outcome,autoPhase:loc.phase};
 }
 tick(realDeltaMs:number){
  if(!Number.isFinite(realDeltaMs)||realDeltaMs<=0)return;
  // Discard long frame deltas after tab suspension.
  this.clock.advance(Math.min(100,realDeltaMs));
  if(this.mode==='AUTO_SHOWCASE'&&this.clock.time>=AUTO_DURATION){
   this.clock.seek(this.clock.time%AUTO_DURATION,AUTO_DURATION);this.generation++;
  } else if(this.mode==='INTERACTIVE'&&this.scene==='BOOT'&&this.clock.time>BOOT_DURATION){
   this.clock.seek(BOOT_DURATION,BOOT_DURATION);
  } else if(this.mode==='INTERACTIVE'&&this.scene==='PROCESSING'&&this.clock.time>PROCESS_DURATION){
   this.clock.seek(PROCESS_DURATION,PROCESS_DURATION);
  } else if(this.mode==='INTERACTIVE'&&this.scene==='COMMAND'&&this.clock.time>COMMAND_DURATION){
   this.clock.seek(COMMAND_DURATION,COMMAND_DURATION);
  }
 }
 setMode(mode:Mode){
  if(mode===this.mode)return;
  this.mode=mode;this.generation++;
  if(mode==='INTERACTIVE'){this.scene=this.snapshot.scene;this.manualTime=this.clock.time;this.clock.pause();}
  else{this.clock.seek(0,AUTO_DURATION);this.clock.resume();}
 }
 setScene(scene:SceneId){
  this.mode='INTERACTIVE';this.scene=scene;this.clock.seek(0,AUTO_DURATION);
  this.clock.pause();this.generation++;
 }
 runTask(outcome:Outcome){
  this.mode='INTERACTIVE';this.scene='PROCESSING';this.outcome=outcome;
  const runId='interactive-'+(this.generation+1);
  this.events=makeDemoEvents(runId,108,outcome);
  this.clock.seek(0,PROCESS_DURATION);this.clock.resume();this.generation++;
 }
 skipIntro(){if(this.mode==='AUTO_SHOWCASE'){this.clock.seek(BOOT_DURATION,AUTO_DURATION);}
  else{this.scene='PROCESSING';this.clock.seek(0,PROCESS_DURATION);}
  this.generation++;
 }
 play(){this.clock.resume();}
 pause(){this.clock.pause();}
 seek(timeMs:number){this.clock.seek(timeMs,this.mode==='AUTO_SHOWCASE'?AUTO_DURATION:this.scene==='BOOT'?BOOT_DURATION:this.scene==='PROCESSING'?PROCESS_DURATION:COMMAND_DURATION);}
 replay(){this.clock.seek(0,this.mode==='AUTO_SHOWCASE'?AUTO_DURATION:PROCESS_DURATION);this.clock.resume();this.generation++;}
 reset(){this.clock.seek(0,AUTO_DURATION);this.clock.pause();this.generation++;}
 setRate(rate:0.5|1|1.5){this.clock.rate=rate;}
 setQuality(quality:Quality){this.quality=quality;}
 setReducedMotion(reducedMotion:boolean){this.reducedMotion=reducedMotion;}
 selectAgent(id:string){this.selectedAgent=id;}
 setVisible(visible:boolean){this.clock.setVisible(visible);}
 get rate(){return this.clock.rate;}
}
