/* MODEL LIBRARY core: the five base robots (see models-a.js, models-b.js). Replaces the old body/head/limb kit as the sole character base.
   A model is  build(K) => rig  where K is the helper kit below and rig is:
     { group, height, width, legLength,
       legs:[{hip,foot,F,L,restX,restZ}, ...]   index 0 = left (-x), 1 = right (+x); hip = pivot group at the hip, foot = child group at distance F below it, L = hip height
       arms:[{shoulder,restX,restZ}, ...]        same ordering
       wheels:[{mesh,radius}], idle:(t,dt,ctx)=>void }
   The existing locomotion system drives the legs/arms through the hidden stock limbs (limb0..3, boot0/1); update() copies those onto the rig. */
(() => {
'use strict';
if(!window.THREE||!window.AshfallParts)return;
const T=THREE,PI=Math.PI,P=AshfallParts,hub=window.AshfallHubScene;
const NAMES=['HEAVY INDUSTRIAL MECH','SERVICE ORB','CHROME FILIGREE','GAUNT SCAVENGER','BARREL HAULER'];

// ---- procedural weathering textures ------------------------------------------------------------------------------------------------
const rngMk=seed=>{let s=(seed>>>0)||1;return()=>(s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296};
function tex(w,h,seed,paint,linear){const c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d'),w,h,rngMk(seed));const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;if(!linear)t.colorSpace=T.SRGBColorSpace;return t}
const speck=(g,w,h,r,col,n,lo,hi,a)=>{g.fillStyle=col;for(let i=0;i<n;i++){g.globalAlpha=a*(.35+.65*r());const s=lo+(hi-lo)*r();g.fillRect(r()*w,r()*h,s,s*(.4+r()))}g.globalAlpha=1};
const streak=(g,w,h,r,col,n,len,a)=>{g.fillStyle=col;for(let i=0;i<n;i++){const x=r()*w,y=r()*h*.8,l=len*(.3+r()),wd=1+r()*6;for(let s=0;s<l;s+=4){g.globalAlpha=a*(1-s/l)*(.5+.5*r());g.fillRect(x+(r()-.5)*1.5,y+s,wd,4)}}g.globalAlpha=1};
const lines=(g,w,h,col,xs,ys,a,wd)=>{g.strokeStyle=col;g.globalAlpha=a;g.lineWidth=wd||2;for(const x of xs){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke()}for(const y of ys){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke()}g.globalAlpha=1};
const rivets=(g,xs,ys,col,r)=>{g.fillStyle=col;for(const x of xs)for(const y of ys){g.beginPath();g.arc(x,y,r,0,PI*2);g.fill()}};
const fillGrad=(g,w,h,a,b)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,a);gr.addColorStop(1,b);g.fillStyle=gr;g.fillRect(0,0,w,h)};

const TEX={};
function makeTextures(){
  TEX.orange=tex(512,512,11,(g,w,h,r)=>{fillGrad(g,w,h,'#a9531a','#8e4214');speck(g,w,h,r,'#c9742c',900,1,4,.45);                      // painted steel, chipped to bare metal and rust
    for(let i=0;i<70;i++){g.fillStyle='#69706f';g.globalAlpha=.75;const x=r()*w,y=r()*h;g.beginPath();g.ellipse(x,y,2+r()*16,1+r()*8,r()*PI,0,PI*2);g.fill()}g.globalAlpha=1;
    streak(g,w,h,r,'#5a2a10',45,150,.55);streak(g,w,h,r,'#2b1a10',22,200,.4);speck(g,w,h,r,'#2a1a10',500,1,3,.5);lines(g,w,h,'#3a1d0e',[w*.5],[h*.33,h*.66],.5,2);rivets(g,[18,w-18],[18,h*.33-14,h*.33+14,h*.66-14,h*.66+14,h-18],'#4a3a30',4)});
  TEX.steel=tex(512,512,23,(g,w,h,r)=>{fillGrad(g,w,h,'#5d676f','#4b545b');speck(g,w,h,r,'#8d979d',1000,1,3,.4);speck(g,w,h,r,'#2c3236',1000,1,4,.5);
    streak(g,w,h,r,'#6b3b1c',60,170,.5);streak(g,w,h,r,'#1d2327',35,190,.45);lines(g,w,h,'#1f262a',[w*.25,w*.75],[h*.5],.5,3);rivets(g,[16,w-16,w*.5],[16,h-16],'#2a3034',4)});
  TEX.darkRust=tex(512,512,37,(g,w,h,r)=>{fillGrad(g,w,h,'#42464a','#34383c');speck(g,w,h,r,'#6a4126',1200,1,6,.6);speck(g,w,h,r,'#2a2d30',900,1,5,.5);
    streak(g,w,h,r,'#7a3d18',70,180,.6);streak(g,w,h,r,'#16191b',40,200,.5);lines(g,w,h,'#17191b',[w*.33,w*.66],[h*.25,h*.5,h*.75],.6,3);rivets(g,[14,w*.33,w*.66,w-14],[14,h*.25,h*.5,h*.75,h-14],'#6b5a4a',4)});
  TEX.barrel=tex(512,512,41,(g,w,h,r)=>{fillGrad(g,w,h,'#3a3e42','#2c3033');                                                         // staves + hoop bands
    for(let x=0;x<w;x+=w/12){g.fillStyle='rgba(0,0,0,.35)';g.fillRect(x,0,3,h)}for(const y of [h*.12,h*.5,h*.88]){g.fillStyle='#2f3236';g.fillRect(0,y-18,w,36);g.fillStyle='#55595d';g.fillRect(0,y-18,w,3)}
    rivets(g,Array.from({length:12},(_,i)=>i*w/12+w/24),[h*.12,h*.5,h*.88],'#74685a',4);speck(g,w,h,r,'#7a4a28',1400,1,6,.6);streak(g,w,h,r,'#7a3d18',80,190,.65);streak(g,w,h,r,'#111416',45,200,.5)});
  TEX.skeleton=tex(256,256,53,(g,w,h,r)=>{fillGrad(g,w,h,'#5b5750','#48443e');speck(g,w,h,r,'#8a4a20',700,1,4,.6);speck(g,w,h,r,'#25221f',500,1,4,.6);streak(g,w,h,r,'#7a3a16',50,120,.6)});
  TEX.scavBody=tex(512,512,67,(g,w,h,r)=>{fillGrad(g,w,h,'#6f7475','#5a5f60');speck(g,w,h,r,'#979b9a',900,1,3,.3);speck(g,w,h,r,'#4a4f50',900,1,4,.5);                  // rust-streaked grey chassis
    streak(g,w,h,r,'#7b3a17',90,200,.65);streak(g,w,h,r,'#3b2a20',45,220,.5);lines(g,w,h,'#3a3f40',[w*.5],[h*.5],.6,3);rivets(g,[14,w*.5,w-14],[14,h*.5,h-14],'#4a4a48',4)});
  TEX.skin=tex(256,256,71,(g,w,h,r)=>{fillGrad(g,w,h,'#a98277','#97706a');speck(g,w,h,r,'#c9a79c',500,1,3,.3);speck(g,w,h,r,'#6d4a45',400,1,3,.3)});
  TEX.white=tex(256,256,83,(g,w,h,r)=>{g.fillStyle='#efefec';g.fillRect(0,0,w,h);speck(g,w,h,r,'#b9bab8',260,1,3,.25);streak(g,w,h,r,'#9c9e9c',10,60,.18)});
  TEX.visor=tex(512,256,97,(g,w,h)=>{g.fillStyle='#05080c';g.fillRect(0,0,w,h);                                                          // dot-matrix blue LED visor with eyebrows
    g.fillStyle='#2d86ff';g.shadowColor='#4aa0ff';g.shadowBlur=14;for(const cx of [w*.34,w*.66]){for(let y=-3;y<=3;y++)for(let x=-4;x<=4;x++){if(x*x/16+y*y/9>1)continue;g.beginPath();g.arc(cx+x*9,h*.56+y*9,3.6,0,PI*2);g.fill()}}
    g.lineWidth=7;g.lineCap='round';g.strokeStyle='#6cb0ff';for(const s of [-1,1]){g.beginPath();g.moveTo(w*.5+s*w*.09,h*.18);g.lineTo(w*.5+s*w*.25,h*.1);g.stroke()}},false);
  TEX.logo=tex(128,128,101,(g,w,h)=>{g.clearRect(0,0,w,h);g.strokeStyle='#3f8fe0';g.lineWidth=5;g.lineCap='round';g.beginPath();g.arc(64,64,40,0,PI*2);g.stroke();g.fillStyle='#3f8fe0';g.beginPath();g.arc(48,56,6,0,PI*2);g.fill();g.beginPath();g.arc(80,56,6,0,PI*2);g.fill();g.beginPath();g.arc(64,74,16,.15*PI,.85*PI);g.stroke();for(const a of [-1,0,1]){g.beginPath();g.moveTo(64+a*30,18);g.lineTo(64+a*40,6);g.stroke()}});
}

// ---- reflection environment (chrome / gloss need something to reflect): dark studio with soft overhead panels ----------------------------------------
let ENV=null;const MATS=[];
function makeEnv(){
  const c=document.createElement('canvas');c.width=512;c.height=256;const g=c.getContext('2d');
  fillGrad(g,512,256,'#8393a6','#2b333c');g.fillStyle='#3a342e';g.fillRect(0,176,512,80);
  for(const [x,y,w,h,a] of [[30,6,190,46,1],[240,2,140,38,1],[400,8,110,44,1],[110,70,90,30,.7],[320,70,100,30,.6]]){const gr=g.createLinearGradient(x,y,x+w,y+h);gr.addColorStop(0,`rgba(235,244,255,${a})`);gr.addColorStop(1,`rgba(160,180,210,${a*.6})`);g.fillStyle=gr;g.fillRect(x,y,w,h)}
  g.fillStyle='rgba(255,150,70,.7)';g.fillRect(20,150,120,10);g.fillRect(360,152,110,9);
  const t=new T.CanvasTexture(c);t.mapping=T.EquirectangularReflectionMapping;t.colorSpace=T.SRGBColorSpace;
  try{const pm=new T.PMREMGenerator(hub.renderer);ENV=pm.fromEquirectangular(t).texture;pm.dispose()}catch{ENV=null}
  for(const m of MATS){m.envMap=ENV;m.needsUpdate=true}
}
function std(o,physical){const m=physical?new T.MeshPhysicalMaterial(o):new T.MeshStandardMaterial(o);if(ENV)m.envMap=ENV;MATS.push(m);return m}

// ---- builder kit --------------------------------------------------------------------------------------------------------------------------------------------
function kit(){
  const M={
    orange:std({map:TEX.orange,bumpMap:TEX.orange,bumpScale:2.2,roughness:.62,metalness:.35,envMapIntensity:.5}),steel:std({map:TEX.steel,bumpMap:TEX.steel,bumpScale:2,roughness:.5,metalness:.7,envMapIntensity:.8}),
    darkRust:std({map:TEX.darkRust,bumpMap:TEX.darkRust,bumpScale:2.4,roughness:.7,metalness:.55,envMapIntensity:.5}),barrel:std({map:TEX.barrel,bumpMap:TEX.barrel,bumpScale:2.6,roughness:.68,metalness:.5,envMapIntensity:.4}),
    black:std({color:0x15171a,roughness:.55,metalness:.6,envMapIntensity:.6}),rubber:std({color:0x101112,roughness:.9,metalness:.05}),
    chrome:std({color:0xf2f4f7,roughness:.05,metalness:1,envMapIntensity:2.4}),darkChrome:std({color:0xb4bac2,roughness:.14,metalness:1,envMapIntensity:2}),
    skin:std({map:TEX.skin,roughness:.5,metalness:.35,envMapIntensity:.7}),gloss:std({map:TEX.white,roughness:.12,metalness:.05,clearcoat:1,clearcoatRoughness:.05,envMapIntensity:1.2},true),
    glossGrey:std({color:0xb7babd,roughness:.2,metalness:.2,clearcoat:.6,envMapIntensity:1}),visor:std({map:TEX.visor,emissiveMap:TEX.visor,emissive:0xffffff,emissiveIntensity:1.1,roughness:.15,metalness:.2}),
    skel:std({map:TEX.skeleton,bumpMap:TEX.skeleton,bumpScale:1.6,roughness:.65,metalness:.6,envMapIntensity:.5}),scav:std({map:TEX.scavBody,bumpMap:TEX.scavBody,bumpScale:2.2,roughness:.6,metalness:.55,envMapIntensity:.6}),
    wire:std({color:0x24201c,roughness:.7,metalness:.2}),wireRed:std({color:0x5a1f16,roughness:.7,metalness:.1}),brass:std({color:0x8a6a3a,roughness:.5,metalness:.8,envMapIntensity:.6}),
    green:new T.MeshBasicMaterial({color:0x62ff74}),greenGlow:std({color:0x62ff74,emissive:0x34ff55,emissiveIntensity:2.2,roughness:.2,metalness:0}),
    logo:new T.MeshBasicMaterial({map:TEX.logo,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}),
    lamp:new T.MeshBasicMaterial({color:0xfff2c0}),lens:std({color:0x0a0d10,roughness:.05,metalness:.9,envMapIntensity:1.5})
  };
  const roles={primary:['orange','barrel','scav','skel','steel','chrome','gloss'],secondary:['darkRust','darkChrome','glossGrey','wire','wireRed','brass','lens'],panel:['black'],boot:['rubber'],trim:['skin','lamp','logo'],glow:['visor','green','greenGlow']};for(const [role,keys]of Object.entries(roles))for(const key of keys){const m=M[key];if(m?.isMaterial){m.userData=m.userData||{};m.userData.colorRole=role}}for(const [key,kind]of Object.entries({lens:'lens',visor:'visor',green:'led',greenGlow:'led'})){const m=M[key];if(m?.isMaterial){m.userData=m.userData||{};m.userData.eye=kind}}  const add=(p,geo,m,x,y,z,rx,ry,rz)=>{const o=new T.Mesh(geo,m);o.position.set(x||0,y||0,z||0);o.rotation.set(rx||0,ry||0,rz||0);o.castShadow=o.receiveShadow=true;p.add(o);return o};
  const K={M,add,
    box:(p,m,w,h,d,x,y,z,rx,ry,rz)=>add(p,new T.BoxGeometry(w,h,d),m,x,y,z,rx,ry,rz),
    cyl:(p,m,rt,rb,h,x,y,z,rx,ry,rz,seg)=>add(p,new T.CylinderGeometry(rt,rb,h,seg||28),m,x,y,z,rx,ry,rz),
    sph:(p,m,ax,ay,az,x,y,z,seg)=>{const o=add(p,new T.SphereGeometry(1,seg||32,Math.ceil((seg||32)/2)),m,x,y,z);o.scale.set(ax,ay||ax,az||ax);return o},
    cap:(p,m,r,len,x,y,z,rx,ry,rz)=>add(p,new T.CapsuleGeometry(r,len,8,20),m,x,y,z,rx,ry,rz),
    tor:(p,m,R,t,x,y,z,rx,ry,rz)=>add(p,new T.TorusGeometry(R,t,10,40),m,x,y,z,rx,ry,rz),
    // chamfered plate: rounded-rect outline extruded with a bevel (armour panels, pauldrons, hull plates)
    plate:(p,m,w,h,d,bev,x,y,z,rx,ry,rz)=>{const r=Math.min(bev*2.2,w/2.2,h/2.2),s=new T.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
      const g=new T.ExtrudeGeometry(s,{depth:Math.max(.01,d-bev*2),bevelEnabled:true,bevelSize:bev,bevelThickness:bev,bevelSegments:2,curveSegments:6});g.center();const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/ (w+.001)+.5,uv.getY(i)/(h+.001)+.5);return add(p,g,m,x,y,z,rx,ry,rz)},
    lathe:(p,m,pts,x,y,z,seg)=>add(p,new T.LatheGeometry(pts.map(q=>new T.Vector2(q[0],q[1])),seg||40),m,x,y,z),
    tube:(p,m,pts,r,seg)=>{const c=new T.CatmullRomCurve3(pts.map(q=>new T.Vector3(q[0],q[1],q[2])));return add(p,new T.TubeGeometry(c,seg||24,r,6,false),m,0,0,0)},
    group:(p,x,y,z)=>{const g=new T.Group();g.position.set(x||0,y||0,z||0);p.add(g);return g},
    // pivot groups used by rigs
    leg:(hip,foot,F,L,restX,restZ)=>({hip,foot,F,L,restX:restX||0,restZ:restZ||0}),
    arm:(shoulder,restX,restZ,elbow,bend)=>({shoulder,restX:restX||0,restZ:restZ||0,elbow:elbow||null,bend:bend||0})
  };
  return K;
}

// ---- registry / apply / update --------------------------------------------------------------------------------------------------------------------------
const registry=[],cache=new WeakMap();
const register=(i,def)=>{registry[i]=def};
function ensureAssets(){if(!TEX.orange)makeTextures();if(!ENV&&hub?.renderer)makeEnv()}
function dispose(g){g.traverse(o=>{o.geometry?.dispose?.()})}

// ---- part interchange -----------------------------------------------------------------------------------------------------------------------------------
/* profile.model is the default for every slot; profile.parts = {head,torso,arms,legs} (model indices as strings) overrides single slots.
   The torso model is the chassis: its pelvis/chest/back stay, and the head / arms / legs of other models are re-anchored onto it (head to the torso's neck socket,
   arms to its shoulder pivots, legs under its pelvis with the whole torso stack raised or lowered so the feet stay on the floor).
   Limits: the orb has no separable head or legs (it is one dome on wheels), so an orb torso keeps its own head and a donor leg set replaces its wheels; the barrel hauler has no head. */
const PART_KEYS=['head','torso','armL','armR','legL','legR'],TORSO_HIP={1:.45};
function selection(p){
  const n=registry.length,base=Number.isInteger(Number(p?.model))&&p.model!==''&&p.model!==null?Number(p.model):0,b=base>=0&&base<n?base:0,o=p?.parts&&typeof p.parts==='object'?p.parts:{};
  const pick=(...ks)=>{for(const k of ks){const v=o[k];if(v===undefined||v===''||v===null)continue;const i=Number(v);if(Number.isInteger(i)&&i>=0&&i<n)return i}return b};
  const s={head:pick('head'),torso:pick('torso'),armL:pick('armL','arms'),armR:pick('armR','arms'),legL:pick('legL','legs'),legR:pick('legR','legs')};
  if(s.torso===1)s.head=1;else if(s.head===1)s.head=s.torso;                    // the orb dome cannot be moved as a head
  if(s.torso===1){if(s.legL===1&&s.legR!==1)s.legL=s.legR;if(s.legR===1&&s.legL!==1)s.legR=s.legL}   // half a set of wheels is not a pair of legs
  else{if(s.legL===1)s.legL=s.torso;if(s.legR===1)s.legR=s.torso}                // the orb's wheels are not a leg set
  return s;
}
function compose(sel){
  const K=kit(),pure=PART_KEYS.every(k=>sel[k]===sel.torso);
  if(pure){const r=registry[sel.torso].build(K);r.selection={...sel};return r}
  const builds={},get=i=>builds[i]||(builds[i]=registry[i].build(K)),Tr=get(sel.torso),Hr=get(sel.head),Ar=[get(sel.armL),get(sel.armR)],Lg=[get(sel.legL),get(sel.legR)],root=Tr.group;
  const drop=o=>{o.parent?.remove(o);o.traverse(x=>x.geometry?.dispose?.())};
  const tHip=TORSO_HIP[sel.torso]??Tr.legLength,H=Math.max(Lg[0].legLength,Lg[1].legLength),ownLegs=Lg[0]===Tr&&Lg[1]===Tr,dy=ownLegs?0:H-tHip,C=new T.Group();C.name='torsoStack';
  const shoulderPos=(Tr.arms||[]).map(a=>a.shoulder.position.clone()),hipX=(Tr.legs||[]).map(l=>l.hip.position.x),headAnchor=r=>new T.Vector3(...(r.sockets.head.hull.c||[0,3,0]));
  const keepHips=new Set((Tr.legs||[]).filter((l,i)=>Lg[i]===Tr).map(l=>l.hip));
  const wheelSet=new Set((Tr.wheels||[]).map(w=>w.mesh));
  for(const ch of [...root.children]){if(keepHips.has(ch))continue;C.add(ch)}
  root.add(C);C.position.y=dy;
  // orb torso on any donor leg set: remove the wheels and their axle struts
  if(sel.torso===1&&!ownLegs){for(const w of wheelSet)drop(w);for(const ch of [...C.children])if(ch.geometry?.type==='BoxGeometry'&&Math.abs(ch.position.y-.58)<.01)drop(ch)}
  // head
  const off=headAnchor(Tr).sub(headAnchor(Hr));
  if(Hr!==Tr){if(Tr.parts?.head)drop(Tr.parts.head);if(Hr.parts?.head){const hd=Hr.parts.head;C.add(hd);hd.position.add(off)}}
  // arms, per side (the donor's same-side arm keeps its handedness)
  root.updateMatrixWorld(true);
  const arms=[0,1].map(i=>{const D=Ar[i];if(D===Tr)return Tr.arms[i];drop(Tr.arms[i].shoulder);const a=D.arms[i];C.add(a.shoulder);if(shoulderPos[i])a.shoulder.position.copy(shoulderPos[i]);
    const bb=new T.Box3().setFromObject(a.shoulder),h=bb.max.y-bb.min.y,allow=Math.max(.5,a.shoulder.position.y+dy-.05);if(h>allow)a.shoulder.scale.setScalar(Math.max(.45,allow/h));return a});
  // legs, per side; every leg hangs from a wrapper at the common hip height and is stretched so its foot reaches the floor
  const legs=ownLegs&&!(Tr.legs||[]).length?[]:[0,1].map(i=>{const D=Lg[i],l=D===Tr?Tr.legs[i]:D.legs[i],own=D===Tr,x0=own?l.hip.position.x:Math.sign(l.hip.position.x||(i?1:-1))*Math.max(Math.abs(hipX[i]??.35),Math.abs(l.hip.position.x));
    if(!own&&Tr.legs?.[i])drop(Tr.legs[i].hip);const W=new T.Group();W.name='legWrap'+i;W.position.set(x0,H,0);W.scale.y=Math.min(1.7,H/Math.max(.3,D.legLength));root.add(W);W.add(l.hip);l.hip.position.set(0,0,0);return l});
  // sockets
  const mv=(sock,parent,shift)=>{if(!sock)return null;const hull={...sock.hull};if(shift&&hull.c)hull.c=[hull.c[0]+shift.x,hull.c[1]+shift.y,hull.c[2]+shift.z];return {...sock,parent,hull}};
  const inC=(sock,donor)=>sock.parent===donor.group?C:sock.parent;
  const S={};
  S.chest=mv(Tr.sockets.chest,inC(Tr.sockets.chest,Tr));S.back=mv(Tr.sockets.back,inC(Tr.sockets.back,Tr));
  const hs=Hr.sockets.head;S.head=Hr===Tr?mv(hs,inC(hs,Tr)):(Hr.parts?.head?mv(hs,Hr.parts.head):mv(hs,C,off));
  ['L','R'].forEach((side,i)=>{
    const D=Ar[i],sh=D.sockets['shoulder'+side];S['shoulder'+side]=D===Tr?mv(sh,inC(sh,Tr)):mv(sh,C,sh&&shoulderPos[i]?shoulderPos[i].clone().sub(new T.Vector3(...sh.hull.c)):null);
    S['arm'+side]=mv(D.sockets['arm'+side],inC(D.sockets['arm'+side],D));
    const LD=Lg[i];for(const k of ['thigh','shin']){const so=LD.sockets[k+side];if(so)S[k+side]=mv(so,so.parent)}
  });
  for(const k of Object.keys(S))if(!S[k])delete S[k];
  const uniq=[...new Set([Tr,Hr,...Ar,...Lg])],idles=uniq.map(r=>r.idle).filter(Boolean);
  for(const r of uniq)if(r!==Tr)r.group.traverse(x=>x.geometry?.dispose?.());
  return {group:root,height:Math.max(Tr.height+dy,Hr.height?Hr.height-(headAnchor(Hr).y-headAnchor(Tr).y)+dy:0),width:Math.max(Tr.width,(Ar[0].width+Ar[1].width)*.4),legLength:H,legs,arms,wheels:ownLegs?Tr.wheels:[],idle:(t,dt,ctx)=>{for(const f of idles){try{f(t,dt,ctx)}catch{}}},sockets:S,parts:{head:Hr.parts?.head||null},selection:{...sel}};
}
function applyModel(root,p){
  if(!root||!p)return;ensureAssets();
  const sel=selection(p),idx=sel.torso,sig=PART_KEYS.map(k=>sel[k]).join('');
  let st=cache.get(root);
  if(!st){st={idx:-1,rig:null,group:null,last:null,wheel:0};cache.set(root,st);for(const c of [...root.children])if(c.name==='modelRoot'||c.name.startsWith('exo_')){root.remove(c);dispose(c)}}
  if(st.sig!==sig||!st.group){
    if(st.group){root.remove(st.group);dispose(st.group)}
    const rig=compose(sel);rig.group.name='modelRoot';root.add(rig.group);st.idx=idx;st.sig=sig;st.rig=rig;st.group=rig.group;
    if(root===hub?.robot){window.AshfallThirdPerson?.setBody?.({legLength:rig.legLength||.9,scale:(rig.height||3.1)/3.1});window.dispatchEvent(new CustomEvent('ashfall-model-change',{detail:{index:idx,height:rig.height,width:rig.width}}))}
  }
  // Keep only the selected rig visible; name lookup can hit nested parts and leave stock geometry showing through.
  for(const child of root.children)child.visible=child===st.group;
  st.group.visible=true;
  window.AshfallSkinSets?.sync(root,p,st.rig,st.idx);
}
const clampK=v=>Math.min(1.35,Math.max(1,v));
function updateModel(root,dt,locoOverride){
  const st=cache.get(root);if(!st?.rig)return;const rig=st.rig,get=n=>root.getObjectByName(n);
  for(const n of ['robotHat','chainPivot']){const o=get(n);if(o)o.visible=false}
  dt=dt||1/60;const loco=locoOverride||window.AshfallThirdPerson?.loco,still=1-Math.min(1,(loco?.weight||0)*1.2);   // rest pose fades out while moving
  const limbs=[get('limb1'),get('limb3')],armL=[get('limb0'),get('limb2')],boots=[get('boot0'),get('boot1')];
  (rig.legs||[]).forEach((leg,i)=>{
    const l=limbs[i];if(!l)return;const side=i?1:-1,rx=l.rotation.x+leg.restX*still,rz=l.rotation.z+side*leg.restZ*still;
    leg.hip.rotation.set(rx,0,rz);const k=clampK(1/Math.max(.5,Math.cos(rx)*Math.cos(rz)));leg.hip.scale.y=k;
    if(leg.foot){const lift=(boots[i]?boots[i].position.y-.15:0);leg.foot.scale.y=1/k;leg.foot.position.y=(-(leg.F+leg.L*(k-1))+lift)/k}
  });
  (rig.arms||[]).forEach((arm,i)=>{const l=armL[i];if(!l)return;const side=i?1:-1;arm.shoulder.rotation.set(l.rotation.x+arm.restX*still,0,l.rotation.z+side*arm.restZ*still);if(arm.elbow)arm.elbow.rotation.x=arm.bend-Math.max(0,-l.rotation.x)*.7});
  if(rig.wheels?.length){
    const p=root.position;let fwd=0;if(st.last){const dx=p.x-st.last.x,dz=p.z-st.last.z;fwd=dx*Math.sin(root.rotation.y)+dz*Math.cos(root.rotation.y)}st.last=p.clone();
    if(Math.abs(fwd)<5)for(const w of rig.wheels)w.mesh.rotation.x+=fwd/w.radius*(w.dir||1);
  }
  rig.idle?.(performance.now()/1000,dt,{still,loco});window.AshfallSkinSets?.update(root,performance.now()/1000);
}

// UI: model-only locker (no paint / skin / add-on controls in the clean-slate library)
P.names={model:NAMES};P.defaults.model='0';P.matchedKit=()=>({model:'0'});
P.randomProfile=()=>({...P.defaults,model:String(Math.floor(Math.random()*NAMES.length))});
const css=document.createElement('style');css.textContent='.robot-actions,.robot-finish,.skin-studio,.skin-main-select,.skin-lock-button{display:none!important}.robot-slots{grid-template-columns:1fr!important}';document.head.append(css);

window.AshfallModels={selection,compose,std,tex,ensure:ensureAssets,names:NAMES,register,apply:applyModel,update:updateModel,registry,kit,rig:root=>cache.get(root||hub?.robot)?.rig,info(root){const r=cache.get(root||hub?.robot)?.rig;return r?{height:r.height,width:r.width,legLength:r.legLength}:null},get TEX(){return TEX}};
})();
