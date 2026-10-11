import {Canvas,useFrame} from '@react-three/fiber';
import {EffectComposer,Bloom} from '@react-three/postprocessing';
import {useMemo,useRef,useState} from 'react';
import * as THREE from 'three';
import {seededRandom} from './core';
import type {DirectorSnapshot} from './director';

function Particles({snapshot}:{snapshot:DirectorSnapshot}){
 const points=useRef<THREE.Points>(null);
 const count=snapshot.quality==='ULTRA'?6500:snapshot.quality==='LOW'?420:2200;
 const geometry=useMemo(()=>{
  const rng=seededRandom(4321);
  const coords=new Float32Array(count*3);
  for(let i=0;i<count;i++){
   const radius=1.8+Math.pow(rng(),.65)*7;
   const a=rng()*Math.PI*2;
   const z=(rng()-.5)*4.5;
   coords[i*3]=Math.cos(a)*radius;
   coords[i*3+1]=Math.sin(a)*radius*.6;
   coords[i*3+2]=z;
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(coords,3));
  return g;
 },[count]);
 useFrame(()=>{
  if(points.current){
   points.current.rotation.z=snapshot.reducedMotion?0:snapshot.time/70000;
   points.current.rotation.x=snapshot.reducedMotion?0:snapshot.time/135000;
  }
 });
 return <points ref={points} geometry={geometry}>
  <pointsMaterial color="#3ecddb" size={.025} sizeAttenuation transparent opacity={.62} depthWrite={false}/>
 </points>;
}

const rings=[
 {r:1.65,t:.016,color:'#25d8e5',rx:0,ry:0,rz:0,speed:.000085},
 {r:1.87,t:.009,color:'#256f92',rx:.6,ry:.08,rz:0,speed:-.00011},
 {r:2.12,t:.013,color:'#63fff2',rx:.17,ry:.3,rz:0,speed:.000065},
 {r:2.43,t:.008,color:'#174966',rx:1.08,ry:-.44,rz:0,speed:.00012},
 {r:2.66,t:.008,color:'#19a9b9',rx:0,ry:0,rz:0,speed:-.00004},
 {r:3.10,t:.006,color:'#236c89',rx:.05,ry:.16,rz:0,speed:.00007},
 {r:3.45,t:.006,color:'#174564',rx:.22,ry:0,rz:0,speed:-.000055}
];
function Reactor({snapshot}:{snapshot:DirectorSnapshot}){
 const group=useRef<THREE.Group>(null);
 const core=useRef<THREE.Mesh>(null);
 const processing=snapshot.scene==='PROCESSING';
 const error=snapshot.phase==='ERROR';
 const intense=processing&&(snapshot.phase==='ANALYZING'||snapshot.phase==='EXECUTING');
 useFrame(()=>{
  const time=snapshot.time;
  if(group.current)group.current.rotation.y=snapshot.reducedMotion?0:Math.sin(time/5800)*.13;
  if(core.current) {
   const scale=snapshot.reducedMotion?1:(1+Math.sin(time/650)*.055)*(intense?1.2:1);
   core.current.scale.setScalar(scale);
  }
 });
 return <group ref={group}>
  <mesh ref={core}>
   <icosahedronGeometry args={[.9,5]}/>
   <meshBasicMaterial color={error?'#ff546d':intense?'#8cfff4':'#35a9b9'} wireframe transparent opacity={.2}/>
  </mesh>
  <mesh><sphereGeometry args={[.57,40,40]}/>
   <meshBasicMaterial color={error?'#ff617b':'#74fff2'} transparent opacity={.9}/>
  </mesh>
  <mesh scale={.69}><sphereGeometry args={[.6,24,24]}/>
   <meshBasicMaterial color="#dcffff"/>
  </mesh>
  {rings.map((ring,i)=><Ring key={i} ring={ring} time={snapshot.time}
   reduced={snapshot.reducedMotion} intense={intense} />)}
  {Array.from({length:64},(_,i)=><mesh key={i}
    rotation={[0,0,i*(Math.PI*2/64)]}
    position={[Math.cos(i*Math.PI*2/64)*2.89,Math.sin(i*Math.PI*2/64)*2.89,0]}>
    <boxGeometry args={[i%8===0?.095:.038,i%8===0?.18:.075,.012]}/>
    <meshBasicMaterial color={i%8===0?'#9ffff4':'#267e93'} transparent opacity={i%8===0?.94:.65}/>
  </mesh>)}
  <pointLight color={error?'#ff456f':'#0cfff0'} intensity={intense?48:26} distance={8} decay={2}/>
 </group>;
}
function Ring({ring,time,reduced,intense}:{ring:typeof rings[number];time:number;reduced:boolean;intense:boolean}){
 const angle=reduced?0:time*ring.speed*(intense?1.65:1);
 return <mesh rotation={[ring.rx,ring.ry,angle]}>
  <torusGeometry args={[ring.r,ring.t,4,180]}/>
  <meshBasicMaterial color={ring.color} transparent opacity={.85} depthWrite={false}/>
 </mesh>;
}
function Scanner({snapshot}:{snapshot:DirectorSnapshot}){
 const active=snapshot.scene==='PROCESSING'&&snapshot.phase!=='SUCCESS'&&snapshot.phase!=='ERROR';
 return <group rotation={[0,0,snapshot.reducedMotion?0:snapshot.time/1300]}>
  {active&&<mesh rotation={[0,0,-.3]}>
   <ringGeometry args={[1.98,2.33,40,1,0,.48]}/>
   <meshBasicMaterial color="#13dacf" side={THREE.DoubleSide} transparent opacity={.16} depthWrite={false}/>
  </mesh>}
  {active&&<mesh><ringGeometry args={[3.02,3.055,90]}/>
   <meshBasicMaterial color="#3af5e5" side={THREE.DoubleSide} transparent opacity={.35}/>
  </mesh>}
 </group>;
}
function Network({snapshot}:{snapshot:DirectorSnapshot}){
 const active=snapshot.scene==='COMMAND'||snapshot.scene==='PROCESSING';
 if(!active)return null;
 return <group position={[0,0,-1.5]}>
  {Array.from({length:6},(_,i)=>{
    const a=i*Math.PI/3;
    return <mesh key={i} position={[Math.cos(a)*4.2,Math.sin(a)*2.9,-.6]}>
     <sphereGeometry args={[i===0?.085:.047,8,8]}/>
     <meshBasicMaterial color={snapshot.selectedAgent===('NEURAL-0'+(i+1))?'#effffc':'#16c9d0'}/>
    </mesh>;
  })}
 </group>;
}
function Contents({snapshot}:{snapshot:DirectorSnapshot}){
 return <>
  <ambientLight intensity={.12}/>
  <Particles snapshot={snapshot}/>
  <Reactor snapshot={snapshot}/>
  <Scanner snapshot={snapshot}/>
  <Network snapshot={snapshot}/>
  {snapshot.quality!=='LOW'&&snapshot.quality!=='SAFE_2D'&&
    <EffectComposer><Bloom intensity={snapshot.quality==='ULTRA'?1.5:.78}
      luminanceThreshold={.18} mipmapBlur/></EffectComposer>}
 </>;
}
export function SafeCore2D({snapshot}:{snapshot:DirectorSnapshot}){
 return <div className="safe-core" aria-label="Safe two-dimensional reactor">
 <div className="safe-ring ring-one"/><div className="safe-ring ring-two"/>
 <div className="safe-ring ring-three"/><div className="safe-nucleus"/>
 <span className="safe-label">{snapshot.phase==='ERROR'?'ERROR':'CORE'}</span>
 </div>;
}
export default function Scene3D({snapshot,onContextLost}:{snapshot:DirectorSnapshot;onContextLost?:()=>void}){
 const [lost,setLost]=useState(false);
 if(snapshot.quality==='SAFE_2D'||lost)return <SafeCore2D snapshot={snapshot}/>;
 return <div className="three-host" aria-hidden="true">
  <Canvas
   dpr={snapshot.quality==='LOW'?[1,1]:[1,2]}
   gl={{alpha:true,antialias:false,powerPreference:'high-performance'}}
   camera={{position:[0,0,10],fov:48,near:.1,far:100}}
   onCreated={({gl})=>{
    gl.domElement.addEventListener('webglcontextlost',(e)=>{e.preventDefault();setLost(true);onContextLost?.();},{once:true});
   }}
   fallback={<SafeCore2D snapshot={snapshot}/>}>
   <Contents snapshot={snapshot}/>
  </Canvas>
 </div>;
}
