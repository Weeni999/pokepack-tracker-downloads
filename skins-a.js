/* Skin sets 1-5: Hypebeast streetwear, Elemental pyre, Void-rift abyssal, Dark ominous dread, Cyber-ronin. Built only from socket helpers (see skins-core.js). */
(() => {
'use strict';
const SS=window.AshfallSkinSets,AM=window.AshfallModels;if(!SS||!AM)return;
const T=THREE,PI=Math.PI,std=AM.std,tex=AM.tex,D=T.DoubleSide;

// ---- shared fitting utilities (also used by skins-b.js) -----------------------------------------------------------------------------------------------
const U={};
U.band=(H,mat,f0,f1,m,o={},fl)=>{const h=H.hull;if(H.fmap){const [a,b]=H.fmap;f0=a+(b-a)*f0;f1=a+(b-a)*f1}
  if(h.t==='ell')return H.shell(mat,{margin:m,th:[Math.acos(1-2*f0),Math.acos(1-2*f1)],phi:o.phi,seg:o.seg},fl);
  if(h.t==='cyl')return H.shell(mat,{margin:m,y:[.5-f1,.5-f0],ang:o.ang,caps:o.caps,rt:o.rt,rb:o.rb},fl);
  const yoff=(.5-(f0+f1)/2)*h.s[1];let first;for(const face of ['front','back','left','right']){const s=H.shell(mat,{margin:m,face,v:f1-f0,u:o.u??1,pos:[0,yoff,0],t:o.t??.04},fl);first=first||s}return first};
U.cap=(H,mat,m,f=.35,o={})=>U.band(H,mat,0,f,m,{...o,caps:true},o.fl);
// polyline that follows the hull surface between two directions (straps, tendons, seam lines)
U.slerp=(a,b,t)=>{const dot=Math.max(-1,Math.min(1,a.dot(b))),th=Math.acos(dot);if(th<1e-4)return a.clone();let ax=a.clone().cross(b);if(ax.lengthSq()<1e-8){ax=Math.abs(a.x)<.9?new T.Vector3(1,0,0).cross(a):new T.Vector3(0,1,0).cross(a)}ax.normalize();return a.clone().applyAxisAngle(ax,th*t)};
U.arc=(H,a,b,n,m,mat,r=.016,fl)=>{const va=new T.Vector3(...a).normalize(),vb=new T.Vector3(...b).normalize();let prev=null;const out=[];for(let i=0;i<=n;i++){const d=U.slerp(va,vb,i/n),p=H.pos([d.x,d.y,d.z],m);if(prev&&prev.distanceTo(p)>1e-4)out.push(H.tether([prev.x,prev.y,prev.z],[p.x,p.y,p.z],mat,r));prev=p}return out};
U.panel=(H,mat,dir,w,hgt,m,fl)=>{const g=new T.PlaneGeometry(w,hgt);g.rotateX(-PI/2);const o=new T.Mesh(g,mat);return H.on(o,dir,m,fl)};
U.slab=(H,mat,dir,w,hgt,d,m,fl,rotY)=>{const o=new T.Mesh(new T.BoxGeometry(w,d,hgt),mat);const r=H.on(o,dir,m+d/2,fl);if(rotY)r.rotateY(rotY);return r};
U.spike=(H,mat,dir,len,rad,m,fl)=>H.on(new T.Mesh(new T.ConeGeometry(rad,len,8),mat),dir,m+len/2,fl);
U.ring=(H,mat,y,m,t=.02,fl)=>{const h=H.hull;if(h.t==='ell'){const th=Math.acos(1-2*y);return U.band(H,mat,Math.max(0,y-t*2),Math.min(1,y+t*2),m,{},fl)}return U.band(H,mat,Math.max(0,y-t),Math.min(1,y+t),m,{},fl)};
U.mat=(o,phys)=>{const m=std({side:D,...o},phys);m.userData.skinMat=true;return m};
SS.util=U;

// ---- procedural patterns -------------------------------------------------------------------------------------------------------------------------------------
const P={};
P.quilt=(seed)=>tex(256,256,seed,(g,w,h)=>{g.fillStyle='#1b1e23';g.fillRect(0,0,w,h);g.strokeStyle='#07080a';g.lineWidth=5;for(let i=0;i<=w;i+=64){g.beginPath();g.moveTo(i,0);g.lineTo(i,h);g.stroke();g.beginPath();g.moveTo(0,i);g.lineTo(w,i);g.stroke()}
  for(let x=0;x<w;x+=64)for(let y=0;y<h;y+=64){const gr=g.createRadialGradient(x+32,y+32,4,x+32,y+32,44);gr.addColorStop(0,'rgba(120,130,150,.35)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(x,y,64,64)}});
P.kanji=()=>tex(256,512,5,(g,w,h)=>{g.fillStyle='#050505';g.fillRect(0,0,w,h);g.fillStyle='#ff7a1f';g.shadowColor='#ff8a30';g.shadowBlur=12;g.font='bold 110px "Yu Gothic","MS Gothic",sans-serif';g.textAlign='center';['電','脳','街','走'].forEach((c,i)=>g.fillText(c,w/2,110+i*118));g.fillRect(14,8,w-28,4);g.fillRect(14,h-14,w-28,4)});
P.cracks=(emis)=>tex(512,512,9,(g,w,h,r)=>{g.fillStyle=emis?'#000':'#16131a';g.fillRect(0,0,w,h);if(!emis){for(let i=0;i<1500;i++){g.fillStyle=`rgba(${60+r()*40},${50+r()*30},${60+r()*40},.25)`;g.fillRect(r()*w,r()*h,2+r()*4,1+r()*3)}}
  g.strokeStyle=emis?'#ff8a1e':'#07050a';g.lineWidth=emis?4:3;g.shadowColor=emis?'#ffb040':'#000';g.shadowBlur=emis?10:0;for(let k=0;k<26;k++){let x=r()*w,y=r()*h;g.beginPath();g.moveTo(x,y);for(let s=0;s<7;s++){x+=(r()-.5)*90;y+=(r()-.3)*70;g.lineTo(x,y)}g.stroke()}});
P.chain=()=>tex(256,256,13,(g,w,h)=>{g.fillStyle='#14161a';g.fillRect(0,0,w,h);g.strokeStyle='#6b7078';g.lineWidth=2.5;for(let y=0;y<h+16;y+=11)for(let x=(y/11%2)*8;x<w+16;x+=16){g.beginPath();g.arc(x,y,7.5,0,PI*2);g.stroke()}});
P.lamellar=()=>tex(256,256,17,(g,w,h)=>{g.fillStyle='#0b1014';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=32){g.fillStyle=y%64?'#121a21':'#0e151b';g.fillRect(0,y,w,30);g.strokeStyle='#2c3b46';g.lineWidth=2;g.strokeRect(1,y+1,w-2,28);for(let x=16;x<w;x+=32){g.fillStyle='#3a4c59';g.beginPath();g.arc(x,y+15,3,0,PI*2);g.fill()}}});
P.fiber=(c)=>tex(128,128,21,(g,w,h)=>{g.fillStyle='#000';g.fillRect(0,0,w,h);const gr=g.createLinearGradient(0,0,w,0);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(.5,c);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,w,h)});
SS.pat=P;

const pulse=(m,base,amp,spd,off=0)=>t=>{m.emissiveIntensity=base+amp*(.5+.5*Math.sin(t*spd+off))};

// ================================================================================================================================ 0  HYPEBEAST
SS.register(0,{id:'hype',name:'1 / HYPEBEAST STREETWEAR',requires:['chest'],
  mats:()=>({puff:U.mat({map:P.quilt(31),color:0xffffff,roughness:.42,metalness:.05,clearcoat:.5},true),orange:U.mat({color:0xff6a13,emissive:0xff4d00,emissiveIntensity:.55,roughness:.5}),strap:U.mat({color:0x2a2d33,roughness:.7,metalness:.2}),
    led:U.mat({map:P.kanji(),emissiveMap:P.kanji(),emissive:0xffffff,emissiveIntensity:1.3,roughness:.4}),tech:U.mat({color:0x111316,roughness:.6,metalness:.3})}),
  build(S){const m=S.m;
    S.piece('head','cap',H=>{U.cap(H,m.puff,.06,.4);U.band(H,m.orange,.4,.46,.075);const v=U.slab(H,m.tech,[0,.55,1],H.R*1.1,H.R*.55,.04,.09,{deco:true});U.panel(H,m.led,[0,.35,1],H.R*.34,H.R*.34,.12,{deco:true})});
    S.piece('chest','puffer',H=>{const bands=[[0,.25],[.25,.5],[.5,.75],[.75,1]];bands.forEach(([a,b],i)=>U.band(H,m.puff,a+.01,b-.01,i%2?.06:.115));
      U.arc(H,[-.8,.9,.6],[.8,-.4,.7],10,.14,m.orange,.02);U.arc(H,[.8,.9,.6],[-.8,-.4,.7],10,.14,m.orange,.02);U.slab(H,m.orange,[0,.15,1],H.R*.28,H.R*.18,.04,.16,{deco:true});
      U.panel(H,m.led,[.55,.35,1],H.R*.36,H.R*.72,.15,{deco:true})});
    S.both('shoulder','ball',(H,s)=>{H.shell(m.puff,{margin:.08});U.arc(H,[0,1,0],[s,0,0],8,.09,m.orange,.016);U.arc(H,[0,0,1],[0,0,-1],10,.09,m.orange,.016)});
    S.both('arm','sleeve',(H,s)=>{[[0,.3],[.34,.64]].forEach(([a,b],i)=>U.band(H,m.puff,a,b,i?.08:.1));U.band(H,m.orange,.7,.9,.05)});
    S.both('thigh','pouch',(H,s)=>{U.band(H,m.puff,0,.9,.05);const big=s<0;const w=H.R*(big?1.7:1),hh=H.Hh*(big?.4:.22);U.slab(H,m.tech,[s*1,0,.2],w,hh,.12,.09,{mount:false});U.arc(H,[1,.5,0],[-1,.5,0],10,.1,m.orange,.016)});
    S.both('shin','cuff',(H,s)=>{U.band(H,m.puff,.05,.55,.06);U.band(H,m.orange,.62,.72,.06);U.band(H,m.strap,.8,1,.05)});
    S.piece('back','spine',H=>{U.panel(H,m.led,[0,.05,-1],H.R*.35,H.Hh*.9,.1,{deco:true});U.slab(H,m.puff,[0,.35,-1],H.R*1.2,H.Hh*.45,.12,.05,{});U.slab(H,m.orange,[0,.75,-1],H.R*.2,H.R*.2,.04,.18,{deco:true})})}});

// ================================================================================================================================ 1  ELEMENTAL PLASMA PYRE
SS.register(1,{id:'pyre',name:'2 / ELEMENTAL PLASMA PYRE',requires:['chest'],base:{color:0x3a3028,metal:.5},
  mats:()=>{const em=P.cracks(true);return {rock:U.mat({map:P.cracks(false),emissiveMap:em,emissive:0xffffff,emissiveIntensity:1.5,roughness:.8,metalness:.2}),glow:U.mat({color:0xff7a1a,emissive:0xff6a00,emissiveIntensity:2.2,roughness:.3}),iron:U.mat({color:0x1b1a1c,roughness:.5,metalness:.8}),fin:U.mat({color:0x2a2020,emissive:0xff4a00,emissiveIntensity:.5,roughness:.5,metalness:.7})}},
  build(S){const m=S.m;
    S.piece('head','helm',H=>{[[0,.3],[.32,.6],[.62,.9]].forEach(([a,b])=>U.band(H,m.rock,a,b,.05));U.slab(H,m.glow,[0,.45,1],H.R*.9,H.R*.14,.03,.09,{deco:true});for(const s of [-1,0,1])U.spike(H,m.iron,[s*.6,1,-.2],H.R*.9,H.R*.1,.04,{})});
    S.piece('chest','core',H=>{[[0,.2],[.22,.42],[.44,.62],[.64,.82]].forEach(([a,b])=>U.band(H,m.rock,a,b,.05));U.band(H,m.glow,.2,.22,.035);U.band(H,m.glow,.42,.44,.035);U.band(H,m.glow,.62,.64,.035);
      const ring=new T.Mesh(new T.TorusGeometry(H.R*.24,.03,10,32),m.iron);const r=H.on(ring,[0,.15,1],.06,{deco:true});r.rotateX(PI/2);const core=H.on(new T.Mesh(new T.SphereGeometry(H.R*.17,24,16),m.glow),[0,.15,1],.06,{deco:true});S.upd(pulse(m.glow,1.8,1.2,3))});
    S.both('shoulder','fins',(H,s)=>{U.band(H,m.rock,0,.6,.05);for(let i=0;i<3;i++){const a=.9+i*.28,d=[s*(.3+i*.2),1,(i-1)*.45];const top=H.pos(d,.55+i*.1),base=H.pos(d,.04);const f=H.add(new T.BoxGeometry(.03,H.R*1.5,H.R*.9),m.fin,[top.x,top.y,top.z],[0,0,s*(.25+i*.18)],{floating:true,deco:true});H.tether([base.x,base.y,base.z],[top.x,top.y,top.z],m.glow,.012)}});
    S.both('arm','plate',(H,s)=>{[[0,.3],[.35,.65]].forEach(([a,b])=>U.band(H,m.rock,a,b,.05));U.band(H,m.glow,.31,.34,.04)});
    S.both('thigh','plate',(H,s)=>{U.band(H,m.rock,0,.45,.045);U.band(H,m.rock,.5,1,.045);U.band(H,m.glow,.46,.49,.04)});
    S.both('shin','plate',(H,s)=>{U.band(H,m.rock,0,.5,.045);U.band(H,m.glow,.52,.56,.04);U.band(H,m.rock,.6,1,.045)});
    S.piece('back','vents',H=>{for(let i=-3;i<=3;i++)U.slab(H,m.fin,[i*.25,.2,-1],.03,H.Hh*.8,H.R*.35,.05,{});U.slab(H,m.glow,[0,-.4,-1],H.R*1.1,H.R*.12,.04,.07,{deco:true});S.upd(pulse(m.fin,.5,.6,2.2,1))})}});

// ================================================================================================================================ 2  VOID-RIFT ABYSSAL
SS.register(2,{id:'void',name:'3 / VOID-RIFT ABYSSAL',requires:['chest'],base:{color:0x0a0a0c,metal:.1,rough:.95,map:false},
  mats:()=>({vanta:U.mat({color:0x010102,roughness:1,metalness:0}),fiber:U.mat({color:0x2a0a50,emissive:0x8a2cff,emissiveIntensity:1.8,roughness:.4}),ring:U.mat({color:0x0b0b10,roughness:.3,metalness:.9,emissive:0x5a1ac0,emissiveIntensity:.35}),node:U.mat({color:0x000000,emissive:0xa040ff,emissiveIntensity:2.4,roughness:.2})}),
  build(S){const m=S.m;
    S.piece('head','hood',H=>{U.cap(H,m.vanta,.05,.62);U.band(H,m.vanta,.62,1,.045);U.slab(H,m.fiber,[0,.42,1],H.R*.85,H.R*.07,.03,.085,{deco:true})});
    S.piece('chest','shell',H=>{U.band(H,m.vanta,0,1,.05);for(let i=0;i<4;i++){const a=-.9+i*.45;U.arc(H,[a,1,.5],[a+.8,-1,.5],14,.08,m.fiber,.014)}U.arc(H,[1,.6,.2],[-1,.2,.8],12,.08,m.fiber,.016);S.upd(pulse(m.fiber,1.3,1,2.6))});
    S.both('shoulder','orbit',(H,s)=>{U.band(H,m.vanta,0,.8,.05);const n=s<0?3:2;for(let i=0;i<n;i++){const R=H.R*(1.5+i*.28),arc=new T.Mesh(new T.TorusGeometry(R,.028,8,28,PI*.9),m.ring);arc.rotation.set(.5+i*.6,i*1.2,(s<0?1:-1)*.4);arc.position.set(0,0,0);arc.userData.q={floating:true,deco:true};H.add(arc.geometry,m.ring,[0,0,0],[arc.rotation.x,arc.rotation.y,arc.rotation.z],{floating:true,deco:true});
        const tip=new T.Vector3(R,0,0).applyEuler(arc.rotation);const p=H.pos([tip.x,tip.y,tip.z],.04);H.tether([p.x,p.y,p.z],[tip.x,tip.y,tip.z],m.ring,.014)}
      if(s>0){const nd=H.pos([1,.6,.4],.28);H.add(new T.SphereGeometry(H.R*.18,16,12),m.node,[nd.x,nd.y,nd.z],null,{deco:true,floating:true});const p0=H.pos([1,.6,.4],.04);H.tether([p0.x,p0.y,p0.z],[nd.x,nd.y,nd.z],m.ring,.014)}});
    S.both('arm','sleeve',(H,s)=>{U.band(H,m.vanta,0,1,.045);U.arc(H,[0,.5,1],[0,-.5,1],8,.07,m.fiber,.012)});
    S.both('thigh','sleeve',(H,s)=>{U.band(H,m.vanta,0,1,.045);U.arc(H,[s,.5,0],[s,-.5,0],8,.07,m.fiber,.012)});
    S.both('shin','greave',(H,s)=>{U.band(H,m.vanta,0,1,.045);U.arc(H,[0,.5,1],[0,-.5,1],8,.07,m.fiber,.012)});
    S.piece('back','anomaly',H=>{const pts=[[.4,.3,-1,.2],[-.5,-.1,-1,.28],[.1,-.5,-1,.14]];pts.forEach(([x,y,z,r],i)=>{const p=H.pos([x,y,z],r+.2);H.add(new T.SphereGeometry(r*H.R*.8,16,12),m.node,[p.x,p.y,p.z],null,{deco:true,floating:true});const b=H.pos([x,y,z],.04);H.tether([b.x,b.y,b.z],[p.x,p.y,p.z],m.ring,.014);const rg=H.add(new T.TorusGeometry(r*H.R*1.3,.012,6,28),m.ring,[p.x,p.y,p.z],[.6+i,.3*i,0],{deco:true,floating:true})});S.upd(pulse(m.node,1.6,1.4,2.2))})}});

// ================================================================================================================================ 3  DARK OMINOUS DREAD
SS.register(3,{id:'dread',name:'4 / DARK OMINOUS DREAD',requires:['chest'],base:{color:0x403530,metal:.7,rough:.8},
  mats:()=>({rust:U.mat({color:0x3c2a22,roughness:.8,metalness:.7}),weld:U.mat({color:0x6b4a38,roughness:.6,metalness:.8}),mail:U.mat({map:P.chain(),roughness:.55,metalness:.7}),tendon:U.mat({color:0x4a1612,roughness:.5,metalness:.1}),eye:U.mat({color:0x300000,emissive:0xff1010,emissiveIntensity:2.6,roughness:.3}),spike:U.mat({color:0x2b2623,roughness:.5,metalness:.9})}),
  build(S){const m=S.m;
    S.piece('head','shroud',H=>{U.cap(H,m.mail,.07,.75);U.band(H,m.mail,.75,1,.11);for(const s of [-1,1])U.slab(H,m.eye,[s*.32,.5,1],H.R*.28,H.R*.05,.03,.1,{deco:true});U.spike(H,m.spike,[0,1,-.2],H.R*.9,H.R*.12,.06,{});for(const s of [-1,1])U.spike(H,m.spike,[s*.75,.7,0],H.R*.6,H.R*.08,.05,{})});
    S.piece('chest','plates',H=>{U.band(H,m.rust,.05,.35,.05);U.band(H,m.rust,.4,.7,.07);U.band(H,m.weld,.72,.95,.05);for(let i=0;i<7;i++){const a=-.9+i*.3;U.spike(H,m.spike,[a,.2-Math.abs(a)*.2,1],H.R*.35,H.R*.06,.08,{})}
      for(let i=-1;i<=1;i++)U.arc(H,[i*.3,.8,1],[i*.3+.1,-.6,1],8,.1,m.tendon,.02);U.arc(H,[-.6,.5,1],[.6,.5,1],8,.07,m.weld,.016)});
    S.both('shoulder','spikes',(H,s)=>{U.band(H,m.rust,0,.7,.06);for(let i=0;i<6;i++){const a=i*PI/3,d=[Math.abs(Math.cos(a))*.8*s,.7,Math.sin(a)*.8];U.spike(H,m.spike,d,H.R*1.2,H.R*.16,.06,{})}U.spike(H,m.spike,[s*.2,1,0],H.R*1.6,H.R*.2,.06,{})});
    S.both('arm','bracer',(H,s)=>{U.band(H,m.rust,0,.4,.06);U.band(H,m.rust,.45,.9,.05);for(let i=0;i<3;i++)U.spike(H,m.spike,[s*.4,.6-i*.5,.9],H.R*.7,H.R*.12,.06,{});U.arc(H,[-1,.9,0],[1,-.6,.4],10,.08,m.tendon,.02)});
    S.both('thigh','greave',(H,s)=>{U.band(H,m.rust,0,.55,.06);U.arc(H,[s,.9,.3],[s,-.9,.3],10,.09,m.tendon,.022)});
    S.both('shin','greave',(H,s)=>{U.band(H,m.rust,0,.6,.06);U.spike(H,m.spike,[0,-.4,1],H.R*2.2,H.R*.2,.06,{});U.band(H,m.weld,.7,.85,.06)});
    S.piece('back','ridge',H=>{for(let i=0;i<7;i++)U.spike(H,m.spike,[0,.8-i*.28,-1],H.R*(.5-i*.04),H.R*.09,.05,{});for(const s of [-1,1])U.arc(H,[s*.6,.9,-1],[s*.7,-.8,-1],10,.07,m.tendon,.02);for(let i=-1;i<=1;i++){const p=H.pos([i*.6,-.9,-1],.06),q=[p.x,p.y-H.Hh*.5,p.z-.05];H.tether([p.x,p.y,p.z],q,m.spike,.016)}})}});

// ================================================================================================================================ 4  CYBER-RONIN NEO-SAMURAI
SS.register(4,{id:'ronin',name:'5 / CYBER-RONIN NEO-SAMURAI',requires:['chest'],base:{color:0x1a2026,metal:.7},
  mats:()=>({lam:U.mat({map:P.lamellar(),roughness:.45,metalness:.5}),lac:U.mat({color:0x0a0f13,roughness:.3,metalness:.6}),cyan:U.mat({color:0x00323a,emissive:0x00e5ff,emissiveIntensity:2.2,roughness:.3}),steel:U.mat({color:0x8a949c,roughness:.3,metalness:1}),cord:U.mat({color:0x7a1010,roughness:.8})}),
  build(S){const m=S.m;
    S.piece('head','kabuto',H=>{U.cap(H,m.lac,.05,.55);U.band(H,m.lam,.55,.9,.08);U.band(H,m.lam,.9,1,.12);
      const mask=U.band(H,m.lac,.45,.8,.07,{phi:[0,PI*.8],ang:[0,PI*.8]});for(let i=0;i<3;i++)U.slab(H,m.lam,[0,.1-i*.3,1],H.R*(1-i*.15),H.R*.18,.04,.1+i*.015,{});U.slab(H,m.cyan,[0,.3,1],H.R*.8,H.R*.05,.03,.11,{deco:true});
      for(const s of [-1,1]){U.spike(H,m.steel,[s*.35,1,.6],H.R*1.3,H.R*.05,.05,{});const c=H.slab;} });
    S.piece('chest','do',H=>{for(let i=0;i<5;i++)U.band(H,i%2?m.lam:m.lac,i*.2+.005,i*.2+.195,.05+i*.006);U.band(H,m.cyan,.19,.205,.075);U.band(H,m.cyan,.59,.605,.075);U.arc(H,[0,.9,1],[0,-.9,1],10,.1,m.cyan,.012);U.arc(H,[-.8,.5,.6],[.8,.5,.6],10,.1,m.cord,.016)});
    S.both('shoulder','sode',(H,s)=>{for(let i=0;i<4;i++){const w=H.R*(2-i*.18),d=[s*(.9-i*.05),-.1-i*.35,0];U.slab(H,i%2?m.lam:m.lac,d,w,H.R*(1.6-i*.1),.05,.04+i*.05,{});U.slab(H,m.cyan,[d[0],d[1]-.15,d[2]],w*.9,.02,.03,.1+i*.05,{deco:true})}U.cap(H,m.lac,.05,.4)});
    S.both('arm','kote',(H,s)=>{U.band(H,m.lac,0,.3,.05);for(let i=0;i<3;i++)U.band(H,m.lam,.32+i*.2,.5+i*.2,.05+i*.012);U.band(H,m.cyan,.3,.32,.07)});
    S.both('thigh','haidate',(H,s)=>{for(let i=0;i<3;i++)U.slab(H,m.lam,[0,.8-i*.5,i%2?1:-1],H.R*1.6,H.Hh*.45,.05,.05+i*.015,{});U.band(H,m.lac,0,.25,.05)});
    S.both('shin','suneate',(H,s)=>{U.band(H,m.lac,0,.7,.05);U.slab(H,m.lam,[0,0,1],H.R*1.6,H.Hh*.6,.04,.09,{});U.band(H,m.cyan,.72,.75,.07);U.band(H,m.lam,.78,1,.06)});
    S.piece('back','scabbard',H=>{U.slab(H,m.lac,[0,0,-1],H.R*.9,H.Hh*.5,.05,.04,{});const L=Math.max(H.Hh*1.5,1),sc=H.add(new T.CylinderGeometry(.045,.04,L,10),m.lac,[0,.1,-H.size[2]-.2],[0,0,.5],{});for(const y of [-.25,.2]){const p=H.pos([0,y,-1],.04);H.tether([p.x,p.y,p.z],[p.x*.9+Math.sin(.5)*y*.3,p.y*.9,-H.size[2]-.2],m.steel,.016)}
      H.add(new T.CylinderGeometry(.035,.035,.22,8),m.cord,[Math.sin(.5)*-L*.55,.1+Math.cos(.5)*L*.55,-H.size[2]-.2],[0,0,.5],{deco:true});U.slab(H,m.cyan,[0,.3,-1],H.R*.7,.03,.03,.1,{deco:true})})}});
})();
