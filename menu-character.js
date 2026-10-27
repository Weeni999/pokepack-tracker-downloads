/* Main-menu character customization: zooms to the live podium robot and opens the existing customizer over the same scene. */
(() => {
'use strict';
const hub=window.AshfallHubScene,T=window.THREE,CM=window.AshfallCinematicMenu,MM=window.AshfallMainMenu;
if(!hub||!T||!CM||!MM||typeof MM.update!=='function')return;
const {scene,camera,renderer}=hub,robot=hub.robot,bird=hub.bird,AR=window.AshfallAnimationRig;
const placeholder=scene.getObjectByName('MENU_SALVAGE_ROBOT'),menuRoot=placeholder?.parent;
if(!robot||!placeholder||!menuRoot)return;
const POD=placeholder.position.clone().add(new T.Vector3(0,.2,0)),HOME_POS=CM.cameraPosition,HOME_LOOK=CM.cameraTarget;   // shared with the menu camera; the lobby menu moves them (yard-dressing.js)
const rim=new T.PointLight(0x6dff9a,0,9,1.6);rim.position.set(POD.x+1.8,3.4,POD.z-1.8);rim.userData.menuBaseIntensity=0;menuRoot.add(rim);
const ray=new T.Raycaster(),ndc=new T.Vector2(),cam={pos:HOME_POS.clone(),look:HOME_LOOK.clone()};
const overlay=document.getElementById('character-customize-overlay');
const birdHome=bird?{position:bird.position.clone(),rotation:bird.rotation.clone(),scale:bird.scale.clone()}:null;
let birdPreviewing=false;
let hover=false,zoom=null,playing=false,castDone=false,avatarYaw=0,spinPointer=null;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||window.AshfallSettings?.state?.reduceMotion;
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
function currentView(){const dir=camera.getWorldDirection(new T.Vector3());return {pos:camera.position.clone(),look:camera.position.clone().addScaledVector(dir,10)}}
function open(forceRobot=false){
  if(!overlay)return;
  if(forceRobot||!window.AshfallCustomizerMode)document.querySelector('[data-customizer-mode="robot"]')?.click();
  overlay.hidden=false;document.body.classList.add('menu-character-zoom');
  window.AshfallChickens?.renderLocker?.();
  if(window.AshfallCustomizerMode==='chicken')place(0);
  if(CM.active){if(reduced()){cam.pos.set(POD.x-3.1,3,POD.z+6.2);cam.look.set(POD.x-2.6,2,POD.z);CM.camOverride=cam;zoom=null}
    else{const from=currentView();cam.pos.copy(from.pos);cam.look.copy(from.look);CM.camOverride=cam;zoom={t:0,direction:'in',fromPos:from.pos,fromLook:from.look}}}
}
function close(){if(!overlay)return;spinPointer=null;canvas.style.cursor='';
  if(CM.active&&!reduced()) {const from=currentView();cam.pos.copy(from.pos);cam.look.copy(from.look);CM.camOverride=cam;zoom={t:0,direction:'out',fromPos:from.pos,fromLook:from.look};return}
  overlay.hidden=true;document.body.classList.remove('menu-character-zoom');zoom=null;CM.camOverride=null;cam.pos.copy(HOME_POS);cam.look.copy(HOME_LOOK);
}
function pick(e){
  const r=renderer.domElement.getBoundingClientRect();
  if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)return false;
  ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);
  camera.updateMatrixWorld(true);robot.updateWorldMatrix(true,true);ray.setFromCamera(ndc,camera);
  if(ray.intersectObject(robot,true).some(h=>h.object.isMesh))return true;
  const bounds=new T.Box3().setFromObject(robot);if(bounds.isEmpty())return false;
  const projected=[];for(let i=0;i<8;i++)projected.push(new T.Vector3(i&1?bounds.max.x:bounds.min.x,i&2?bounds.max.y:bounds.min.y,i&4?bounds.max.z:bounds.min.z).project(camera));
  const xs=projected.map(p=>r.left+(p.x*.5+.5)*r.width),ys=projected.map(p=>r.top+(-p.y*.5+.5)*r.height);
  const pad=14,left=Math.min(...xs)-pad,right=Math.max(...xs)+pad,top=Math.min(...ys)-pad,bottom=Math.max(...ys)+pad;
  return e.clientX>=left&&e.clientX<=right&&e.clientY>=top&&e.clientY<=bottom;
}
const overUI=e=>e.target.closest?.('button,input,select,textarea,dialog,#character-customize-overlay,#cockpit-media,#cockpit-radio-dock,#cinematic-lighting,[role=dialog]');
window.addEventListener('pointermove',e=>{
  if(!CM.active||zoom||!overlay?.hidden||window.AshfallSettings?.isOpen||overUI(e)){if(hover){hover=false;document.body.style.cursor=''}return}
  const h=pick(e);if(h!==hover){hover=h;document.body.style.cursor=h?'pointer':''}
},{passive:true});
window.addEventListener('click',e=>{
  if(!CM.active||zoom||!overlay?.hidden||window.AshfallSettings?.isOpen||overUI(e))return;
  if(pick(e)){e.preventDefault();e.stopPropagation();open(true)}
},true)
const canvas=renderer.domElement;
function spinStart(e){if(!CM.active||!overlay||overlay.hidden||zoom||window.AshfallSettings?.isOpen||spinPointer||e.target.closest?.('button,input,select,textarea,[role=dialog]')||!pick(e))return;spinPointer={id:e.pointerId,x:e.clientX};try{e.target.setPointerCapture?.(e.pointerId)}catch{}canvas.style.cursor='grabbing';document.body.style.cursor='grabbing';e.preventDefault();e.stopPropagation()}
function spinMove(e){if(!spinPointer||e.pointerId!==spinPointer.id)return;const dx=e.clientX-spinPointer.x;spinPointer.x=e.clientX;avatarYaw+=dx*.02;robot.rotation.y=avatarYaw;e.preventDefault();e.stopPropagation()}
function spinEnd(e){if(!spinPointer||e.pointerId!==spinPointer.id)return;spinPointer=null;canvas.style.cursor='';document.body.style.cursor='';try{e.target.releasePointerCapture?.(e.pointerId)}catch{}e.preventDefault();e.stopPropagation()}
window.addEventListener('pointerdown',spinStart,true);window.addEventListener('pointermove',spinMove,true);window.addEventListener('pointerup',spinEnd,true);window.addEventListener('pointercancel',spinEnd,true);
document.getElementById('character-customize-close')?.addEventListener('click',close);
const sr=document.createElement('button');sr.type='button';sr.className='sr-only';sr.textContent='CUSTOMIZE CHARACTER';sr.onclick=()=>open(true);document.body.append(sr);
function place(dt){
  const previewActive=CM.active||!!(overlay&&!overlay.hidden&&document.body.classList.contains('menu-character-zoom'));
  const petPreview=previewActive&&overlay&&!overlay.hidden&&window.AshfallCustomizerMode==='chicken'&&bird;
  if(petPreview){
    robot.visible=false;bird.visible=true;birdPreviewing=true;
    const h=window.AshfallChickenModels?.info?.(bird)?.height||2.4,s=Math.max(.72,Math.min(1.12,2.65/h));
    bird.position.copy(POD);bird.scale.setScalar(s);bird.rotation.set(0,avatarYaw,0);
  }else if(birdPreviewing&&birdHome){bird.position.copy(birdHome.position);bird.rotation.copy(birdHome.rotation);bird.scale.copy(birdHome.scale);birdPreviewing=false}
  if(previewActive){const rh=window.AshfallModels?.info?.(robot)?.height||3.1,rs=Math.max(.7,Math.min(1.1,3.3/rh));robot.position.copy(POD);robot.scale.setScalar(rs);robot.rotation.set(0,avatarYaw,0);robot.visible=!petPreview;if(AR){if(!playing&&AR.play(robot,'robot',{clip:'robot_menu_idle'}))playing=true;AR.update(robot,dt,'robot')}return}
  if(robot.parent!==menuRoot)menuRoot.add(robot);
  const h=window.AshfallModels?.info?.(robot)?.height||3.1,s=Math.max(.7,Math.min(1.1,3.3/h));
  robot.visible=true;robot.position.copy(POD);robot.scale.setScalar(s);robot.rotation.set(0,avatarYaw,0);placeholder.visible=false;
  if(!castDone){robot.traverse(o=>{if(o.isMesh)o.castShadow=true});castDone=true}
  if(AR){if(!playing&&AR.play(robot,'robot',{clip:'robot_menu_idle'}))playing=true;AR.update(robot,dt,'robot')}
}
window.addEventListener('ashfall-customizer-mode',()=>{if(overlay&&!overlay.hidden&&(CM.active||document.body.classList.contains('menu-character-zoom')))place(0)});
function release(){
  if(robot.parent===menuRoot){scene.add(robot);robot.scale.setScalar(1);robot.rotation.set(0,0,0)}
  if(playing){AR?.stop(robot);playing=false}castDone=false;
  if(hover){hover=false;document.body.style.cursor=''}
  if(zoom){zoom=null;CM.camOverride=null}
  overlay&&(overlay.hidden=true);document.body.classList.remove('menu-character-zoom');
}
const orig=MM.update;
MM.update=function(dt,t){
  { const mp=window.AshfallYardDressing?.menuAvatarPos; if(mp) POD.set(mp.x,mp.y,mp.z) }
  const previewActive=CM.active||!!(overlay&&!overlay.hidden&&document.body.classList.contains('menu-character-zoom'));
  if(previewActive)place(dt);
  if(zoom){
    zoom.t+=Math.min(.05,dt||0)/.9;const k=ease(Math.min(1,zoom.t));
    const targetPos=zoom.direction==='in'?new T.Vector3(POD.x-3.1,3,POD.z+6.2):HOME_POS;
    const targetLook=zoom.direction==='in'?new T.Vector3(POD.x-2.6,2,POD.z):HOME_LOOK;
    cam.pos.lerpVectors(zoom.fromPos,targetPos,k);cam.look.lerpVectors(zoom.fromLook,targetLook,k);
    if(zoom.t>=1){const direction=zoom.direction;zoom=null;if(direction==='out'){overlay.hidden=true;document.body.classList.remove('menu-character-zoom');CM.camOverride=null;cam.pos.copy(HOME_POS);cam.look.copy(HOME_LOOK)}}
  }
  rim.userData.menuBaseIntensity+=((hover||zoom||!overlay?.hidden?90:0)-rim.userData.menuBaseIntensity)*Math.min(1,(dt||.016)*8);
  const r=orig.call(this,dt,t);
  if(!previewActive)release();
  return r;
};
window.AshfallMenuCharacter={open:()=>open(),close,zoomTo:()=>open(true),get isOpen(){return !!overlay&&!overlay.hidden},get isDragging(){return !!spinPointer},get hover(){return hover},get zooming(){return !!zoom}};
})();
