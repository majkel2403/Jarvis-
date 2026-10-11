import {useState} from 'react';
import type {DirectorSnapshot} from './director';
import {AUTO_DURATION,BOOT_DURATION,PROCESS_DURATION,COMMAND_DURATION,type SceneId} from './core';

function Icon({type,size=17}:{type:string;size?:number}){
 const paths:Record<string,string>={
 power:'M12 2v10 M6.5 5.5a9 9 0 1 0 11 0',
 play:'m8 5 12 7-12 7V5Z',pause:'M8 5v14 M16 5v14',
 rewind:'m16 4-8 8 8 8 M8 4v16',reset:'M3 11a9 9 0 1 1 2 6 M3 4v7h7',
 expand:'M8 3H3v5 M16 3h5v5 M3 16v5h5 M21 16v5h-5',
 radar:'M12 2a10 10 0 1 0 10 10 M12 12l6-8 M12 6v12 M6 12h12',
 network:'M12 4v6 M5 19l7-9 7 9 M2 19h6 M16 19h6 M9 4h6',
 signal:'M2 16l5-5 4 3 7-9 4 3',equalizer:'M5 20v-8 M11 20V4 M17 20v-12',
 cpu:'M5 5h14v14H5z M9 9h6v6H9z',
 clock:'M12 2a10 10 0 1 1 0 20a10 10 0 0 1 0-20 M12 6v6l4 2',
 scan:'M3 8V4h5 M16 4h5v4 M3 16v4h5 M16 20h5v-4',
 bolt:'m13 2-9 12h7l-1 8 10-12h-7l0-8z',
 layers:'M3 8l9-5 9 5-9 5-9-5z M3 13l9 5 9-5 M3 18l9 5 9-5'
 };
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[type]??paths.cpu}/></svg>;
}
export function Card({title,kicker,icon,children,classname=''}:{title:string;kicker?:string;icon:string;children:React.ReactNode;classname?:string}){
 return <section className={'hud-card '+classname}><header className="card-heading"><span className="card-icon"><Icon type={icon}/></span><div><strong>{title}</strong>{kicker&&<small>{kicker}</small>}</div><span className="heading-dots">•••</span></header><div className="card-body">{children}</div></section>;
}
const agents=['NEURAL-01','VISION-02','SIGNAL-03','VERIFY-04','VECTOR-05','MEMORY-06'];
function Radar({snapshot}:{snapshot:DirectorSnapshot}){
 const rotation=snapshot.reducedMotion?0:(snapshot.time/40)%360;
 return <div className="radar-body"><div className="radar-dial" style={{'--scan-angle':rotation+'deg'} as React.CSSProperties}>
 <span className="radar-line radar-line-x"/><span className="radar-line radar-line-y"/>
 <span className="radar-sweep"/><i className="blip one"/><i className="blip two"/><i className="blip three"/>
 </div><div className="radar-legend"><b>360°</b><small>OMNI SCAN</small><em>ACTIVE</em></div></div>;
}
function Graph({snapshot,select}:{snapshot:DirectorSnapshot;select:(id:string)=>void}){
 return <div className="graph-box"><svg viewBox="0 0 280 145" width="100%" aria-label="Six simulated AI agents">
  {agents.map((a,i)=>{
   const x=140+Math.cos(i*Math.PI/3)*98;
   const y=73+Math.sin(i*Math.PI/3)*53;
   return <g key={a}>
    <line x1="140" y1="73" x2={x} y2={y} stroke="#23657d" strokeWidth=".7" strokeDasharray="2 4"/>
    <circle cx={x} cy={y} r={snapshot.selectedAgent===a?8:5} fill={snapshot.selectedAgent===a?'#a4fff1':'#19a1af'} opacity=".95"/>
    <circle cx={x} cy={y} r="12" stroke="#246c80" strokeWidth=".7" fill="none"/>
    <text x={x} y={y+23} textAnchor="middle" fill="#67a9bc" fontSize="7">{a.split('-')[0]}</text>
   </g>;
  })}
  <circle cx="140" cy="73" r="19" fill="#052835" stroke="#5aeeeb" strokeWidth="1"/>
  <circle cx="140" cy="73" r="5" fill="#9cfff3"/>
 </svg>
 <div className="agent-pills">{agents.slice(0,3).map(a=><button key={a} type="button" className={snapshot.selectedAgent===a?'selected':''} onClick={()=>select(a)}>{a}</button>)}</div></div>;
}
function Wave({phase}:{phase:string}){
 const values=[30,39,27,56,20,65,24,44,31,83,28,54,25,66,33,49,21,63,30,44,24,51,33,69,23,47,31,54,26,39,29];
 return <svg viewBox="0 0 310 95" preserveAspectRatio="none" width="100%" height="90" aria-label={'Demonstration waveform for '+phase}>
  <defs><linearGradient id="waveArea" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#2adee6" stopOpacity=".3"/><stop offset="1" stopColor="#2adee6" stopOpacity="0"/></linearGradient></defs>
  {[20,48,76].map(y=><line key={y} x1="0" y1={y} x2="310" y2={y} stroke="#154052" strokeWidth=".6"/>)}
  <path d={'M0 95 L'+values.map((v,i)=>((i*310)/(values.length-1)).toFixed(1)+' '+v).join(' L')+' L310 95Z'} fill="url(#waveArea)"/>
  <polyline points={values.map((v,i)=>((i*310)/(values.length-1)).toFixed(1)+','+v).join(' ')} fill="none" stroke="#4aeae5" strokeWidth="1.6"/>
 </svg>;
}
export function LeftHud({snapshot}:{snapshot:DirectorSnapshot}){
 return <aside className="hud-column left-hud">
  <Card title="SYSTEM TELEMETRY" kicker="LIVE RENDER STATUS" icon="equalizer">
   <div className="telemetry-list">
    <div><span>CORE STATUS</span><strong className="cyan">{snapshot.status}</strong></div>
    <div><span>ACTIVE SCENE</span><strong>{snapshot.scene}</strong></div>
    <div><span>RENDER PROFILE</span><strong>{snapshot.quality}</strong></div>
    <div><span>EVENT STREAM</span><strong className="cyan">{snapshot.visibleEvents.length.toString().padStart(2,'0')}</strong></div>
   </div>
   <div className="card-foot"><span className="status-dot"/> SIMULATED DIAGNOSTICS <span>DEMO</span></div>
  </Card>
  <Card title="SIGNAL MONITOR" kicker="FREQUENCY ANALYSIS" icon="signal">
   <Wave phase={snapshot.phase}/>
   <div className="wave-stats"><span>FREQ <b>128.4 Hz</b></span><span>GAIN <b>+12.6 dB</b></span><span>MODE <b>DEMO</b></span></div>
  </Card>
  <Card title="RADAR ARRAY" kicker="SPATIAL MONITOR" icon="radar" classname="radar-card">
   <Radar snapshot={snapshot}/>
  </Card>
 </aside>;
}
export function RightHud({snapshot,select}:{snapshot:DirectorSnapshot;select:(id:string)=>void}){
 return <aside className="hud-column right-hud">
 <Card title="NEURAL NETWORK" kicker="AGENT TOPOLOGY / DEMO" icon="network">
  <Graph snapshot={snapshot} select={select}/>
 </Card>
 <Card title="PROCESS DIAGNOSTICS" kicker="SIMULATED TASK ACTIVITY" icon="cpu">
  <div className="pipeline">
   {(['SIGNAL','ANALYZING','DELEGATING','EXECUTING','VERIFYING','SUCCESS'] as const).map((label,i)=>{
    const statuses=['IDLE','SIGNAL','ANALYZING','DELEGATING','EXECUTING','VERIFYING','SUCCESS'];
    const ix=statuses.indexOf(snapshot.phase);
    return <div className={'pipeline-row '+(ix>=i+1?'done':'')} key={label}>
     <span className="pipeline-node"/><span>{label}</span><b>{ix>i+1?'DONE':ix===i+1?'ACTIVE':'—'}</b>
    </div>;
   })}
  </div>
 </Card>
 <Card title="CORE METRICS" kicker="SIMULATED PARAMETERS" icon="layers">
  <div className="metric-bars">{[83,64,91,42].map((v,i)=><div className="metric" key={i}><div><span>{['COHERENCE','INTEGRITY','SIGNAL','RESONANCE'][i]}</span><strong>{v}%</strong></div><div className="bar-track"><div style={{width:v+'%'}}/></div></div>)}</div>
 </Card>
 </aside>;
}
export function BottomHud({snapshot,seek}:{snapshot:DirectorSnapshot;seek:(time:number)=>void}){
 const duration=snapshot.mode==='AUTO_SHOWCASE'?AUTO_DURATION:snapshot.scene==='BOOT'?BOOT_DURATION:snapshot.scene==='PROCESSING'?PROCESS_DURATION:COMMAND_DURATION;
 const [logOpen,setLogOpen]=useState(false);
 return <section className="bottom-hud"><div className="bottom-left">
  <div className="little-label"><Icon type="clock" size={13}/> EVENT LOG <span className="demo-tag">SIMULATED</span></div>
  <button className="log-expander" type="button" onClick={()=>setLogOpen(x=>!x)} aria-expanded={logOpen}>{logOpen?'COLLAPSE':'EXPAND'} LOG</button>
  <div className={'event-log '+(logOpen?'expanded':'')}>
   {snapshot.visibleEvents.length? snapshot.visibleEvents.slice(-4).map(e=><div key={e.eventId}><time>{(e.timeMs/1000).toFixed(1)}s</time><span>{e.kind.toUpperCase().replaceAll('.',' / ')}</span><b>OK</b></div>):
     <div><time>00.0s</time><span>AWAITING SYSTEM EVENTS</span><b>READY</b></div>}
  </div>
 </div>
 <div className="timeline-group"><div className="timeline-meta"><strong>MOTION TIMELINE / REPLAY</strong><span>{(snapshot.time/1000).toFixed(1)}s / {(duration/1000).toFixed(1)}s</span></div>
  <input type="range" aria-label="Seek timeline" min="0" max={duration} step="100" value={Math.min(duration,snapshot.time)} onChange={e=>seek(Number(e.target.value))} style={{'--progress':((Math.min(duration,snapshot.time)/duration)*100)+'%'} as React.CSSProperties}/>
  <div className="timeline-ticks"><span>00:00</span><span>SCAN</span><span>PROCESS</span><span>RENDER</span><span>END</span></div>
 </div></section>;
}
export {Icon};
