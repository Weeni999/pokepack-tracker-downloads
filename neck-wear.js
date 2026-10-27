/* Ten modular mechanical neck chains with damped pendulum motion. */
(() => {
'use strict';
const names=['BRASS LINK / PADLOCK','INDUSTRIAL CABLE','HEAVY CURB CHAIN','CHAIN & DOG TAG','LOCKED SHACKLES','SCRAP ROSARY','COPPER PENDULUM','WELDERS LINK','OVERSIZED KEY','CAGED MEDALLION'];
function update(pivot,dt,{velocity,impact=0,reduced=false}={}){if(!pivot)return;const time=performance.now()*.001, speed=velocity?.length?.()||0, amp=reduced?0:Math.min(.3,.045+speed*.025+impact*.08);pivot.rotation.z+=(Math.sin(time*2.2)*amp-pivot.rotation.z)*Math.min(1,dt*8);pivot.rotation.x+=(Math.cos(time*1.7)*amp*.55-pivot.rotation.x)*Math.min(1,dt*7)}
window.AshfallNeckWear={names,update};
})();
