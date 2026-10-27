/* Shared randomizer, skin-module adapter, and per-character material palette controller. */
(() => {
'use strict';
const THEMES=[
 {name:'BLOOD IRON',finish:'#5b241e',secondary:'#b48a55',trimColor:'#d04b31',lens:'#ff4936',bootColor:'#342322',panelColor:'#231817'},
 {name:'COLD CHROME',finish:'#6a8790',secondary:'#d4dde0',trimColor:'#a8bac4',lens:'#42dcff',bootColor:'#303a40',panelColor:'#202a30'},
 {name:'TOXIC YARD',finish:'#526c3f',secondary:'#c4ad57',trimColor:'#e0b238',lens:'#9aff44',bootColor:'#303522',panelColor:'#1b2417'},
 {name:'ROYAL ASH',finish:'#4a385e',secondary:'#cbb56e',trimColor:'#dfcc8d',lens:'#c28aff',bootColor:'#2b2432',panelColor:'#1b1821'},
 {name:'DEEP WATER',finish:'#174e57',secondary:'#72c4c2',trimColor:'#a4eee2',lens:'#6affdc',bootColor:'#203438',panelColor:'#101f23'},
 {name:'WELDER ORANGE',finish:'#a94f20',secondary:'#343c40',trimColor:'#d7c08d',lens:'#fff19a',bootColor:'#3a2820',panelColor:'#24201a'},
 {name:'BONE LOT',finish:'#9c9279',secondary:'#393633',trimColor:'#c6b99b',lens:'#f7edc7',bootColor:'#292825',panelColor:'#292722'},
 {name:'PIT NEON',finish:'#441b3a',secondary:'#b54087',trimColor:'#51d9bd',lens:'#ff4dcc',bootColor:'#241b28',panelColor:'#17131d'},
 {name:'SODIUM HAZE',finish:'#71613e',secondary:'#bc8d45',trimColor:'#e2b25e',lens:'#ffd34d',bootColor:'#322b20',panelColor:'#29241a'},
 {name:'STATIC WHITE',finish:'#aeb6b2',secondary:'#39434a',trimColor:'#8babb7',lens:'#d5ffff',bootColor:'#22282d',panelColor:'#252b2d'}
];
const MODULES=['head','chest','shoulders','arms','legs','back'],records=new WeakMap();
const randomInt=n=>Math.floor(Math.random()*Math.max(1,n));
const colorOK=v=>/^#[\da-f]{6}$/i.test(String(v||''));
function applyPalette(root,profile={}){
 if(!root)return;const sig=JSON.stringify([profile.finish,profile.secondary,profile.panelColor,profile.trimColor,profile.bootColor,profile.lens]);let state=records.get(root);if(!state){state={meshes:new Map(),signature:'',group:null,skinState:null};records.set(root,state)}
 const group=root.children?.find(o=>o.name==='modelRoot'||o.name==='chickenModel')||root,skinState=window.AshfallSkinSets?.states?.get(root)||null;if(state.signature===sig&&state.group===group&&state.skinState===skinState)return;state.group=group;state.skinState=skinState;
 const live=new Set();root.traverse(o=>{if(!o.isMesh)return;const source=Array.isArray(o.material)?o.material:null,items=source||[o.material];if(!items.length)return;const roles=items.map(m=>m?.userData?.colorRole||o.userData?.colorRole||'');if(!roles.some(Boolean))return;live.add(o);let rec=state.meshes.get(o);if(!rec||rec.source!==o.material){if(rec)for(const m of rec.clones)m?.dispose?.();const clones=items.map(m=>m?.clone?.()||m);rec={source:o.material,clones,role:roles};state.meshes.set(o,rec);o.material=source?clones:clones[0]}
  rec.clones.forEach((m,i)=>{const role=rec.role[i],key=role==='primary'?'finish':role==='secondary'?'secondary':role==='panel'?'panelColor':role==='trim'?'trimColor':role==='boot'?'bootColor':role==='glow'?'lens':null,c=profile[key];if(!key||!colorOK(c))return;m.color?.set(c);if(role==='glow'&&m.emissive)m.emissive.set(c);m.needsUpdate=true})});
 for(const [mesh,rec]of state.meshes)if(!live.has(mesh)){for(const m of rec.clones)m?.dispose?.();state.meshes.delete(mesh)}
 state.signature=sig;
}
/* Variation: every slot is rolled independently, so two clicks almost never share a body. Robots: head, torso, left/right arm and left/right leg each pick any of the base models
   (20% chance a slot just follows the chassis, so most results are mixes); skin is a full set 30%, bare 8%, or per-slot modules (each slot 22% empty); the palette is a theme or a
   freshly generated colour scheme. The last 40 results are remembered per character and a candidate that repeats one is re-rolled. */
function moduleMap(){const o={};for(const key of MODULES)o[key]=Math.random()<.22?-1:randomInt(10);if(Object.values(o).every(v=>v<0))o[MODULES[randomInt(MODULES.length)]]=randomInt(10);return o}
function colors(){
 if(Math.random()<.4||!window.AshfallColors?.combination)return THEMES[randomInt(THEMES.length)];
 const mode=['complementary','triadic','analogous','wild'][randomInt(4)],c=window.AshfallColors.combination(mode);return {name:'GENERATED '+mode.toUpperCase(),...c};
}
const history={robot:[],chicken:[]};
function unique(mode,make){let cand,sig;for(let i=0;i<40;i++){cand=make();sig=JSON.stringify(cand);if(!history[mode].includes(sig))break}history[mode].push(sig);if(history[mode].length>40)history[mode].shift();return cand}
function robotCandidate(){
 const n=window.AshfallModels?.names?.length||window.AshfallParts?.names?.model?.length||5,model=String(randomInt(n)),pk=()=>Math.random()<.2?model:String(randomInt(n));
 const parts={head:pk(),torso:pk(),armL:pk(),armR:pk(),legL:pk(),legR:pk()},roll=Math.random();
 return {model,parts,skin:roll<.3?{skinSet:String(randomInt(window.AshfallSkinSets?.defs?.length||10))}:roll<.38?{skinSet:'-1'}:{skinSet:-2,skinModules:moduleMap()},palette:colors(),neckWear:Math.random()<.16?'none':String(randomInt(window.AshfallNeckWear?.names?.length||1))};
}
function chickenCandidate(cur){
 const n=window.AshfallChickenModels?.count||5;let m=randomInt(n);if(n>1&&m===Number(cur))m=(m+1+randomInt(n-1))%n;
 const roll=Math.random();
 return {model:String(m),skin:roll<.3?{skinSet:randomInt(10)}:roll<.38?{skinSet:-1}:{skinSet:-2,skinModules:moduleMap()},palette:colors(),neckWear:Math.random()<.16?'none':String(randomInt(window.AshfallNeckWear?.names?.length||1))};
}
function randomizeAll(mode=window.AshfallCustomizerMode||'robot'){
 if(mode==='chicken'){
  const bird=window.AshfallChickens?.selected;if(!bird)return false;const v=bird.visual,parts=window.AshfallChickenParts?.names||{};
  const c=unique('chicken',()=>chickenCandidate(v.model)),palette=c.palette;
  v.model=c.model;for(const key of ['body','head','wings','legs','tail'])v[key]=String(randomInt(parts[key]?.length||1));v.hat=String(randomInt(parts.hat?.length||1));v.neckWear=c.neckWear;
  v.skinSet=c.skin.skinSet;if(c.skin.skinModules)v.skinModules=c.skin.skinModules;else delete v.skinModules;
  {const {name,...pal}=palette;Object.assign(v,pal)}window.AshfallChickens.save();document.querySelectorAll('[data-part]').forEach(el=>{if(v[el.dataset.part]!==undefined)el.value=v[el.dataset.part]});document.querySelector('[data-wear]')&&(document.querySelector('[data-wear]').value=v.wear||0);window.dispatchEvent(new CustomEvent('ashfall-profile-color',{detail:{mode:'chicken',id:bird.id}}));return {mode,palette,skinModules:v.skinModules||null,skinSet:v.skinSet}}
 const p=window.AshfallRobotCustomizer?.profile;if(!p)return false;
 const c=unique('robot',robotCandidate),palette=c.palette;
 p.model=c.model;p.parts=c.parts;p.skinSet=c.skin.skinSet;if(c.skin.skinModules)p.skinModules=c.skin.skinModules;else delete p.skinModules;
 {const {name,...pal}=palette;Object.assign(p,pal)}for(const key of ['bodyShape','face','hat','shoulders','handShape','feetShape']){const n=window.AshfallParts?.names?.[key]?.length||1;p[key]=String(randomInt(n))}p.neckWear=c.neckWear;
 window.AshfallRobotCustomizer.persist();document.querySelectorAll('[data-robot]').forEach(el=>{el.value=p[el.dataset.robot]});const skinSelect=document.querySelector('[data-skinset]');if(skinSelect)skinSelect.value=String(p.skinSet);document.querySelector('[data-wear]')&&(document.querySelector('[data-wear]').value=p.wear||0);window.dispatchEvent(new CustomEvent('ashfall-profile-color',{detail:{mode:'robot'}}));return {mode:'robot',palette,skinModules:p.skinModules||null,skinSet:p.skinSet}
}
function refreshPanel(){try{window.AshfallChickens?.showScreen?.('locker')}catch(e){console.warn('[randomizer] panel refresh:',e)}}
function lookRobot(){
 const c=unique('robot',robotCandidate),{name,...pal}=c.palette,P=window.AshfallParts,p={...(P?.defaults||{}),model:c.model,parts:c.parts,skinSet:c.skin.skinSet,...pal,neckWear:c.neckWear};
 if(c.skin.skinModules)p.skinModules=c.skin.skinModules;for(const key of ['bodyShape','face','hat','shoulders','handShape','feetShape']){const n=P?.names?.[key]?.length||1;p[key]=String(randomInt(n))}return p;
}
function lookChicken(){
 const c=unique('chicken',()=>chickenCandidate(-1)),{name,...pal}=c.palette,parts=window.AshfallChickenParts?.names||{},v={model:c.model,skinSet:c.skin.skinSet,...pal,neckWear:c.neckWear};
 if(c.skin.skinModules)v.skinModules=c.skin.skinModules;for(const key of ['body','head','wings','legs','tail','hat'])v[key]=String(randomInt(parts[key]?.length||1));return v;
}
function api(){return {lookRobot,lookChicken,randomizeAll,refreshPanel,moduleMap,applyPalette,themes:THEMES.map(x=>({...x})),modules:[...MODULES]}}
window.AshfallCharacterRandomizer=api();
const button=document.querySelector('[data-randomize-all]');button?.addEventListener('click',()=>{const result=randomizeAll();if(result&&(window.AshfallCustomizerMode==='chicken'))refreshPanel();if(result)window.AshfallChickens?.notify?.(`${result.palette.name||THEMES.find(x=>x===result.palette)?.name||'YARD'} CONFIGURATION BUILT.`)})
})();
