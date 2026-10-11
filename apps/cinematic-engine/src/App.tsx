import {useEffect,useRef,useState} from 'react';
import Scene3D from './Scene3D';
import {BottomHud,Icon,LeftHud,RightHud} from './Hud';
import {CinematicDirector,type DirectorSnapshot} from './director';
import {AudioDirector} from './audio';
import type {Mode,SceneId,Quality} from './core';

const scenes:{id:SceneId;label:string;tag:string}[]=[
 {id:'BOOT',label:'SYSTEM BOOT',tag:'01'},
 {id:'PROCESSING',label:'AI PROCESSING',tag:'02'},
 {id:'COMMAND',label:'COMMAND CENTER',tag:'03'}
];
const stages=['SIGNAL','ANALYZING','DELEGATING','EXECUTING','VERIFYING','SUCCESS'];
function tickLabel(n:number){const d=new Date(0);d.setUTCMilliseconds(n);return d.toISOString().slice(14,23);}
export default function App(){
 const director=useRef<CinematicDirector>(new CinematicDirector()).current;
 const audio=useRef<AudioDirector>(new AudioDirector()).current;
 const [snapshot,setSnapshot]=useState<DirectorSnapshot>(()=>director.snapshot);
 const [audioEnabled,setAudioEnabled]=useState(false);
 const [controlsOpen,setControlsOpen]=useState(false);
 const [showHud,setShowHud]=useState(true);
 const [clockDate,setClockDate]=useState<Date>(()=>new Date());
 const [rate,setRate]=useState<0.5|1|1.5>(1);
 useEffect(()=>{audio.sync(snapshot);},[audio,snapshot]);
 function refresh(){setSnapshot(director.snapshot);}
 useEffect(()=>{
  const media=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  director.setReducedMotion(!!media?.matches);
  refresh();
  const change=()=>{director.setReducedMotion(!!media?.matches);refresh();};
  media?.addEventListener?.('change',change);
  let frame=0;let prior=performance.now();let update=0;
  function animate(now:number){
   const delta=now-prior;prior=now;
   director.tick(delta);
   if(now-update>32){refresh();update=now;}
   frame=window.requestAnimationFrame(animate);
  }
  frame=window.requestAnimationFrame(animate);
  const visible=()=>{director.setVisible(!document.hidden);prior=performance.now();refresh();};
  document.addEventListener('visibilitychange',visible);
  const timeInterval=window.setInterval(()=>setClockDate(new Date()),1000);
  return ()=>{cancelAnimationFrame(frame);clearInterval(timeInterval);document.removeEventListener('visibilitychange',visible);media?.removeEventListener?.('change',change);};
 },[director]);
 useEffect(()=>{
  const key=(e:KeyboardEvent)=>{
   const target=e.target as HTMLElement | null;
   if(target && /input|textarea|select/i.test(target.tagName))return;
   if(e.key==='1'||e.key==='2'||e.key==='3'){director.setScene(scenes[Number(e.key)-1].id);refresh();}
   else if(e.key===' '){e.preventDefault();snapshot.playing?director.pause():director.play();refresh();}
   else if(e.key.toLowerCase()==='r'){director.replay();refresh();}
  };
  document.addEventListener('keydown',key);
  return ()=>document.removeEventListener('keydown',key);
 },[director,snapshot.playing]);
 const mode=snapshot.mode;
 const coreIntensity=snapshot.phase==='ERROR'?'danger':snapshot.phase==='SUCCESS'?'success':snapshot.phase==='ANALYZING'?'analysis':'normal';
 function changeMode(next:Mode){director.setMode(next);refresh();}
 function selectScene(scene:SceneId){director.setScene(scene);refresh();}
 function chooseQuality(q:Quality){director.setQuality(q);refresh();}
 function run(outcome:'success'|'error'){director.runTask(outcome);refresh();}
 const currentStage=stages.indexOf(snapshot.phase);
 return <div className={'app '+(snapshot.reducedMotion?'reduced ':'')+'scene-'+snapshot.scene.toLowerCase()} data-scene={snapshot.scene} data-mode={mode} data-phase={snapshot.phase}>
  <div className="world-grid"/><div className="atmospheric-glow"/><div className="screen-grain"/>
  <div className="corner-deco corner-tl"/><div className="corner-deco corner-tr"/><div className="corner-deco corner-bl"/><div className="corner-deco corner-br"/>
  <header className="topbar">
   <div className="identity"><div className="brand-mark"><span>J</span><i/></div>
    <div className="brand-copy"><strong>JARVIS<span> / CINEMATIC ENGINE</span></strong><small>FUTURISTIC INTERFACE OPERATING SYSTEM <span className="brand-version">v1.0 DEMO</span></small></div>
   </div>
   <div className="top-stats">
    <div className="top-stat"><small>CORE SYNC</small><span><i className="alive"/> ONLINE</span></div>
    <div className="top-stat"><small>RENDER MODE</small><span>{snapshot.quality}</span></div>
    <div className="top-stat timer"><small>LOCAL TIME</small><span>{clockDate.toLocaleTimeString('en-GB',{hour12:false})}</span></div>
   </div>
   <div className="top-actions"><span className="demo-token"><span className="live-dot"/> SIMULATED DATA</span>
    <button type="button" title="Toggle HUD panels" aria-label="Toggle HUD panels" className="icon-button" onClick={()=>setShowHud(x=>!x)}><Icon type="layers" size={19}/></button>
    <button type="button" title="Display settings" aria-label="Display settings" className={'icon-button '+(controlsOpen?'active':'')} onClick={()=>setControlsOpen(x=>!x)}><Icon type="equalizer" size={19}/></button>
   </div>
  </header>
  <nav className="scene-nav" aria-label="Cinematic scenes">
   <span className="nav-label">SCENE SELECT</span>
   {scenes.map(item=><button key={item.id} type="button" className={snapshot.scene===item.id?'is-current':''} aria-current={snapshot.scene===item.id?'page':undefined} onClick={()=>selectScene(item.id)}><span>{item.tag}</span>{item.label}</button>)}
   <div className="mode-control">
    <button type="button" className={mode==='AUTO_SHOWCASE'?'is-current':''} onClick={()=>changeMode('AUTO_SHOWCASE')}>AUTO SHOWCASE</button>
    <button type="button" className={mode==='INTERACTIVE'?'is-current':''} onClick={()=>changeMode('INTERACTIVE')}>INTERACTIVE</button>
   </div>
  </nav>
  <main className={'main-layout '+(!showHud?'hud-hidden':'')}>
   {showHud&&<LeftHud snapshot={snapshot}/>}
   <section className="stage" aria-label="Cinematic 3D reactor visualization">
    <div className="stage-topline"><span><i/> REACTOR DISPLAY / {snapshot.scene}</span><span className="stage-coordinates">X: 00.427 / Y: 03.019 / Z: 00.012</span></div>
    <div className={'core-container core-'+coreIntensity}>
     <div className="core-ambient"/>
     <div className="core-grid"/>
     <Scene3D snapshot={snapshot}/>
     <div className="reticle" aria-hidden="true">
      <div className="reticle-ring outer"/><div className="reticle-ring middle"/><div className="reticle-ring inner"/>
      <div className="crosshair horizontal"/><div className="crosshair vertical"/>
      <div className="radial-ticks"/>
      <span className="angle-label a1">000°</span><span className="angle-label a2">090°</span><span className="angle-label a3">180°</span><span className="angle-label a4">270°</span>
     </div>
     {snapshot.scene==='BOOT'&&<div className="boot-dialog"><span className="micro-title">SYSTEM INITIALIZATION</span><strong>{snapshot.localTime<900?'ACTIVATING CORE':snapshot.localTime<2000?'ESTABLISHING LINK':snapshot.localTime<3300?'ASSEMBLING HUD':'SYSTEM ONLINE'}</strong><div className="boot-progress"><div style={{width:snapshot.progress+'%'}}/></div><small>{snapshot.progress.toString().padStart(2,'0')}% · CINEMATIC ENGINE</small></div>}
     {snapshot.scene!=='BOOT'&&<div className="core-centerlabel"><span>J / CORE</span><small>{snapshot.status}</small></div>}
     <span className="core-annotation annotation-left"><i/> QUANTUM FIELD<br/>INTEGRITY NOMINAL</span>
     <span className="core-annotation annotation-right">CORE ID / A-108<br/>REACTOR STABLE <i/></span>
    </div>
    <div className="stage-under"><div><span className="status-indicator"/><span>NEURAL CORE</span><strong>{snapshot.status}</strong></div><div><span>INTEGRITY</span><strong>99.8% <small>DEMO</small></strong></div><div><span>PROCESSING</span><strong>{snapshot.phase}</strong></div></div>
    {snapshot.scene==='PROCESSING'&&<div className="stage-process">
      <div className="process-label">ACTIVE AGENT PIPELINE <small>DEMO SESSION</small></div>
      <div className="stage-steps">{stages.map((s,i)=><span key={s} className={i===currentStage?'current':i<currentStage?'done':''}>{String(i+1).padStart(2,'0')}<b>{s}</b></span>)}</div>
    </div>}
    {snapshot.scene==='COMMAND'&&<div className="stage-process"><div className="process-label">COMMAND MATRIX <small>INTERACTIVE AGENT HUB</small></div><div className="command-pills"><span>NETWORK: NOMINAL</span><span>6 DEMO AGENTS</span><span>COHERENCE 98.6%</span></div></div>}
   </section>
   {showHud&&<RightHud snapshot={snapshot} select={id=>{director.selectAgent(id);refresh();}}/>}
  </main>
  <BottomHud snapshot={snapshot} seek={time=>{director.seek(time);refresh();}}/>
  <footer className="transport">
   <div className="transport-brand"><div className="mini-reactor"/><div><b>CINEMATIC DIRECTOR</b><span>SCENE ENGINE <i>●</i> READY</span></div></div>
   <div className="transport-controls">
    <button aria-label="Replay sequence" title="Replay sequence (R)" type="button" className="transport-button" onClick={()=>{director.replay();refresh();}}><Icon type="rewind"/></button>
    <button aria-label={snapshot.playing?'Pause animation':'Play animation'} title="Play or pause (Space)" className="transport-button primary" type="button" onClick={()=>{snapshot.playing?director.pause():director.play();refresh();}}><Icon type={snapshot.playing?'pause':'play'}/></button>
    <button type="button" title="Reset" aria-label="Reset scene" className="transport-button" onClick={()=>{director.reset();refresh();}}><Icon type="reset"/></button>
    <span className="transport-separator"/>
    <button type="button" className="transport-text" onClick={()=>{director.skipIntro();refresh();}}>SKIP INTRO</button>
    <select aria-label="Playback speed" value={rate} onChange={e=>{const value=Number(e.target.value) as 0.5|1|1.5;setRate(value);director.setRate(value);}}>{[.5,1,1.5].map(r=><option value={r} key={r}>{r}× SPEED</option>)}</select>
   </div>
   <div className="transport-right">
    <span className="timeline-clock">{tickLabel(snapshot.time)}</span>
    <button type="button" className="event-trigger success-trigger" onClick={()=>run('success')}><Icon type="bolt" size={14}/> RUN DEMO</button>
    <button type="button" className="event-trigger failure-trigger" onClick={()=>run('error')}>TEST ERROR</button>
   </div>
  </footer>
  {controlsOpen&&<aside className="settings-popover" aria-label="Display and motion settings">
    <header><strong>ENGINE CONFIGURATION</strong><button aria-label="Close settings" onClick={()=>setControlsOpen(false)}>×</button></header>
    <label>RENDER QUALITY<select value={snapshot.quality} onChange={e=>chooseQuality(e.target.value as Quality)}><option>ULTRA</option><option>BALANCED</option><option>LOW</option><option value="SAFE_2D">SAFE 2D</option></select></label>
    <label className="toggle-line"><span>REDUCED MOTION</span><input type="checkbox" checked={snapshot.reducedMotion} onChange={e=>{director.setReducedMotion(e.target.checked);refresh();}}/></label>
    <label className="toggle-line"><span>ENABLE AUDIO (CUE PREVIEW)</span><input type="checkbox" checked={audioEnabled} onChange={e=>{if(e.target.checked){void audio.enable().then(ok=>setAudioEnabled(ok));}else{audio.mute();setAudioEnabled(false);}}}/></label>
    <div className="settings-note">No real AI tools are connected. All telemetry and workflow events are simulated. Audio cues synchronize with incoming simulated events when enabled.</div>
  </aside>}
  <div className="signature">CINEMATIC ENGINE <i> / </i> EXPERIMENTAL INTERFACE LAB</div>
 </div>;
}
