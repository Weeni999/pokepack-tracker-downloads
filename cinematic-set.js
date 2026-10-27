/* Procedural, fully spatial menu set. No reference photograph is used by this module. */
(() => {
'use strict';
const T=window.THREE;if(!T)return;
function build(){
 let seed=6517;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296),pi=Math.PI;
 const root=new T.Group();root.name='COCKPIT_CINEMATIC_SET';root.visible=false;
 const texture=(size,paint)=>{const c=document.createElement('canvas');c.width=c.height=size;paint(c.getContext('2d'),size);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t};
 const rust=texture(512,(g,s)=>{g.fillStyle='#332b23';g.fillRect(0,0,s,s);for(let i=0;i<16000;i++){const v=random();g.fillStyle=v<.4?'#171c1b':v<.7?'#633b20':v<.92?'#94562c':'#c08b56';g.globalAlpha=.15+random()*.5;g.fillRect(random()*s,random()*s,1+random()*6,1+random()*10)}g.globalAlpha=1;for(let i=0;i<130;i++){g.strokeStyle='rgba(14,13,9,.55)';g.beginPath();const x=random()*s,y=random()*s;g.moveTo(x,y);g.lineTo(x+random()*20,y+random()*80);g.stroke()}});
 const concrete=texture(1024,(g,s)=>{g.fillStyle='#373a36';g.fillRect(0,0,s,s);for(let i=0;i<35000;i++){g.fillStyle=random()<.5?'rgba(5,9,7,.19)':'rgba(175,180,167,.13)';g.fillRect(random()*s,random()*s,1+random()*4,1+random()*4)}for(let i=0;i<90;i++){const x=random()*s,y=random()*s,r=15+random()*100;const a=g.createRadialGradient(x,y,0,x,y,r);a.addColorStop(0,'rgba(0,5,2,.45)');a.addColorStop(1,'rgba(0,5,2,0)');g.fillStyle=a;g.fillRect(x-r,y-r,2*r,2*r)}g.lineWidth=1.4;g.strokeStyle='#111914';for(let i=0;i<42;i++){let x=random()*s,y=random()*s;g.beginPath();g.moveTo(x,y);for(let n=0;n<8;n++){x+=random()*42-21;y+=random()*42-21;g.lineTo(x,y)}g.stroke()}});
 concrete.wrapS=concrete.wrapT=T.RepeatWrapping;concrete.repeat.set(6,7);
 const chipped=texture(512,(g,s)=>{g.fillStyle='#c3ff8d';g.fillRect(0,0,s,s);for(let i=0;i<1500;i++){g.fillStyle=random()<.7?'#0b1709':'#507c36';const x=random()*s,y=random()*s;g.fillRect(x,y,random()*6+.5,random()*9+.5)}g.strokeStyle='#10200b';for(let i=0;i<25;i++){const x=random()*s,y=random()*s;g.lineWidth=.5+random()*3;g.beginPath();g.moveTo(x,y);g.lineTo(x+random()*55,y+random()*120);g.stroke()}});
 const steel=new T.MeshStandardMaterial({color:0x8d7050,map:rust,bumpMap:rust,bumpScale:.035,roughness:.76,metalness:.72});
 const dark=new T.MeshStandardMaterial({color:0x151c1a,metalness:.6,roughness:.62});
 const brass=new T.MeshStandardMaterial({color:0x987347,map:rust,metalness:.75,roughness:.44});
 const chrome=new T.MeshStandardMaterial({color:0x707972,metalness:.88,roughness:.3});
 const rubber=new T.MeshStandardMaterial({color:0x0b0e0c,roughness:.94,metalness:.05});
 const red=new T.MeshStandardMaterial({color:0x782f1c,map:rust,roughness:.7,metalness:.45});
 const green=new T.MeshStandardMaterial({color:0x96fb67,emissive:0x66df37,emissiveIntensity:2,map:chipped,emissiveMap:chipped,roughness:.55,metalness:.25});
 const glow=new T.MeshBasicMaterial({color:0xb8ffa0,toneMapped:false});
 function mesh(geometry,material,parent=root,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m}
 const box=(p,m,w,h,d,x=0,y=0,z=0)=>mesh(new T.BoxGeometry(w,h,d),m,p,x,y,z);
 const sphere=(p,m,r,x=0,y=0,z=0)=>mesh(new T.SphereGeometry(r,12,8),m,p,x,y,z);
 const cyl=(p,m,rt,rb,h,x=0,y=0,z=0)=>mesh(new T.CylinderGeometry(rt,rb,h,16),m,p,x,y,z);
 const ring=(p,m,r,t,x,y,z)=>mesh(new T.TorusGeometry(r,t,8,28),m,p,x,y,z);
 function rod(p,m,a,b,r=.025){a=new T.Vector3(...a);b=new T.Vector3(...b);const v=b.clone().sub(a);const o=cyl(p,m,r,r,v.length());o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return o}
 function cable(p,points,r=.035,m=rubber){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(a=>new T.Vector3(...a))),Math.max(12,points.length*8),r,6,false),m,p)}
 function merge(gs){const pos=[],nor=[],uv=[],ind=[];let offset=0;for(const g of gs){pos.push(...g.attributes.position.array);nor.push(...g.attributes.normal.array);uv.push(...g.attributes.uv.array);for(const index of g.index.array)ind.push(index+offset);offset+=g.attributes.position.count;g.dispose()}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(nor,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ind);g.computeBoundingSphere();return g}
 // Physical diamond-wire fencing: each strand has thickness and a woven depth offset.
 function fence(w,h){const gs=[],spacing=.38;for(const slope of [-1,1])for(let k=-w/2-h;k<=w/2+h;k+=spacing){let lo=Math.max(0,slope===1?-w/2-k:k-w/2),hi=Math.min(h,slope===1?w/2-k:k+w/2);if(hi<=lo)continue;const pts=[];const n=Math.ceil((hi-lo)*9);for(let i=0;i<=n;i++){const y=lo+(hi-lo)*i/n;pts.push(new T.Vector3(k+slope*y,y,Math.sin(y*pi/spacing)*.024*slope))}gs.push(new T.TubeGeometry(new T.CatmullRomCurve3(pts),Math.max(4,n),.012,4,false))}return mesh(merge(gs),steel)}
 const backFence=fence(22,8.9);backFence.position.z=-7.2;
 for(const side of [-1,1]){const f=fence(23,8.9);f.rotation.y=pi/2;f.position.set(side*11,0,1);for(let z=-10;z<=11;z+=4.5)box(root,steel,.22,9,.24,side*11,4.5,z)}
 for(const x of [-11,-7,-3.7,0,3.7,7,11]){box(root,steel,.22,9,.26,x,4.5,-7.2);for(const y of [.3,2.6,5.4,8.6]){const tie=ring(root,chrome,.145,.018,x,y,-7.2);tie.rotation.y=pi/2;for(const z of [-7.02,-7.39]){const bolt=cyl(root,brass,.055,.055,.05,x,y,z);bolt.rotation.x=pi/2}}}
 for(const y of [.2,8.7])box(root,steel,22,.2,.28,0,y,-7.2);
 // A second layer of cages and trusses is visible through the central mesh.
 for(const x of [-10,-6,6,10]){box(root,dark,.3,11,.4,x,5.5,-11);for(const y of [2.8,6,9])box(root,dark,4,.14,.18,x,y,-11);rod(root,steel,[x-1.7,0,-11],[x+1.7,8.7,-11],.035)}
 box(root,dark,45,16,.4,0,6,-15);
 for(const z of [-7,0,7]){box(root,steel,24,.25,.22,0,9,z);rod(root,dark,[-11,9,z],[-6,11,z],.08);rod(root,dark,[11,9,z],[6,11,z],.08)}
 for(let i=0;i<9;i++)cable(root,[[-12,9-i*.12,-5+i*.6],[-4,8.1-i*.22,-4+i*.6],[3,8.5-i*.2,-3+i*.6],[12,9,-4+i*.6]],.035+random()*.025);
 // Uneven concrete geometry, cracks, embedded aggregate and dark oily margins.
 const floorGeo=new T.PlaneGeometry(40,46,160,180);floorGeo.rotateX(-pi/2);const fp=floorGeo.attributes.position;
 for(let i=0;i<fp.count;i++){const x=fp.getX(i),z=fp.getZ(i);fp.setY(i,-.045+.009*Math.sin(x*3.7)*Math.cos(z*4.1)+.006*Math.sin(x*12+z*8))}floorGeo.computeVertexNormals();
 const floor=mesh(floorGeo,new T.MeshStandardMaterial({map:concrete,bumpMap:concrete,bumpScale:.065,roughness:.64,metalness:.12}));floor.castShadow=false;
 // Contact shading complements the real spotlight shadow map (not screen-space AO).
 const contactTexture=texture(128,(g,s)=>{const gr=g.createRadialGradient(s/2,s/2,3,s/2,s/2,s/2);gr.addColorStop(0,'rgba(0,0,0,.75)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,s,s)});
 function contact(x,z,sx,sz){const o=mesh(new T.PlaneGeometry(sx,sz),new T.MeshBasicMaterial({map:contactTexture,transparent:true,depthWrite:false}),root,x,.004,z);o.rotation.x=-pi/2;o.castShadow=o.receiveShadow=false;return o}
 function crate(x,z,s=1){const p=new T.Group();p.position.set(x,.55*s,z);root.add(p);box(p,steel,1.5*s,1.1*s,1.1*s);for(const a of [-1,1]){box(p,brass,.1*s,1.18*s,1.18*s,a*.68*s,0,0);box(p,dark,1.58*s,.08*s,1.18*s,0,a*.49*s,0)}for(let i=0;i<5;i++)box(p,dark,.025*s,.9*s,.03*s,(-.48+i*.24)*s,0,.57*s);contact(x,z,2.4*s,1.8*s);return p}
 for(const [x,z,s]of [[-9,-3,1.2],[-8.3,-5.7,.7],[-10,1,1.5],[9.2,-2,1.2],[10,-5,1.3],[9,3,1],[-8,5,1.1]])crate(x,z,s);
 for(const side of [-1,1]){for(let i=0;i<22;i++){const x=side*(8+random()*2.7),z=-6+random()*14,r=.12+random()*.26;const gear=ring(root,i%3?steel:brass,r,.055,x,r*.6,z);gear.rotation.set(random()*pi,random()*pi,random()*pi);if(i%3===0)cyl(root,steel,r*.55,r*.55,.5,x,.2,z)}for(let i=0;i<5;i++){const x=side*(6.5+random()*4),z=random()*8-2;cable(root,[[x,.05,z],[x-side,.04,z+1],[x-side*1.7,.03,z+1.7],[x-side*2,.04,z+2.6]],.035+random()*.035)}}
 for(let i=0;i<9;i++)cable(root,[[-10+random()*4,.04,7+random()*4],[-5+random()*2,.03,6+random()*3],[random()*3,.04,9+random()*2],[6+random()*4,.04,7+random()*3]],.025+random()*.022);
 // Deterministic scatter keeps debris clustered like the approved composition.
 const rubble=new T.InstancedMesh(new T.DodecahedronGeometry(1,0),steel,360),dummy=new T.Object3D();rubble.castShadow=rubble.receiveShadow=true;root.add(rubble);
 for(let i=0;i<360;i++){const side=i%2?1:-1;const rear=i%4===0;dummy.position.set(rear?(random()-.5)*21:side*(7.3+random()*3.5),.02+random()*.08,rear?-6.3+random():-5+random()*17);dummy.scale.set(.035+random()*.17,.02+random()*.07,.035+random()*.2);dummy.rotation.set(random()*pi,random()*pi,random()*pi);dummy.updateMatrix();rubble.setMatrixAt(i,dummy.matrix)}rubble.instanceMatrix.needsUpdate=true;
 // Single enlarged sign; no lower frame is constructed.
 function frame(w,h,x,y,z){const g=new T.Group();g.position.set(x,y,z);root.add(g);for(const yy of [-h/2,h/2])box(g,brass,w,.065,.1,0,yy,0);for(const xx of [-w/2,w/2])box(g,brass,.065,h,.1,xx,0,0);for(const xx of [-w/2+.11,w/2-.11])for(const yy of [-h/2+.1,h/2-.1])sphere(g,chrome,.035,xx,yy,.06);return g}
 const upper=frame(6.9,2.05,0,5.7,-6.96);const signHit=box(upper,dark,6.85,2,.12,0,0,-.055);upper.name='COCKPIT_SIGN';upper.scale.set(1.25,1.25,1);
 // Extruded stencil glyphs are genuine geometry, with scratched emissive surfaces.
 const glyphs=new T.Group();glyphs.position.set(-3.13,-.76,.05);upper.add(glyphs);
 const rect=(x,y,w,h)=>{const s=new T.Shape();s.moveTo(x,y);s.lineTo(x+w,y);s.lineTo(x+w,y+h);s.lineTo(x,y+h);s.closePath();return s};
 const polygon=points=>{const s=new T.Shape();points.forEach((p,i)=>i?s.lineTo(...p):s.moveTo(...p));s.closePath();return s};
 function letter(c,x){const w=.76,h=1.52,t=.21;let shapes=[];
  if(c==='C')shapes=[polygon([[w,0],[0,0],[0,h],[w,h],[w,h-t],[t,h-t],[t,t],[w,t]])];
  if(c==='O'){const s=rect(0,0,w,h);const hole=new T.Path();hole.moveTo(t,t);hole.lineTo(t,h-t);hole.lineTo(w-t,h-t);hole.lineTo(w-t,t);hole.closePath();s.holes.push(hole);shapes=[s]}
  if(c==='K')shapes=[rect(0,0,t,h),polygon([[t,h*.48],[w,h],[w-t,h],[t*.8,h*.68]]),polygon([[t,h*.62],[w,0],[w-t,0],[t*.7,h*.43]])];
  if(c==='P'){const s=polygon([[0,0],[t,0],[t,h*.43],[w,h*.43],[w,h],[0,h]]);const hole=new T.Path();hole.moveTo(t,h*.58);hole.lineTo(t,h-t);hole.lineTo(w-t,h-t);hole.lineTo(w-t,h*.58);hole.closePath();s.holes.push(hole);shapes=[s]}
  if(c==='I')shapes=[rect((w-t)/2,0,t,h),rect(.05,0,w-.1,t),rect(.05,h-t,w-.1,t)];
  if(c==='T')shapes=[rect((w-t)/2,0,t,h),rect(0,h-t,w,t)];
  for(const shape of shapes)mesh(new T.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:true,bevelSize:.012,bevelThickness:.01,bevelSegments:1,steps:1}),green,glyphs,x,0,0);
 }
 'COCKPIT'.split('').forEach((c,i)=>letter(c,i*.91));
 // Chicken crest and faded head outline rise behind the lettering.
 const emblemMat=new T.MeshStandardMaterial({color:0x467a43,emissive:0x2b6734,emissiveIntensity:.75,roughness:.9});
 cable(upper,[[.05,.14,.025],[-.24,.55,.025],[-.28,.9,.025],[-.08,1.15,.025],[.22,1.08,.025],[.43,.85,.025],[.24,.75,.025],[.2,.45,.025],[.05,.14,.025]],.025,emblemMat);
 cable(upper,[[-.24,.98,.025],[-.44,1.27,.025],[-.24,1.24,.025],[-.22,1.48,.025],[.01,1.25,.025],[.13,1.5,.025],[.24,1.18,.025],[.39,1.33,.025],[.25,1.04,.025]],.025,emblemMat);
 // Slender mechanical display robot: articulated pivots, piston legs, exposed harnesses.
 const robot=new T.Group();robot.name='MENU_SALVAGE_ROBOT';robot.position.set(7,0,-2);root.add(robot);
 const rimMaterial=new T.MeshStandardMaterial({color:0x365043,emissive:0x66b879,emissiveIntensity:.65,roughness:.4,metalness:.7});const rim=ring(root,rimMaterial,1.31,.018,7,.09,-2);rim.rotation.x=pi/2;
 const podium=cyl(root,steel,1.28,1.4,.18,7,.07,-2);podium.receiveShadow=true;const podiumTop=cyl(root,brass,1.21,1.21,.035,7,.177,-2);contact(7,-2,4,3.4);for(let i=0;i<14;i++){const a=i*pi*2/14;sphere(root,dark,.045,7+Math.cos(a)*1.18,.203,-2+Math.sin(a)*1.18)}
 for(const side of [-1,1]){const x=side*.26;box(robot,dark,.28,.12,.57,x,.29,.13);box(robot,brass,.24,.035,.42,x,.37,.2);sphere(robot,chrome,.11,x,.49,0);rod(robot,steel,[x,.52,0],[x*1.15,1.22,-.03],.07);rod(robot,chrome,[x+.09,.58,0],[x*1.15+.09,1.17,-.03],.025);sphere(robot,brass,.12,x*1.15,1.28,-.03);rod(robot,steel,[x*1.15,1.4,-.03],[x*.95,2.03,0],.065);rod(robot,chrome,[x*1.15-.09,1.4,0],[x*.95-.09,2,0],.025);cable(robot,[[x,.55,-.08],[x*1.6,1.05,-.08],[x,1.8,-.13]],.022,rubber)}
 const torso=new T.Group();torso.name='MenuTorso';torso.position.y=2.08;robot.add(torso);
 box(torso,dark,.57,.23,.24);for(const x of [-.23,0,.23]){const gear=ring(torso,brass,.14,.035,x,0,.16);cyl(torso,chrome,.035,.035,.12,x,0,.2).rotation.x=pi/2}
 cyl(torso,chrome,.075,.085,.73,0,.53,0);for(let i=0;i<6;i++){const r=ring(torso,steel,.1,.02,0,.25+i*.09,0);r.rotation.x=pi/2}
 rod(torso,brass,[-.35,1.04,0],[.24,.54,.04],.03);rod(torso,brass,[.35,1.04,0],[-.24,.54,.04],.03);
 const chest=mesh(new T.ConeGeometry(.4,.72,3,1,true),steel,torso,0,.91,0);chest.rotation.z=pi;chest.scale.z=.48;
 for(const side of [-1,1]){sphere(torso,chrome,.13,side*.45,1.09,0);const arm=new T.Group();arm.position.set(side*.45,1.09,0);torso.add(arm);rod(arm,steel,[0,0,0],[side*.14,-.58,.03],.05);sphere(arm,brass,.09,side*.14,-.63,.03);rod(arm,chrome,[side*.14,-.72,.03],[side*.18,-1.2,.1],.035);cyl(arm,red,.105,.105,.17,side*.18,-.88,.1);sphere(arm,dark,.075,side*.18,-1.28,.1);for(let f=-1;f<=1;f++)cable(arm,[[side*.18+f*.045,-1.3,.1],[side*.18+f*.06,-1.46,.14],[side*.18+f*.055,-1.52,.24]],.016,brass);cable(arm,[[0,-.1,-.04],[side*.24,-.5,-.08],[side*.17,-1.16,.05]],.02,rubber);arm.userData.side=side;arm.name=side<0?'MenuArmLeft':'MenuArmRight'}
 for(let i=0;i<7;i++)cable(torso,[[(i-3)*.055,1.13,-.05],[(i-3)*.08,.68,.19],[(i-3)*.045,.18,-.06]],.015,i%2?rubber:brass);
 const head=new T.Group();head.name='MenuHead';head.position.set(0,1.52,0);torso.add(head);cyl(head,chrome,.06,.08,.35,0,-.15,0);sphere(head,dark,.18,0,.15,0);const helmet=cyl(head,brass,.055,.28,.43,0,.42,0);helmet.rotation.z=.13;ring(head,steel,.27,.025,0,.21,0).rotation.x=pi/2;for(const x of [-.085,.085])sphere(head,glow,.026,x,.16,.16);cable(head,[[-.1,.64,0],[.05,.76,.04],[.18,.64,.04]],.016,chrome);
 // Overhead lamp housing and real, adjustable shadow-casting spotlight.
 const lamp=cyl(root,brass,.23,.42,.18,7,8.55,-1.6);cyl(root,glow,.28,.28,.025,7,8.45,-1.6);cable(root,[[7,9.2,-1.6],[7,8.8,-1.6],[7,8.64,-1.6]],.035);
 const spot=new T.SpotLight(0xffc58a,240,22,.32,.42,1.5);spot.position.set(7,8.4,-1.6);spot.target.position.set(7,1.4,-1.6);spot.castShadow=true;spot.shadow.mapSize.set(2048,2048);spot.shadow.bias=-.0001;spot.shadow.normalBias=.025;spot.shadow.camera.near=.3;root.add(spot,spot.target);
 const signLight=new T.PointLight(0x71ff3d,80,18,1.5);signLight.position.set(0,5.4,-5.9);root.add(signLight);
 const bounce=new T.PointLight(0x56b63a,9,12,1.5);bounce.position.set(0,.55,-3);root.add(bounce);
 root.add(new T.HemisphereLight(0x5a786f,0x13100a,.16));
 for(const x of [-8,8]){const lamp=new T.PointLight(0xffcba7,3,6,1.5);lamp.position.set(x,4.5,-10);root.add(lamp);sphere(root,new T.MeshBasicMaterial({color:0xddaa80}),.055,x,4.5,-10)}
 // Real projected menu panel and wireframe light rays from an emitter.
 const holoGroup=new T.Group();holoGroup.position.set(-5.2,1.25,2.6);holoGroup.rotation.set(0,.16,.055);root.add(holoGroup);
 const menuTex=texture(512,(g,s)=>{g.fillStyle='rgba(8,42,28,.8)';g.fillRect(0,0,s,s);g.strokeStyle='#8bffb6';g.lineWidth=3;g.strokeRect(5,5,s-10,s-10);g.font='700 45px "Courier New",monospace';g.textAlign='center';g.textBaseline='middle';g.fillStyle='#dcffca';g.shadowColor='#72ff9a';g.shadowBlur=7;g.fillText('[ OPTIONS ]',s/2,s*.34);g.fillText('[ EXIT GAME ]',s/2,s*.66)});
 const holoMaterial=new T.ShaderMaterial({uniforms:{map:{value:menuTex},time:{value:0},strength:{value:1}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform sampler2D map;uniform float time;uniform float strength;varying vec2 vUv;void main(){vec4 c=texture2D(map,vUv);float scan=.86+.14*sin(vUv.y*510.);float band=.98+.02*sin(vUv.y*30.-time);gl_FragColor=vec4(c.rgb*scan*band*strength,c.a*.85);}',transparent:true,side:T.DoubleSide,depthWrite:false,toneMapped:false});
 const holo=mesh(new T.PlaneGeometry(3.4,1.65),holoMaterial,holoGroup);holo.castShadow=false;
 for(let i=0;i<15;i++){const x=-1.7+3.4*i/14;const line=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(x,-.825,0),new T.Vector3(0,-1.05,.24)]),new T.LineBasicMaterial({color:0x6affe0,transparent:true,opacity:.14,blending:T.AdditiveBlending}));holoGroup.add(line)}
 cyl(holoGroup,dark,.14,.18,.08,0,-1.05,.24);sphere(holoGroup,glow,.04,0,-.99,.24);const holoLight=new T.PointLight(0x48ffa3,3,4,1.5);holoLight.position.set(-5,.6,3);root.add(holoLight);
 // Small additive lens halos; they stay attached to light sources in world space.
 const haloTex=texture(128,(g,s)=>{const a=g.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);a.addColorStop(0,'rgba(255,255,255,.45)');a.addColorStop(.12,'rgba(255,255,255,.15)');a.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=a;g.fillRect(0,0,s,s)});
 const halo=new T.Sprite(new T.SpriteMaterial({map:haloTex,color:0x84ff54,transparent:true,blending:T.AdditiveBlending,depthWrite:false,opacity:.18}));halo.position.set(0,5.7,-6.6);halo.scale.set(10,4,1);root.add(halo);
 // Reuse the five chicken rigs already shipped with the game as scrapyard salvage.
 const salvageChickens=[],birdVisual={...(window.AshfallChickens?.selected?.visual||{})};
 const salvageLayout=[
  {model:0,x:-5.8,y:.03,z:2.25,s:.66,rx:.16,ry:.8,rz:1.18,hang:false},
  {model:1,x:6.55,y:.03,z:2.05,s:.62,rx:-.2,ry:-.9,rz:-.82,hang:false},
  {model:3,x:2.4,y:.03,z:-1.7,s:.53,rx:.28,ry:2.1,rz:.32,hang:false},
  {model:2,x:-8.25,y:4.15,z:-6.55,s:.42,rx:Math.PI,ry:-.35,rz:-.22,hang:true},
  {model:4,x:8.2,y:4.65,z:-6.55,s:.4,rx:Math.PI,ry:.5,rz:.2,hang:true}
 ];
 for(let i=0;i<salvageLayout.length;i++){
  const pose=salvageLayout[i],bird=new T.Group();bird.name='MENU_SALVAGE_CHICKEN_'+(i+1);
  window.AshfallChickenModels?.apply?.(bird,{...birdVisual,model:String(pose.model)},'menu-salvage-'+i);
  bird.position.set(pose.x,pose.y,pose.z);bird.scale.setScalar(pose.s);bird.rotation.set(pose.rx,pose.ry,pose.rz);root.add(bird);
  bird.traverse(o=>{if(!o.isMesh)return;o.castShadow=false;o.receiveShadow=false;const source=Array.isArray(o.material)?o.material:[o.material],worn=source.map(m=>{if(!m?.clone)return m;const c=m.clone();if(c.color)c.color.multiplyScalar(.56);if(c.emissive)c.emissive.multiplyScalar(.22);if('emissiveIntensity'in c)c.emissiveIntensity*=.35;if('roughness'in c)c.roughness=Math.max(.68,c.roughness);return c});o.material=Array.isArray(o.material)?worn:worn[0]});
  salvageChickens.push(bird);
  if(pose.hang){cable(root,[[pose.x-.16,8.7,-6.7],[pose.x-.2,7.6,-6.62],[pose.x,6.2,-6.55],[pose.x,pose.y+1.1,-6.55]],.026,brass);const hook=ring(root,brass,.12,.022,pose.x-.16,8.48,-6.7);hook.rotation.x=pi/2}
 }
 // Blue and amber electrical spit around the three floor carcasses: particles only.
 const sparkSeed=[],sparkCount=84,sparkPos=new Float32Array(sparkCount*3),sparkColor=new Float32Array(sparkCount*3),wrecks=salvageLayout.filter(p=>!p.hang);
 for(let i=0;i<sparkCount;i++){const w=wrecks[i%wrecks.length],phase=random()*pi*2,angle=random()*pi*2,r=.18+random()*.72,x=w.x+Math.cos(angle)*r,y=.18+random()*.85,z=w.z+Math.sin(angle)*r;sparkPos.set([x,y,z],i*3);const c=new T.Color(i%2?0x63caff:0xffc45e);sparkColor.set([c.r,c.g,c.b],i*3);sparkSeed.push([x,y,z,phase,random()])}
 const sparkGeometry=new T.BufferGeometry();sparkGeometry.setAttribute('position',new T.BufferAttribute(sparkPos,3));sparkGeometry.setAttribute('color',new T.BufferAttribute(sparkColor,3));
 const sparks=new T.Points(sparkGeometry,new T.PointsMaterial({map:haloTex,color:0xffffff,size:.09,vertexColors:true,transparent:true,opacity:.72,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));sparks.name='SALVAGE_ELECTRICAL_SPARKS';root.add(sparks); const smokeSeed=[],smokeCount=48,smokePos=new Float32Array(smokeCount*3);
 for(let i=0;i<smokeCount;i++){const w=wrecks[i%wrecks.length],a=random()*pi*2,r=.1+random()*.48,x=w.x+Math.cos(a)*r,y=.16+random()*.36,z=w.z+Math.sin(a)*r;smokePos.set([x,y,z],i*3);smokeSeed.push([x,y,z,random()*pi*2,.12+random()*.22])}
 const smokeGeometry=new T.BufferGeometry();smokeGeometry.setAttribute('position',new T.BufferAttribute(smokePos,3));
 const smoke=new T.Points(smokeGeometry,new T.PointsMaterial({map:haloTex,color:0xb6b7a8,size:.42,transparent:true,opacity:.16,depthWrite:false,blending:T.NormalBlending,toneMapped:false}));smoke.name='SALVAGE_SMOKE';root.add(smoke);
 const dustPos=new Float32Array(360*3),dustSeed=[];for(let i=0;i<360;i++){const x=i<230?7+(random()-.5)*3.2:(random()-.5)*16,y=random()*8,z=i<230?-2+(random()-.5)*2.5:-6+random()*10;dustPos.set([x,y,z],i*3);dustSeed.push([x,y,z,random()])}
 const dg=new T.BufferGeometry();dg.setAttribute('position',new T.BufferAttribute(dustPos,3));const dust=new T.Points(dg,new T.PointsMaterial({map:haloTex,color:0xded0ad,size:.035,transparent:true,opacity:.5,depthWrite:false,blending:T.AdditiveBlending}));root.add(dust); return {root,floor,robot,torso,head,spot,signLight,bounce,green,halo,holo,holoGroup,holoMaterial,signHit,dust,dustSeed,salvageChickens,sparks,sparkSeed,smoke,smokeSeed,contact,random};
}
window.AshfallCinematicSet={build};
})();
