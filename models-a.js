/* Models 1-2: heavy industrial mech, glossy service orb. (v2 mech: barrel torso with bulge, orange saddle plates, digitigrade legs, fingered fists) */
(() => {
'use strict';
if(!window.AshfallModels)return;
const T=THREE,PI=Math.PI,X=AshfallModels;

// ---------------------------------------------------------------------------------------------------------------- 1  HEAVY INDUSTRIAL MECH
X.register(0,{build(K){
  const {M,box,cyl,sph,plate,tor,group,cap,add,tube}=K,g=new T.Group(),HIP=1.6;
  const orangeD=M.orange.clone();orangeD.side=T.DoubleSide;
  // torso profile (y -> radius) shared by the lathe and the plates that wrap it
  const prof=[[.001,1.9],[.72,1.92],[.88,2.1],[1.0,2.35],[1.06,2.62],[1.02,2.88],[.94,3.04],[.001,3.04]],rAt=y=>{for(let i=0;i<prof.length-1;i++){const [r0,y0]=prof[i],[r1,y1]=prof[i+1];if(y>=y0&&y<=y1)return r0+(r1-r0)*(y-y0)/(y1-y0)}return .9};
  const wrap=(y,h,t0,tl)=>add(g,new T.CylinderGeometry(rAt(y+h/2)+.025,rAt(y-h/2)+.025,h,40,1,true,t0,tl),orangeD,0,y,0);
  // pelvis + hip mechanism
  plate(g,M.orange,1.45,.5,.85,.06,0,HIP+.12,0);box(g,M.steel,1.0,.3,.7,0,HIP-.12,0);cyl(g,M.black,.34,.34,.5,0,HIP+.02,.05,0,0,PI/2,16);for(const s of [-1,1])cyl(g,M.black,.07,.07,.5,s*.38,HIP+.35,.25,.2,0,0,10);
  // barrel torso (weathered blue-grey steel), orange saddle plates and belly band, open top with riveted collar
  const torso=add(g,new T.LatheGeometry(prof.map(p=>new T.Vector2(p[0],p[1])),48),M.steel,0,0,0);
  wrap(2.08,.5,-1.0,2.0);wrap(2.08,.5,PI-.9,1.8);wrap(1.97,.14,0,PI*2);wrap(2.97,.1,0,PI*2);
  for(const s of [-1,1])plate(g,M.orange,.5,.45,.1,.04,s*.5,1.95,rAt(1.95)+.04,.3,s*.42,0);
  cyl(g,M.black,.88,.88,.05,0,3.0,0,0,0,0,40);tor(g,M.steel,.94,.1,0,3.03,0,PI/2,0,0,0);
  for(let i=0;i<18;i++){const a=i*PI*2/18;cyl(g,M.brass,.035,.035,.05,Math.sin(a)*.94,3.1,Math.cos(a)*.94,0,0,0,6)}
  // pilot head: hard hat with lamp, goggles, antenna
  const HD=group(g,0,0,0);
  sph(HD,M.skin,.27,.3,.26,0,3.02,0);sph(HD,M.orange,.34,.28,.34,0,3.2,0);tor(HD,M.orange,.35,.05,0,3.12,0,PI/2,0,0);cyl(HD,M.lamp,.06,.08,.08,0,3.34,.24,PI/2.2,0,0,10);cyl(HD,M.black,.22,.22,.07,0,3.06,.26,PI/2,0,0,14);
  for(const s of [-1,1]){tor(HD,M.steel,.08,.022,s*.11,3.06,.3,0,0,0);cyl(HD,M.lens,.065,.065,.04,s*.11,3.06,.31,PI/2,0,0,14)}cyl(HD,M.steel,.022,.022,.55,.32,3.45,-.12,0,0,.1,6);
  // pauldrons: big rounded orange shells over grey joint rings
  for(const s of [-1,1]){sph(g,M.orange,.62,.46,.66,s*1.36,2.78,0);tor(g,M.steel,.55,.08,s*1.36,2.6,0,PI/2,0,0);tor(g,M.darkRust,.52,.03,s*1.36,2.88,0,PI/2,0,0);sph(g,M.steel,.28,.28,.28,s*1.36,2.55,0);cyl(g,M.steel,.1,.1,.5,s*1.02,2.5,0,0,0,PI/2,12)}
  // arms: grey hydraulics, orange cuffs, huge plated forearm, fingered fist
  const mkArm=s=>{const sh=group(g,s*1.36,2.5,0);
    cyl(sh,M.steel,.3,.27,.85,0,-.5,0);plate(sh,M.orange,.52,.38,.62,.06,0,-.3,0);cyl(sh,M.black,.07,.07,.7,s*.28,-.6,.12,0,0,0,10);tor(sh,M.steel,.31,.05,0,-.85,0,PI/2,0,0);
    const el=group(sh,0,-1.02,0);sph(el,M.steel,.32,.32,.32,0,0,0);cyl(el,M.black,.22,.22,.74,0,0,0,0,0,PI/2,18);
    cyl(el,M.darkRust,.44,.34,1.12,0,-.66,0,0,0,0,28);plate(el,M.orange,.34,.7,.14,.05,s*.4,-.6,.1);box(el,M.steel,.5,.14,.5,0,-.26,0);cyl(el,M.black,.06,.06,.5,-s*.32,-.9,.3,0,0,0,8);tor(el,M.steel,.35,.06,0,-1.2,0,PI/2,0,0);
    plate(el,M.steel,.64,.5,.58,.07,0,-1.52,0);plate(el,M.orange,.5,.14,.4,.04,0,-1.3,.2,.4,0,0);
    for(let i=-1.5;i<=1.5;i+=1){const f=group(el,i*.15,-1.76,.12);cyl(f,M.steel,.065,.065,.15,0,0,0,0,0,PI/2,10);box(f,M.darkRust,.12,.3,.15,0,-.2,.03,.25,0,0);const f2=group(f,0,-.36,.08);f2.rotation.x=.6;cyl(f2,M.steel,.055,.055,.13,0,0,0,0,0,PI/2,8);box(f2,M.steel,.1,.26,.13,0,-.17,0)}
    const th=group(el,s*.36,-1.62,.14);th.rotation.z=s*-.5;box(th,M.darkRust,.14,.34,.16,0,-.15,0);return K.arm(sh,-.14,.45,el,-.35)};
  const armL=mkArm(-1),armR=mkArm(1);
  // legs: orange thigh armour, bolted knee hubs, slim hydraulic shins, bird-like three-blade feet
  const mkLeg=s=>{const hip=group(g,s*.65,HIP,0);sph(hip,M.steel,.33,.33,.33,0,0,0);
    plate(hip,M.orange,.68,.95,.7,.07,0,-.5,0);box(hip,M.darkRust,.5,.22,.5,0,-.12,0);plate(hip,M.orange,.34,.42,.12,.05,0,-.98,.34,.2,0,0);
    cyl(hip,M.steel,.25,.25,.66,0,-1.02,0,0,0,PI/2,24);cyl(hip,M.black,.1,.1,.72,0,-1.02,0,0,0,PI/2,10);for(let i=0;i<6;i++){const a=i*PI/3;cyl(hip,M.brass,.03,.03,.05,s*.34,-1.02+Math.sin(a)*.18,Math.cos(a)*.18,0,0,PI/2,6)}
    for(const z of [-.15,.15])cyl(hip,M.steel,.065,.06,.5,0,-1.28,z,0,0,0,10);cyl(hip,M.darkRust,.1,.085,.44,0,-1.27,0,0,0,0,16);box(hip,M.orange,.22,.32,.08,0,-1.22,.2);sph(hip,M.steel,.12,.12,.12,0,-1.5,0);
    const foot=group(hip,0,-1.45,0);box(foot,M.darkRust,.34,.14,.36,0,-.04,-.02);box(foot,M.steel,.24,.1,.22,0,.03,-.2);for(const a of [-.38,0,.38])box(foot,M.steel,.1,.07,.6,Math.sin(a)*.34,-.1,.28+Math.cos(a)*.1,0,a,0);cyl(foot,M.darkRust,.04,.02,.2,0,-.1,-.3,PI/2-.4,0,0,6);
    return K.leg(hip,foot,1.45,HIP,0,.14)};
  const legL=mkLeg(-1),legR=mkLeg(1);
  const E=(c,r)=>({t:'ell',c,r}),C=(c,r,h,axis)=>({t:'cyl',c,r,h,axis:axis||'y'}),B=(c,s)=>({t:'box',c,s});
  const sockets={head:{parent:g,hull:E([0,3.08,0],[.36,.34,.36])},chest:{parent:g,hull:C([0,2.5,0],1.06,1.1)},back:{parent:g,hull:B([0,2.5,-1.08],[1.1,1.0,.16])},
    shoulderL:{parent:g,hull:E([-1.36,2.75,0],[.66,.56,.7])},shoulderR:{parent:g,hull:E([1.36,2.75,0],[.66,.56,.7])},
    armL:{parent:armL.elbow,hull:C([0,-.66,0],.45,1.1)},armR:{parent:armR.elbow,hull:C([0,-.66,0],.45,1.1)},
    thighL:{parent:legL.hip,hull:B([0,-.5,0],[.72,.97,.74])},thighR:{parent:legR.hip,hull:B([0,-.5,0],[.72,.97,.74])},
    shinL:{parent:legL.hip,hull:C([0,-1.27,0],.15,.5)},shinR:{parent:legR.hip,hull:C([0,-1.27,0],.15,.5)}};
  return {group:g,height:3.7,width:5.4,legLength:HIP,legs:[legL,legR],arms:[armL,armR],sockets,parts:{head:HD}};
}});

// ---------------------------------------------------------------------------------------------------------------- 2  SERVICE ORB
X.register(1,{build(K){
  const {M,box,cyl,sph,tor,group,cap,add}=K,g=new T.Group(),wheels=[];
  const BY=1.2,R=.86;
  const body=sph(g,M.gloss,R,R*.94,R*.96,0,BY,0,48);
  // visor: dark curved panel with a dot-matrix blue LED eye band and eyebrows, set in a slim gloss-grey frame
  const vg=new T.SphereGeometry(R*1.012,64,32,PI/2-.74,1.48,.62,.58);const visor=add(g,vg,M.visor,0,BY,0);visor.scale.set(1,.94,.96);
  const rim=new T.SphereGeometry(R*1.006,64,16,PI/2-.8,1.6,.56,.7);add(g,rim,M.glossGrey,0,BY,0).scale.set(1,.94,.96);visor.renderOrder=2;
  // panel seam between head and body, small chest vent line
  tor(g,M.glossGrey,R*.985,.018,0,BY-.02,0,PI/2,0,0);
  for(const s of [-1,1])cyl(g,M.black,.045,.045,.06,s*.14,BY-.2,R*.9,PI/2,0,0,10);
  // wheels (spin with ground distance) on short axle struts
  for(const s of [-1,1]){const w=group(g,s*.6,.3,.08);cyl(w,M.rubber,.3,.3,.22,0,0,0,0,0,PI/2,32);cyl(w,M.glossGrey,.17,.17,.24,0,0,0,0,0,PI/2,24);tor(w,M.rubber,.28,.03,0,0,0,0,PI/2,0);for(let i=0;i<6;i++){const a=i*PI/3;cyl(w,M.black,.018,.018,.26,0,Math.sin(a)*.1,Math.cos(a)*.1,0,0,PI/2,6)}wheels.push({mesh:w,radius:.3});
    box(g,M.black,.14,.26,.2,s*.5,.58,.08)}
  // side decal
  const logo=new T.Mesh(new T.CircleGeometry(.17,32),M.logo);logo.position.set(-R*.965,BY-.18,.18);logo.rotation.y=-PI/2+.22;g.add(logo);
  // stub arms with rounded hands
  const mkArm=s=>{const sh=group(g,s*.9,BY+.02,0);sph(sh,M.glossGrey,.13,.13,.13,0,0,0);cap(sh,M.gloss,.13,.3,s*.04,-.26,0,0,0,s*.06);sph(sh,M.darkChrome,.12,.12,.12,s*.06,-.55,0);
    for(const z of [-.05,.05])cap(sh,M.darkChrome,.025,.07,s*.06,-.66,z*1.4,0,0,0);return K.arm(sh,0,.25)};
  const armL=mkArm(-1),armR=mkArm(1);
  const idle=t=>{g.position.y=Math.sin(t*2.2)*.012};
  const E=(c,r)=>({t:'ell',c,r}),C=(c,r,h,axis)=>({t:'cyl',c,r,h,axis:axis||'y'}),B=(c,s)=>({t:'box',c,s});
  const body_=E([0,BY,0],[R,R*.94,R*.96]);
  const sockets={head:{parent:g,hull:body_,fmap:[0,.4]},chest:{parent:g,hull:body_,fmap:[.52,.96]},back:{parent:g,hull:B([0,BY,-R*.96+.02],[.7,.7,.08])},
    shoulderL:{parent:g,hull:E([-.9,BY+.02,0],[.14,.14,.14])},shoulderR:{parent:g,hull:E([.9,BY+.02,0],[.14,.14,.14])},
    armL:{parent:armL.shoulder,hull:C([-.04,-.3,0],.14,.62)},armR:{parent:armR.shoulder,hull:C([.04,-.3,0],.14,.62)}};
  return {group:g,height:2.1,width:2.2,legLength:.9,legs:[],arms:[armL,armR],wheels,idle,sockets};
}});
})();
