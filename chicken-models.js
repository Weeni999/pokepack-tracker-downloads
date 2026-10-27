/* CYBER-POULTRY base library: five full-body chicken models that replace the stock procedural bird. Each build(K) returns
   { group, height, width, length, idle(t,dt,ctx) } with the floor at y=0 and the beak toward +z.
   The selected chicken's visual.model (0-4) chooses the model; birds without one get a stable pick from their id. */
(() => {
'use strict';
const AM=window.AshfallModels,hubScene=window.AshfallHubScene;if(!AM||!hubScene||!window.THREE)return;
const T=THREE,PI=Math.PI,std=AM.std,tex=AM.tex;
const NAMES=['TANKY BOILER MECH','DIGITAL-FACE EGG BOT','ROYAL FILIGREE ANDROID','GAUNT SKELETAL SCAVENGER','ARMORED BIPEDAL MECH'];

// ---- textures ---------------------------------------------------------------------------------------------------------------------------------
const TX={};
function textures(){
  if(TX.ready)return;TX.ready=1;
  TX.face=tex(256,128,201,(g,w,h)=>{const lo=document.createElement('canvas');lo.width=32;lo.height=16;const c=lo.getContext('2d');c.clearRect(0,0,32,16);
    const px=(x,y,col)=>{c.fillStyle=col;c.fillRect(x,y,1,1)};for(const [x,y] of [[15,1],[16,1],[14,2],[15,2],[16,2],[17,2],[16,0],[13,3],[18,3]])px(x,y,'#ff2d1a');   // red comb
    const eye=cx=>{for(let y=3;y<=8;y++)for(let x=cx-3;x<=cx+3;x++){const dx=x-cx,dy=y-5.5;if(dx*dx/10+dy*dy/7<1)px(x,y,'#ffffff')}for(let y=5;y<=7;y++)for(let x=cx-1;x<=cx+1;x++)px(x,y,'#101010')};eye(9);eye(23);
    for(let y=8;y<=13;y++){const hw=Math.max(0,5-Math.abs(y-10)*2);for(let x=16-hw;x<=16+hw;x++)px(x,y,y<10?'#ffb020':'#ff7a10')}                                   // orange beak
    g.fillStyle='#04060a';g.fillRect(0,0,w,h);const d=lo.getContext('2d').getImageData(0,0,32,16).data;g.shadowBlur=6;
    for(let y=0;y<16;y++)for(let x=0;x<32;x++){const i=(y*32+x)*4;const a=d[i+3];g.fillStyle=a?`rgb(${d[i]},${d[i+1]},${d[i+2]})`:'#10141a';g.shadowColor=a?`rgb(${d[i]},${d[i+1]},${d[i+2]})`:'#000';g.beginPath();g.arc(x*8+4,y*8+4,a?3.1:1.5,0,PI*2);g.fill()}});
  TX.decal=tex(128,128,203,(g,w,h)=>{g.clearRect(0,0,w,h);g.strokeStyle='#4f86d6';g.lineWidth=3;g.lineCap='round';g.lineJoin='round';
    g.beginPath();g.ellipse(64,76,30,24,0,0,PI*2);g.stroke();g.beginPath();g.arc(44,44,13,0,PI*2);g.stroke();g.strokeStyle='#e0452f';g.beginPath();g.moveTo(40,32);g.lineTo(44,24);g.lineTo(49,31);g.lineTo(54,25);g.stroke();
    g.strokeStyle='#e8a520';g.beginPath();g.moveTo(31,44);g.lineTo(22,48);g.lineTo(31,50);g.stroke();g.strokeStyle='#4f86d6';g.beginPath();g.moveTo(94,66);g.quadraticCurveTo(110,52,104,74);g.quadraticCurveTo(100,86,90,80);g.stroke();
    g.beginPath();g.moveTo(54,98);g.lineTo(52,112);g.moveTo(74,98);g.lineTo(76,112);g.stroke();g.fillStyle='#4f86d6';g.beginPath();g.arc(40,42,2.5,0,PI*2);g.fill()});
  TX.fili=tex(256,512,211,(g,w,h)=>{g.clearRect(0,0,w,h);g.strokeStyle='#d9b45a';g.fillStyle='#d9b45a';g.lineCap='round';g.lineWidth=5;g.beginPath();g.moveTo(w/2,8);g.lineTo(w/2,h-8);g.stroke();                       // gold openwork: rib, barbs, scrolls
    g.lineWidth=3.5;for(let y=40;y<h-30;y+=34){const k=1-Math.abs(y/h-.5)*.9;for(const s of [-1,1]){g.beginPath();g.moveTo(w/2,y);g.quadraticCurveTo(w/2+s*70*k,y-10,w/2+s*(98*k),y+38);g.stroke();g.beginPath();g.arc(w/2+s*(46*k),y+14,9*k,0,PI*1.6);g.stroke()}}
    g.lineWidth=5;g.beginPath();g.ellipse(w/2,h/2,w/2-9,h/2-9,0,0,PI*2);g.stroke()});
  TX.tread=tex(128,128,213,(g,w,h,r)=>{g.fillStyle='#16181a';g.fillRect(0,0,w,h);for(let x=0;x<w;x+=16){g.fillStyle='#2a2d30';g.fillRect(x+1,0,12,h);g.fillStyle='#07080a';g.fillRect(x+13,0,3,h)}for(let i=0;i<400;i++){g.fillStyle='rgba(120,70,40,.25)';g.fillRect(r()*w,r()*h,2,2)}});
  TX.tread.repeat.set(6,1);
}
const MATS={};
function materials(K){
  if(MATS.ready)return MATS;MATS.ready=1;const M=K.M;
  Object.assign(MATS,{
    gold:std({color:0xcfa84e,roughness:.28,metalness:1,envMapIntensity:1.6}),
    fili:std({map:TX.fili,color:0xffffff,roughness:.3,metalness:1,alphaTest:.4,side:T.DoubleSide,envMapIntensity:1.6}),
    filiChrome:std({map:TX.fili,color:0xdfe5ec,roughness:.12,metalness:1,alphaTest:.4,side:T.DoubleSide,envMapIntensity:1.8}),
    leaf:std({color:0xdfe3e8,roughness:.1,metalness:1,side:T.DoubleSide,envMapIntensity:2}),
    ruby:std({color:0x7a0010,emissive:0xff2040,emissiveIntensity:1.1,roughness:.1,metalness:.3}),sapphire:std({color:0x00105a,emissive:0x2a60ff,emissiveIntensity:1.1,roughness:.1,metalness:.3}),
    velvet:std({color:0x6a0a1a,roughness:.9,metalness:0}),
    tread:std({map:TX.tread,roughness:.85,metalness:.3}),
    face:std({map:TX.face,emissiveMap:TX.face,emissive:0xffffff,emissiveIntensity:1.4,roughness:.2,metalness:.2}),
    decal:new T.MeshBasicMaterial({map:TX.decal,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}),
    bone:std({color:0x40382d,roughness:.88,metalness:.3,envMapIntensity:.25}),
    heart:std({color:0x300000,emissive:0xff1010,emissiveIntensity:2.4,roughness:.3}),
    cage:std({color:0x9aa2aa,roughness:.35,metalness:1,envMapIntensity:1.2}),
    lampGlow:new T.MeshBasicMaterial({color:0xfffbe8}),wireDark:M.wire,black:M.black
  });
  return MATS;
}

// ---- builder kit ---------------------------------------------------------------------------------------------------------------------------------
function tools(K){
  const {add}=K,V=T.Vector3,UP=new V(0,1,0);
  return {
    // capsule/cylinder bone between two points
    bone(p,m,a,b,r,r2,seg){const A=new V(...a),B=new V(...b),L=A.distanceTo(B),o=new T.Mesh(new T.CylinderGeometry(r2??r,r,L,seg||10),m);o.position.copy(A).add(B).multiplyScalar(.5);o.quaternion.setFromUnitVectors(UP,B.clone().sub(A).normalize());o.castShadow=o.receiveShadow=true;p.add(o);return o},
    ball(p,m,pt,r){return K.sph(p,m,r,r,r,pt[0],pt[1],pt[2],14)},
    // flat leaf plate along +y (filigree wings/tails); UVs normalised so the openwork texture maps cleanly
    leaf(p,m,len,wid,x,y,z,rx,ry,rz){const s=new T.Shape();s.moveTo(0,0);s.bezierCurveTo(wid*.7,len*.12,wid*.62,len*.62,0,len);s.bezierCurveTo(-wid*.62,len*.62,-wid*.7,len*.12,0,0);const g=new T.ShapeGeometry(s,14),uv=g.attributes.uv,pos=g.attributes.position;for(let i=0;i<uv.count;i++)uv.setXY(i,pos.getX(i)/wid+.5,pos.getY(i)/len);return add(p,g,m,x,y,z,rx,ry,rz)},
    fan(p,m,n,len,wid,from,to,ox){const out=[];for(let i=0;i<n;i++){const t=n===1?0:i/(n-1),a=from+(to-from)*t,L=len*(1-.28*Math.abs(t-.5)*1.4),lf=this.leaf(p,m,L,wid,0,0,0,0,0,0);lf.rotation.order='ZXY';lf.rotation.x=a;lf.rotation.z=(ox||0)*(t-.5);out.push(lf)}return out},
    track(p,x,y,z,len,h,w,mats,K2){const g=K.group(p,x,y,z),top=h/2-.02;K.box(g,mats.tread,w,.06,len-h,0,top,0);K.box(g,mats.tread,w,.06,len-h,0,-top,0);
      for(const s of [-1,1]){const e=K.cyl(g,mats.tread,h/2,h/2,w,0,0,s*(len-h)/2,0,0,PI/2,24)}const n=Math.max(3,Math.round(len/.45));for(let i=0;i<n;i++){const zz=-(len-h)/2+i*(len-h)/(n-1);K.cyl(g,K2.steel,h*.27,h*.27,w+.06,0,-.02,zz,0,0,PI/2,16);K.cyl(g,K2.black,h*.1,h*.1,w+.1,0,-.02,zz,0,0,PI/2,8)}
      for(const s of [-1,1]){K.cyl(g,K2.steel,h*.33,h*.33,w+.08,0,0,s*(len-h)/2,0,0,PI/2,20);K.tor(g,K2.darkRust,h*.33,.03,s>0?w/2+.04:-w/2-.04,0,s*(len-h)/2,0,PI/2,0)}return g}
  };
}

// ---- models ---------------------------------------------------------------------------------------------------------------------------------------
const BUILD=[];

// 0 ------------------------------------------------ TANKY BOILER MECH: riveted rusted boiler on crawler tracks, headlamp nose, helmeted head, flatbed rail
BUILD[0]=(K,X,Mt)=>{const {M,box,cyl,sph,tor,group,plate,lathe}=K,g=new T.Group(),R=.92,cy=1.5,len=2.6;
  cyl(g,M.barrel,R,R,len,0,cy,-.1,PI/2,0,0,56);
  for(const s of [-1,1]){const zc=-.1+s*len/2;sph(g,M.darkRust,R*.96,R*.96,.42,0,cy,zc+s*.05,40);tor(g,M.darkRust,R*.97,.06,0,cy,zc,0,0,0)}
  for(const z of [-1.0,-.4,.25,.85]){tor(g,M.darkRust,R+.012,.055,0,cy,z,0,0,0);for(let i=0;i<22;i++){const a=i*PI*2/22;sph(g,M.brass,.032,.032,.032,Math.sin(a)*(R+.05),cy+Math.cos(a)*(R+.05),z,6)}}
  for(let i=0;i<10;i++){const a=i*PI*2/10+.16;box(g,M.darkRust,.03,.03,len*.98,Math.sin(a)*(R+.006),cy+Math.cos(a)*(R+.006),-.1,0,0,-a)}
  box(g,M.darkRust,1.7,.26,2.6,0,.82,-.1);
  // headlamp housing, glowing lens, mechanical nose beak + gun-barrel detail
  cyl(g,M.steel,.4,.36,.55,0,cy+.05,1.55,PI/2,0,0,28);tor(g,M.darkRust,.38,.06,0,cy+.05,1.84,0,0,0);cyl(g,Mt.lampGlow,.3,.3,.05,0,cy+.05,1.86,PI/2,0,0,24);for(let i=0;i<8;i++){const a=i*PI/4;cyl(g,M.brass,.025,.025,.06,Math.sin(a)*.4,cy+.05+Math.cos(a)*.4,1.84,PI/2,0,0,6)}
  cyl(g,M.darkRust,0,.2,.55,0,cy-.5,1.62,PI/2,0,0,16);cyl(g,M.black,.1,.1,.5,0,cy-.55,1.45,PI/2,0,0,12);box(g,M.steel,.4,.28,.14,0,cy-.62,1.25);for(let i=-2;i<=2;i++)box(g,M.black,.03,.2,.03,i*.07,cy-.62,1.33);
  // chicken head on the boiler: riveted helmet, goggles, beak, comb
  cyl(g,M.darkRust,.26,.34,.5,0,2.28,.9,.3,0,0,20);sph(g,M.steel,.4,.42,.44,0,2.62,1.02,28);plate(g,M.darkRust,.62,.34,.1,.04,0,2.8,.78,-.5,0,0);for(const s of [-1,1]){tor(g,M.brass,.12,.03,s*.17,2.68,1.42,0,0,0);cyl(g,M.lens,.1,.1,.05,s*.17,2.68,1.43,PI/2,0,0,16);sph(g,M.brass,.03,.03,.03,s*.34,2.58,1.2,6)}
  cyl(g,M.steel,0,.17,.5,0,2.52,1.5,PI/2-.2,0,0,14);for(const [z,h] of [[.92,.3],[1.05,.38],[1.18,.26]])sph(g,M.orange,.07,h,.15,0,2.98+h*.3,z,10);
  // flatbed with railing along the spine
  box(g,M.darkRust,1.5,.07,1.7,0,2.46,-.55);for(const [x,z] of [[-.72,-1.38],[.72,-1.38],[-.72,.28],[.72,.28],[-.72,-.55],[.72,-.55],[0,-1.38]]){cyl(g,M.steel,.022,.022,.34,x,2.66,z,0,0,0,6)}
  for(const [w,d,x,z] of [[1.5,.03,0,-1.38],[1.5,.03,0,.28],[.03,1.7,-.72,-.55],[.03,1.7,.72,-.55]]){box(g,M.steel,w,.03,d,x,2.82,z);box(g,M.steel,w,.025,d,x,2.64,z)}
  // crawler tracks with suspension linkages
  const trk=X.track;for(const s of [-1,1]){trk(g,s*1.0,.45,-.1,3.2,.9,.52,Mt,M);box(g,M.darkRust,.16,.7,3.0,s*.82,.95,-.1);for(const z of [-1,.8]){cyl(g,M.black,.07,.07,.7,s*.78,.85,z,0,0,s*.35,8);cyl(g,M.steel,.1,.1,.35,s*.78,.65,z,0,0,s*.35,8)}}
  cyl(g,M.steel,.09,.09,.7,.4,cy+.5,-1.6,0,0,0,10);cyl(g,M.black,.12,.12,.12,.4,cy+.88,-1.6,0,0,0,10);for(const [x,a] of [[-.3,.25],[0,0],[.3,-.25]])box(g,M.darkRust,.34,.5,.06,x,cy+.2,-1.5,-.3,0,a);
  return {group:g,height:3.05,width:2.5,length:3.7,idle(t,dt,c){const s=c.moving?c.speed*.35*dt:0;Mt.tread.map.offset.x-=s;Mt.lampGlow.color.setScalar(.92+.08*Math.sin(t*3))}}};

// 1 ------------------------------------------------ DIGITAL-FACE EGG BOT: glossy white egg, LED face, mascot decal, filigree wing flaps, crawler treads
BUILD[1]=(K,X,Mt)=>{const {M,box,cyl,sph,tor,group,lathe,add}=K,g=new T.Group(),BY=1.45,wings=[];
  const eggMat=M.gloss.clone();eggMat.emissive=new T.Color(0x2c2c2c);eggMat.emissiveIntensity=1;eggMat.map=null;eggMat.color=new T.Color(0xf4f4f1);eggMat.roughness=.2;const pts=[];for(let i=0;i<=40;i++){const t=PI*i/40;pts.push([Math.max(.001,.95*Math.sin(t)*(1-.09*Math.cos(t))),BY+1.1*Math.cos(t)])}pts.reverse();lathe(g,eggMat,pts,0,0,0,64);
  tor(g,M.glossGrey,.9,.014,0,BY+.62,0,PI/2,0,0);for(const s of [-1,1])cyl(g,M.glossGrey,.05,.05,.1,s*.9,BY+.62,0,0,0,PI/2,10);
  // LED matrix face in a dark bezel on the upper front curve
  const rim=new T.SphereGeometry(.975,48,24,PI/2-.7,1.4,.62,.72);add(g,rim,M.black,0,BY+.07,0).scale.set(1,1.1,1);const vg=new T.SphereGeometry(.98,48,24,PI/2-.6,1.2,.7,.54);add(g,vg,Mt.face,0,BY+.07,0).scale.set(1,1.1,1);
  const dec=new T.Mesh(new T.CircleGeometry(.24,32),Mt.decal);dec.position.set(-.9,BY-.55,.35);dec.rotation.y=-PI/2+.38;g.add(dec);
  // swept-back filigree wings (pivots for the idle flap)
  for(const s of [-1,1]){const w=group(g,s*.92,BY+.2,-.05);cyl(w,M.glossGrey,.09,.09,.16,0,0,0,0,0,PI/2,14);const fan=group(w,0,0,0);X.fan(fan,Mt.leaf,6,1.7,.5,-PI/2-.5,-PI/2+.55,s*.5);X.fan(fan,Mt.fili,6,1.62,.46,-PI/2-.5,-PI/2+.55,s*.5).forEach(l=>l.translateZ(.014));fan.rotation.z=s*-.55;fan.children.forEach(c=>{c.scale.x=1});
    X.bone(w,M.chrome,[0,0,0],[s*.25,.1,-.35],.045);wings.push({g:w,s})}
  // compact crawler treads under the shell
  for(const s of [-1,1]){X.track(g,s*.62,.34,0,1.5,.68,.38,Mt,M);box(g,M.glossGrey,.18,.3,.9,s*.5,.72,0)}
  box(g,M.black,.9,.2,.8,0,.62,0);
  return {group:g,height:2.7,width:3.0,length:2.3,idle(t,dt,c){for(const w of wings)w.g.rotation.z=Math.sin(t*2+w.s)*.04*w.s;Mt.tread.map.offset.x-=c.moving?c.speed*.4*dt:0;Mt.face.emissiveIntensity=1.3+.2*Math.sin(t*5)}}};

// 2 ------------------------------------------------ ROYAL FILIGREE ANDROID: chrome + gold chicken, jewelled crown, filigree wings and tail, slender chrome legs
BUILD[2]=(K,X,Mt)=>{const {M,box,cyl,sph,tor,group,cap,tube,add}=K,g=new T.Group(),flap=[];
  const torso=group(g,0,1.95,0);torso.rotation.x=.22;sph(torso,M.chrome,.8,.74,1.12,0,0,0,56);add(torso,new T.SphereGeometry(1,44,30,PI/2-1.2,2.4,.28,2.0),Mt.fili,0,0,0).scale.set(.83,.77,1.16);
  for(let i=0;i<5;i++)for(const s of [-1,1]){X.leaf(torso,Mt.leaf,.7-i*.05,.3,s*.62,.3-i*.17,.2-i*.08,-1.8,0,s*(.55+i*.1));X.leaf(torso,Mt.fili,.62-i*.05,.26,s*.63,.3-i*.17,.21-i*.08,-1.8,0,s*(.55+i*.1))}
  const neckPts=[[0,2.4,.7],[0,2.7,1.15],[0,3.1,1.25],[0,3.45,1.05],[0,3.65,.95]];tube(g,M.chrome,neckPts,.17,36);for(const p of [[0,2.78,1.18],[0,3.05,1.25],[0,3.35,1.12],[0,3.58,1.0]])tor(g,Mt.gold,.19,.03,p[0],p[1],p[2],PI/2-.25,0,0);
  sph(g,M.chrome,.27,.29,.4,0,3.82,.95,36);X.bone(g,Mt.gold,[0,3.74,1.25],[0,3.66,1.78],.13,0,16);for(const s of [-1,1]){sph(g,M.black,.06,.06,.06,s*.19,3.9,1.12,12);tor(g,Mt.gold,.07,.016,s*.2,3.9,1.14,0,PI/2,0)}
  for(const [y,z,h] of [[4.08,.82,.14],[4.06,.95,.2],[4.02,1.08,.12]])sph(g,Mt.ruby,.05,h,.09,0,y+h*.3,z,8);sph(g,Mt.ruby,.05,.16,.06,0,3.62,1.3,8);
  const crown=group(g,0,4.12,.92);cyl(crown,Mt.gold,.32,.27,.18,0,0,0,0,0,0,28);sph(crown,Mt.velvet,.26,.16,.26,0,.12,0,18);for(let i=0;i<5;i++){const a=i*PI*2/5,p=[Math.sin(a)*.3,.17,Math.cos(a)*.3];cyl(crown,Mt.gold,0,.08,.26,p[0],p[1]+.09,p[2],0,0,0,8);sph(crown,i%2?Mt.sapphire:Mt.ruby,.045,.045,.045,p[0],p[1]+.25,p[2],10)}
  for(const r of [0,PI/2]){const arch=tor(crown,Mt.gold,.26,.022,0,.15,0,0,r,0);arch.geometry=new T.TorusGeometry(.26,.022,8,24,PI);arch.rotation.set(0,r,0)}sph(crown,Mt.gold,.07,.07,.07,0,.46,0,12);cyl(crown,Mt.gold,.015,.015,.14,0,.58,0,0,0,0,6);for(let i=0;i<10;i++){const a=i*PI/5;sph(crown,i%2?Mt.sapphire:Mt.ruby,.03,.03,.03,Math.sin(a)*.315,-.02,Math.cos(a)*.315,8)}
  for(const s of [-1,1]){const w=group(g,s*.78,2.15,-.1);const fan=group(w,0,0,0);X.fan(fan,Mt.leaf,7,2.0,.58,-PI/2-.7,-PI/2+.65,s*.7);X.fan(fan,Mt.fili,7,1.92,.52,-PI/2-.7,-PI/2+.65,s*.7).forEach(l=>l.translateZ(.014));fan.rotation.set(0,s*-.25,s*-.55);flap.push({g:w,s})}
  const tail=group(g,0,2.2,-1.0);X.fan(tail,Mt.leaf,9,2.3,.62,-1.5,-.12,.9);X.fan(tail,Mt.fili,9,2.2,.56,-1.5,-.12,.9).forEach(l=>l.translateZ(.014));X.fan(tail,Mt.fili,5,1.4,.4,-1.35,-.25,.5);
  for(const s of [-1,1]){const x=s*.4,hip=[x,1.55,.1],knee=[x,1.1,.6],ankle=[x,.62,.2],toe=[x,.14,.5];X.ball(g,M.chrome,hip,.2);X.bone(g,M.chrome,hip,knee,.15,.1);X.ball(g,Mt.gold,knee,.12);X.bone(g,M.chrome,knee,ankle,.1,.065);X.ball(g,M.chrome,ankle,.08);X.bone(g,M.chrome,ankle,toe,.055,.045);tor(g,Mt.gold,.12,.02,x,1.33,.36,PI/2-.6,0,0);tor(g,Mt.gold,.075,.016,x,.4,.19,PI/2-.2,0,0);
    for(const a of [-.4,0,.4]){const e=[x+Math.sin(a)*.6,.04,.5+Math.cos(a)*.55];X.bone(g,M.chrome,toe,e,.04,.025,8);cyl(g,Mt.gold,0,.035,.16,e[0]+Math.sin(a)*.06,.06,e[2]+Math.cos(a)*.08,PI/2+.5,a,0,6)}X.bone(g,M.chrome,toe,[x,.05,-.2],.04,.022,8);cyl(g,Mt.gold,0,.03,.14,x,.06,-.26,-PI/2+.3,0,0,6)}
  return {group:g,height:4.6,width:3.3,length:3.9,idle(t,dt,c){for(const f of flap)f.g.rotation.z=Math.sin(t*1.6+f.s)*.03*f.s;tail.rotation.y=Math.sin(t*1.2)*.03}}};

// 3 ------------------------------------------------ GAUNT SKELETAL SCAVENGER: avian skull with green optic, open ribcage and red core, wired limbs
BUILD[3]=(K,X,Mt)=>{const {M,box,cyl,sph,tor,group,cap,tube,add}=K,g=new T.Group(),bone=Mt.bone,rnd=(()=>{let s=3;return()=>(s=(s*16807)%2147483647)/2147483647})();
  // pelvis + curved spine of vertebrae
  box(g,M.skel,.6,.16,.36,0,1.5,0);box(g,bone,.5,.2,.3,0,1.62,.02);const spine=[[0,1.65,0],[0,1.9,.1],[0,2.2,.18],[0,2.5,.26],[0,2.75,.34]];for(let i=0;i<spine.length-1;i++){const a=spine[i],b=spine[i+1];for(let k=0;k<4;k++){const t=k/4;cyl(g,bone,.06,.07,.08,a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t,.3,0,0,10)}}
  // ribcage: open rings around the spine, sternum, glowing red heart with vessels
  for(let i=0;i<7;i++){const y=1.82+i*.13,R=.3+.16*Math.sin(i/6*PI*.92),z=.08+i*.035;const rb=add(g,new T.TorusGeometry(R,.026,6,26,PI*2-1.1),bone,0,y,z);rb.rotation.order='YXZ';rb.rotation.set(PI/2,-(PI/2+.55),0);rb.scale.set(1,1,.82)}
  cyl(g,bone,.03,.03,.82,0,2.3,.42,.28,0,0,8);sph(g,Mt.heart,.13,.15,.13,0,2.2,.2,16);tube(g,M.wireRed,[[0,2.34,.2],[.1,2.5,.18],[.16,2.62,.1]],.025);tube(g,M.wireRed,[[0,2.34,.2],[-.1,2.46,.2],[-.14,2.6,.12]],.02);tube(g,M.wire,[[.1,2.1,.2],[.2,1.9,.1],[.15,1.7,.05]],.018);
  // neck of vertebrae, avian skull with long beak, glowing green optic and wire crest
  for(let i=0;i<9;i++){const t=i/8,p=[0,2.78+t*.62,.36+Math.sin(t*1.6)*.4];cyl(g,bone,.05-.008*t,.06-.008*t,.06,p[0],p[1],p[2],.5-t*.6,0,0,10)}
  sph(g,bone,.24,.28,.42,0,3.58,.8,28);X.bone(g,bone,[0,3.52,1.12],[0,3.34,1.72],.13,.014,12);X.bone(g,bone,[0,3.44,1.05],[0,3.3,1.5],.08,.01,10);sph(g,M.black,.15,.16,.16,.2,3.64,1.0,16);add(g,new T.SphereGeometry(.13,20,16),M.greenGlow,.21,3.64,1.07);tor(g,bone,.15,.024,.22,3.64,1.04,0,PI/2,0);add(g,new T.SphereGeometry(.13,20,16),M.greenGlow,-.21,3.64,1.07);sph(g,M.black,.15,.16,.16,-.2,3.64,1.0,16);add(g,new T.SphereGeometry(.13,20,16),M.greenGlow,-.21,3.64,1.07);
  for(let i=0;i<8;i++){const a=(i-3.5)*.14;tube(g,i%2?M.wire:M.skel,[[a*.2,3.7,.7],[a*1.2,3.95+rnd()*.15,.55],[a*2.4,4.05+rnd()*.15,.2],[a*3.2,3.88,-.1-rnd()*.1]],.01)}
  // long jointed arms with clawed hands and wired legs
  for(const s of [-1,1]){const sh=[s*.42,2.62,.18],el=[s*.62,2.0,.3],wr=[s*.55,1.4,.62];X.ball(g,Mt.bone,sh,.09);X.bone(g,bone,sh,el,.04,.032);X.ball(g,M.skel,el,.06);X.bone(g,bone,el,wr,.03,.026);X.ball(g,M.skel,wr,.05);
    for(const a of [-.3,0,.3]){const e=[wr[0]+Math.sin(a)*.3,wr[1]-.28,wr[2]+.18+Math.cos(a)*.05];X.bone(g,bone,wr,e,.014,.007,6)}X.bone(g,bone,wr,[wr[0]-s*.2,wr[1]-.18,wr[2]+.1],.014,.007,6);
    tube(g,M.wire,[[sh[0],sh[1]-.05,sh[2]+.04],[el[0]+.05,el[1],el[2]+.06],[wr[0],wr[1]+.1,wr[2]+.04]],.011);
    const x=s*.28,hip=[x,1.5,.0],kn=[x,1.0,.4],an=[x,.5,.02],toe=[x,.1,.42];X.ball(g,Mt.bone,hip,.08);X.bone(g,bone,hip,kn,.045,.035);X.ball(g,M.skel,kn,.06);X.bone(g,bone,kn,an,.035,.03);X.ball(g,M.skel,an,.05);X.bone(g,bone,an,toe,.025,.02);tube(g,M.wire,[[x+.05,1.45,.04],[x+.08,1.0,.4],[x+.04,.5,.06]],.011);
    for(const a of [-.35,0,.35]){X.bone(g,bone,toe,[x+Math.sin(a)*.35,.03,.42+Math.cos(a)*.38],.02,.01,6)}X.bone(g,bone,toe,[x,.05,-.1],.02,.01,6)}
  for(let i=0;i<6;i++)tube(g,i%3?M.wire:M.wireRed,[[(i-2.5)*.08,1.52,.1],[(i-2.5)*.12+(rnd()-.5)*.1,1.25,.18+rnd()*.1],[(i-2.5)*.14+(rnd()-.5)*.1,.95+rnd()*.15,.12]],.011);
  return {group:g,height:4.1,width:2.0,length:2.4,idle(t){M.greenGlow.emissiveIntensity=2+.8*Math.sin(t*4);Mt.heart.emissiveIntensity=2.2+1.2*Math.max(0,Math.sin(t*5))}}};

// 4 ------------------------------------------------ ARMORED BIPEDAL MECH CHICKEN: orange/grey plate hen, wire-cage helmet, shock-absorber legs, claw feet
BUILD[4]=(K,X,Mt)=>{const {M,box,cyl,sph,tor,group,plate,tube,add}=K,g=new T.Group();
  const body=group(g,0,1.95,-.05);body.rotation.x=.14;plate(body,M.orange,1.5,1.05,1.9,.12,0,0,0);plate(body,M.steel,.14,.85,1.35,.05,.8,-.05,-.1);plate(body,M.steel,.14,.85,1.35,.05,-.8,-.05,-.1);
  for(const s of [-1,1])for(let i=0;i<3;i++)plate(body,M.darkRust,.1,.18,.4,.03,s*.88,.2-i*.28,-.1);box(body,M.darkRust,1.2,.2,1.5,0,-.55,0);
  for(const [y,z,r] of [[.35,-1.1,.12],[.1,-1.2,.2],[-.15,-1.2,.26]])plate(body,M.orange,1.2-(.35-y),.34,.08,.03,0,y+.2,z,-.55-r,0,0);                                 // armoured tail shingles
  for(let i=0;i<10;i++)sph(body,M.brass,.03,.03,.03,-.55+(i%5)*.28,.52,.6-Math.floor(i/5)*.9,6);
  // neck: hydraulic column in an orange collar
  cyl(g,M.steel,.27,.3,.6,0,2.55,.85,.45,0,0,20);for(const s of [-1,1])cyl(g,M.black,.05,.05,.7,s*.22,2.55,.95,.45,0,0,8);plate(g,M.orange,.62,.3,.1,.04,0,2.7,1.0,.45,0,0);
  // head: orange + grey, articulated beak, comb, protective wire cage
  const head=group(g,0,3.02,1.18);sph(head,M.orange,.38,.4,.44,0,0,0,28);plate(head,M.steel,.5,.22,.1,.04,0,.24,.1,-.4,0,0);for(const s of [-1,1]){tor(head,M.steel,.1,.025,s*.18,.06,.4,0,0,0);cyl(head,M.lens,.08,.08,.05,s*.18,.06,.42,PI/2,0,0,14)}
  X.bone(head,M.steel,[0,-.05,.38],[0,-.12,.86],.16,.012,4);X.bone(head,M.darkRust,[0,-.2,.34],[0,-.2,.7],.1,.012,4);for(const [z,h] of [[-.1,.3],[.04,.4],[.18,.28]])plate(head,M.orange,.08,h,.14,.03,0,.45+h*.2,z,0,0,0);
  const cg=group(head,0,0,.05),CR=.58;for(let i=0;i<4;i++){const a=.35+i*.4;tor(cg,Mt.cage,CR*Math.sin(a+.0),.012,0,CR*Math.cos(a),0,PI/2,0,0)}for(let i=0;i<7;i++){const a=i*PI/7;const m=add(cg,new T.TorusGeometry(CR,.012,6,20,PI),Mt.cage,0,0,0);m.rotation.y=a;m.rotation.x=0}tor(cg,Mt.cage,CR*.8,.016,0,-.28,0,PI/2,0,0);
  // legs: thigh armour, hydraulic shock absorbers, shins, heavy clawed footpads
  for(const s of [-1,1]){const x=s*.55,hip=[x,1.5,0],kn=[x,1.0,.5],an=[x,.45,.12];X.ball(g,M.steel,hip,.3);plate(g,M.orange,.42,.95,.5,.07,x,1.2,.28,.55,0,0);X.ball(g,M.darkRust,kn,.2);cyl(g,M.steel,.22,.22,.5,x,1.0,.5,0,0,PI/2,18);X.bone(g,M.steel,kn,an,.14,.1);plate(g,M.orange,.3,.4,.1,.04,x,.82,.46,.2,0,0);
    X.bone(g,M.black,[x+s*.18,1.38,.2],[x+s*.18,.92,.5],.05,.05,8);X.bone(g,M.steel,[x+s*.18,1.22,.3],[x+s*.18,.72,.4],.035,.035,8);X.bone(g,M.black,[x-s*.18,.75,.45],[x-s*.18,.3,.16],.05,.05,8);X.ball(g,M.steel,an,.12);box(g,M.darkRust,.42,.12,.6,x,.1,.4);
    for(const a of [-.4,0,.4]){const p=[x+Math.sin(a)*.5,.06,.7+Math.cos(a)*.35];X.bone(g,M.steel,[x,.1,.4],p,.07,.05,8);cyl(g,M.steel,0,.06,.2,p[0]+Math.sin(a)*.06,.07,p[2]+Math.cos(a)*.1,PI/2+.4,a,0,6)}X.bone(g,M.steel,[x,.1,.22],[x,.07,-.2],.06,.04,8);cyl(g,M.steel,0,.05,.18,x,.07,-.28,-PI/2+.3,0,0,6)}
  return {group:g,height:3.45,width:2.2,length:3.0,idle(t){}}};

// ---- registry / apply / update ------------------------------------------------------------------------------------------------------------------------
const cache=new WeakMap();let K=null;
const hashId=s=>{let h=2166136261;s=String(s||'');for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return Math.abs(h>>>0)};
function ensure(){if(K)return true;try{AM.ensure?.();textures();K=AM.kit();K.X=tools(K);materials(K)}catch(e){console.error('[chicken-models]',e);K=null;return false}return true}
function modelIndex(v,id){let i=Number(v?.model);if(!Number.isInteger(i)||i<0||i>=BUILD.length)i=hashId(id||v?.id||'')%BUILD.length;return i}
function makeSockets(rig,index){const g=rig.group,E=(c,r)=>({t:'ell',c,r}),C=(c,r,h,axis='y')=>({t:'cyl',c,r,h,axis}),B=(c,s)=>({t:'box',c,s});const heads=[[0,2.62,1.05],[0,1.52,.25],[0,3.62,.1],[0,3.58,.8],[0,3.02,1.18]],chests=[[0,1.5,-.1],[0,1.45,0],[0,1.95,0],[0,2.18,0],[0,1.95,-.05]],radii=[[.92,.92,1.35],[.92,1.0,.85],[.8,.74,1.05],[.48,.48,.32],[.84,.62,.9]],hc=heads[index],cc=chests[index],cr=radii[index],side=index===3?.38:.55;rig.sockets={head:{parent:g,hull:E(hc,[index===2?.4:.36,index===3?.28:.34,index===0?.48:.42])},chest:{parent:g,hull:E(cc,cr)},back:{parent:g,hull:B([cc[0],cc[1],cc[2]-cr[2]],[Math.min(1.5,cr[0]*1.7),Math.max(.6,cr[1]*1.7),.16])},shoulderL:{parent:g,hull:E([-side,cc[1]+cr[1]*.35,0],[.24,.24,.24])},shoulderR:{parent:g,hull:E([side,cc[1]+cr[1]*.35,0],[.24,.24,.24])},armL:{parent:g,hull:C([-side*1.25,cc[1]-.18,.05],.14,.55)},armR:{parent:g,hull:C([side*1.25,cc[1]-.18,.05],.14,.55)}};return rig}
function rebuildChickenParts(st,visual){
  const catalog=window.AshfallChickenParts?.names||{},keys=['body','head','wings','legs','tail'];
  const ids=Object.fromEntries(keys.map(k=>{const n=catalog[k]?.length||25;return[k,Math.max(0,Math.min(n-1,Number(visual?.[k])||0))]})),signature=JSON.stringify(ids);
  if(st.partSignature===signature&&st.customParts)return;
  if(st.customParts){st.group.remove(st.customParts);st.customParts.traverse(o=>{o.geometry?.dispose?.();if(o.material?.userData?.chickenModule)o.material.dispose?.()})}
  const group=new T.Group();group.name='chickenModularParts';st.group.add(group);st.customParts=group;st.partSignature=signature;
  const mat=(role,color,metalness=.72,roughness=.38)=>{const m=new T.MeshStandardMaterial({color,metalness,roughness});m.userData.colorRole=role;m.userData.chickenModule=true;return m};
  const mats={primary:mat('primary',0x60735f),secondary:mat('secondary',0x9ca797),trim:mat('trim',0xb68a4d),boot:mat('boot',0x895433),glow:mat('glow',0x55ff70,.35,.24)};
  const mesh=(parent,geo,material,p,s,r)=>{const o=new T.Mesh(geo,material);o.position.set(...p);o.scale.set(...s);if(r)o.rotation.set(...r);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o};
  const variant=k=>({family:ids[k]%5,tier:Math.floor(ids[k]/5)}),sockets=st.rig.sockets;
  // Interchangeable breast shells: 25 catalog entries resolve to five silhouettes and five armor-density levels.
  {const {family,tier}=variant('body'),h=sockets.chest.hull,c=h.c||[0,1.5,0],r=h.r||[.7,.7,.6],rows=2+family,scale=.72+tier*.075;for(let i=0;i<rows;i++){const t=rows===1?0:i/(rows-1)-.5,w=r[0]*(.62+scale*.28)*(1-Math.abs(t)*.22),height=Math.max(.12,r[1]*(.18+tier*.025)),depth=.075+family*.012;mesh(group,new T.BoxGeometry(1,1,1),i%2?mats.secondary:mats.primary,[c[0],c[1]+t*r[1]*.9,c[2]+r[2]*.86+depth*.35],[w*2,height*2,depth],[0,0,(i%2?1:-1)*.04]);for(const side of [-1,1])mesh(group,new T.SphereGeometry(.035+family*.004,8,6),mats.trim,[c[0]+side*w*.72,c[1]+t*r[1]*.9,c[2]+r[2]*.86+depth*.8],[1,1,1])}}
  // Head kits: comb, eye guard and beak armor attach to the measured head socket on every chicken chassis.
  {const {family,tier}=variant('head'),h=sockets.head.hull,c=h.c||[0,2.5,0],r=h.r||[.36,.34,.4],count=1+family,len=.16+tier*.035;for(let i=0;i<count;i++){const x=(i-(count-1)/2)*Math.min(.18,r[0]*.7);mesh(group,new T.ConeGeometry(.085+family*.008,len,5),i%2?mats.trim:mats.primary,[c[0]+x,c[1]+r[1]+len*.38,c[2]],[1,1,1],[0,0,(i-count/2)*.08])}mesh(group,new T.ConeGeometry(.11+tier*.012,.3+family*.035,5),mats.trim,[c[0],c[1]-.12,c[2]+r[2]+.13],[1,1,1],[Math.PI/2,0,0]);mesh(group,new T.BoxGeometry(.26+family*.025,.055,.07),mats.glow,[c[0],c[1]+.02,c[2]+r[2]+.045],[1,1,1])}
  // Wing kits use the shoulder sockets so every chassis receives a matched left/right assembly.
  {const {family,tier}=variant('wings'),count=1+family,stretch=.72+tier*.12;for(const side of [-1,1]){const sock=sockets[side<0?'shoulderL':'shoulderR'],c=sock.hull.c||[side*.5,1.7,0];for(let i=0;i<count;i++){const spread=(i-(count-1)/2)*.13,geo=new T.ConeGeometry(.11+family*.01,.48*stretch,5);mesh(group,geo,i%2?mats.secondary:mats.primary,[c[0]+side*(.12+i*.075),c[1]+spread,c[2]+.12],[1,1,1],[0,0,side*Math.PI/2]);mesh(group,new T.BoxGeometry(.08,.045,.06),mats.trim,[c[0]+side*(.12+i*.075),c[1]+spread,c[2]+.17],[1,1,1])}}}
  // Talon kits: armored boots and index-dependent claw counts at floor level.
  {const {family,tier}=variant('legs'),boot=.3+tier*.025,toes=2+family;for(const side of [-1,1]){const x=side*.36;mesh(group,new T.CylinderGeometry(.12+family*.012,.18+family*.012,boot,7),mats.boot,[x,boot*.6,.16],[1,1,1]);mesh(group,new T.BoxGeometry(.28+family*.025,.12,.34+tier*.025),mats.secondary,[x,.1,.28],[1,1,1]);for(let i=0;i<toes;i++){const dx=(i-(toes-1)/2)*.12;mesh(group,new T.ConeGeometry(.045,.22+tier*.025,4),mats.trim,[x+dx,.065,.48+Math.max(0,.12-Math.abs(dx))],[1,1,1],[Math.PI/2,0,0])}}}
  // Tail fans mount behind the body socket; every entry changes fan count and spread.
  {const {family,tier}=variant('tail'),sock=sockets.back,c=sock.hull.c||[0,1.4,-.5],count=2+family,spread=.32+tier*.06;for(let i=0;i<count;i++){const t=count===1?0:i/(count-1)-.5;mesh(group,new T.ConeGeometry(.09+family*.006,.45+tier*.04,5),i%2?mats.secondary:mats.primary,[c[0]+t*spread,c[1]+Math.abs(t)*.12,c[2]-.18],[1,1,1],[Math.PI/2,0,t*.55]);mesh(group,new T.SphereGeometry(.035,7,5),mats.glow,[c[0]+t*spread,c[1]+Math.abs(t)*.12,c[2]-.4-tier*.02],[1,1,1])}}
}
function apply(root,visual,id){
  if(!root||!ensure())return;const idx=modelIndex(visual,id);let st=cache.get(root);
  if(!st){st={idx:-1,group:null,rig:null,last:null,customParts:null,partSignature:''};cache.set(root,st);for(const c of [...root.children])if(c.name==='chickenModel'){root.remove(c);c.traverse(o=>o.geometry?.dispose?.())}}
  if(st.idx!==idx||!st.group){if(st.group){root.remove(st.group);st.group.traverse(o=>o.geometry?.dispose?.())}
    const Mt={...MATS};Mt.tread=MATS.tread.clone();Mt.tread.map=TX.tread.clone();Mt.tread.map.needsUpdate=true;Mt.face=MATS.face.clone();Mt.lampGlow=MATS.lampGlow.clone();Mt.heart=MATS.heart.clone();
    const roleMap={gold:'secondary',fili:'primary',filiChrome:'secondary',leaf:'primary',ruby:'glow',sapphire:'glow',velvet:'primary',tread:'boot',face:'glow',decal:'trim',bone:'secondary',heart:'glow',cage:'secondary',lampGlow:'glow',wireDark:'secondary',black:'panel'};for(const [key,role]of Object.entries(roleMap)){const m=Mt[key];if(m?.isMaterial){m.userData=m.userData||{};m.userData.colorRole=role}}const rig=makeSockets(BUILD[idx](K,K.X,Object.assign(Mt,{brass:K.M.brass})),idx);rig.group.name='chickenModel';root.add(rig.group);st.idx=idx;st.rig=rig;st.group=rig.group;st.customParts=null;st.partSignature='';
    window.dispatchEvent(new CustomEvent('ashfall-chicken-model',{detail:{index:idx,height:rig.height,width:rig.width,length:rig.length,root:root===hubScene.bird}}))}
  for(const c of root.children)if(c!==st.group)c.visible=false;
  rebuildChickenParts(st,visual||{});
  const skinApi=window.AshfallSkinSets;if(visual?.skinModules&&skinApi?.applyMixed)skinApi.applyMixed(root,st.rig,visual.skinModules,idx);else if(visual?.skinSet!==undefined&&skinApi?.applyCompatible)skinApi.applyCompatible(root,st.rig,visual.skinSet,idx);else if(skinApi?.states?.has(root))skinApi.applyCompatible(root,st.rig,-1,idx);
}
function update(root,dt){const st=cache.get(root);if(!st?.rig)return;const p=root.position;let speed=0;if(st.last&&dt>0)speed=Math.hypot(p.x-st.last.x,p.z-st.last.z)/dt;st.last=p.clone();st.rig.idle?.(performance.now()/1000,dt||1/60,{moving:speed>.3&&speed<20,speed:Math.min(speed,12)});window.AshfallSkinSets?.update(root,performance.now()/1000)}
const info=root=>{const r=cache.get(root||hubScene.bird)?.rig;return r?{height:r.height,width:r.width,length:r.length}:null};
window.AshfallChickenModels={names:NAMES,apply,update,info,rig:root=>cache.get(root||hubScene.bird)?.rig,modelIndex,count:BUILD.length,get ready(){return !!K}};
if(window.AshfallChickenParts)window.AshfallChickenParts.models=NAMES;
})();
