/** The domain contains no renderer, network or mutable global state. */
export type SceneId = 'BOOT' | 'PROCESSING' | 'COMMAND';
export type Mode = 'AUTO_SHOWCASE' | 'INTERACTIVE';
export type ProcessPhase = 'IDLE' | 'SIGNAL' | 'ANALYZING' | 'DELEGATING' | 'EXECUTING' | 'VERIFYING' | 'SUCCESS' | 'ERROR';
export type Outcome = 'success' | 'error';
export type Quality = 'ULTRA' | 'BALANCED' | 'LOW' | 'SAFE_2D';
export type EventKind = 'system.boot.started' | 'system.boot.completed' | 'signal.detected' | 'analysis.started' | 'agent.delegated' | 'tool.started' | 'tool.completed' | 'verification.started' | 'task.succeeded' | 'task.failed' | 'scene.outro.started';

export interface DemoEvent {
 schemaVersion:1; eventId:string; runId:string; sequence:number; timeMs:number;
 source:'demo-simulator'; kind:EventKind; correlationId?:string;
 payload: Record<string, string>;
}

export const AUTO_DURATION=35000;
export const BOOT_DURATION=4200;
export const PROCESS_DURATION=16000;
export const COMMAND_DURATION=12000;

export const MOTION_TOKENS = {
 confirm:180, materialize:480, trace:560, ping:780, acquire:680,
 charge:1150, release:330, transition:1250, boot:4200, outro:2000
} as const;

export function clamp(value:number,min:number,max:number){
 return Number.isFinite(value)?Math.max(min,Math.min(max,value)):min;
}
export function seededRandom(seed:number):()=>number {
 let state=(seed>>>0)||1;
 return ()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;};
}
export function sceneAt(timeMs:number):{scene:SceneId;phase:'SCENE'|'OUTRO'|'RESET';localTime:number}{
 const t=clamp(timeMs,0,AUTO_DURATION);
 if(t<4200)return {scene:'BOOT',phase:'SCENE',localTime:t};
 if(t<20200)return {scene:'PROCESSING',phase:'SCENE',localTime:t-4200};
 if(t<32200)return {scene:'COMMAND',phase:'SCENE',localTime:t-20200};
 if(t<34200)return {scene:'COMMAND',phase:'OUTRO',localTime:t-32200};
 return {scene:'BOOT',phase:'RESET',localTime:t-34200};
}
const eventKinds:readonly EventKind[]=[
 'system.boot.started','system.boot.completed','signal.detected',
 'analysis.started','agent.delegated','tool.started','tool.completed',
 'verification.started','task.succeeded','task.failed','scene.outro.started'];
const phaseKinds:Partial<Record<EventKind,ProcessPhase>>={
 'signal.detected':'SIGNAL','analysis.started':'ANALYZING',
 'agent.delegated':'DELEGATING','tool.started':'EXECUTING',
 'tool.completed':'EXECUTING','verification.started':'VERIFYING',
 'task.succeeded':'SUCCESS','task.failed':'ERROR'
};
const payloadKey:Partial<Record<EventKind,string>>={
 'signal.detected':'signalId','agent.delegated':'agentId',
 'tool.started':'toolId','tool.completed':'toolId',
 'verification.started':'checkId','task.succeeded':'result','task.failed':'reason'
};
export function validateEvent(input:unknown,seen:ReadonlySet<string>):{ok:boolean;error?:string}{
 if(!input||typeof input!=='object')return {ok:false,error:'INVALID_PAYLOAD'};
 const e=input as Partial<DemoEvent>;
 if(e.schemaVersion!==1||e.source!=='demo-simulator')return {ok:false,error:'INVALID_SCHEMA'};
 if(typeof e.runId!=='string'||!e.runId||typeof e.eventId!=='string'||!e.eventId
 ||!Number.isSafeInteger(e.sequence)||!(e.sequence!>0)||!Number.isSafeInteger(e.timeMs)||e.timeMs!<0)
 return {ok:false,error:'INVALID_PAYLOAD'};
 if(!eventKinds.includes(e.kind as EventKind))return {ok:false,error:'UNKNOWN_KIND'};
 if(seen.has(e.runId+':'+e.eventId))return {ok:false,error:'DUPLICATE'};
 if(typeof e.payload!=='object'||e.payload===null||Array.isArray(e.payload))return {ok:false,error:'INVALID_PAYLOAD'};
 const key=payloadKey[e.kind as EventKind];
 if(key && (typeof e.payload[key]!=='string'||!e.payload[key]?.trim()||!e.correlationId?.trim()))
 return {ok:false,error:'INVALID_PAYLOAD'};
 if(Object.keys(e.payload).some(k=>k!==key))return {ok:false,error:'INVALID_PAYLOAD'};
 return {ok:true};
}
export function makeDemoEvents(runId:string,seed:number,outcome:Outcome):DemoEvent[]{
 const rng=seededRandom(seed);const events:DemoEvent[]=[];
 const push=(timeMs:number,kind:EventKind,payload:Record<string,string>={})=>{
  const sequence=events.length+1;
  events.push({schemaVersion:1,eventId:`${sequence}-${Math.floor(rng()*1000000)}`,runId,sequence,timeMs,
   source:'demo-simulator',kind,correlationId:'demo-task-001',payload});
 };
 push(350,'signal.detected',{signalId:'sigma-7'});
 push(1950,'analysis.started');
 push(4500,'agent.delegated',{agentId:'NEURAL-01'});
 push(6900,'tool.started',{toolId:'vector-scan'});
 push(10000,'tool.completed',{toolId:'vector-scan'});
 push(11800,'verification.started',{checkId:'confidence-check'});
 push(14200,outcome==='success'?'task.succeeded':'task.failed',
 outcome==='success'?{result:'SIGNAL VERIFIED'}:{reason:'CONFIDENCE BELOW THRESHOLD'});
 return events;
}
export function projectAt(events:readonly DemoEvent[],timeMs:number):{phase:ProcessPhase;lastEvent:DemoEvent|null;visible:DemoEvent[]}{
 const visible=events.filter(e=>e.timeMs<=timeMs).sort((a,b)=>a.timeMs-b.timeMs||a.sequence-b.sequence);
 const lastEvent=visible.at(-1)??null;
 return {phase:lastEvent?phaseKinds[lastEvent.kind]??'IDLE':'IDLE',lastEvent,visible};
}
export class VirtualClock{
 time=0; rate:0.5|1|1.5=1; playing=true; visible=true;
 advance(deltaMs:number){if(this.playing&&this.visible&&Number.isFinite(deltaMs)&&deltaMs>0)
 this.time+=deltaMs*this.rate;return this.time;}
 pause(){this.playing=false;}
 resume(){this.playing=true;}
 seek(timeMs:number,maxMs:number){this.time=clamp(timeMs,0,maxMs);}
 setVisible(visible:boolean){this.visible=visible;}
}
