/* Shift+R toggles the bottom media player and the bottom-right Cockpit Radio together.
   Hiding is pure CSS (display:none on a root class), so both widgets keep their DOM, layout, playback and settings and come back exactly as they were. */
(() => {
'use strict';
const KEY='ashfall_media_ui_hidden',CLASS='cockpit-media-hidden',IDS=['cockpit-media','cockpit-radio-dock'];
const style=document.createElement('style');style.textContent=`html.${CLASS} #cockpit-media,html.${CLASS} #cockpit-radio-dock{display:none!important}`;document.head.append(style);
let hidden=false,focusMemory=null;try{hidden=localStorage.getItem(KEY)==='1'}catch{}
const widgets=()=>IDS.map(id=>document.getElementById(id)).filter(Boolean);
function apply(){document.documentElement.classList.toggle(CLASS,hidden);for(const w of widgets())w.inert=hidden}
function toggle(){
  hidden=!hidden;try{localStorage.setItem(KEY,hidden?'1':'0')}catch{}
  if(hidden){const a=document.activeElement;if(a&&widgets().some(w=>w.contains(a))){focusMemory=a;a.blur()}}                       // never leave focus on something that just vanished
  else if(focusMemory&&document.contains(focusMemory)){const f=focusMemory;focusMemory=null;requestAnimationFrame(()=>f.focus?.({preventScroll:true}))}
  apply();window.AshfallChickens?.notify?.(hidden?'MEDIA + RADIO HIDDEN · SHIFT+R TO SHOW':'MEDIA + RADIO SHOWN · SHIFT+R TO HIDE');
}
window.addEventListener('keydown',e=>{
  if(e.code!=='KeyR'||!e.shiftKey||e.ctrlKey||e.altKey||e.metaKey||e.repeat)return;
  if(e.target?.closest?.('input:not([type=range]):not([type=checkbox]):not([type=color]),textarea,select,[contenteditable=true]'))return;   // typing a capital R stays typing
  e.preventDefault();e.stopPropagation();toggle();
},true);
document.addEventListener('DOMContentLoaded',apply);apply();
window.AshfallMediaUI={toggle,get hidden(){return hidden}};
})();
