(() => {
'use strict';
const notice=(text)=>window.AshfallChickens?.notify?.(text);
const menu=document.querySelector('.menu-terminal');
if(!menu)return;
menu.querySelector('#load-save')?.addEventListener('click',()=>{
  let saved=false;
  try{saved=!!localStorage.getItem('ashfall_world_position')||!!localStorage.getItem('ashfall_chickens')}catch{}
  notice(saved?'LOCAL SAVE FOUND · RESTORING YOUR YARD':'NO SAVE FOUND · STARTING WITH THE GUARANTEED BIRD');
  document.getElementById('enter-yard')?.click();
});
menu.querySelector('#menu-options')?.addEventListener('click',()=>document.getElementById('game-settings-toggle')?.click());
const credits=document.getElementById('credits-dialog');
menu.querySelector('#menu-credits')?.addEventListener('click',()=>credits?.showModal?.());
credits?.querySelector('[data-close-credits]')?.addEventListener('click',()=>credits.close());
credits?.addEventListener('click',event=>{if(event.target===credits)credits.close()});
menu.querySelector('#menu-exit')?.addEventListener('click',()=>{
  try{window.close()}catch{}
  notice('THE BROWSER KEEPS THIS WINDOW OPEN · CLOSE THE TAB TO LEAVE');
});
})();
