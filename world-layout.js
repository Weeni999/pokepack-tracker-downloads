/* Persistent connected spaces attached to the existing Ashfall scene once. */
(() => {
'use strict';
const hub=window.AshfallHubScene;if(!hub?.scene||!window.THREE)return;
const T=THREE,root=new T.Group();root.name='ASHFALL_PERSISTENT_WORLD';root.visible=false;hub.scene.add(root);
const mats={steel:new T.MeshStandardMaterial({color:0x38413b,metalness:.72,roughness:.62}),dark:new T.MeshStandardMaterial({color:0x111714,metalness:.42,roughness:.78}),floor:new T.MeshStandardMaterial({color:0x242a25,metalness:.42,roughness:.38}),rust:new T.MeshStandardMaterial({color:0x80502d,metalness:.32,roughness:.86}),wire:new T.MeshStandardMaterial({color:0x5d7062,metalness:.67,roughness:.54}),red:new T.MeshStandardMaterial({color:0x9d2118,emissive:0x99150b,emissiveIntensity:1.8}),green:new T.MeshStandardMaterial({color:0x59db65,emissive:0x19c735,emissiveIntensity:1.4})};
function box(parent,w,h,d,x,y,z,material){const m=new T.Mesh(new T.BoxGeometry(w,h,d),material);m.position.set(x,y,z);parent.add(m);return m}
const corridor=new T.Group(),yard=new T.Group(),plots=new T.Group(),arena=new T.Group();corridor.name='ENTRY_CORRIDOR';yard.name='THE_YARD';plots.name='CHICKEN_PLOTS';arena.name='PIT_ARENA';root.add(corridor,yard,plots,arena);
// Corridor is 10m x 5.5m x 30m, centered on x=0 from z=-8 to -38.
box(corridor,10,.35,31,0,-.25,-23.5,mats.floor);box(corridor,10,.28,31,0,5.35,-23.5,mats.dark);
for(const side of [-1,1]){box(corridor,.34,5.5,31,side*5,2.5,-23.5,mats.steel);for(let z=-37;z<=-9;z+=3){box(corridor,.18,5.4,.22,side*4.78,2.5,z,mats.rust);box(corridor,.08,.08,9.3,0,.01,z,mats.wire)}for(let y=.4;y<5;y+=.36)box(corridor,.035,.035,30,side*4.8,y,-23.5,mats.wire)}
for(let x=-4;x<=4;x+=2)box(corridor,.16,.12,30,x,5.05,-23.5,mats.rust);
// The blast door plane is at z=-38. Leaves slide into wall pockets; no mesh is rebuilt.
const doors=new T.Group();doors.name='BLAST_DOORS';corridor.add(doors);const leftLeaf=box(doors,2.5,4.8,.42,-1.25,2.45,-38,mats.steel),rightLeaf=box(doors,2.5,4.8,.42,1.25,2.45,-38,mats.steel);for(const x of [-2.2,-1.6,-1,.0,1,1.6,2.2]){box(doors,.09,4.3,.08,x,2.45,-37.76,mats.rust)}box(doors,5.6,.35,.65,0,4.98,-38,mats.dark);box(doors,.18,5.3,.65,-2.88,2.5,-38,mats.rust);box(doors,.18,5.3,.65,2.88,2.5,-38,mats.rust);
const redLamp=new T.PointLight(0xff2816,2.8,9),greenLamp=new T.PointLight(0x39ff63,0,9);redLamp.position.set(-3.3,4.8,-37);greenLamp.position.set(3.3,4.8,-37);corridor.add(redLamp,greenLamp);for(const side of [-1,1]){const lamp=box(doors,.26,.26,.12,side*3.2,4.8,-37.6,mats.red);lamp.name=side<0?'RED_LOCK_LEFT':'RED_LOCK_RIGHT'}
const steam=[];const steamMaterial=new T.MeshBasicMaterial({color:0xa7b6a4,transparent:true,opacity:.11,depthWrite:false});for(let i=0;i<14;i++){const puff=new T.Mesh(new T.SphereGeometry(.22+Math.random()*.24,7,5),steamMaterial.clone());puff.position.set((Math.random()-.5)*3,Math.random()*2,-37.2-Math.random()*.4);puff.visible=false;doors.add(puff);steam.push(puff)}
// Connected Yard, plots and arena occupy the same scene graph and are visibility-streamed.
box(yard,46,.35,42,0,-.28,-61,mats.floor);for(let side of [-1,1]){box(yard,.3,7,42,side*23,3.2,-61,mats.steel);for(let z=-81;z<=-41;z+=.34)box(yard,.025,6.4,.025,side*22.8,3.1,z,mats.wire);for(let y=0;y<=6;y+=.24)box(yard,.025,.025,42,side*22.8,y,-61,mats.wire)}for(let z=-81;z<=-41;z+=5){box(yard,.36,6.3,.36,-22.6,3.1,z,mats.rust);box(yard,.36,6.3,.36,22.6,3.1,z,mats.rust)}
for(let x=13;x<=21;x+=4)for(let z=-68;z<=-52;z+=5){box(plots,3.5,.25,4.2,x,0,z,mats.rust);box(plots,3.2,.08,3.9,x,.17,z,mats.dark);box(plots,.12,1.3,.12,x-1.55,.8,z-1.9,mats.steel);box(plots,.12,1.3,.12,x+1.55,.8,z-1.9,mats.steel)}
box(arena,18,.28,22,-13,-.04,-65,mats.dark);for(const x of [-22,-4])box(arena,.2,5,22,x,2.5,-65,mats.rust);for(let x=-21.5;x<=-4.5;x+=.28)box(arena,.025,4.6,.025,x,2.5,-65,mats.wire);for(let y=0;y<5;y+=.18)box(arena,18,.025,.025,-13,y,-65,mats.wire);const ring=new T.Mesh(new T.TorusGeometry(3,.06,8,60),new T.MeshStandardMaterial({color:0x71f36d,emissive:0x25ac41,emissiveIntensity:1.2}));ring.rotation.x=Math.PI/2;ring.position.set(-13,.12,-65);arena.add(ring);
function setDoor(open){const p=Math.max(0,Math.min(1,open));leftLeaf.position.x=-1.25-2.7*p;rightLeaf.position.x=1.25+2.7*p;redLamp.intensity=2.8*(1-p);greenLamp.intensity=2.6*p;doors.traverse(o=>{if(o.isMesh&&o.name.startsWith('RED_LOCK'))o.material=p>.85?mats.green:mats.red});steam.forEach((o,i)=>{o.visible=p>.25&&p<.95;o.position.y=.4+((performance.now()*.00045+i*.17)%1.8);o.material.opacity=(p>.25&&p<.95)?.12:0})}
function setDoorTarget(open){doors.userData.target=open?1:0}
function streamAt(pos){const z=pos?.z??-10;corridor.visible=Math.abs(z+23)<45;yard.visible=Math.abs(z+61)<48;plots.visible=pos.x>16;arena.visible=false}
function setVisible(active){root.visible=!!active}
window.AshfallWorldLayout={root,corridor,yard,plots,arena,doors,leftLeaf,rightLeaf,steam,setDoor,setDoorTarget,streamAt,setVisible,get target(){return doors.userData.target??0}};setDoor(0);
})();
