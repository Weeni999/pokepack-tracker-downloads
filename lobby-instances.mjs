import './lobby-config.js';
import { createSocial } from './lobby-social-server.mjs';
import { createChallenges } from './lobby-challenges.mjs';
const C=globalThis.AshfallLobbyConfig;
export function createLobbyInstances({store,send,devEnabled=false,onReport=()=>{}}){
 const worlds=new Map(),clients=new Map(),runtime=new Map(),queues=new Map();let serial=0,lastBroadcast=0,ticking=false;
 function create(){const id=`YARD-${String(++serial).padStart(3,'0')}`,i={id,members:new Set(),bots:[],doors:C.createDoors(),pads:new Map(),devBots:null};worlds.set(id,i);return i}
 function instance(id){return worlds.get(runtime.get(id)?.instanceId)}
 function online(id){return clients.has(id)}
 function sendTo(id,type,data){const ws=clients.get(id);if(ws)send(ws,type,{...data,serverTime:Date.now(),instanceId:instance(id)?.id})}
 function realPlayers(id){return [...(instance(id)?.members||[])].map(pid=>store.getPlayer(pid)).filter(p=>p&&!p.menuHidden)}
 function publicRecord(p){const r=runtime.get(p.id),bird=p.chickens.find(b=>b.id===p.companionId)||p.chickens[0];return {id:p.id,name:p.name,position:{...p.position,y:r?.jumpAt?(p.position.y+Math.max(0,Math.sin(Math.min(1,(Date.now()-r.jumpAt)/750)*Math.PI))*1.05):(p.position.y||0)},robotCosmetics:p.robotCosmetics,lookCode:p.robotLookCode||'',chicken:bird,companionPosition:p.companionPosition||C.companion(p.position),badge:(p.history||[]).filter(h=>h.winnerId===p.id).length?'PIT REGULAR':'YARDHAND',emote:p.emoteUntil>Date.now()?p.emote:'',moving:!!r?.moving,sprinting:!!r?.input?.sprint,menuHidden:!!p.menuHidden,lingerUntil:p.lingerUntil||0}}
 function records(id){const i=instance(id);return i?[...realPlayers(id).map(publicRecord),...i.bots.map(b=>({...b,companionPosition:b.companionPosition||C.companion(b.position)}))]:[]}
 function same(a,b){return !!instance(a)&&instance(a)===instance(b)}
 function announce(id,type,data){for(const pid of instance(id)?.members||[])sendTo(pid,type,data)}
 function count(){for(const id of clients.keys())sendTo(id,'population_update',{online:clients.size,real:[...(instance(id)?.members||[])].filter(online).length,bots:instance(id)?.bots.length||0,capacity:C.capacity,code:instance(id)?.id})}
 function assign(id,i){const old=instance(id);old?.members.delete(id);old?.pads.delete(id);i.members.add(id);const p=store.getPlayer(id);runtime.set(id,{instanceId:i.id,input:{x:0,z:0},inputAt:0,seq:0,arrival:null,moving:false});p.instanceId=i.id;p.menuHidden=true;sendTo(id,'instance_assigned',{code:i.id,capacity:C.capacity,position:p.position});snapshot(id);count()}
 function join(id,ws){const prior=clients.get(id);if(prior&&prior!==ws)prior.close(4001,'Session opened in another tab');clients.set(id,ws);const p=store.getPlayer(id);p.lingerUntil=0;p.social||={friends:[],muted:[],blocked:[]};const resume=instance(id);if(resume){sendTo(id,'instance_assigned',{code:resume.id,capacity:C.capacity,position:p.position});snapshot(id);return}const best=[...worlds.values()].filter(i=>i.members.size<C.capacity).sort((a,b)=>b.members.size-a.members.size)[0]||create();assign(id,best)}
 function disconnect(id,ws){if(clients.get(id)!==ws)return;clients.delete(id);const p=store.getPlayer(id),r=runtime.get(id);if(!r)return;r.input={x:0,z:0};r.moving=false;p.lingerUntil=Date.now()+10000;count()}
 function snapshot(id){sendTo(id,'instance_snapshot',{players:records(id),doors:instance(id)?.doors,online:clients.size,code:instance(id)?.id,social:store.getPlayer(id)?.social,leaderboard:store.world.arena.leaderboard,history:store.world.arena.history})}
 const api={join,disconnect,snapshot,records,realPlayers,online,same,sendTo,announce,publicRecord,instance,get size(){return worlds.size}};
 const social=createSocial({store,instances:api,onReport}),challenges=createChallenges({store,instances:api,social});
 function arrival(id){const p=store.getPlayer(id),r=runtime.get(id),i=instance(id);p.menuUntil=0;if(r.arrival){sendTo(id,'arrival_assigned',r.arrival);return}if(C.valid(p.position)&&p.position.z<-44&&!p.entryPending){p.menuHidden=false;r.arrival={resume:true,position:p.position,phase:'camera'};sendTo(id,'arrival_assigned',r.arrival);return}const occupied=[...i.members].filter(pid=>pid!==id).map(pid=>store.getPlayer(pid)).filter(p=>p&&!p.menuHidden);const pad=C.pads.find(pad=>!occupied.some(p=>C.distance(p.position,pad)<1.5)&&![...i.pads.values()].some(p=>C.distance(p,pad)<.1));if(!pad){sendTo(id,'arrival_progress',{phase:'queued',message:'Waiting for a clear arrival lane…'});r.waitArrival=true;return}i.pads.set(id,pad);p.position={...pad,y:0,yaw:Math.PI};p.menuHidden=false;r.arrival={resume:false,position:p.position,phase:'camera'};r.waitArrival=false;sendTo(id,'arrival_assigned',r.arrival)}
 async function handle(id,type,d,ws){const r=runtime.get(id),p=store.getPlayer(id);if(!r||clients.get(id)!==ws)return true;
  if(type==='movement'){const seq=Number(d.seq);if(!Number.isSafeInteger(seq)||seq===r.seq)return true;r.seq=seq;   // a lower seq means the client page restarted its counter: accept it instead of ignoring input until it catches up
  r.input={x:Math.max(-1,Math.min(1,Number(d.dx)||0)),z:Math.max(-1,Math.min(1,Number(d.dz)||0)),sprint:!!d.sprint,speed:Number.isFinite(Number(d.speed))?Number(d.speed):undefined};r.inputAt=Date.now();if(d.jump&&(!r.jumpAt||Date.now()-r.jumpAt>1000))r.jumpAt=Date.now();return true}
  if(type==='yard_enter'){
   p.menuUntil=0;p.menuHidden=false;p.entryPending=false;p.zone='yard';r.arrival=null;r.waitArrival=false;instance(id)?.pads.delete(id);
   const spawn={...(C.startPad||{x:-1,y:.25,z:-50,yaw:Math.PI})};p.position=spawn;p.companionPosition=C.companion(spawn);p.zone='yard';r.arrival=null;r.waitArrival=false;r.input={x:0,z:0};r.inputAt=0;instance(id)?.pads.delete(id);await store.commit(()=>{p.entryPending=false;p.menuHidden=false;p.lastSeenAt=Date.now()});sendTo(id,'yard_entered',{position:p.position});return true
  }
  if(type==='arrival_begin'||type==='entry_begin'){arrival(id);return true}
  if(type==='arrival_progress'||type==='arrival_skip'){if(r.arrival?.resume){r.arrival=null;p.entryPending=false;sendTo(id,'arrival_complete',{position:p.position})}else if(r.arrival){r.arrival.phase='walking';instance(id).doors.entry.forceUntil=Date.now()+5000;}return true}
  if(type==='entry_complete'||type==='checkpoint_request'){await store.save();sendTo(id,'save_ack',{requestId:d.requestId});return true}
  if(type==='companion_presence'){return true} // Position follows the authoritative owner.
  if(type==='door_request'||type==='door_interest'){return true} // Occupancy owns all door transitions.
  if(type==='companion_choose'){if(!p.chickens.some(b=>b.id===d.chickenId))throw Error('Chicken not owned.');await store.commit(()=>{p.companionId=d.chickenId});return true}
  if(type==='menu_grace'){r.input={x:0,z:0};p.menuUntil=Date.now()+10000;return true}
  if(type==='instance_join_friend'||type==='instance_join'){if(challenges.busy(id))throw Error('Finish your challenge first.');const key=String(d.code||d.name||'').trim().toUpperCase(),friend=Object.values(store.world.players).find(p=>p.name.toUpperCase()===key),target=worlds.get(key)||instance(friend?.id);if(!target)throw Error('No active lobby matches that name or code.');if(target===instance(id)){snapshot(id);return true}if(target.members.size>=24){queues.set(id,target.id);sendTo(id,'instance_full',{code:target.id,message:'Lobby full. You are queued; your current lobby stays active.'});return true}assign(id,target);p.entryPending=true;arrival(id);return true}
  if(type==='instance_queue_cancel'){queues.delete(id);return true}
  if(type==='dev_lobby_command'){if(!devEnabled)throw Error('Server development controls are disabled.');const i=instance(id);if(d.action==='bots')i.devBots=Math.max(0,Math.min(24,Number(d.count)||0));if(d.action==='door'&&i.doors[d.doorId])i.doors[d.doorId].forceUntil=Date.now()+15000;return true}
  if(await social.handle(id,type,d))return true;
  if(await challenges.handle(id,type,d))return true;
  return false;
 }
 async function tick(){if(ticking)return;ticking=true;try{const now=Date.now(),dt=.05;for(const [id,r]of runtime){const p=store.getPlayer(id);if(!online(id)&&p.lingerUntil<now){instance(id)?.members.delete(id);instance(id)?.pads.delete(id);runtime.delete(id);p.menuHidden=true;continue}if(p.menuUntil&&p.menuUntil<now){p.menuHidden=true;p.menuUntil=0}if(r.waitArrival)arrival(id);if(p.menuHidden)continue;const i=instance(id);if(r.arrival?.phase==='walking'){
    const goal={x:r.arrival.position.x,z:-47},dx=goal.x-p.position.x,dz=goal.z-p.position.z,len=Math.max(1,Math.hypot(dx,dz));let input={x:dx/len,z:dz/len};const ahead={x:p.position.x+input.x*.9,z:p.position.z+input.z*.9};const blocker=realPlayers(id).find(q=>q.id!==id&&C.distance(q.position,ahead)<.7);if(blocker){input={x:p.position.x<=0?-.35:.35,z:0};if(Math.abs(p.position.x)>1.7)input.x=0}p.position=C.move(p.position,input,dt,i.doors);r.moving=true;if(p.position.z<-46){r.arrival=null;p.zone='yard';p.entryPending=false;i.pads.delete(id);sendTo(id,'arrival_complete',{position:p.position});store.save().catch(console.warn)}
   }else if(!r.arrival&&now-r.inputAt<220){const before=p.position;p.position=C.move(p.position,r.input,dt,i.doors);const startPad=C.startPad||{x:-1,y:.25,z:-50};p.position.y=C.distance(p.position,startPad)<1.18?startPad.y:0;r.moving=C.distance(before,p.position)>.001;p.zone=p.position.z<-40?'yard':'corridor'}else r.moving=false;
   const birdGoal=C.companion(p.position),bird=p.companionPosition||birdGoal,bd=C.distance(bird,birdGoal);p.companionPosition=C.move(bird,{x:(birdGoal.x-bird.x)/Math.max(.1,bd),z:(birdGoal.z-bird.z)/Math.max(.1,bd),sprint:bd>1},Math.min(dt,bd/4.8),i.doors);if(r.jumpAt&&now-r.jumpAt>750)r.jumpAt=0;
  }
  for(const i of worlds.values()){const real=[...i.members].filter(online).length,target=i.devBots??Math.max(0,C.fill-real);if(i.bots.length<target)i.bots.push(C.makeBot(i.bots.length,i.id));else if(i.bots.length>target&&now%500<60)i.bots.pop();const people=[...i.members].map(id=>store.getPlayer(id)).filter(p=>p&&!p.menuHidden),occupants=[...people,...i.bots].flatMap(p=>[p.position,p.companionPosition||C.companion(p.position)]);C.tickDoors(i.doors,occupants,now,dt,people.length>0&&people.every(p=>p.settings?.reduceMotion));for(const b of i.bots)C.tickBot(b,dt,now,i.doors);}
  for(const [id,code]of queues){const i=worlds.get(code);if(online(id)&&i&&i.members.size<24){queues.delete(id);assign(id,i);store.getPlayer(id).entryPending=true;arrival(id)}}
  await challenges.tick(now);
  if(now-lastBroadcast>=100){lastBroadcast=now;for(const id of clients.keys()){const r=runtime.get(id);sendTo(id,'lobby_frame',{players:records(id),doors:instance(id)?.doors,ack:r?.seq,position:store.getPlayer(id)?.position,online:clients.size});}if(now%1000<110)count()}
 }catch(error){console.warn('Lobby tick:',error.message)}finally{ticking=false}}
 const timer=setInterval(tick,50);timer.unref();return {...api,handle,challenges,close(){clearInterval(timer)},get debug(){return {instances:worlds.size,players:clients.size}}};
}
