/* Esc = back. Closes the topmost thing first: dev menu, settings, chat/inspect panel, then steps back through the screens
   (locker/coop/pit/shop/... -> the screen you came from -> main menu). In the yard with nothing open, Esc keeps its normal pause/settings behaviour. */
(() => {
'use strict';
const views=()=>[...document.querySelectorAll('[data-view]')],visible=()=>views().find(v=>!v.hidden)?.dataset.view||null;
const stack=[];let last=visible(),going=false;
new MutationObserver(()=>{const cur=visible();if(cur===last)return;if(!going&&last&&cur&&cur!=='menu')stack.push(last);if(cur==='menu')stack.length=0;last=cur;going=false}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['hidden']});
function back(){const target=stack.pop()||'menu';going=true;window.AshfallChickens?.showScreen(target);if(visible()===last)going=false}
window.addEventListener('keydown',e=>{
  if(e.key!=='Escape'||e.repeat||e.defaultPrevented)return;
  const eat=()=>{e.preventDefault();e.stopImmediatePropagation()};
  if(window.AshfallDevMenu?.open){eat();AshfallDevMenu.toggle(false);return}
  if(window.AshfallSettings?.isOpen)return;                          // settings.js closes itself
  if(window.AshfallMenuCharacter?.isOpen){eat();window.AshfallMenuCharacter.close();return}
  if(e.target.closest?.('input,textarea,select')&&e.target.type!=='range'){e.target.blur();eat();return}
  const state=window.AshfallEntrySequence?.state;
  if(state==='IN_WORLD'){
    if(window.AshfallLobbySocial?.inputOpen){eat();AshfallLobbySocial.close();return}
    if([...document.querySelectorAll('.screen-view')].some(p=>!p.hidden)){eat();AshfallEntrySequence.hidePanels();return}
    return;                                                           // nothing open: normal pause / settings
  }
  if(state==='MENU'){const cur=visible();if(cur&&cur!=='menu'){eat();back()}}
},true);
})();
