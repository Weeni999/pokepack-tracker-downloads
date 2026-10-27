/* Models 3-5: chrome filigree humanoid, gaunt scavenger, barrel hauler. (v2: slimmer proportions, bent elbows, detailed hands/feet, cabling) */
(() => {
'use strict';
if(!window.AshfallModels)return;
const T=THREE,PI=Math.PI,X=AshfallModels;
const rnd=(()=>{let s=7;return()=>(s=(s*16807)%2147483647)/2147483647})();

// ---------------------------------------------------------------------------------------------------------------- 3  CHROME FILIGREE
X.register(2,{build(K){
  const {M,box,cyl,sph,tor,group,cap,lathe,tube,add}=K,g=new T.Group(),HIP=1.6,up=group(g,0,0,0);up.rotation.y=.14;
  // pelvis: chrome shell around an exposed gear mechanism with red/black service tubing
  sph(g,M.chrome,.31,.17,.23,0,HIP+.12,0,40);cyl(g,M.black,.1,.1,.22,0,HIP+.1,.14,PI/2,0,0,18);
  for(const r of [.07,.045,.025])tor(g,M.darkChrome,r,.011,0,HIP+.1,.255-r*.2,0,0,0);
  for(let i=0;i<10;i++){const a=i/10*PI*2;cyl(g,M.chrome,.008,.008,.035,Math.sin(a)*.07,HIP+.1+Math.cos(a)*.07,.26,PI/2,0,0,5)}
  tube(g,M.wireRed,[[-.2,HIP+.05,.1],[-.12,HIP+.0,.19],[.0,HIP-.02,.2],[.12,HIP+.02,.18],[.21,HIP+.08,.1]],.014);tube(g,M.wire,[[-.18,HIP+.2,.12],[-.05,HIP+.28,.17],[.1,HIP+.26,.16],[.2,HIP+.18,.1]],.011);
  // waist, hourglass ribcage with fine rib rings and an exposed spine
  cyl(up,M.darkChrome,.09,.105,.5,0,HIP+.5,0,0,0,0,20);for(let i=0;i<6;i++)sph(up,M.chrome,.05,.04,.05,0,2.0+i*.065,-.1);
  lathe(up,M.chrome,[[.001,2.28],[.1,2.3],[.14,2.48],[.2,2.68],[.3,2.86],[.32,3.0],[.25,3.12],[.14,3.2],[.001,3.22]],0,0,0,56);
  for(let i=0;i<6;i++)tor(up,M.darkChrome,.2+.1*Math.sin(i/5*PI*.9),.011,0,2.5+i*.1,0,PI/2,0,0);
  for(let i=0;i<7;i++)sph(up,M.darkChrome,.025,.022,.03,0,2.35+i*.12,-.17);
  tube(up,M.wireRed,[[.04,2.3,.1],[.1,2.42,.13],[.02,2.55,.15]],.009);
  // long neck with ring joints
  cyl(up,M.darkChrome,.03,.042,.42,0,3.42,0,0,0,0,14);for(let i=0;i<6;i++)tor(up,M.chrome,.045,.008,0,3.24+i*.07,0,PI/2,0,0);
  // head: back-swept alien skull in satin pink-grey metal, hollow eyes, flared crest fins and fine filigree wire
  const HD=group(g,0,0,0);HD.rotation.y=.14;
  sph(HD,M.skin,.17,.29,.2,0,3.78,-.03,40);sph(HD,M.skin,.115,.2,.1,0,3.7,.1,32);
  for(const s of [-1,1]){sph(HD,M.black,.032,.055,.03,s*.065,3.77,.19,14);
    const fin=sph(HD,M.chrome,.022,.3,.13,s*.17,3.92,-.1);fin.rotation.set(0,s*.3,s*.5);const fin2=sph(HD,M.darkChrome,.012,.22,.1,s*.2,3.9,-.13);fin2.rotation.set(0,s*.3,s*.5);
    tube(HD,M.chrome,[[s*.06,4.02,-.04],[s*.14,4.16,-.1],[s*.24,4.18,-.2],[s*.3,4.08,-.28]],.007)}
  box(HD,M.black,.04,.01,.02,0,3.62,.185);tube(HD,M.darkChrome,[[0,4.04,-.06],[0,4.2,-.14],[0,4.22,-.28]],.01);
  // arms: slender, elbow bend, long five-finger hands
  const hand=(p,y)=>{box(p,M.chrome,.06,.08,.022,0,y,0);for(let f=-1.5;f<=1.5;f+=1)cap(p,M.chrome,.009,.13,f*.02,y-.1,0,0,0,f*.07);cap(p,M.chrome,.01,.08,.045,y-.03,.0,0,0,-.8)};
  const mkArm=(s,rx,rz,bend)=>{const sh=group(up,s*.36,3.02,0);sph(sh,M.chrome,.09,.09,.09,0,0,0);cap(sh,M.chrome,.056,.5,0,-.33,0);tor(sh,M.darkChrome,.05,.008,0,-.18,0,PI/2,0,0);
    const el=group(sh,0,-.64,0);sph(el,M.darkChrome,.055,.055,.055,0,0,0);cap(el,M.chrome,.043,.48,0,-.32,0);tor(el,M.darkChrome,.04,.007,0,-.15,0,PI/2,0,0);sph(el,M.darkChrome,.035,.035,.035,0,-.66,0);hand(el,-.72);return K.arm(sh,rx,rz,el,bend)};
  const armL=mkArm(-1,.35,.16,-.5),armR=mkArm(1,0,2.3,-.7);
  // legs: slim chrome with calf shaping, knee mechanism, ankle joint, high-heeled foot
  const mkLeg=(s,rx)=>{const hip=group(g,s*.19,HIP,0);sph(hip,M.chrome,.115,.115,.115,0,0,0);cap(hip,M.chrome,.095,.58,0,-.42,0);tor(hip,M.darkChrome,.09,.01,0,-.3,0,PI/2,0,0);
    sph(hip,M.darkChrome,.088,.088,.088,0,-.84,0);tor(hip,M.chrome,.1,.009,0,-.84,0,0,PI/2,0);for(const z of [-.05,.05])cyl(hip,M.darkChrome,.01,.01,.22,0,-.84,z*1.1,0,0,0,6);
    cyl(hip,M.chrome,.075,.042,.5,0,-1.14,0,0,0,0,20);sph(hip,M.chrome,.078,.14,.088,0,-1.02,-.03,24);sph(hip,M.darkChrome,.038,.038,.038,0,-1.43,0);
    const foot=group(hip,0,-1.47,0);sph(foot,M.chrome,.04,.04,.04,0,0,0);cap(foot,M.chrome,.026,.17,0,-.05,.11,PI/2-.55,0,0);sph(foot,M.chrome,.03,.03,.03,0,-.085,.2);cyl(foot,M.chrome,.022,.008,.09,0,-.085,-.045,0,0,0,10);
    return K.leg(hip,foot,1.47,HIP,rx,.03)};
  const legL=mkLeg(-1,-.38),legR=mkLeg(1,.3);
  const E=(c,r)=>({t:'ell',c,r}),C=(c,r,h,axis)=>({t:'cyl',c,r,h,axis:axis||'y'}),B=(c,s)=>({t:'box',c,s});
  const sockets={head:{parent:up,hull:E([0,3.78,-.03],[.17,.29,.2])},chest:{parent:up,hull:E([0,2.76,0],[.33,.5,.27])},back:{parent:up,hull:B([0,2.78,-.3],[.5,.8,.06])},
    shoulderL:{parent:up,hull:E([-.36,3.02,0],[.09,.09,.09])},shoulderR:{parent:up,hull:E([.36,3.02,0],[.09,.09,.09])},
    armL:{parent:armL.elbow,hull:C([0,-.32,0],.05,.62)},armR:{parent:armR.elbow,hull:C([0,-.32,0],.05,.62)},
    thighL:{parent:legL.hip,hull:C([0,-.42,0],.105,.62)},thighR:{parent:legR.hip,hull:C([0,-.42,0],.105,.62)},
    shinL:{parent:legL.hip,hull:C([0,-1.14,0],.08,.5)},shinR:{parent:legR.hip,hull:C([0,-1.14,0],.08,.5)}};
  return {group:g,height:4.2,width:2.9,legLength:HIP,legs:[legL,legR],arms:[armL,armR],sockets,parts:{head:HD}};
}});

// ---------------------------------------------------------------------------------------------------------------- 4  GAUNT SCAVENGER
X.register(3,{build(K){
  const {M,box,cyl,sph,tor,group,cap,tube,plate}=K,g=new T.Group(),HIP=1.55;
  // pelvis frame
  for(const x of [-.28,.28])box(g,M.skel,.05,.3,.36,x,HIP+.16,0);box(g,M.scav,.62,.1,.4,0,HIP+.34,0);box(g,M.skel,.46,.08,.3,0,HIP-.02,0);cyl(g,M.skel,.05,.05,.5,0,HIP+.12,0,0,0,PI/2,8);
  // chassis: rust-streaked grey box with riveted vent grille
  plate(g,M.scav,.9,.82,.58,.05,0,2.18,0);plate(g,M.skel,.6,.46,.04,.02,0,2.1,.31);for(let i=-4;i<=4;i++)box(g,M.black,.03,.4,.04,i*.062,2.1,.33);
  for(const y of [1.9,2.3])for(let i=-5;i<=5;i++)cyl(g,M.brass,.012,.012,.02,i*.072,y,.31,PI/2,0,0,6);
  for(const s of [-1,1]){box(g,M.skel,.06,.6,.5,s*.48,2.18,0);cyl(g,M.skel,.03,.03,.5,s*.3,1.72,.0,0,0,0,6)}
  // head housing with one big green optic
  const HD=group(g,0,0,0);
  cyl(HD,M.scav,.22,.26,.22,0,2.72,0,0,0,0,24);cyl(HD,M.black,.2,.2,.1,0,2.72,.2,PI/2,0,0,24);tor(HD,M.skel,.2,.032,0,2.72,.255,0,0,0);cyl(HD,M.green,.135,.135,.04,0,2.72,.265,PI/2,0,0,24);cyl(HD,M.greenGlow,.08,.08,.05,0,2.72,.285,PI/2,0,0,18);
  cyl(HD,M.skel,.015,.015,.4,.15,3.05,-.05,0,0,.12,6);tube(HD,M.wire,[[-.1,2.6,.0],[-.22,2.5,.1],[-.3,2.45,.2]],.012);
  // belly cabling: many hanging bundles
  for(let i=0;i<8;i++){const x=-.3+i*.085;tube(g,i%3?M.wire:M.wireRed,[[x,1.82,.05+rnd()*.15],[x+(rnd()-.5)*.1,1.55,.1+rnd()*.15],[x+(rnd()-.5)*.16,1.2+rnd()*.2,.05+rnd()*.12]],.01+rnd()*.006)}
  // arms: long three-part limbs with elbow bend, cable bundles, spindly five-finger hands
  const mkArm=(s,bend)=>{const sh=group(g,s*.6,2.5,0);sph(sh,M.skel,.1,.1,.1,0,0,0);tor(sh,M.darkRust,.085,.016,0,0,0,0,PI/2,0);cyl(sh,M.skel,.038,.032,.78,0,-.42,0,0,0,0,10);tor(sh,M.darkRust,.045,.012,0,-.2,0,PI/2,0,0);tor(sh,M.darkRust,.04,.012,0,-.6,0,PI/2,0,0);
    const el=group(sh,0,-.84,0);sph(el,M.scav,.065,.065,.065,0,0,0);cyl(el,M.skel,.032,.026,.8,0,-.42,0,0,0,0,10);tor(el,M.darkRust,.038,.012,0,-.3,0,PI/2,0,0);
    tube(sh,M.wire,[[.03,-.05,.04],[.08,-.5,.06]],.01);tube(el,M.wire,[[.04,.0,.04],[.06,-.4,.06],[.03,-.85,.03]],.011);tube(el,M.wireRed,[[-.04,.0,.03],[-.07,-.45,.0],[-.03,-.88,.03]],.009);
    box(el,M.scav,.06,.1,.06,0,-.86,0);for(let f=-2;f<=2;f++)cyl(el,M.skel,.01,.006,.26,f*.02,-1.03,0,0,0,f*.07,6);return K.arm(sh,0,.16,el,bend)};
  const armL=mkArm(-1,-.25),armR=mkArm(1,-.2);
  // legs: twin-rod thigh and shin, knee joint, ankle, splayed three-claw foot, tendons
  const mkLeg=s=>{const hip=group(g,s*.27,HIP,0);sph(hip,M.skel,.085,.085,.085,0,0,0);
    for(const z of [-.04,.04]){cyl(hip,M.skel,.03,.026,.85,0,-.46,z,0,0,0,8);cyl(hip,M.skel,.022,.018,.84,0,-1.18,z,0,0,0,8)}
    tor(hip,M.darkRust,.06,.013,0,-.25,0,PI/2,0,0);tor(hip,M.darkRust,.055,.013,0,-1.1,0,PI/2,0,0);sph(hip,M.scav,.075,.075,.075,0,-.9,0);cyl(hip,M.skel,.03,.03,.14,0,-.9,0,0,0,PI/2,10);
    tube(hip,M.wire,[[.05,-.1,.05],[.09,-.6,.06],[.04,-1.2,.04]],.01);cyl(hip,M.skel,.012,.012,.8,.06,-.46,.0,0,0,.03,5);
    const foot=group(hip,0,-1.4,0);sph(foot,M.skel,.05,.05,.05,0,0,0);box(foot,M.scav,.12,.07,.2,0,-.08,-.04);for(const a of [-.4,0,.4])cyl(foot,M.skel,.016,.006,.32,Math.sin(a)*.17,-.12,.14+Math.cos(a)*.07,PI/2+.15,0,a,6);
    return K.leg(hip,foot,1.4,HIP,0,.06)};
  const legL=mkLeg(-1),legR=mkLeg(1);
  const E=(c,r)=>({t:'ell',c,r}),C=(c,r,h,axis)=>({t:'cyl',c,r,h,axis:axis||'y'}),B=(c,s)=>({t:'box',c,s});
  const sockets={head:{parent:g,hull:C([0,2.72,0],.27,.24)},chest:{parent:g,hull:B([0,2.18,0],[.96,.86,.62])},back:{parent:g,hull:B([0,2.18,-.31],[.8,.8,.04])},
    shoulderL:{parent:g,hull:E([-.6,2.5,0],[.11,.11,.11])},shoulderR:{parent:g,hull:E([.6,2.5,0],[.11,.11,.11])},
    armL:{parent:armL.elbow,hull:C([0,-.42,0],.045,.85)},armR:{parent:armR.elbow,hull:C([0,-.42,0],.045,.85)},
    thighL:{parent:legL.hip,hull:C([0,-.46,0],.09,.85)},thighR:{parent:legR.hip,hull:C([0,-.46,0],.09,.85)},
    shinL:{parent:legL.hip,hull:C([0,-1.18,0],.07,.85)},shinR:{parent:legR.hip,hull:C([0,-1.18,0],.07,.85)}};
  return {group:g,height:3.15,width:2.6,legLength:HIP,legs:[legL,legR],arms:[armL,armR],sockets,parts:{head:HD}};
}});

// ---------------------------------------------------------------------------------------------------------------- 5  BARREL HAULER
X.register(4,{build(K){
  const {M,box,cyl,sph,tor,group,cap,lathe,plate,tube,add}=K,g=new T.Group(),HIP=1.1;
  // staved barrel torso across the hips: bulged drum, heavy hoops, riveted belly plate
  const drum=lathe(g,M.barrel,[[.001,-.84],[.7,-.84],[.82,-.65],[.9,-.25],[.93,0],[.9,.25],[.82,.65],[.7,.84],[.001,.84]],0,2.05,0,56);drum.rotation.z=PI/2;
  for(const x of [-.55,-.18,.18,.55]){tor(g,M.darkRust,.915-Math.abs(x)*.12,.05,x,2.05,0,0,PI/2,0)}
  for(let i=0;i<20;i++){const a=i*PI*2/20;for(const x of [-.55,.55])cyl(g,M.brass,.022,.022,.03,x,2.05+Math.sin(a)*.85,Math.cos(a)*.85,Math.sin(a)*0,0,0,6)}
  // end hubs carrying the arms: concentric rings, bolt circles, centre caps
  for(const s of [-1,1]){cyl(g,M.darkRust,.66,.66,.12,s*.92,2.05,0,0,0,PI/2,40);cyl(g,M.steel,.5,.5,.28,s*1.02,2.05,0,0,0,PI/2,36);tor(g,M.darkRust,.55,.04,s*1.0,2.05,0,0,PI/2,0);tor(g,M.steel,.4,.03,s*1.18,2.05,0,0,PI/2,0);
    for(let i=0;i<10;i++){const a=i*PI/5;cyl(g,M.brass,.04,.04,.07,s*1.18,2.05+Math.sin(a)*.3,Math.cos(a)*.3,0,0,PI/2,6)}sph(g,M.steel,.2,.2,.1,s*1.2,2.05,0)}
  plate(g,M.darkRust,.95,.55,.1,.05,0,1.62,.84,-.32,0,0);for(const x of [-.4,.4])for(const y of [1.45,1.8])cyl(g,M.brass,.03,.03,.04,x,y,.9,PI/2-.32,0,0,6);box(g,M.darkRust,.7,.3,.5,0,1.42,.0);box(g,M.steel,1.0,.28,.6,0,HIP+.2,0);
  // arms: thick hydraulics, elbow bend, plated forearms, heavy articulated claws
  const mkArm=(s,bend)=>{const sh=group(g,s*1.15,2.05,0);sph(sh,M.steel,.34,.34,.34,0,0,0);cyl(sh,M.darkRust,.24,.22,.8,0,-.5,0,0,0,0,24);tor(sh,M.steel,.25,.05,0,-.3,0,PI/2,0,0);plate(sh,M.barrel,.34,.55,.1,.04,0,-.5,.24);cyl(sh,M.black,.06,.06,.6,s*.2,-.55,.1,0,0,0,10);
    const el=group(sh,0,-.98,0);sph(el,M.steel,.29,.29,.29,0,0,0);cyl(el,M.black,.17,.17,.64,0,0,0,0,0,PI/2,16);cyl(el,M.darkRust,.28,.25,.8,0,-.55,0,0,0,0,24);plate(el,M.darkRust,.4,.5,.12,.05,0,-.45,.26);tor(el,M.steel,.28,.05,0,-.25,0,PI/2,0,0);
    box(el,M.steel,.46,.3,.36,0,-1.06,0);cyl(el,M.black,.06,.06,.1,0,-1.0,.2,PI/2,0,0,8);
    for(const x of [-.15,0,.15]){const f=group(el,x,-1.2,.1);cyl(f,M.steel,.06,.06,.12,0,0,0,0,0,PI/2,10);box(f,M.darkRust,.11,.3,.13,0,-.17,.02,.2,0,0);box(f,M.steel,.09,.2,.1,0,-.42,.1,.55,0,0)}
    box(el,M.darkRust,.1,.26,.12,s*.26,-1.2,.0,0,0,s*-.4);return K.arm(sh,-.2,.1,el,bend)};
  const armL=mkArm(-1,-.55),armR=mkArm(1,-.5);
  // legs: thick thigh armour, round knee hubs with bolts, shin cylinders, boots
  const mkLeg=s=>{const hip=group(g,s*.55,HIP,0);sph(hip,M.steel,.3,.3,.3,0,0,0);plate(hip,M.darkRust,.56,.62,.58,.06,0,-.36,0);box(hip,M.barrel,.4,.3,.1,0,-.3,.3);
    cyl(hip,M.steel,.3,.3,.4,0,-.72,0,0,0,PI/2,36);tor(hip,M.darkRust,.3,.04,s*.2,-.72,0,0,PI/2,0);cyl(hip,M.darkRust,.2,.2,.46,0,-.72,0,0,0,PI/2,24);for(let i=0;i<8;i++){const a=i*PI/4;cyl(hip,M.brass,.03,.03,.05,s*.23,-.72+Math.sin(a)*.2,Math.cos(a)*.2,0,0,PI/2,6)}
    cyl(hip,M.darkRust,.2,.17,.4,0,-.9,0,0,0,0,24);plate(hip,M.darkRust,.34,.34,.1,.04,0,-.92,.2);tube(hip,M.wire,[[.18,-.45,.15],[.26,-.7,.12],[.2,-.9,.1]],.014);
    const foot=group(hip,0,-.8,0);box(foot,M.darkRust,.62,.2,.95,0,-.1,.1);box(foot,M.steel,.66,.08,1.0,0,-.26,.1);box(foot,M.barrel,.4,.1,.3,0,.0,.4);plate(foot,M.steel,.5,.18,.12,.03,0,-.12,.62);
    return K.leg(hip,foot,.8,HIP,0,.05)};
  const legL=mkLeg(-1),legR=mkLeg(1);
  const E=(c,r)=>({t:'ell',c,r}),C=(c,r,h,axis)=>({t:'cyl',c,r,h,axis:axis||'y'}),B=(c,s)=>({t:'box',c,s});
  const sockets={head:{parent:g,hull:E([0,3.0,0],[.4,.25,.4])},chest:{parent:g,hull:C([0,2.05,0],.93,1.7,'x')},back:{parent:g,hull:B([0,2.05,-.95],[1.2,1.0,.12])},
    shoulderL:{parent:g,hull:E([-1.15,2.05,0],[.42,.5,.5])},shoulderR:{parent:g,hull:E([1.15,2.05,0],[.42,.5,.5])},
    armL:{parent:armL.elbow,hull:C([0,-.55,0],.28,.8)},armR:{parent:armR.elbow,hull:C([0,-.55,0],.28,.8)},
    thighL:{parent:legL.hip,hull:B([0,-.36,0],[.58,.64,.6])},thighR:{parent:legR.hip,hull:B([0,-.36,0],[.58,.64,.6])},
    shinL:{parent:legL.hip,hull:C([0,-.9,0],.2,.4)},shinR:{parent:legR.hip,hull:C([0,-.9,0],.2,.4)}};
  return {group:g,height:3.0,width:3.8,legLength:HIP,legs:[legL,legR],arms:[armL,armR],sockets};
}});
})();
