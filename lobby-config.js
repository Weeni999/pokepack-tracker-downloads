/* Shared, build-free world rules: loaded by the browser and the Node server. */
(() => {
  const doors = [
    {id:'entry',label:'THE YARD',x:0,z:-38,axis:'z',width:5},
    {id:'plots',label:'PLOTS / CHICKEN HOUSE',x:23,z:-58,axis:'x',width:5},
    {id:'locker',label:'LOCKER / WORKSHOP',x:-23,z:-54,axis:'x',width:5},
    {id:'shop',label:'SCRAP SHOP',x:-23,z:-71,axis:'x',width:5}
  ];
  const rooms = [[-23,23,-81,-38],[-4.8,4.8,-38,-8],[23,40,-65,-51],[-38,-23,-60,-48],[-38,-23,-77,-65]];
  const obstacles = [{x:0,z:-62,r:4.3},{x:14,z:-54,r:2.5},{x:-12,z:-72.2,r:2.3},{x:-8,z:-72.2,r:2.3},{x:-4,z:-72.2,r:2.3},{x:0,z:-72.2,r:2.3},{x:4,z:-72.2,r:2.3},{x:8,z:-72.2,r:2.3},{x:12,z:-72.2,r:2.3},{x:-16,z:-75,r:3.4},{x:16,z:-75,r:3.4},{x:-20,z:-79,r:3.4},{x:20,z:-79,r:3.4}];
  const pads = [{x:-1.2,z:-33},{x:1.2,z:-33},{x:-1.2,z:-30},{x:1.2,z:-30}];
  // Shared direct-entry spawn: the character display podium.
  const startPad = {x:-1,y:.25,z:-50,yaw:Math.PI};
  // Reserve the player's display podium for their avatar. NPC routing uses this
  // exclusion independently of player movement, so the player can still spawn here.
  const botKeepOut = [{x:startPad.x,z:startPad.z,r:3.6}];
  const landmarks = [{name:'ROOSTER',x:0,z:-62},{name:'BAR',x:14,z:-54},{name:'LEADERBOARD',x:-15,z:-74},{name:'BETTING',x:14,z:-69},{name:'STAGE',x:0,z:-76}];
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  function valid(p){return p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&rooms.some(([a,b,c,d])=>p.x>=a&&p.x<=b&&p.z>=c&&p.z<=d)&&!obstacles.some(o=>distance(p,o)<o.r+.35)}
  function relative(d,p){return d.axis==='z'?{n:p.z-d.z,t:p.x-d.x}:{n:p.x-d.x,t:p.z-d.z}}
  function createDoors(){return Object.fromEntries(doors.map(d=>[d.id,{id:d.id,state:'CLOSED',progress:0,since:0,forceUntil:0}]))}
  function tickDoors(states,occupants,now,dt,reduced=false){for(const d of doors){const s=states[d.id],near=occupants.some(p=>{const q=relative(d,p);return Math.abs(q.n)<4&&Math.abs(q.t)<d.width/2+1}),blocked=occupants.some(p=>{const q=relative(d,p);return Math.abs(q.n)<1.7&&Math.abs(q.t)<d.width/2+.7}),want=near||blocked||s.forceUntil>now;
    if(want){if(s.state==='CLOSED'){s.state='OPEN_DELAY';s.since=now}if(s.state==='CLOSING'||s.state==='CLOSE_DELAY'||s.state==='OPEN_DELAY'&&now-s.since>=200)s.state='OPENING'}
    if(s.state==='OPENING'){s.progress=Math.min(1,s.progress+dt/(reduced?.4:1.8));if(s.progress>=1)s.state='OPEN'}
    if(!want&&s.state==='OPEN'){s.state='CLOSE_DELAY';s.since=now}if(!want&&s.state==='CLOSE_DELAY'&&now-s.since>1500)s.state='CLOSING';
    if(s.state==='CLOSING'){s.progress=Math.max(0,s.progress-dt/1.8);if(s.progress<=0)s.state='CLOSED'}
  }return states}
  function canStep(a,b,states){if(!valid(b))return false;for(const d of doors){const r=relative(d,a),s=relative(d,b);if(r.n*s.n<=0&&Math.abs(r.n-s.n)>0.0001){const options=doors.filter(o=>o.axis===d.axis&&o[o.axis]===d[d.axis]);if(!options.some(o=>Math.abs(relative(o,b).t)<o.width/2-.4&&(states?.[o.id]?.progress||0)>=.94))return false}if(Math.abs(s.n)<.42&&Math.abs(s.t)<d.width/2&&(states?.[d.id]?.progress||0)<.94)return false}return true}
  const speeds={walk:5.4,sprint:9};
  function move(p,input,dt,states){const x=Number(input.x)||0,z=Number(input.z)||0,len=Math.max(1,Math.hypot(x,z)),speed=Number.isFinite(input.speed)?Math.min(14,Math.max(.5,input.speed)):input.sprint?speeds.sprint:speeds.walk,step=Math.min(.1,Math.max(0,dt))*speed,out={...p};let q={...out,x:out.x+x/len*step};if(canStep(out,q,states))out.x=q.x;q={...out,z:out.z+z/len*step};if(canStep(out,q,states))out.z=q.z;if(x||z)out.yaw=Math.atan2(x,z);return out}
  function companion(p){const yaw=p.yaw||0,side=2.1,behind=.4,out={x:p.x+Math.cos(yaw)*side-Math.sin(yaw)*behind,z:p.z-Math.sin(yaw)*side-Math.cos(yaw)*behind,y:.2};for(const zone of botKeepOut){const dx=out.x-zone.x,dz=out.z-zone.z,d=Math.hypot(dx,dz),min=zone.r+.7;if(d<min){const fx=p.x-zone.x,fz=p.z-zone.z,fl=Math.hypot(fx,fz);let nx=d>.001?dx/d:fl>.001?fx/fl:1,nz=d>.001?dz/d:fl>.001?fz/fl:0;out.x=zone.x+nx*min;out.z=zone.z+nz*min}}return out}
  // NPCs only roam the open floor around the ring (botZone); the spawn podium (botKeepOut) and everything outside the zone are the player's alone
  const botZone={x0:-17.5,x1:17.5,z0:-69.5,z1:-43.5};
  const routes=[
    [{x:-11,z:-47},{x:8,z:-45.5},{x:17,z:-47},{x:17,z:-62},{x:10,z:-68},{x:-10,z:-68},{x:-16,z:-60},{x:-15,z:-50}],
    [{x:7,z:-62},{x:5,z:-57},{x:0,z:-55},{x:-5,z:-57},{x:-7,z:-62},{x:-5,z:-67},{x:0,z:-69},{x:5,z:-67}],
    [{x:-14,z:-55},{x:-8,z:-60},{x:-12,z:-66},{x:-16,z:-62}],
    [{x:10,z:-45},{x:-8,z:-45},{x:-12,z:-50},{x:-12,z:-57},{x:-6,z:-56},{x:8,z:-56}]
  ];
  const botNames=['Slag Mags','Uncle Arc','Motherboard','Rusty Rita','Bolt Buckley','Cage Janitor','Sodium Sam','Scrap Oracle'];
  const clearOfBotKeepOut=p=>p.x>=botZone.x0&&p.x<=botZone.x1&&p.z>=botZone.z0&&p.z<=botZone.z1&&botKeepOut.every(zone=>distance(p,zone)>zone.r);
  function makeBot(i,instance='offline'){const route=routes[i%routes.length],initial=route[i%route.length],safe=clearOfBotKeepOut(initial)?initial:(route.find(clearOfBotKeepOut)||{x:8,z:-48});return {id:`bot-${instance}-${i}`,name:botNames[i%8]+(i>=8?' '+i:''),bot:true,badge:'BOT',position:{...safe,y:0,yaw:Math.PI},robotCosmetics:{bodyShape:String(i%25),face:String(i*3%25),hat:String(i%5+1),neckWear:i%2?'chain-1':'none',finish:['#769368','#a17a45','#527c91','#965b69'][i%4],lens:'#afff7a'},chicken:{id:`bot-bird-${i}`,name:['Tin Nugget','Rust Beak','Screwball','Wing Nut'][i%4],rarity:'ambient',stats:{power:0,speed:0,armor:0,stamina:0,aggression:0},visual:{finish:['#bf843f','#598b65','#9c6985'][i%3]}},route:i%routes.length,waypoint:(i+1)%route.length,pauseUntil:0,emote:'',emoteUntil:0}}
  function tickBot(b,dt,now,states){const path=routes[b.route];if(!clearOfBotKeepOut(b.position)){let best=null;for(let i=0;i<path.length;i++){const p=path[i];if(clearOfBotKeepOut(p)&&(!best||distance(b.position,p)<best.distance))best={p,index:i,distance:distance(b.position,p)}}if(best){b.position={...best.p,y:0,yaw:b.position.yaw||Math.PI};b.waypoint=(best.index+1)%path.length}b.pauseUntil=0;b.moving=false;return}if(now<b.pauseUntil){b.moving=false;return}let goal=path[b.waypoint%path.length];if(!clearOfBotKeepOut(goal)){b.waypoint=(b.waypoint+1)%path.length;goal=path[b.waypoint%path.length];if(!clearOfBotKeepOut(goal)){b.moving=false;return}}const dx=goal.x-b.position.x,dz=goal.z-b.position.z;if(Math.hypot(dx,dz)<.5){b.waypoint++;b.pauseUntil=now+2500+(b.waypoint%4)*800;b.emote=['wave','sit','point','dance','flex'][b.waypoint%5];b.emoteUntil=b.pauseUntil;b.moving=false;return}b.emote='';const len=Math.hypot(dx,dz),prior=b.position,next=move(b.position,{x:dx/len*.55,z:dz/len*.55},dt,states);if(!clearOfBotKeepOut(next)){b.waypoint=(b.waypoint+1)%path.length;b.stalled=0;b.moving=false;return}b.position=next;if(distance(prior,b.position)<.002)b.stalled=(b.stalled||0)+dt;else b.stalled=0;if(b.stalled>3){b.waypoint++;b.stalled=0}b.companionPosition=companion(b.position);b.moving=true}
  globalThis.AshfallLobbyConfig={speeds,doors,rooms,obstacles,pads,startPad,botKeepOut,botZone,landmarks,distance,valid,relative,createDoors,tickDoors,move,companion,makeBot,tickBot,capacity:24,fill:8};
})();
