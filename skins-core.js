/* SKIN SETS engine. A skin is a list of PIECES, each fitted to a named SOCKET of the active base model (head, chest, back, shoulderL/R, armL/R,
   thighL/R, shinL/R). A socket = { parent: Object3D that animates with the rig, hull: analytic shape } (ell / cyl / box, centre + size in parent space).
   Pieces are built relative to the hull centre with helpers (H.shell / H.pos ...) that always offset from the hull surface, so one skin definition
   fits all five bodies without hand-fitting. After building, the QA pass verifies and auto-corrects every piece:
     CLIP    vertices inside their own hull (snap out along the normal)          DETACHED  parts not connected to the hull (add a tether strut)
     POSE    vertices inside ANOTHER socket's hull at rest / arm-swing / leg-swing poses (nudge away by the penetration)
   Everything a skin creates (meshes, materials, base-material tints) is tracked per root and fully released by clear(). */
(() => {
'use strict';
const AM=window.AshfallModels;if(!AM||!window.THREE)return;
const T=THREE,PI=Math.PI,TAU=PI*2,hub=window.AshfallHubScene;
const defs=[],states=new WeakMap(),LOG=[];
const CLIP_TOL=.02,TOUCH_TOL=.075,EPS=.04,POSE_TOL=.05;

// ---- diagnostic logger -------------------------------------------------------------------------------------------------------------------
function log(level,msg,data){const e={t:+(performance.now()/1000).toFixed(2),level,msg,data};LOG.push(e);if(LOG.length>600)LOG.shift();(level==='error'?console.error:level==='warn'?console.warn:console.info)(`[SKINQA] ${msg}`,data===undefined?'':data)}

// ---- hull maths (all in hull-local space: origin = hull centre) ---------------------------------------------------------------------------------
const swap=(ax,p)=>ax==='x'?[p.y,p.x,p.z]:ax==='z'?[p.x,p.z,p.y]:[p.x,p.y,p.z];
function sdf(h,p){
  if(h.t==='ell'){const q=[p.x/h.r[0],p.y/h.r[1],p.z/h.r[2]],k=Math.hypot(...q),g=Math.hypot(p.x/(h.r[0]*h.r[0]),p.y/(h.r[1]*h.r[1]),p.z/(h.r[2]*h.r[2]))||1e-6;return k*(k-1)/g}
  if(h.t==='cyl'){const [a,b,c]=swap(h.axis,p),rad=Math.hypot(a,c)-h.r,ax=Math.abs(b)-h.h/2;return Math.max(rad,ax)<0?Math.max(rad,ax):Math.hypot(Math.max(rad,0),Math.max(ax,0))}
  const q=[Math.abs(p.x)-h.s[0]/2,Math.abs(p.y)-h.s[1]/2,Math.abs(p.z)-h.s[2]/2];return Math.hypot(Math.max(q[0],0),Math.max(q[1],0),Math.max(q[2],0))+Math.min(Math.max(q[0],q[1],q[2]),0);
}
function surface(h,dir){const d=dir.clone().normalize();
  if(h.t==='ell'){const t=1/Math.hypot(d.x/h.r[0],d.y/h.r[1],d.z/h.r[2]),p=d.clone().multiplyScalar(t),n=new T.Vector3(p.x/(h.r[0]*h.r[0]),p.y/(h.r[1]*h.r[1]),p.z/(h.r[2]*h.r[2])).normalize();return {p,n}}
  if(h.t==='cyl'){const [a,b,c]=swap(h.axis,d),rad=Math.hypot(a,c)||1e-6,tR=h.r/rad,tA=Math.abs(b)>1e-6?(h.h/2)/Math.abs(b):1e9,t=Math.min(tR,tA),p=d.clone().multiplyScalar(t);
    const n=tR<=tA?(()=>{const v=p.clone();if(h.axis==='y')v.y=0;else if(h.axis==='x')v.x=0;else v.z=0;return v.normalize()})():(()=>{const v=new T.Vector3();const s=Math.sign(b);if(h.axis==='y')v.y=s;else if(h.axis==='x')v.x=s;else v.z=s;return v})();return {p,n}}
  const t=Math.min(...[0,1,2].map(i=>{const di=[d.x,d.y,d.z][i];return Math.abs(di)>1e-6?h.s[i]/2/Math.abs(di):1e9})),p=d.clone().multiplyScalar(t),a=[Math.abs(p.x)/(h.s[0]/2),Math.abs(p.y)/(h.s[1]/2),Math.abs(p.z)/(h.s[2]/2)],i=a.indexOf(Math.max(...a)),n=new T.Vector3();n.setComponent(i,Math.sign([p.x,p.y,p.z][i]));return {p,n}}
const FIB=Array.from({length:96},(_,i)=>{const y=1-2*(i+.5)/96,r=Math.sqrt(1-y*y),a=i*2.399963;return new T.Vector3(Math.cos(a)*r,y,Math.sin(a)*r)});
function samples(h){return FIB.map(d=>surface(h,d).p)}
const size=h=>h.t==='ell'?h.r:h.t==='box'?h.s.map(v=>v/2):(h.axis==='y'?[h.r,h.h/2,h.r]:h.axis==='x'?[h.h/2,h.r,h.r]:[h.r,h.r,h.h/2]);

// ---- piece helpers ---------------------------------------------------------------------------------------------------------------------------------
const G={box:(w,h,d)=>new T.BoxGeometry(w,h,d),cyl:(rt,rb,h,s)=>new T.CylinderGeometry(rt,rb,h,s||20),cone:(r,h,s)=>new T.ConeGeometry(r,h,s||12),sph:(r,ws,hs)=>new T.SphereGeometry(r,ws||20,hs||14),tor:(R,t,rs,ts,arc)=>new T.TorusGeometry(R,t,rs||8,ts||32,arc||TAU)};
function helpers(h,group,side,mats,fmap){
  const H={hull:h,side,m:mats,G,size:size(h),fmap};H.R=(H.size[0]+H.size[2])/2*(fmap?.7:1);H.Hh=H.size[1]*2*(fmap?fmap[1]-fmap[0]:1);
  const flag=(o,f)=>{o.userData.q={...(o.userData.q||{}),...(f||{})};return o};
  H.add=(geo,mat,pos,rot,f,scale)=>{const o=new T.Mesh(geo,mat);if(pos)o.position.set(pos[0],pos[1],pos[2]);if(rot)o.rotation.set(rot[0],rot[1],rot[2]);if(scale)o.scale.set(scale[0],scale[1],scale[2]);o.castShadow=o.receiveShadow=true;group.add(o);return flag(o,f)};
  const D=dir=>{const d=new T.Vector3(...dir).normalize();if(fmap&&h.t==='ell'){const f=(1-d.y)/2,f2=fmap[0]+(fmap[1]-fmap[0])*f,y2=1-2*f2,k=Math.sqrt(Math.max(0,1-y2*y2))/Math.max(1e-6,Math.hypot(d.x,d.z));d.set(d.x*k,y2,d.z*k)}return d};
  H.pos=(dir,m=0)=>{const s=surface(h,D(dir));return s.p.add(s.n.multiplyScalar(m))};
  H.nrm=dir=>surface(h,D(dir)).n;
  // orient a mesh so its +y axis points along the surface normal at dir, sitting `m` above the surface
  H.on=(mesh,dir,m=0,f)=>{const s=surface(h,D(dir));mesh.position.copy(s.p).addScaledVector(s.n,m);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),s.n);group.add(mesh);mesh.castShadow=mesh.receiveShadow=true;return flag(mesh,f)};
  H.tether=(a,b,mat,r=.012)=>{const A=new T.Vector3(...a),B=new T.Vector3(...b),L=A.distanceTo(B);const o=new T.Mesh(new T.CylinderGeometry(r,r,L,6),mat);o.position.copy(A).add(B).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),B.clone().sub(A).normalize());group.add(o);return flag(o,{tether:true})};
  // a garment shell wrapped around the hull at margin m. ell: o.phi=[centre,width] (0=front,+=toward +x), o.th=[top,bottom] polar angles.
  // cyl: o.ang=[centre,width], o.y=[y0,y1] as fractions (-.5..+.5) of the length, o.rt scales the top radius.  box: o.face, o.u/o.v cover fractions, o.t thickness.
  H.shell=(mat,o={},f)=>{const m=o.margin??.04;let mesh;
    if(h.t==='ell'){const [c,w]=o.phi||[0,TAU],[t0,t1]=o.th||[0,PI],g=new T.SphereGeometry(1,o.seg||40,o.seg?o.seg/2:24,PI/2+c-w/2,w,t0,t1-t0);mesh=new T.Mesh(g,mat);mesh.scale.set(h.r[0]+m,h.r[1]+m,h.r[2]+m)}
    else if(h.t==='cyl'){const [c,w]=o.ang||[0,TAU],[y0,y1]=o.y||[-.5,.5],r=h.r+m,g=new T.CylinderGeometry(r*(o.rt||1),r*(o.rb||1),(y1-y0)*h.h,o.seg||36,1,!o.caps,c-w/2,w);mesh=new T.Mesh(g,mat);
      const p=new T.Vector3(0,(y0+y1)/2*h.h,0);if(h.axis==='x'){mesh.rotation.z=PI/2;p.set(p.y,0,0)}else if(h.axis==='z'){mesh.rotation.x=PI/2;p.set(0,0,p.y)}mesh.position.copy(p)}
    else{const [w,hh,d]=h.s,t=o.t??.05,u=o.u??1,v=o.v??1,face=o.face||'front';let g,p;
      if(face==='front'||face==='back'){g=new T.BoxGeometry(w*u+2*m,hh*v+2*m,t);p=new T.Vector3(0,0,(face==='front'?1:-1)*(d/2+m+t/2))}
      else if(face==='left'||face==='right'){g=new T.BoxGeometry(t,hh*v+2*m,d*u+2*m);p=new T.Vector3((face==='right'?1:-1)*(w/2+m+t/2),0,0)}
      else{g=new T.BoxGeometry(w*u+2*m,t,d*v+2*m);p=new T.Vector3(0,(face==='top'?1:-1)*(hh/2+m+t/2),0)}
      if(o.all){g=new T.BoxGeometry(w+2*m,hh+2*m,d+2*m);p=new T.Vector3()}mesh=new T.Mesh(g,mat);mesh.position.copy(p)}
    if(o.pos)mesh.position.add(new T.Vector3(...o.pos));mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return flag(mesh,f)};
  return H;
}

// ---- skin registry + application -----------------------------------------------------------------------------------------------------------------------
const register=(i,def)=>{defs[i]=def};
function clear(root){
  const st=states.get(root);if(!st)return;
  for(const p of st.pieces){p.group.parent?.remove(p.group);p.group.traverse(o=>{o.geometry?.dispose?.()})}
  for(const m of st.mats)m.dispose?.();for(const [mesh,orig] of st.tints){mesh.material=orig}for(const m of st.tintMats)m.dispose?.();
  states.delete(root);
}
function tintBase(root,rig,tint,st){
  if(!tint)return;const cache=new Map();
  rig.group.traverse(o=>{if(!o.isMesh||o.userData.skinPiece||!o.material||Array.isArray(o.material))return;
    let c=cache.get(o.material);if(!c){c=o.material.clone();if(tint.color!==undefined)c.color.multiply(new T.Color(tint.color));if(tint.metal!==undefined)c.metalness=tint.metal;if(tint.rough!==undefined)c.roughness=tint.rough;if(tint.map===false)c.map=null;cache.set(o.material,c);st.tintMats.push(c)}
    st.tints.set(o,o.material);o.material=c})}
function tagSkinMaterials(mats){for(const [key,m] of Object.entries(mats||{})){if(!m?.isMaterial)continue;const n=key.toLowerCase();m.userData=m.userData||{};m.userData.colorRole=/glow|led|fiber|node|eye|cyan|pink|blue|green|heart|emissive/.test(n)?'glow':/boot|tread|talon/.test(n)?'boot':/panel|black|dark/.test(n)?'panel':/gold|trim|tendon|ring|wire|steel|chrome|metal|ti/.test(n)?'secondary':'primary';
  // Head modules can provide their own optic surfaces. Mark only explicitly named eye materials,
  // so decorative LEDs on armor do not get blink/saccade behavior.
  if(/^(eye|eyes|lens|visor|optic|optics)$/.test(n))m.userData.eye=n==='visor'?'visor':'led';
}}
function build(root,rig,skinIdx,modelIdx){
  clear(root);const def=defs[skinIdx];if(!def||!rig?.sockets)return null;
  const st={skin:skinIdx,model:modelIdx,rig,pieces:[],mats:[],tints:new Map(),tintMats:[],report:null,upd:[]};states.set(root,st);
  const mats=def.mats?def.mats(AM,st.mats):{};for(const k of Object.keys(mats))if(mats[k]?.isMaterial)st.mats.push(mats[k]);tagSkinMaterials(mats);
  const S={m:mats,has:k=>!!rig.sockets[k],upd:fn=>st.upd.push(fn),
    piece(key,name,fn,side){const sock=LIMB_OFF.has(key)?null:rig.sockets[key];if(!sock)return null;const g=new T.Group();g.name=`skin_${def.id}_${name}`;g.userData.skinPiece=true;const c=sock.hull.c||[0,0,0];g.position.set(c[0],c[1],c[2]);sock.parent.add(g);
      const hull={...sock.hull,c:[0,0,0]};const H=helpers(hull,g,side||0,mats,sock.fmap);fn(H,side||0);g.traverse(o=>{if(o.isMesh)o.userData.skinPiece=true});
      const p={name,key,group:g,hull,parent:sock.parent,home:g.position.clone()};st.pieces.push(p);return p},
    both(base,name,fn){this.piece(base+'L',name+'L',fn,-1);this.piece(base+'R',name+'R',fn,1)}};
  def.build(S,{model:modelIdx,rig});tintBase(root,rig,def.base,st);return st;
}
const moduleKeys={head:key=>key==='head',chest:key=>key==='chest',shoulders:key=>key.startsWith('shoulder'),arms:key=>key.startsWith('arm'),legs:key=>key.startsWith('thigh')||key.startsWith('shin'),back:key=>key==='back'};
function applyMixed(root,rig,modules={},modelIdx=0){
 if(!root||!rig?.sockets)return null;
 const signature=JSON.stringify(Object.fromEntries(Object.entries(modules).map(([k,v])=>[k,Number(v)]))),prior=states.get(root);if(prior?.skin===-2&&prior.rig===rig&&prior.modulesSignature===signature)return prior.report;
 clear(root);const st={skin:-2,model:modelIdx,rig,pieces:[],mats:[],tints:new Map(),tintMats:[],report:null,upd:[],modulesSignature:signature};states.set(root,st);
 for(const [slot,accept] of Object.entries(moduleKeys)){const index=Number(modules[slot]);const def=Number.isInteger(index)?defs[index]:null;if(!def)continue;const mats=def.mats?def.mats(AM,st.mats):{};for(const m of Object.values(mats))if(m?.isMaterial)st.mats.push(m);tagSkinMaterials(mats);
  const S={m:mats,has:k=>!!rig.sockets[k],upd:fn=>st.upd.push(fn),piece(key,name,fn,side){const sock=LIMB_OFF.has(key)?null:rig.sockets[key];if(!sock||!accept(key))return null;const g=new T.Group();g.name=`skin_${def.id}_${name}`;g.userData.skinPiece=true;const c=sock.hull.c||[0,0,0];g.position.set(c[0],c[1],c[2]);sock.parent.add(g);const hull={...sock.hull,c:[0,0,0]},H=helpers(hull,g,side||0,mats,sock.fmap);fn(H,side||0);g.traverse(o=>{if(o.isMesh)o.userData.skinPiece=true});const piece={name,key,group:g,hull,parent:sock.parent,home:g.position.clone()};st.pieces.push(piece);return piece},both(base,name,fn){this.piece(base+'L',name+'L',fn,-1);this.piece(base+'R',name+'R',fn,1)}};
  def.build(S,{model:modelIdx,rig});
 }
 root.updateWorldMatrix(true,true);st.report=qa(root,{fix:true,poses:false});return st.report;
}
function applyCompatible(root,rig,skinIdx,modelIdx=0){if(!root||!rig?.sockets)return null;const idx=Number(skinIdx),old=states.get(root);if(!Number.isInteger(idx)||idx<0||!defs[idx]){if(old)clear(root);return null}if(old?.skin===idx&&old.rig===rig)return old.report;const st=build(root,rig,idx,modelIdx);if(!st)return null;root.updateWorldMatrix(true,true);st.report=qa(root,{fix:true,poses:false});return st.report}
// ---- QA: clipping, detached parts, pose intersections ------------------------------------------------------------------------------------------
const tmpV=new T.Vector3();
function meshVerts(mesh,group,out,limit=500){
  const pos=mesh.geometry.attributes.position;if(!pos)return out;const M=new T.Matrix4().copy(group.matrixWorld).invert().multiply(mesh.matrixWorld),n=pos.count,step=Math.max(1,Math.floor(n/limit));
  for(let i=0;i<n;i+=step){out.push(new T.Vector3().fromBufferAttribute(pos,i).applyMatrix4(M))}return out}
function qaPiece(p,rep,fix){
  p.group.updateWorldMatrix(true,true);const meshes=[];p.group.traverse(o=>{if(o.isMesh)meshes.push(o)});if(!meshes.length)return;
  const data=meshes.map(m=>{const v=meshVerts(m,p.group,[]).filter(x=>Number.isFinite(x.x+x.y+x.z));if(!v.length)return {m,v,bb:new T.Box3(),minD:9,q:{},skip:true};const bb=new T.Box3().setFromPoints(v);return {m,v,bb,minD:Math.min(...v.map(x=>sdf(p.hull,x))),q:m.userData.q||{}}});
  // 1) clipping into the owner hull (mounts may bury a little)
  for(const d of data){if(d.skip)continue;const allow=d.q.mount?-.07:-CLIP_TOL;if(d.minD<allow){const depth=-d.minD+.01,dir=d.bb.getCenter(tmpV.set(0,0,0)).clone();const s=surface(p.hull,dir.lengthSq()?dir:new T.Vector3(0,1,0));
      rep.warnings.push(`${p.name}: ${d.m.name||'mesh'} clips hull by ${(-d.minD).toFixed(3)}`);if(fix){d.m.position.addScaledVector(s.n,depth);d.bb.translate(s.n.clone().multiplyScalar(depth));d.minD+=depth;rep.fixes.push(`${p.name}: snapped out ${depth.toFixed(3)}`)}}}
  // 2) connectivity: everything must reach the hull (directly or through other parts)
  const n=data.length,adj=Array.from({length:n},()=>[]),inside=(a,b)=>{const bb=b.bb;return a.v.some(x=>x.x>=bb.min.x-EPS&&x.x<=bb.max.x+EPS&&x.y>=bb.min.y-EPS&&x.y<=bb.max.y+EPS&&x.z>=bb.min.z-EPS&&x.z<=bb.max.z+EPS)};
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){if(!data[i].bb.clone().expandByScalar(EPS).intersectsBox(data[j].bb))continue;if(inside(data[i],data[j])||inside(data[j],data[i])){adj[i].push(j);adj[j].push(i)}}
  const seen=new Array(n).fill(false),stack=[];data.forEach((d,i)=>{if(d.skip||d.minD<=TOUCH_TOL){seen[i]=true;stack.push(i)}});while(stack.length){const c=stack.pop();for(const o of adj[c])if(!seen[o]){seen[o]=true;stack.push(o)}}
  data.forEach((d,i)=>{if(seen[i]||d.skip)return;const dir=d.bb.getCenter(new T.Vector3()),s=surface(p.hull,dir.lengthSq()?dir:new T.Vector3(0,1,0)),near=d.v.reduce((a,b)=>sdf(p.hull,a)<sdf(p.hull,b)?a:b);
    rep.warnings.push(`${p.name}: ${d.m.name||'mesh'} detached (gap ${d.minD.toFixed(3)})`);if(fix){const t=p.group.parent?null:null;const tr=new T.Mesh(new T.CylinderGeometry(.012,.012,1,6),p.group.userData.tetherMat||new T.MeshStandardMaterial({color:0x303338,metalness:.8,roughness:.4}));const a=near,b=s.p,L=a.distanceTo(b);tr.scale.y=L;tr.position.copy(a).add(b).multiplyScalar(.5);tr.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());tr.userData.q={tether:true};tr.userData.skinPiece=true;p.group.add(tr);rep.fixes.push(`${p.name}: tethered detached ${d.m.name||'mesh'} (${L.toFixed(2)})`)}});
}
const POSES=[{n:'rest',a:0,l:0,z:0},{n:'arms-fwd',a:-.75,l:0,z:0},{n:'arms-back',a:.75,l:0,z:0},{n:'legs-stride',a:0,l:.55,z:.2},{n:'legs-stride-b',a:0,l:-.55,z:-.2}];
function setPose(root,pose){const set=(n,x,z)=>{const o=root.getObjectByName(n);if(o){o.rotation.x=x;o.rotation.z=z}};set('limb0',pose.a,0);set('limb2',-pose.a,0);set('limb1',pose.l,pose.z);set('limb3',-pose.l,-pose.z);AM.update(root,1/60);root.updateMatrixWorld(true)}
function poseCheck(root,st,rep,fix){
  const rig=st.rig,keys=Object.keys(rig.sockets);
  for(const pose of POSES){setPose(root,pose);
    const frames={};for(const k of keys){const s=rig.sockets[k];s.parent.updateWorldMatrix(true,false);frames[k]={inv:new T.Matrix4().copy(s.parent.matrixWorld).invert(),c:new T.Vector3(...(s.hull.c||[0,0,0])),hull:{...s.hull,c:[0,0,0]},world:s.parent.matrixWorld.clone()}}
    const inT=(k,wp)=>{const f=frames[k],l=wp.clone().applyMatrix4(f.inv).sub(f.c);return sdf(f.hull,l)};
    for(const p of st.pieces){
      const base={},gap={};for(const k of keys){if(k===p.key)continue;let pen0=0,g0=1e9;for(const sp of samples(p.hull)){const w=sp.clone().add(new T.Vector3(...(rig.sockets[p.key].hull.c||[0,0,0]))).applyMatrix4(frames[p.key].world);const d=inT(k,w);g0=Math.min(g0,d);pen0=Math.max(pen0,-d)}
        for(const sp of samples(frames[k].hull)){const w=sp.clone().add(frames[k].c).applyMatrix4(frames[k].world);const d=inT(p.key,w);g0=Math.min(g0,d);pen0=Math.max(pen0,-d)}base[k]=pen0;gap[k]=g0}
      p.group.updateWorldMatrix(true,true);const meshes=[];p.group.traverse(o=>{if(o.isMesh)meshes.push(o)});
      for(const k of keys){if(k===p.key)continue;let worst=0;for(const m of meshes){if(m.userData.q?.tether||m.userData.q?.deco)continue;const pos=m.geometry.attributes.position;if(!pos)continue;const step=Math.max(1,Math.floor(pos.count/300));for(let i=0;i<pos.count;i+=step){const w=new T.Vector3().fromBufferAttribute(pos,i).applyMatrix4(m.matrixWorld);worst=Math.max(worst,-inT(k,w))}}
        const allow=(base[k]>.02||gap[k]<.06)?Math.max(base[k],0)+.14:POSE_TOL,over=worst-allow;if(over>0){rep.warnings.push(`${p.name} intersects ${k} hull by ${worst.toFixed(3)} @${pose.n}`);
          if(fix&&(rep.nudges[p.name]||0)>=3&&(rep.scales[p.name]||0)<2){p.group.scale.multiplyScalar(.85);rep.scales[p.name]=(rep.scales[p.name]||0)+1;rep.fixes.push(`${p.name}: scaled to ${(p.group.scale.x*100).toFixed(0)}% to clear ${k} (${pose.n})`)}
          if(fix&&(rep.nudges[p.name]||0)<3){const cw=p.group.getWorldPosition(new T.Vector3()),tc=frames[k].c.clone().applyMatrix4(frames[k].world),dir=cw.sub(tc);if(dir.lengthSq()<1e-6)dir.set(0,1,0);dir.normalize();const target=p.group.getWorldPosition(new T.Vector3()).addScaledVector(dir,over+.01);p.parent.updateWorldMatrix(true,false);p.group.position.copy(p.parent.worldToLocal(target));rep.nudges[p.name]=(rep.nudges[p.name]||0)+1;rep.fixes.push(`${p.name}: nudged ${(over+.01).toFixed(3)} off ${k} (${pose.n})`)}}}}
  }
  setPose(root,POSES[0]);
}
/* FLOAT pass: a skin mesh whose own centre / box corners are all farther than FLOAT_GAP from every visible base-body mesh (measured in each base mesh's local box)
   is floating beside the body, usually because the socket hull is fatter than a thin base limb. Floating meshes are removed together with any pieces only connected to them,
   so the base body shows cleanly instead of hovering cuffs, plates and packs. Parts that touch the body, or are chained to something that does, stay. */
const FLOAT_GAP=.06;
/* Limb sockets carry no skin pieces: the arm / leg cuffs, sleeves and guards hovered around thin limbs, so arms and legs always show the base model. */
const LIMB_OFF=new Set(['armL','armR','thighL','thighR','shinL','shinR']);
function pruneFloating(root,st,rep){
  const base=[];
  root.traverse(o=>{if(!o.isMesh||o.userData?.skinPiece||!o.geometry)return;for(let n=o;n&&n!==root.parent;n=n.parent)if(n.visible===false)return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();const bb=o.geometry.boundingBox;if(!bb||bb.isEmpty())return;base.push({bb,inv:new T.Matrix4().copy(o.matrixWorld).invert(),s:Math.cbrt(Math.abs(o.matrixWorld.determinant()))||1})});
  if(!base.length)return;
  const pt=new T.Vector3(),corner=new T.Vector3(),dist=(w)=>{let best=1e9;for(const b of base){pt.copy(w).applyMatrix4(b.inv);const d=b.bb.distanceToPoint(pt)*b.s;if(d<best){best=d;if(best<=0)break}}return best};
  for(let i=st.pieces.length-1;i>=0;i--){
    const p=st.pieces[i],meshes=[];p.group.updateWorldMatrix(true,true);p.group.traverse(o=>{if(o.isMesh&&o.geometry)meshes.push(o)});if(!meshes.length)continue;
    const info=meshes.map(o=>{if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();const bb=o.geometry.boundingBox,box=new T.Box3().setFromObject(o).expandByScalar(.03);let near=1e9;const c=bb.getCenter(new T.Vector3());near=Math.min(near,dist(c.applyMatrix4(o.matrixWorld)));for(const x of [bb.min.x,bb.max.x])for(const y of [bb.min.y,bb.max.y])for(const z of [bb.min.z,bb.max.z]){corner.set(x,y,z).applyMatrix4(o.matrixWorld);near=Math.min(near,dist(corner))}return{o,box,near}});
    const parent=info.map((_,k)=>k),find=k=>{while(parent[k]!==k)k=parent[k]=parent[parent[k]];return k};
    for(let a=0;a<info.length;a++)for(let b=a+1;b<info.length;b++)if(info[a].box.intersectsBox(info[b].box))parent[find(a)]=find(b);
    const ok=new Set();info.forEach((m,k)=>{if(m.near<=FLOAT_GAP)ok.add(find(k))});
    let removed=0;info.forEach((m,k)=>{if(ok.has(find(k)))return;m.o.parent?.remove(m.o);m.o.geometry.dispose?.();removed++});
    if(removed){rep.fixes.push(`${p.name}: removed ${removed} floating part(s)`);rep.floated=(rep.floated||0)+removed;let left=0;p.group.traverse(o=>{if(o.isMesh)left++});if(!left){p.group.parent?.remove(p.group);st.pieces.splice(i,1)}}
  }
}
function qa(root,opts={}){
  const st=states.get(root),rep={model:st?.model,skin:st?.skin,pieces:st?.pieces.length||0,warnings:[],fixes:[],nudges:{},scales:{},ok:true,ms:0};if(!st)return rep;
  const t0=performance.now(),fix=opts.fix!==false;root.updateMatrixWorld(true);
  for(let pass=0;pass<2;pass++){rep.warnings.length=0;for(const p of st.pieces)qaPiece(p,rep,fix&&pass===0);if(!rep.warnings.length)break}
  if(fix&&opts.float!==false){pruneFloating(root,st,rep);rep.pieces=st.pieces.length}
  const rest=rep.warnings.length;
  if(opts.poses!==false){const before=rep.warnings.length;poseCheck(root,st,rep,fix);if(fix&&rep.warnings.length>before){const w2=rep.warnings.slice(before);rep.warnings.length=before;poseCheck(root,st,rep,false);rep.warnings=rep.warnings.slice(0,before).concat(rep.warnings.slice(before))}}
  rep.ok=rep.warnings.length===0;rep.ms=+(performance.now()-t0).toFixed(1);st.report=rep;
  if(rep.fixes.length)log('info',`auto-corrected ${rep.fixes.length} issue(s) on model ${rep.model} / skin ${defs[rep.skin]?.id}`,rep.fixes.slice(0,8));
  if(!rep.ok)log('warn',`UNRESOLVED on model ${rep.model} / skin ${defs[rep.skin]?.id}`,rep.warnings.slice(0,8));
  return rep}

// ---- interop audit: after clear(), nothing of the previous skin may remain -------------------------------------------------------------------------
function audit(root){const issues=[];root.traverse(o=>{if(o.userData?.skinPiece)issues.push('stray piece '+o.name);if(o.isMesh&&o.material?.userData?.skinMat)issues.push('skin material on '+(o.name||o.type))});if(states.has(root))issues.push('state still registered');if(issues.length)log('error','residual skin data after clear',issues.slice(0,6));return issues}

// ---- model/skin compatibility ---------------------------------------------------------------------------------------------------------------------------
const socketCache={};
function modelSockets(m){if(socketCache[m])return socketCache[m];const def=AM.registry[m];if(!def)return null;const rig=def.build(AM.kit());socketCache[m]=Object.keys(rig.sockets||{});rig.group.traverse(o=>o.geometry?.dispose?.());return socketCache[m]}
function isValid(m,s){if(m===null||m===undefined||s===null||s===undefined||m===''||s==='')return false;m=Number(m);s=Number(s);if(!Number.isInteger(m)||!Number.isInteger(s))return false;if(s<0)return m>=0&&m<AM.registry.length;if(!AM.registry[m]||!defs[s])return false;const have=modelSockets(m)||[];return (defs[s].requires||['chest']).every(k=>have.includes(k))}

// ---- sync hook from the model layer (rebuilds when model or skin changes) -------------------------------------------------------------------------------
function sync(root,p,rig,modelIdx){
 const modules=p?.skinModules&&typeof p.skinModules==='object'?p.skinModules:null;if(modules){applyMixed(root,rig,modules,modelIdx);return}
 const idx=p&&p.skinSet!==undefined?Number(p.skinSet):-1,want=Number.isInteger(idx)&&isValid(modelIdx,idx)?idx:-1,current=states.get(root);
 if(want<0){if(current)clear(root);return}if(current&&current.skin===want&&current.model===modelIdx&&current.rig===rig)return;
 const s=build(root,rig,want,modelIdx);if(s&&api.autoQA){AM.update(root,1/60);root.updateMatrixWorld(true);s.report=qa(root,{fix:true,poses:false})}}function update(root,t){const st=states.get(root);if(!st)return;for(const fn of st.upd)fn(t,st)}

// ---- randomizer ---------------------------------------------------------------------------------------------------------------------------------------------------
const R={bag:[],last:null,quarantine:new Set(),timer:0,history:[],
  combos(){const o=[];for(let m=0;m<AM.registry.length;m++)for(let s=0;s<defs.length;s++)if(defs[s]&&isValid(m,s)&&!R.quarantine.has(m+':'+s))o.push([m,s]);return o},
  refill(){const c=R.combos();for(let i=c.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[c[i],c[j]]=[c[j],c[i]]}if(R.last&&c.length>1&&c[c.length-1][0]===R.last[0]&&c[c.length-1][1]===R.last[1])c.unshift(c.pop());R.bag=c},
  // pick the next valid combination, apply it, QA it, auto-fix; quarantine and skip combos that stay broken
  next(opts={}){for(let tries=0;tries<8;tries++){if(!R.bag.length)R.refill();const pick=R.bag.pop();if(!pick){log('error','randomizer has no valid combinations');return null}const [m,s]=pick;
      if(!isValid(m,s)){log('warn',`skipping invalid combination ${m}:${s}`);continue}
      const root=opts.root||hub?.robot,r=applyCombo(root,m,s,opts);if(!r)continue;if(!r.ok&&opts.strict!==false){R.quarantine.add(m+':'+s);log('warn',`combination ${m}:${s} quarantined after failed QA`,r.warnings.slice(0,4));continue}
      R.last=[m,s];R.history.push([m,s]);if(R.history.length>50)R.history.shift();return {model:m,skin:s,report:r}}return null},
  start(ms=4000){R.stop();R.timer=setInterval(()=>R.next(),ms);log('info',`randomizer loop started (${ms} ms)`)},stop(){if(R.timer){clearInterval(R.timer);R.timer=0;log('info','randomizer loop stopped')}}};
function applyCombo(root,m,s,opts={}){
  if(!root||!isValid(m,s)){log('error',`refused invalid combination ${m}:${s}`);return null}
  if(root===hub?.robot&&window.AshfallRobotCustomizer&&!opts.direct){const pr=AshfallRobotCustomizer.profile;pr.model=String(m);pr.skinSet=String(s);delete pr.skinModules;AshfallRobotCustomizer.persist();const bar=document.querySelector('[data-skinset]');if(bar)bar.value=String(s);const sel=document.querySelector('[data-robot="model"]');if(sel)sel.value=String(m)}
  else AM.apply(root,{model:String(m),skinSet:String(s)});
  const waitFor=()=>states.get(root);if(!waitFor()){/* hub robot rebuilds on the next frame; build now for a synchronous QA */AM.apply(root,{...(root===hub?.robot?AshfallRobotCustomizer.profile:{}),model:String(m),skinSet:String(s)})}
  return qa(root,{fix:true,poses:opts.poses!==false})}

const api={defs,register,clear,build,buildMixed:applyMixed,applyMixed,applyCompatible,sync,update,qa,audit,isValid,applyCombo,randomizer:R,log,getLog:()=>LOG.slice(),autoQA:true,sdf,surface,get names(){return defs.map(d=>d?.name)},states};
window.AshfallSkinSets=api;

// ---- locker UI: skin set select + randomize / loop / QA report ----------------------------------------------------------------------------------
function inject(){const slots=document.querySelector('.robot-slots');if(!slots||slots.nextElementSibling?.classList?.contains('skinset-bar')||document.querySelector('[data-skinset]')||!window.AshfallRobotCustomizer)return;
  const bar=document.createElement('div');bar.className='skinset-bar';bar.style.cssText='display:grid;gap:6px;margin-top:8px';
  bar.innerHTML=`<label class="robot-control">SKIN SET<select data-skinset><option value="-1">NONE / BASE MODEL</option><option value="-2">MIXED / MODULE RANDOMIZER</option>${defs.map((d,i)=>d?`<option value="${i}">${d.name}</option>`:'').join('')}</select></label><div style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" data-skin-random>[ RANDOMIZE ]</button><button type="button" data-skin-loop>[ LOOP: OFF ]</button><button type="button" data-skin-qa>[ QA REPORT ]</button></div><pre data-skin-status style="margin:0;font:11px/1.35 monospace;color:#8effd0;white-space:pre-wrap"></pre>`;
  slots.after(bar);const sel=bar.querySelector('[data-skinset]'),status=bar.querySelector('[data-skin-status]');sel.value=String(AshfallRobotCustomizer.profile.skinSet??-1);
  const show=r=>{status.textContent=r?`${r.ok?'QA OK':'QA ISSUES'} · ${r.pieces} pieces · ${r.fixes.length} auto-fixes · ${r.warnings.length} warnings · ${r.ms} ms`:''};
  sel.onchange=()=>{const v=Number(sel.value),p=AshfallRobotCustomizer.profile;if(v===-2&&p.skinModules){p.skinSet=-2;AshfallRobotCustomizer.persist();return}if(!isValid(Number(p.model||0),v)){log('warn','skin not valid for this model');sel.value='-1';return}delete p.skinModules;p.skinSet=String(v);AshfallRobotCustomizer.persist();setTimeout(()=>show(states.get(hub.robot)?.report||qa(hub.robot,{poses:false})),120)};
  bar.querySelector('[data-skin-random]').onclick=()=>{const r=R.next();show(r?.report)};
  bar.querySelector('[data-skin-loop]').onclick=e=>{if(R.timer){R.stop();e.target.textContent='[ LOOP: OFF ]'}else{R.start(3500);e.target.textContent='[ LOOP: ON ]'}};
  bar.querySelector('[data-skin-qa]').onclick=()=>{const r=qa(hub.robot,{fix:true});show(r);console.table(LOG.slice(-12))}}
new MutationObserver(inject).observe(document.body,{childList:true,subtree:true});
// defaults + look-code carry the skin set
if(window.AshfallParts){AshfallParts.defaults.skinSet='-1'}
})();
