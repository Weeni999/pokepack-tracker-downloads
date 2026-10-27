/* AshfallAnimationRig: semantic skeleton adapters + clip player layered over the procedural rigs.
   - Robot adapter maps the existing procedural pivots (rig.group, legs[].hip/foot, arms[].shoulder/elbow, sockets[].parent) to the semantic skeleton.
   - Chicken adapter maps what the five chicken builders expose today (whole body only) plus any rig.pivots the builders add later.
   - Imported clips (assets/animations/retargeted/<id>.json, made by tools/mixamo_retarget.py) crossfade over a built-in procedural idle; a missing or invalid clip leaves the procedural idle running.
   - Rotation only. Nothing here writes position, scale or the root's world transform. Call update() after the model update and before render. */
(() => {
'use strict';
const T=window.THREE;if(!T)return;
const RIG_VERSION=1,MAP_VERSION='robot-sem-1';
const ROBOT_BONES=['root','hips','spine','chest','neck','head','shoulder_l','shoulder_r','upper_arm_l','upper_arm_r','forearm_l','forearm_r','hand_l','hand_r','thigh_l','thigh_r','shin_l','shin_r','foot_l','foot_r','toe_l','toe_r','backpack_socket','hat_socket','neck_chain_socket'];
const CHICKEN_BONES=['root','pelvis','body','chest','neck','head','beak_socket','comb_socket','wing_upper_l','wing_upper_r','wing_lower_l','wing_lower_r','thigh_l','thigh_r','shin_l','shin_r','foot_l','foot_r','talon_socket_l','talon_socket_r','tail_base','tail_tip','hat_socket','neck_chain_socket','back_socket'];
const SOCKET_ONLY=new Set(['root','backpack_socket','hat_socket','neck_chain_socket','back_socket','beak_socket','comb_socket','talon_socket_l','talon_socket_r']);
const PARENT={hips:null,spine:'hips',chest:'spine',neck:'chest',head:'neck',shoulder_l:'chest',shoulder_r:'chest',upper_arm_l:'shoulder_l',upper_arm_r:'shoulder_r',forearm_l:'upper_arm_l',forearm_r:'upper_arm_r',thigh_l:'hips',thigh_r:'hips',shin_l:'thigh_l',shin_r:'thigh_r',foot_l:'shin_l',foot_r:'shin_r'};
const ADD_BONES=new Set(['upper_arm_l','upper_arm_r','forearm_l','forearm_r','thigh_l','thigh_r','shin_l','shin_r','foot_l','foot_r']);
const entries=new WeakMap(),clips=new Map(),status=new Map(),quarantine=new Set();let manifest=null,manifestP=null;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const finite=(...v)=>v.every(Number.isFinite);

function robotMap(rig){
  const m={},S=rig.sockets||{},arms=rig.arms||[],legs=rig.legs||[];
  m.root=rig.group;m.hips=rig.group;
  const chest=S.chest?.parent,head=S.head?.parent;
  if(chest&&chest!==rig.group){m.spine=chest;m.chest=chest}
  if(head&&head!==rig.group&&head!==chest){m.head=head;m.neck=head}
  ['l','r'].forEach((s,i)=>{
    const a=arms[i],l=legs[i],sh=S['shoulder'+s.toUpperCase()]?.parent;
    if(a?.shoulder)m['upper_arm_'+s]=a.shoulder;
    if(sh&&sh!==rig.group&&sh!==a?.shoulder)m['shoulder_'+s]=sh;
    if(a?.elbow)m['forearm_'+s]=a.elbow;
    if(l?.hip)m['thigh_'+s]=l.hip;
    if(l?.foot)m['foot_'+s]=l.foot;
  });
  m.backpack_socket=S.back?.parent;m.hat_socket=head;m.neck_chain_socket=head;return m;
}
function chickenMap(rig){
  const m={root:rig.group,pelvis:rig.group,body:rig.group,chest:rig.group,back_socket:rig.group,hat_socket:rig.group,neck_chain_socket:rig.group};
  for(const [k,v] of Object.entries(rig.pivots||{}))if(CHICKEN_BONES.includes(k)&&v)m[k]=v;
  return m;
}

function register(root,rig,opt={}){
  if(!root||!rig)return null;
  const species=opt.species||'robot',names=species==='chicken'?CHICKEN_BONES:ROBOT_BONES,raw=species==='chicken'?chickenMap(rig):robotMap(rig),seen=new Set(),bones=[],missing=[];
  for(const n of names){
    const node=raw[n];
    if(!node){missing.push(n);continue}
    if(SOCKET_ONLY.has(n)||seen.has(node))continue;           // one driver per node: the first semantic name that owns it wins
    seen.add(node);bones.push({name:n,node,rest:node.quaternion.clone(),add:ADD_BONES.has(n)});
  }
  const e={root,rig,species,modelId:opt.modelId??'?',rigVersion:opt.rigVersion||RIG_VERSION,bones,missing,map:raw,t:Math.random()*10,clip:null,clipId:null,clipT:0,clipW:0,clipWant:false,speed:1,active:false,w:0,want:.5};
  entries.set(root,e);return e;
}
function rigOf(root,species){return species==='chicken'?window.AshfallChickenModels?.rig?.(root):window.AshfallModels?.rig?.(root)}
function entryFor(root,species){
  const rig=rigOf(root,species);if(!rig)return null;
  let e=entries.get(root);
  if(!e||e.rig!==rig){const was=e;e=register(root,rig,{species,modelId:species==='chicken'?window.AshfallChickenModels?.modelIndex?.(root.userData?.visual,root.userData?.id):window.AshfallModels?.info?.(root)?.index});if(was?.active){e.active=true;e.w=0;e.want=was.want;e.speed=was.speed;e.clipId=was.clipId;if(was.clipId)loadClip(was.clipId).then(c=>{if(c&&entries.get(root)===e){e.clip=c;e.clipWant=true}})}}
  return e;
}

function robotIdle(t,name){const w=Math.PI*2;switch(name){
  case'hips':return[.006*Math.sin(t*w/4.2),.012*Math.sin(t*w/9),.008*Math.sin(t*w/5.1)];
  case'spine':case'chest':return[.014*Math.sin(t*w/3.8-.7),.01*Math.sin(t*w/9-.5),.006*Math.sin(t*w/5.1-.6)];
  case'neck':case'head':return[.012*Math.sin(t*w/3.8-1.2),.07*Math.sin(t*w/11),.01*Math.sin(t*w/6)];
  case'upper_arm_l':return[.03*Math.sin(t*w/3.8-1.0),0,-.015+.01*Math.sin(t*w/5)];
  case'upper_arm_r':return[.03*Math.sin(t*w/3.8-.6),0,.015-.01*Math.sin(t*w/5)];
  case'forearm_l':case'forearm_r':return[.02*Math.sin(t*w/3.8-1.6),0,0];
}return null}
function chickenIdle(t,name){
  const ok=name==='body'||name==='head'||name==='neck'||name.startsWith('wing')||name.startsWith('tail');if(!ok)return null;
  const cyc=(t%6.5)/6.5,pk=cyc>.55&&cyc<.78?Math.sin((cyc-.55)/.23*Math.PI):0,pk2=cyc>.62&&cyc<.74?Math.sin((cyc-.62)/.12*Math.PI)*.5:0,peck=Math.min(1,pk+pk2),look=Math.sin(t*.4),shift=Math.sin(t*.9);
  switch(name){
    case'body':return[.1*peck+.008*Math.sin(t*2),.08*look,.025*shift];
    case'head':case'neck':return[.35*peck,.25*look,0];
    case'wing_upper_l':case'wing_upper_r':return[0,0,(name.endsWith('l')?1:-1)*(.03*Math.sin(t*1.7)+(Math.sin(t*.7)>.93?.1:0))];
    case'tail_base':case'tail_tip':return[-.2*peck+.03*Math.sin(t*1.3),-.08*look,0];
  }return null}
const eq=new T.Euler(),qa=new T.Quaternion(),qb=new T.Quaternion(),qc=new T.Quaternion(),D=new T.Quaternion(),P=new T.Quaternion(),I=new T.Quaternion();
function procQuat(e,name,out){const v=(e.species==='chicken'?chickenIdle:robotIdle)(e.t,name);if(!v)return false;out.setFromEuler(eq.set(v[0],v[1],v[2]));return true}

function validateClip(c){
  const issues=[];if(!c||c.schema!==1||!c.tracks)return['bad schema'];
  if(!(c.duration>0))issues.push('zero duration');
  if(!Object.keys(c.tracks).length)issues.push('no tracks');
  for(const [b,tr] of Object.entries(c.tracks)){
    if(!Array.isArray(tr.t)||!Array.isArray(tr.q)||tr.q.length!==tr.t.length*4||tr.t.length<2){issues.push('malformed track '+b);continue}
    for(let i=0;i<tr.t.length;i++){
      const x=tr.q[i*4],y=tr.q[i*4+1],z=tr.q[i*4+2],w=tr.q[i*4+3];
      if(!finite(x,y,z,w,tr.t[i])||Math.abs(Math.hypot(x,y,z,w)-1)>.01){issues.push('invalid quaternion '+b+'@'+i);break}
      if(i&&tr.t[i]<=tr.t[i-1]){issues.push('non-monotonic time '+b);break}
    }
  }
  return issues;
}
const loadManifest=()=>manifestP||(manifestP=fetch('assets/animations/manifest.json',{cache:'no-cache'}).then(r=>r.ok?r.json():null).then(m=>(manifest=m)).catch(()=>null));
async function loadClip(id){
  if(clips.has(id))return clips.get(id);if(quarantine.has(id))return null;
  const m=await loadManifest(),meta=m?.clips?.find(c=>c.id===id);
  if(!meta){status.set(id,'not-in-manifest');return null}
  if(meta.status!=='ready'){status.set(id,meta.status||'missing');return null}
  try{
    const r=await fetch(meta.runtimeFile,{cache:'no-cache'});if(!r.ok)throw Error('HTTP '+r.status);
    const c=await r.json(),bad=validateClip(c);if(bad.length)throw Error(bad.slice(0,3).join('; '));
    c.meta=meta;clips.set(id,c);status.set(id,'ready');return c;
  }catch(err){quarantine.add(id);status.set(id,'invalid: '+err.message);console.warn('[AnimationRig] clip '+id+' rejected, procedural idle stays:',err.message);return null}
}
function sample(c,name,time,out){
  const tr=c.tracks[name];if(!tr)return false;
  const n=tr.t.length,d=c.duration,t=c.loop?((time%d)+d)%d:Math.min(time,d);let lo=0,hi=n-1;
  while(hi-lo>1){const mid=(lo+hi)>>1;if(tr.t[mid]<=t)lo=mid;else hi=mid}
  const span=tr.t[hi]-tr.t[lo]||1,k=Math.min(1,Math.max(0,(t-tr.t[lo])/span));
  qa.set(tr.q[lo*4],tr.q[lo*4+1],tr.q[lo*4+2],tr.q[lo*4+3]);qb.set(tr.q[hi*4],tr.q[hi*4+1],tr.q[hi*4+2],tr.q[hi*4+3]);out.copy(qa).slerp(qb,k);return true;
}

function play(root,species,opt={}){
  const e=entryFor(root,species);if(!e)return null;
  e.active=true;e.want=opt.fade??.5;e.speed=opt.speed??1;e.clipId=opt.clip||null;e.clipWant=false;
  if(opt.clip)loadClip(opt.clip).then(c=>{if(c&&entries.get(root)===e&&e.clipId===opt.clip){e.clip=c;e.clipWant=true;e.clipT=0;if(opt.speed===undefined)e.speed=c.meta?.playbackSpeed||1}});
  return e;
}
function stop(root){
  const e=entries.get(root);if(!e)return;
  e.active=false;e.clipWant=false;e.clipId=null;e.w=0;e.clipW=0;
  for(const b of e.bones)if(!b.add)b.node.quaternion.copy(b.rest);
}
function update(root,dt,species){
  const e=entries.get(root);if(!e||!e.active)return;
  if(rigOf(root,species)!==e.rig){entryFor(root,species);return}
  dt=Math.min(.1,Math.max(0,dt||0));const rm=reduced();
  e.t+=dt;e.w+=(1-e.w)*Math.min(1,dt/(e.want||.5));e.clipW+=((e.clipWant?1:0)-e.clipW)*Math.min(1,dt/.6);if(e.clip&&e.clipWant)e.clipT+=dt*e.speed;
  const amp=rm?0:e.w,glob=new Map();
  for(const b of e.bones){
    if(!procQuat(e,b.name,D))D.identity();
    if(e.clip&&e.clipW>.001&&!rm&&sample(e.clip,b.name,e.clipT,qc)){
      glob.set(b.name,qc.clone());
      const pg=glob.get(PARENT[b.name]);qa.copy(qc);if(pg)qa.premultiply(P.copy(pg).invert());
      D.slerp(qa,e.clipW);
    }
    if(!finite(D.x,D.y,D.z,D.w))D.identity();
    I.identity();D.slerp(I,1-amp);
    if(b.add)b.node.quaternion.premultiply(D);else b.node.quaternion.copy(b.rest).premultiply(D);
  }
}

function validate(target,species){
  if(target&&target.tracks){const issues=validateClip(target);return{ok:!issues.length,issues}}
  species=species||'robot';const root=target,e=entryFor(root,species);if(!e)return{ok:false,issues:['no rig on root']};
  const issues=[];for(const n of species==='chicken'?['root','body']:['root','hips'])if(!e.map[n])issues.push('missing '+n);
  const p0=root.position.clone(),s0=root.scale.clone(),was=e.active,saveT=e.t,saveW=e.w;e.active=true;e.w=1;
  for(let i=0;i<120;i++)update(root,1/30,species);
  if(root.position.distanceTo(p0)>1e-6)issues.push('root position changed');
  if(root.scale.distanceTo(s0)>1e-6)issues.push('root scale changed');
  for(const b of e.bones){const q=b.node.quaternion;if(!finite(q.x,q.y,q.z,q.w)||Math.abs(q.length()-1)>1e-3)issues.push('bad pose '+b.name)}
  e.t=saveT;e.w=saveW;e.active=was;if(!was)for(const b of e.bones)if(!b.add)b.node.quaternion.copy(b.rest);
  return{ok:!issues.length,species:e.species,modelId:e.modelId,rigVersion:e.rigVersion,driven:e.bones.map(b=>b.name),unmapped:e.missing,issues};
}
setTimeout(()=>{loadClip('robot_menu_idle');loadClip('chicken_menu_idle_ref')},1500);
window.AshfallAnimationRig={registerRig:register,loadClip,play,stop,update,validate,validateClip,status:()=>Object.fromEntries(status),manifest:()=>manifest,BONES:{robot:ROBOT_BONES,chicken:CHICKEN_BONES},MAP_VERSION,RIG_VERSION};
})();
