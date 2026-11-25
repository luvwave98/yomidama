const L=require('./logic.js');
function play(inn){const g=L.createGame({mode:'cpu',innings:inn,starters:[Math.floor(Math.random()*3),Math.floor(Math.random()*3)]});
 L.seedPrior(g,0);L.seedPrior(g,1);let guard=0,abStart=true;const c={pitches:0,ws:0,wide:0,bunt:0,sq:0,steal:0,po:0,change:0,ph:0,wsK:0};
 while(!g.over&&guard++<8000){
  if(g.ab.pitches.length===0&&g.ab.pickoffs===0){const ph=L.cpuPinch(g);if(ph){L.pinchHit(g,ph);c.ph++;}
    const np=L.cpuPitchChange(g);if(np){L.changePitcher(g,L.pitTeam(g),np);c.change++;}}
  let p=L.cpuPitch(g);const b=L.cpuBat(g);
  if(p.kind==='pickoff'&&!g.bases.some(Boolean))p=L.cpuPitch(g);
  p=L.finalizePitch(g,p);c.pitches++;if(p.ws)c.ws++;if(p.kind==='pickoff')c.po++;
  if(b.act.kind==='wide')c.wide++;if(b.act.kind==='bunt')c.bunt++;if(b.act.kind==='squeeze')c.sq++;if(b.steal!=null)c.steal++;
  const r=L.resolvePitch(g,p,b.act,b.steal);if(p.ws&&r.wsEffect)c.wsK++;
  const ev=L.applyResult(g,p,b.act,r);
  if(ev.halfOver&&!g.over)L.nextHalf(g);}
 return {g,c};}
for(const inn of [1,3,9]){let N=1500,agg={R:0,H:0,HR:0,K:0,BB:0,SB:0,CS:0,ex:0,draw:0,fat:0};const cc={};
 for(let i=0;i<N;i++){const {g,c}=play(inn);agg.R+=g.score[0]+g.score[1];for(const T of g.teams){agg.H+=T.box.H;agg.HR+=T.box.HR;agg.K+=T.box.K;agg.BB+=T.box.BB;agg.SB+=T.box.SB;agg.CS+=T.box.CS;if(T.staff.some(p=>p.fatigued))agg.fat++;}
  if(g.inning>inn)agg.ex++;if(g.draw)agg.draw++;for(const k in c)cc[k]=(cc[k]||0)+c[k];}
 const per=x=>(x/N/2).toFixed(2);
 console.log(`inn=${inn} R=${per(agg.R)} H=${per(agg.H)} HR=${per(agg.HR)} K=${per(agg.K)} BB=${per(agg.BB)} SB=${per(agg.SB)} CS=${per(agg.CS)} extra%=${(agg.ex/N*100).toFixed(0)} draw%=${(agg.draw/N*100).toFixed(1)} fatTeam%=${(agg.fat/N/2*100).toFixed(0)}`);
 console.log('   per team-game:',Object.fromEntries(Object.entries(cc).map(([k,v])=>[k,(v/N/2).toFixed(2)])));}
