/* ===== ヨミダマ UI ===== */
const $=id=>document.getElementById(id);
const VW=1536,VH=1024;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
const cfg={mode:'cpu',innings:3,teamIds:[0,1],side:0,ctl:['human','cpu'],names:['',''],starters:[0,0]};
let G=null,sel={},pending={},news=[],memoTab=0;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const RANK=v=>v>=1.12?'A':v>=1.04?'B':v>=.97?'C':v>=.92?'D':'E';
const handJ=h=>h==='R'?'右':h==='L'?'左':'両';
try{const s=JSON.parse(localStorage.getItem('ymd_names')||'null');if(Array.isArray(s))cfg.names=s.slice(0,2);}catch(e){}

/* ---------- team colours (runtime recolour of the blue/red masked art) ---------- */
const MASKED=new Set(Object.keys(MASKS));
const RC=new Map();
const loadImg=src=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src;});
const hexRgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
function hueOf(hex){const [r,g,b]=hexRgb(hex).map(v=>v/255);const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;if(!d)return {h:0,s:0};
  let h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;h*=60;if(h<0)h+=360;return {h,s:d/mx};}
function matchColors(a,b){const A=TEAMS[a],B=TEAMS[b],ha=hueOf(A.color),hb=hueOf(B.color);let dh=Math.abs(ha.h-hb.h);dh=Math.min(dh,360-dh);
  const close=(ha.s>.3&&hb.s>.3&&dh<45)||(ha.s<=.3&&hb.s<=.3);return [close?A.alt:A.color,B.color];}
async function recolor(n,fc,bc){const k=n+'|'+fc+'|'+bc;if(RC.has(k))return RC.get(k);
  const [im,mk]=await Promise.all([loadImg(ASSETS[n]),loadImg(MASKS[n])]);
  const w=im.naturalWidth,h=im.naturalHeight,c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d',{willReadFrequently:true});
  x.drawImage(mk,0,0,w,h);const M=x.getImageData(0,0,w,h).data;x.clearRect(0,0,w,h);x.drawImage(im,0,0);
  const id=x.getImageData(0,0,w,h),D=id.data,F=hexRgb(fc),B=hexRgb(bc);
  for(let i=0;i<D.length;i+=4){const mb=M[i],mr=M[i+1];if(mb<8&&mr<8)continue;
    const r=D[i],g=D[i+1],b=D[i+2],mx=Math.max(r,g,b);if(!mx)continue;const s=(mx-Math.min(r,g,b))/mx;
    const t=mb>=mr?F:B,al=(Math.max(mb,mr)/255)*Math.min(1,s/.45),sh=mx/230;
    let nr,ng,nb;if(sh<=1){nr=t[0]*sh;ng=t[1]*sh;nb=t[2]*sh;}else{const q=Math.min(1,(sh-1)*2.2);nr=t[0]+(255-t[0])*q;ng=t[1]+(255-t[1])*q;nb=t[2]+(255-t[2])*q;}
    D[i]=r+(nr-r)*al;D[i+1]=g+(ng-g)*al;D[i+2]=b+(nb-b)*al;}
  x.putImageData(id,0,0);
  const url=await new Promise(res=>{try{c.toBlob(bl=>res(bl?URL.createObjectURL(bl):c.toDataURL()),'image/webp',.88);}catch(e){res(c.toDataURL());}});
  RC.set(k,url);return url;}
/* text/swatch colour readable on the dark UI: lift very dark team colours toward white */
function uiColor(hex){const [r,g,b]=hexRgb(hex);const L=(.2126*r+.7152*g+.0722*b)/255;if(L>=.32)return hex;const k=Math.min(.7,(.32-L)/.32+.35);
  return '#'+[r,g,b].map(v=>Math.round(v+(255-v)*k).toString(16).padStart(2,'0')).join('');}
/* blue = fielding team, red = batting team in every masked picture */
function img(n){if(!G||!MASKED.has(n))return ASSETS[n];const k=n+'|'+G.teams[pitTeam(G)].color+'|'+G.teams[batTeam(G)].color;return RC.get(k)||ASSETS[n];}
async function prepareArt(){const c=G.teams.map(t=>t.color);
  for(const n of MASKED)await recolor(n,c[1],c[0]);
  setTimeout(async()=>{for(const n of MASKED)await recolor(n,c[0],c[1]);},60);}

/* ---------- setup ---------- */
const avg=(a,k)=>a.reduce((s,b)=>s+b[k],0)/a.length;
function teamRanks(T){return `打${RANK(avg(T.lineup,'con'))} 長${RANK(avg(T.lineup,'pow'))} 走${RANK(avg(T.lineup,'spd'))} 守${RANK(T.def)} 投${RANK(1+T.stuff)}`;}
function teamBtn(i,side,dis){const T=TEAMS[i];return `<button type="button" id="tm-${side}-${i}" data-i="${i}" style="--tc:${uiColor(T.color)}" aria-pressed="${cfg.teamIds[side]===i}" ${dis?'disabled':''}><b>${esc(T.name)}</b><small>${T.tag}</small><span class="rk">${teamRanks(T)}</span></button>`;}
function humanSides(){return cfg.mode==='2p'?[0,1]:[cfg.side];}
function renderSetup(){
  if(cfg.mode==='tour'||cfg.mode==='league'){$('setupBody').innerHTML=seasonSetupHTML();bindSeasonSetup();$('startBtn').textContent=cfg.mode==='tour'?'抽選して大会を始める':'日程を組んで大会を始める';return;}
  $('startBtn').textContent='次へ';
  if(![1,3,9].includes(cfg.innings))cfg.innings=3;
  if(cfg.fromSeason){cfg.fromSeason=false;cfg.names=['',''];try{const s=JSON.parse(localStorage.getItem('ymd_names')||'null');if(Array.isArray(s))cfg.names=s.slice(0,2);}catch(e){}}
  const hs=humanSides();
  const sideBlock=s=>{const T=TEAMS[cfg.teamIds[s]],hu=hs.includes(s);
    return `<div class="field"><div class="side-h"><span class="label">${s?'後攻':'先攻'}チーム${hu?'':'（CPU）'}</span>${hu?`<label class="nm">参加者名<input id="nm-${s}" maxlength="4" placeholder="${cfg.mode==='2p'?'P'+(s+1):'あなた'}" value="${esc(cfg.names[s]||'')}"></label>`:''}</div>
    <div class="teams" data-side="${s}">${TEAMS.map((_,i)=>teamBtn(i,s,cfg.teamIds[1-s]===i)).join('')}</div><p class="trait">${esc(T.traits)}</p>
    ${hu?`<span class="label">先発投手</span><div class="pick" data-team="${s}">${T.sp.map((p,i)=>`<button type="button" id="sp-${s}-${i}" data-i="${i}" aria-pressed="${cfg.starters[s]===i}">${esc(p.name)}<small>${handJ(p.hand)}投・${p.style}・決め球 ${PT[p.wsType].name}</small><small>${p.rep.map(k=>PT[k].k).join(' ')}</small></button>`).join('')}</div>`:''}</div>`;};
  $('setupBody').innerHTML=`${cfg.mode==='cpu'?`<div class="field"><span class="label">あなたは</span><div class="seg" id="segSide"><button type="button" id="sd-0" data-v="0" aria-pressed="${cfg.side===0}">先攻<small>表から攻撃</small></button><button type="button" id="sd-1" data-v="1" aria-pressed="${cfg.side===1}">後攻<small>表は守備</small></button></div></div>`:''}
   <div class="field"><span class="label">イニング</span><div class="seg" id="segInn">${[[1,'先発・抑え'],[3,'先発・中継ぎ・抑え'],[9,'先発・中継ぎ2人・抑え']].map(([n,s])=>`<button type="button" id="i-${n}" data-v="${n}" aria-pressed="${cfg.innings===n}">${n}回<small>${s}</small></button>`).join('')}</div></div>
   ${sideBlock(0)}${sideBlock(1)}`;
  const seg=(id,f)=>{const el=$(id);if(el)el.onclick=e=>{const b=e.target.closest('button');if(!b)return;f(b.dataset.v);renderSetup();};};
  seg('segSide',v=>cfg.side=+v);seg('segInn',v=>cfg.innings=+v);
  $('setupBody').querySelectorAll('.teams').forEach(el=>el.onclick=e=>{const b=e.target.closest('button');if(!b||b.disabled)return;cfg.teamIds[+el.dataset.side]=+b.dataset.i;cfg.starters[+el.dataset.side]=0;renderSetup();});
  $('setupBody').querySelectorAll('.pick').forEach(el=>el.onclick=e=>{const b=e.target.closest('button');if(!b)return;cfg.starters[+el.dataset.team]=+b.dataset.i;renderSetup();});
  [0,1].forEach(s=>{const inp=$('nm-'+s);if(inp)inp.oninput=()=>{cfg.names[s]=inp.value.trim().slice(0,4);try{localStorage.setItem('ymd_names',JSON.stringify(cfg.names));}catch(e){}};});
}
['segMode','segMode2'].forEach(id=>$(id).addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;document.querySelectorAll('#segMode button,#segMode2 button').forEach(x=>x.setAttribute('aria-pressed',x===b?'true':'false'));cfg.mode=b.dataset.v;renderSetup();}));
renderSetup();
$('startBtn').onclick=()=>{audioInit();
  if(cfg.mode==='tour'||cfg.mode==='league')return startSeason();
  cfg.names=[...cfg.names];G=null;
  cfg.ctl=cfg.mode==='2p'?['human','human']:(cfg.side===0?['human','cpu']:['cpu','human']);
  [0,1].forEach(t=>{if(cfg.ctl[t]==='cpu')cfg.starters[t]=Math.floor(Math.random()*3);});
  const colors=matchColors(cfg.teamIds[0],cfg.teamIds[1]);
  G=createGame({...cfg,teamIds:[...cfg.teamIds],starters:[...cfg.starters],colors});
  const cpuT=cfg.ctl.indexOf('cpu');if(cpuT>=0)seedPrior(G,cpuT);
  $('setup').hidden=true;
  if(cpuT>=0)showScout(true);else beginGame();};
$('sndBtn').onclick=()=>{SND.on=!SND.on;if(SND.on)audioInit();$('sndBtn').textContent=SND.on?'音 ON':'音 OFF';if(SND.amb)SND.amb.gain.value=SND.on?.018:0;};
$('quitBtn').onclick=()=>{if(G&&G.busy)return;$('app').hidden=true;if(G&&G.sgid!=null&&SEASON)return showHub('試合を中断しました。この試合は最初からやり直しになります。');$('setup').hidden=false;renderSetup();};
async function beginGame(){$('scout').hidden=true;$('app').hidden=false;$('endOv').hidden=true;renderBoard();
  dockShow();$('memo').hidden=true;$('panel').innerHTML='<p class="loading">球場を準備しています…</p>';
  await prepareArt();stageSet('set','stance');
  const t=G.teams,sp=[t[0].cur,t[1].cur];
  $('panel').innerHTML=`<div class="result"><div class="label">${G.cfg.innings}回制・${both()?'2人対戦':'CPU対戦'}</div>${scoreline('対')}<div class="s">先発　${esc(sp[0].name)}（${handJ(sp[0].hand)}投）・${esc(sp[1].name)}（${handJ(sp[1].hand)}投）</div></div><button class="go" id="pbBtn" type="button">プレイボール</button>`;
  $('pbBtn').focus();$('pbBtn').onclick=async()=>{$('pbBtn').disabled=true;dockAway();sCrowd(.85,1.8);stamp('プレイボール！',{dur:1300,col:'#ffd447'});await sleep(1300);nextPitch();};}

/* ===== tournament / round robin ===== */
let SEASON=null;
const SKEY='ymd_season';
cfg.pnames=['','','','','',''];cfg.seasonInn={tour:7,league:3};
try{const p=JSON.parse(localStorage.getItem('ymd_pnames')||'null');if(Array.isArray(p)&&p.length===6)cfg.pnames=p;}catch(e){}
function saveSeason(){try{if(SEASON)localStorage.setItem(SKEY,JSON.stringify(SEASON));else localStorage.removeItem(SKEY);}catch(e){}}
function loadSeason(){try{const s=JSON.parse(localStorage.getItem(SKEY)||'null');return s&&s.games?s:null;}catch(e){return null;}}
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
function pname(t){return SEASON.pn[t]||'CPU';}
function seasonSetupHTML(){
  const saved=loadSeason();
  const resume=saved&&!saved.done?`<div class="news">保存された${saved.type==='tour'?'トーナメント':'総当たり'}（${saved.innings}回制）があります（${saved.games.filter(g=>g.res).length}/${saved.games.length}試合済み）。<div class="row" style="margin-top:6px"><button class="ghost" id="resumeBtn" type="button">続きから</button><button class="ghost" id="discardBtn" type="button">破棄する</button></div></div>`:'';
  const si=cfg.seasonInn[cfg.mode],ng=cfg.mode==='tour'?5:15;
  const inn=`<div class="field"><span class="label">イニング</span><div class="seg" id="segTInn">${[[3,'約10分'],[7,'約20分'],[9,'約30分']].map(([n,t])=>`<button type="button" id="ti-${n}" data-v="${n}" aria-pressed="${si===n}">${n}回<small>1試合 ${t}</small></button>`).join('')}</div>
    <p class="note">${cfg.mode==='tour'?'全5試合。引き分けなしで、決着までタイブレークを続けます。':'6チームが1試合ずつ戦う全15試合。引き分けありです。'}時間は人が操作する試合1つの目安です（CPU同士の試合は一瞬で終わります）。</p></div>`;
  const nh=cfg.pnames.filter(Boolean).length;
  return `${resume}${inn}<div class="field"><span class="label">参加者（名前を入れたチームを人が操作・4文字まで。空欄はCPU）</span><div class="plist">${TEAMS.map((T,i)=>`<label class="prow" style="--tc:${uiColor(T.color)}"><span><b>${esc(T.name)}</b><small>${T.tag}・${teamRanks(T)}</small></span><input id="pp-${i}" maxlength="4" placeholder="CPU" value="${esc(cfg.pnames[i]||'')}"></label>`).join('')}</div>
   <p class="note" id="pcount">${nh?`参加者 ${nh}人。人どうしの試合は1台を交互に持ちます。`:'少なくとも1チームに名前を入れてください。'}</p></div>`;
}
function bindSeasonSetup(){
  const si=$('segTInn');if(si)si.onclick=e=>{const b=e.target.closest('button');if(!b)return;cfg.seasonInn[cfg.mode]=+b.dataset.v;renderSetup();};
  TEAMS.forEach((_,i)=>{const inp=$('pp-'+i);inp.oninput=()=>{cfg.pnames[i]=inp.value.trim().slice(0,4);try{localStorage.setItem('ymd_pnames',JSON.stringify(cfg.pnames));}catch(e){}
    const nh=cfg.pnames.filter(Boolean).length;$('pcount').textContent=nh?`参加者 ${nh}人。人どうしの試合は1台を交互に持ちます。`:'少なくとも1チームに名前を入れてください。';};});
  if($('resumeBtn'))$('resumeBtn').onclick=()=>{audioInit();SEASON=loadSeason();$('setup').hidden=true;showHub();};
  if($('discardBtn'))$('discardBtn').onclick=()=>{SEASON=null;saveSeason();renderSetup();};
}
function startSeason(){
  if(!cfg.pnames.some(Boolean)){$('pcount').textContent='少なくとも1チームに名前を入れてください。';$('pcount').style.color='var(--bad)';return;}
  const ids=shuffle([0,1,2,3,4,5]);const games=[];
  if(cfg.mode==='tour'){const s=ids; /* s[0],s[1] seeded */
    games.push({id:0,rd:'1回戦',away:s[4],home:s[3]},{id:1,rd:'1回戦',away:s[5],home:s[2]},
      {id:2,rd:'準決勝',away:{w:0},home:s[0]},{id:3,rd:'準決勝',away:{w:1},home:s[1]},{id:4,rd:'決勝',away:{w:3},home:{w:2}});}
  else{const r=[...ids];for(let k=0;k<5;k++){for(let j=0;j<3;j++){const a=r[j],b=r[5-j];const flip=(k+j)%2;games.push({id:games.length,rd:`第${k+1}節`,away:flip?b:a,home:flip?a:b});}r.splice(1,0,r.pop());}}
  SEASON={type:cfg.mode,innings:cfg.seasonInn[cfg.mode],pn:[...cfg.pnames],seeds:ids.slice(0,2),games,done:false,champ:null};
  saveSeason();$('setup').hidden=true;showHub();
}
function slotTeam(x){if(typeof x==='number')return x;const g=SEASON.games[x.w];return g.res?g.res.win:null;}
function nextGame(){return SEASON.games.find(g=>!g.res&&slotTeam(g.away)!=null&&slotTeam(g.home)!=null)||null;}
function standings(){const st=TEAMS.map((T,i)=>({i,g:0,w:0,l:0,d:0,rs:0,ra:0}));
  for(const g of SEASON.games){if(!g.res)continue;const [a,h]=[g.away,g.home],[sa,sh]=g.res.score;for(const [t,f,ag] of [[a,sa,sh],[h,sh,sa]]){const o=st[t];o.g++;o.rs+=f;o.ra+=ag;if(f>ag)o.w++;else if(f<ag)o.l++;else o.d++;}}
  st.forEach(o=>o.pct=o.w+o.l?o.w/(o.w+o.l):0);
  return st.sort((x,y)=>y.pct-x.pct||(y.rs-y.ra)-(x.rs-x.ra)||y.rs-x.rs);}
function teamCell(t,r){if(t==null)return `<span class="t${r?' r':''} tbd">未定</span>`;return `<span class="t${r?' r':''}"><b style="color:${TEAMS[t].color}">${esc(TEAMS[t].short)}</b><small>${esc(pname(t))}</small></span>`;}
function gameRow(g,next){const a=slotTeam(g.away),h=slotTeam(g.home);const r=g.res;
  const sc=r?`${r.score[0]} - ${r.score[1]}${r.ex?`<small style="font-size:10px">（${r.ex}回${r.lot?'・抽選':''}）</small>`:''}`:'vs';
  return `<div class="gm${next?' next':''}"><span class="rd">${g.rd}</span><span class="${r&&r.win===a?'w':''}">${teamCell(a)}</span><span class="sc">${sc}</span><span class="${r&&r.win===h?'w':''}">${teamCell(h,1)}</span></div>`;}
function showHub(msg){
  $('app').hidden=true;$('endOv').hidden=true;$('setup').hidden=true;
  const S=SEASON,ng=nextGame();
  if(!ng&&!S.done){S.done=true;if(S.type==='tour'){S.champ=S.games[4].res.win;}else{S.champ=standings()[0].i;}saveSeason();}
  let body='';
  if(S.type==='tour'){body=`<p class="note">シード：${S.seeds.map(t=>esc(TEAMS[t].short)).join('・')}（1回戦免除）。引き分けなし、決着までタイブレーク。</p><div class="games">${S.games.map(g=>gameRow(g,g===ng)).join('')}</div>`;}
  else{const st=standings();body=`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>順位</th><th>チーム</th><th>試合</th><th>勝</th><th>敗</th><th>分</th><th>勝率</th><th>得失</th></tr></thead><tbody>${st.map((o,k)=>`<tr><td>${k+1}</td><td><b style="color:${TEAMS[o.i].color}">${esc(TEAMS[o.i].short)}</b><br><small class="sub">${esc(pname(o.i))}</small></td><td class="n">${o.g}</td><td class="n">${o.w}</td><td class="n">${o.l}</td><td class="n">${o.d}</td><td class="n">${o.w+o.l?o.pct.toFixed(3).replace(/^0/,''):'-'}</td><td class="n">${o.rs-o.ra>0?'+':''}${o.rs-o.ra}</td></tr>`).join('')}</tbody></table></div>
    <details class="rules"><summary>日程と結果（${S.games.filter(g=>g.res).length}/15）</summary><div class="games" style="margin-top:8px">${S.games.map(g=>gameRow(g,g===ng)).join('')}</div></details>`;}
  let action='';
  if(S.done){const c=S.champ;action=`<div class="champ"><div class="label">${S.type==='tour'?'優勝':'リーグ優勝'}</div><div class="h">${esc(TEAMS[c].name)}</div><div class="s">${esc(pname(c))}</div></div><button class="go" id="hubNew" type="button">設定に戻る</button>`;}
  else{const a=slotTeam(ng.away),h=slotTeam(ng.home),hu=S.pn[a]||S.pn[h];
    action=`<div class="label">次の試合（${ng.rd}）</div>${gameRow(ng,true)}<button class="go" id="hubGo" type="button">${hu?'この試合を始める':'CPU同士の試合を進める'}</button>`;}
  $('hubSheet').innerHTML=`<span class="label">${S.type==='tour'?'トーナメント':'総当たり'}・${S.innings}回制</span><h2 class="big-h">${S.done?'大会終了':S.type==='tour'?'トーナメント表':'順位表'}</h2>
   ${msg?`<div class="news" role="status">${msg}</div>`:''}${body}${action}${S.done?'':'<button class="ghost" id="hubQuit" type="button">設定画面へ（大会は保存されます）</button>'}`;
  $('hub').hidden=false;
  if($('hubGo'))$('hubGo').onclick=()=>playSeasonGame(ng);
  if($('hubNew'))$('hubNew').onclick=()=>{SEASON=null;saveSeason();$('hub').hidden=true;$('setup').hidden=false;renderSetup();};
  if($('hubQuit'))$('hubQuit').onclick=()=>{$('hub').hidden=true;$('setup').hidden=false;renderSetup();};
  ($('hubGo')||$('hubNew')).focus();
}
function recordSeason(gid,g){const gm=SEASON.games[gid];const sc=[...g.score];
  gm.away=slotTeam(gm.away);gm.home=slotTeam(gm.home);
  let win=sc[0]>sc[1]?gm.away:sc[1]>sc[0]?gm.home:null,lot=false;
  if(SEASON.type==='tour'&&win==null){lot=true;win=g.lot===0?gm.away:g.lot===1?gm.home:(Math.random()<.5?gm.away:gm.home);}
  gm.res={score:sc,win,lot,ex:g.inning>g.cfg.innings?g.inning:0};saveSeason();}
function playSeasonGame(ng){
  const a=slotTeam(ng.away),h=slotTeam(ng.home),S=SEASON;
  const base={innings:S.innings,teamIds:[a,h],noDraw:S.type==='tour',colors:matchColors(a,h)};
  if(!S.pn[a]&&!S.pn[h]){ /* CPU vs CPU: simulate instantly */
    const g=simGame({...base,starters:[Math.floor(Math.random()*3),Math.floor(Math.random()*3)]});recordSeason(ng.id,g);
    const r=SEASON.games[ng.id].res;showHub(`${ng.rd}：${TEAMS[a].short} ${r.score[0]} - ${r.score[1]} ${TEAMS[h].short}（CPU同士）`);return;}
  cfg.fromSeason=true;
  cfg.ctl=[S.pn[a]?'human':'cpu',S.pn[h]?'human':'cpu'];cfg.names=[S.pn[a]||'',S.pn[h]||''];cfg.innings=S.innings;
  const st=[0,0];const hs=[0,1].filter(t=>cfg.ctl[t]==='human');
  const draw=()=>{$('hubSheet').innerHTML=`<span class="label">${ng.rd}・試合前</span><h2 class="big-h">${esc(TEAMS[a].short)} 対 ${esc(TEAMS[h].short)}</h2>
    ${hs.map(t=>{const T=TEAMS[base.teamIds[t]];return `<div class="field"><span class="label">${esc(cfg.names[t])}（${esc(T.short)}・${t?'後攻':'先攻'}）の先発投手</span><div class="pick" data-team="${t}">${T.sp.map((p,i)=>`<button type="button" id="psp-${t}-${i}" data-i="${i}" aria-pressed="${st[t]===i}">${esc(p.name)}<small>${handJ(p.hand)}投・${p.style}・決め球 ${PT[p.wsType].name}</small></button>`).join('')}</div></div>`;}).join('')}
    <button class="go" id="pgGo" type="button">試合開始</button><button class="ghost" id="pgBack" type="button">大会の画面に戻る</button>`;
    $('hubSheet').querySelectorAll('.pick').forEach(el=>el.onclick=e=>{const b=e.target.closest('button');if(!b)return;st[+el.dataset.team]=+b.dataset.i;draw();});
    $('pgBack').onclick=()=>showHub();
    $('pgGo').onclick=()=>{audioInit();[0,1].forEach(t=>{if(cfg.ctl[t]==='cpu')st[t]=Math.floor(Math.random()*3);});
      G=createGame({...base,starters:[...st]});G.sgid=ng.id;
      const cpuT=cfg.ctl.indexOf('cpu');if(cpuT>=0)seedPrior(G,cpuT);
      $('hub').hidden=true;if(cpuT>=0)showScout(true);else beginGame();};};
  draw();
}

/* ---------- scouting report ---------- */
function tendText(p){return p.tend==='power'?`初球はストレートから入り、追い込むと${PT[p.wsType].name}で決めにくる`:`初球は変化球が多く、打者有利のカウントでは${p.rep.includes('CH')?'チェンジアップ':'変化球'}で外す`;}
function showScout(first){
  const c=cfg.ctl.indexOf('cpu');if(c<0)return;const T=G.teams[c];
  const st=p=>{const tot=p.rep.reduce((a,k)=>a+p.mix[k],0);return p.rep.map(k=>`${PT[k].name} ${Math.round(p.mix[k]/tot*100)}%`).join(' / ');};
  $('scoutSheet').innerHTML=`<span class="label">試合前スカウティングレポート</span><h2 class="big-h">${esc(T.name)}</h2>
  <p class="scout-now">${first?'先発予定':'いま投げているのは'} <b>${esc(T.cur.name)}</b>（${{SP:'先発',RP:'中継ぎ',CL:'抑え'}[T.cur.role]}・${handJ(T.cur.hand)}投・${T.cur.style}）</p>
  <p class="lede">${esc(T.tag)}：${esc(T.traits)}。チーム評価 ${teamRanks(T)}。過去の対戦データです。試合中の集計はこの資料に上乗せされます。</p>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>投手</th><th>役割</th><th>球種の割合</th><th>決め球・傾向</th></tr></thead><tbody>
  ${[T.cur,...T.staff.filter(p=>p!==T.cur)].map(p=>`<tr class="${p===T.cur?'now':p.out?'gone':''}"><td>${esc(p.name)}${p===T.cur?`<span class="badge">${first?'先発予定':'登板中'}</span>`:p.out?'<span class="badge off">降板</span>':''}<br><small class="sub">${handJ(p.hand)}投・${p.style}</small></td><td>${{SP:'先発',RP:'中継ぎ',CL:'抑え'}[p.role]}</td><td>${st(p)}</td><td>${PT[p.wsType].name}<br><small class="sub">${tendText(p)}</small></td></tr>`).join('')}
  </tbody></table></div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>打順</th><th>打者</th><th>打席</th><th>ミート / パワー / 選球 / 走力</th></tr></thead><tbody>
  ${T.order.map((b,i)=>`<tr><td>${i+1}</td><td>${esc(b.name)}${b.wide?'<span class="badge">広角</span>':''}</td><td>${handJ(b.bats)}</td><td>${RANK(b.con)} / ${RANK(b.pow)} / ${RANK(b.eye)} / ${RANK(b.spd)}</td></tr>`).join('')}
  </tbody></table></div>
  <p class="note">打線の傾向：${T.batStyle.style}。${T.batStyle.firstTake>.4?'初球を見送ることが多く、追い込まれるとカットで粘る。':'初球から積極的に振ってくる。'}${T.batStyle.bunt>1?'送りバントやスクイズを多用する。':''}</p>
  <button class="go" id="scoutBtn" type="button">${first?'プレイボール':'閉じる'}</button>`;
  $('scout').hidden=false;$('scoutBtn').onclick=first?beginGame:()=>{$('scout').hidden=true;};$('scoutBtn').focus();
}

/* ---------- control ---------- */
const isHuman=t=>cfg.ctl[t]==='human';
const both=()=>isHuman(0)&&isHuman(1);
function who(t){return cfg.names[t]||(isHuman(t)?(both()?'P'+(t+1):'あなた'):'CPU');}

/* ---------- board ---------- */
function renderBoard(){
  const n=Math.max(G.cfg.innings,G.inning),cols=[...Array(n).keys()];
  const row=t=>{const T=G.teams[t];return `<tr><td class="tn"><i style="background:${uiColor(T.color)}"></i>${T.short}<small>${esc(who(t))}</small></td>`+
    cols.map(i=>{const v=G.line[t][i];const cur=i===G.inning-1&&G.half===t&&!G.over;return `<td class="${cur?'cur':''}">${v===undefined?'':v}</td>`;}).join('')+
    `<td class="rh">${G.score[t]}</td><td class="rh">${G.hits[t]}</td></tr>`;};
  const dots=(n,on,c)=>`<div class="dots ${c}">${[...Array(n)].map((_,i)=>`<i class="${i<on?'on':''}"></i>`).join('')}</div>`;
  const B=G.bases,sq=(x,y,on)=>`<rect x="${x}" y="${y}" width="11" height="11" transform="rotate(45 ${x+5.5} ${y+5.5})" fill="${on?'#ffb547':'#1d2a25'}" stroke="#3b4a43"/>`;
  $('board').innerHTML=`<div class="ls-wrap"><table class="ls"><thead><tr><th></th>${cols.map(i=>`<th>${i+1}</th>`).join('')}<th>R</th><th>H</th></tr></thead><tbody>${row(0)}${row(1)}</tbody></table></div>
  <div class="status"><div class="inn">${G.inning}<small>回${G.half?'裏':'表'}${G.inning>G.cfg.innings?'・TB':''}</small></div>
  <div class="bso"><span>B</span>${dots(3,G.balls,'b')}<span>S</span>${dots(2,G.strikes,'s')}<span>O</span>${dots(2,G.outs,'o')}</div>
  <svg class="bases" viewBox="0 0 46 40" role="img" aria-label="塁上">${sq(17.5,2,B[1])}${sq(31,16,B[0])}${sq(4,16,B[2])}</svg></div>`;
}

/* ---------- stage ---------- */
const ZY={H:226,L:300};
function zoneXY(zone,side){const inX=side==='L'?743:787,outX=side==='L'?787:743;
  switch(zone){case 'HI':return [inX,ZY.H];case 'HO':return [outX,ZY.H];case 'LI':return [inX,ZY.L];case 'LO':return [outX,ZY.L];
    case 'HB':return [765,156];case 'LB':return [765,374];case 'WA':return [side==='L'?945:585,250];default:return [765,263];}}
function placeSprite(el,shadow,src,key,h,flip,o){
  const m=META[key],sc=h/m.h,w=m.w*sc;let x0;
  if(o.alignRight!=null){const fmax=flip?m.w-m.fmin:m.fmax;x0=o.alignRight-fmax*sc;}
  else if(o.alignLeft!=null){const fmin=flip?m.w-m.fmax:m.fmin;x0=o.alignLeft-fmin*sc;}
  else x0=o.cx-w/2;
  el.style.left=(x0/VW*100)+'%';el.style.top=((o.feet-h)/VH*100)+'%';el.style.width=(w/VW*100)+'%';
  el.classList.toggle('flip',flip);if(el.dataset.src!==src){el.src=src;el.dataset.src=src;}
  const fx0=x0+(flip?m.w-m.fmax:m.fmin)*sc,fx1=x0+(flip?m.w-m.fmin:m.fmax)*sc,sw=(fx1-fx0)*1.15,sx=(fx0+fx1)/2;
  shadow.style.left=((sx-sw/2)/VW*100)+'%';shadow.style.width=(sw/VW*100)+'%';shadow.style.top=((o.feet-h*.035)/VH*100)+'%';shadow.style.height=(h*.06/VH*100)+'%';
}
const ST={side:'L',hand:'R',pitPose:'set',batPose:'stance',marks:[]};
function stageSet(pitPose,batPose){
  const F=ST.freeze,P=F?F.P:T_pit(G).cur,b=F?F.b:curBatter(G),side=batSide(b,P);
  ST.side=side;ST.hand=P.hand;ST.pitPose=pitPose||ST.pitPose;ST.batPose=batPose||ST.batPose;
  const bg=$('sBg');const bgs=img('bg');if(bg.dataset.src!==bgs){bg.src=bgs;bg.dataset.src=bgs;}
  const bKey=ST.batPose==='swing'?'b_swing':'b_stance',bh=ST.batPose==='swing'?389:405;
  placeSprite($('sBat'),$('sBatShadow'),img(bKey),bKey,bh,side==='R',side==='L'?{alignRight:690,feet:458}:{alignLeft:842,feet:458});
  const pKey=ST.pitPose==='rel'?'p_rel':'p_set',ph=ST.pitPose==='rel'?560:620;
  const cx=side==='L'?(ST.pitPose==='rel'?836:830):(ST.pitPose==='rel'?700:706);
  placeSprite($('sPit'),$('sPitShadow'),img(pKey),pKey,ph,P.hand==='L',{cx,feet:890});
  $('sBat').alt=`打者 ${b.name}`;$('sPit').alt=`投手 ${P.name}`;
  const T=T_bat(G);
  $('tvPlate').innerHTML=`<div><small style="margin:0 6px 0 0">投</small><b>${esc(P.name)}</b><small>${handJ(P.hand)}投 ${P.np||0}球${P.fatigued?' 疲労':''}</small></div><div><small style="margin:0 6px 0 0">${F?F.order:(T.bIdx%9)+1}番</small><b>${esc(b.name)}</b><small>${handJ(side)}打</small></div>`;
  drawZone();
}
function drawZone(){
  const s=$('sZone');const m=ST.marks.map((k,i)=>{const col={B:'#5fd38d',S:'#ffd447',F:'#ffb547','打':'#6fa8ff','バ':'#6fa8ff'}[k.c]||'#fff';
    return `<g><circle cx="${k.x}" cy="${k.y}" r="11" fill="${col}" stroke="#08110d" stroke-width="3"/><text x="${k.x}" y="${k.y+5}" text-anchor="middle" font-size="14" font-weight="900" fill="#08110d" font-family="DotGothic16,monospace">${i+1}</text></g>`;}).join('');
  s.innerHTML=`<rect x="722" y="190" width="86" height="146" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.75)" stroke-width="2"/>
  <line x1="765" y1="190" x2="765" y2="336" stroke="rgba(255,255,255,.35)" stroke-width="1.5"/><line x1="722" y1="263" x2="808" y2="263" stroke="rgba(255,255,255,.35)" stroke-width="1.5"/>${m}`;
}
/* ball */
const cv=$('sBall'),cx=cv.getContext('2d');
function sizeCanvas(){const r=cv.getBoundingClientRect();const d=Math.min(2,window.devicePixelRatio||1);cv.width=Math.max(1,r.width*d);cv.height=Math.max(1,r.height*d);}
window.addEventListener('resize',sizeCanvas);
const BRK={FB:[0,-6,3,0],SL:[-34,10,3,0],CB:[-18,40,1.8,30],FK:[0,38,4,0],CH:[18,24,2.6,0]};
function animateBall(type,zone,dur){
  sizeCanvas();const k=cv.width/VW;const [tx,ty]=zoneXY(zone,ST.side);
  const relCx=ST.side==='L'?836:700;const sx=relCx+(ST.hand==='R'?60:-60),sy=318;
  const b=BRK[type]||[0,0,2,0];const dx=b[0]*(ST.hand==='R'?1:-1),dy=b[1];
  const t0=performance.now();
  return new Promise(res=>{const trail=[];
    const step=now=>{const t=Math.min(1,(now-t0)/dur);const f=Math.pow(t,b[2]);
      const x=sx+(tx-dx-sx)*t+dx*f,y=sy+(ty-dy-sy)*t+dy*f-b[3]*Math.sin(Math.PI*t);
      const r=11-6.5*t;trail.push([x,y,r]);if(trail.length>7)trail.shift();
      cx.clearRect(0,0,cv.width,cv.height);
      trail.forEach(([px,py,pr],i)=>{cx.fillStyle=`rgba(255,255,255,${.05*(i+1)})`;cx.beginPath();cx.arc(px*k,py*k,pr*k,0,7);cx.fill();});
      cx.fillStyle='#fbfaf5';cx.beginPath();cx.arc(x*k,y*k,r*k,0,7);cx.fill();cx.strokeStyle='rgba(200,40,40,.85)';cx.lineWidth=Math.max(1,r*k*.2);cx.beginPath();cx.arc((x-r*.3)*k,y*k,r*.7*k,-1,1);cx.stroke();
      if(t<1)requestAnimationFrame(step);else res([tx,ty]);};
    requestAnimationFrame(step);});
}
function clearBall(){cx.clearRect(0,0,cv.width,cv.height);}
function stamp(t,o={}){const el=$('stamp');el.innerHTML=`<div class="t" style="color:${o.col||'#fff'}">${t}</div>${o.sub?`<div class="s">${o.sub}</div>`:''}`;el.style.setProperty('--dur',(o.dur||1000)+'ms');el.classList.remove('show');void el.offsetWidth;el.classList.add('show');}
function tvPitch(type,kmh){const el=$('tvPitch');el.innerHTML=`<span>${PT[type].name}</span>${kmh} km/h`;el.hidden=false;clearTimeout(el._t);el._t=setTimeout(()=>el.hidden=true,2600);}

/* cut-ins */
const CI_SND={c06_impact:sc=>{if(sc.text==='ファウル'){sFoul();sCrowd(.25,.6);}else{sHit(sc.big?1:.75);sCrowd(sc.big?1:.7,sc.big?2.6:1.5);}},c07_mitt:sc=>sMitt(!!sc.k),c08_strike:()=>sMitt(false),c09_k:()=>{sMitt(true);sCrowd(.7,1.6);},
  c10_walk:()=>sCrowd(.25,1),c11_grounder:()=>{sMitt(false);sCrowd(.65,1);},c12_fly:()=>{sMitt(false);sCrowd(.65,1);},c13_bunt:()=>sFoul(),c14_slide:()=>sWhoosh(.5),c15_out:()=>sCrowd(.5,1.2),c16_safe:()=>sCrowd(.6,1.3),c17_dp:()=>sCrowd(.6,1.4),c18_celebrate:()=>sCrowd(1,3)};
function waitTap(ms){return new Promise(res=>{const el=$('cutin');let done=false;const fin=()=>{if(done)return;done=true;el.onclick=null;clearTimeout(t);res();};const t=setTimeout(fin,ms);el.onclick=fin;});}
async function playScenes(scenes,ctx){
  const el=$('cutin');$('stage').classList.add('ci-on');
  for(const sc of scenes){
    el.className='cutin'+(sc.vision?' vision':'')+(sc.big?' big':'');el.hidden=false;
    $('ciImg').style.backgroundImage=`url("${img(sc.img)}")`;
    const tx=$('ciText');tx.textContent=sc.text||'';tx.className='ci-text'+(sc.text==='アウト！'?' red':sc.text==='セーフ！'?' green':'');
    /* keep the caption on one line: shrink long words so they fit about 88% of the frame width */
    {const n=[...(sc.text||'')].length||1,base=sc.big?(sc.vision?11:14):10;tx.style.fontSize=`clamp(18px,${Math.min(base,88/n).toFixed(2)}cqw,110px)`;}
    [...el.children].forEach(c=>{c.style.animation='none';void c.offsetWidth;c.style.animation='';});
    (CI_SND[sc.img]||(()=>{}))({...sc,k:ctx&&ctx.k});
    await waitTap(sc.big?1500:sc.text?1150:800);
  }
  el.hidden=true;$('stage').classList.remove('ci-on');
}

async function showRuns(n,bt){
  const el=$('cutin');el.className='cutin big score';el.hidden=false;$('stage').classList.add('ci-on');
  $('ciImg').style.backgroundImage=`url("${img('bg')}")`;
  const T=G.teams[bt],tx=$('ciText');tx.className='ci-text';
  tx.innerHTML=`<div class="sc-team" style="color:${uiColor(T.color)}">${esc(T.short)}</div>${n}点！<div class="sc">${esc(G.teams[0].short)} ${G.score[0]} - ${G.score[1]} ${esc(G.teams[1].short)}</div>`;
  [...el.children].forEach(c=>{c.style.animation='none';void c.offsetWidth;c.style.animation='';});
  sCrowd(.9,2);await waitTap(2000);el.hidden=true;$('stage').classList.remove('ci-on');}
/* ---------- bottom sheet ---------- */
function dockShow(full){const d=$('dock');d.classList.remove('away','min');d.classList.toggle('full',!!full);$('grab').textContent='中継を見る';$('grab').setAttribute('aria-expanded','true');d.scrollTop=0;
  if(!full)$('foot').innerHTML='';
  const st=$('stage').getBoundingClientRect();if(!full&&(st.top<0||st.top>window.innerHeight*.4))window.scrollTo({top:Math.max(0,window.scrollY+st.top-8),behavior:RM?'auto':'smooth'});}
function toFoot(){const f=$('foot');f.innerHTML='';$('panel').querySelectorAll(':scope > .row').forEach(r=>f.appendChild(r));}
function miniHTML(){const t=G.teams;const B=G.bases;const run=['一','二','三'].filter((_,i)=>B[i]);
  return `<div class="mini">${G.inning}回${G.half?'裏':'表'}<span>${esc(t[0].short)} ${G.score[0]}-${G.score[1]} ${esc(t[1].short)}</span>B${G.balls} S${G.strikes} O${G.outs}<span>${run.length?'走者 '+run.join('・')+'塁':'走者なし'}</span></div>`;}
function dockAway(){$('dock').classList.add('away');}
$('grab').onclick=()=>{const d=$('dock');const m=d.classList.toggle('min');$('grab').textContent=m?'選択に戻る':'中継を見る';$('grab').setAttribute('aria-expanded',String(!m));};
/* ---------- flow ---------- */
function say(msg){news.push(msg);}
async function nextPitch(){
  if(G.over)return showEnd();
  sel={};pending={};$('tvPitch').hidden=true;
  const freshPA=G.ab.pitches.length===0&&G.ab.pickoffs===0&&!G.ab.prepped;
  if(freshPA){G.ab.prepped=true;
    if(!isHuman(batTeam(G))){const ph=cpuPinch(G);if(ph){const old=pinchHit(G,ph);say(`${T_bat(G).short}、代打 ${ph.name}（${old.name}に代わって）`);}}
    if(!isHuman(pitTeam(G))){const np=cpuPitchChange(G);if(np){changePitcher(G,pitTeam(G),np);say(`${T_pit(G).short}、投手交代 ${np.name}（${{SP:'先発',RP:'中継ぎ',CL:'抑え'}[np.role]}・${handJ(np.hand)}投）`);}}
  }
  ST.marks=G.ab.pitches.length?ST.marks:[];
  stageSet('set','stance');renderBoard();
  const pt=pitTeam(G);
  if(!isHuman(pt)){pending.pitch=cpuPitch(G);if(pending.pitch.kind==='pickoff'&&!G.bases.some(Boolean))pending.pitch=cpuPitch(G);afterPitch();}
  else if(both())handoff(`${who(pt)} の番`,'投手',`${G.teams[pt].short}の投手として配球を決めます。${who(batTeam(G))} は画面を見ないでください。`,renderPitcherUI);
  else renderPitcherUI();
}
function afterPitch(){const bt=batTeam(G);
  if(!isHuman(bt)){const c=cpuBat(G);pending.act=c.act;pending.steal=c.steal;reveal();}
  else if(both())handoff(`${who(bt)} の番`,'打者',`${G.teams[bt].short}の打者として読みを伏せます。${who(pitTeam(G))} は画面を見ないでください。`,renderBatterUI);
  else renderBatterUI();}
function handoff(title,label,text,fn){$('hoTitle').textContent=title;$('hoLabel').textContent=label;$('hoText').textContent=text;
  $('panel').innerHTML='<p class="sub">端末を渡しています…</p>';$('foot').innerHTML='';$('memo').hidden=true;$('handoff').hidden=false;
  $('hoBtn').onclick=()=>{$('handoff').hidden=true;fn();};$('hoBtn').focus();}
function newsHTML(){if(!news.length)return '';const h=news.map(n=>`<div>${esc(n)}</div>`).join('');news=[];return `<div class="news" role="status">${h}</div>`;}

/* ---------- pitcher UI ---------- */
function zoneButtons(selZ,opts){
  const side=ST.side;const L=side==='L'?['HI','LI']:['HO','LO'],Rr=side==='L'?['HO','LO']:['HI','LI'];
  const b=(z,cls='in')=>{const multi=Array.isArray(selZ);const on=multi?selZ.includes(z):selZ===z;
    return `<button type="button" id="z-${z}" data-zone="${z}" class="${ZN[z].ball?(z==='WA'?'waste':'ball'):cls}" aria-pressed="${on}">${ZN[z].label}${z==='WA'?'<small>スクイズ封じ・ボール1つ</small>':''}</button>`;};
  return `<div class="zp">${opts.balls?b('HB'):''}${b(L[0])}${b(Rr[0])}${b(L[1])}${b(Rr[1])}${opts.balls?b('LB'):''}${opts.waste?b('WA'):''}<div class="cap">テレビ中継と同じ向き・打者は${side==='L'?'左':'右'}打席</div></div>`;
}
function cardHTML(k,o={}){return `<button type="button" class="card${o.ws?' ws':''}" id="${o.id}" data-type="${k}" aria-pressed="${!!o.pressed}" ${o.disabled?'disabled':''}><span class="k">${PT[k].k}</span><span class="n">${PT[k].name}</span>${o.noSpeed?'':`<span class="v${k==='FB'?' fb':''}">${o.kmh||PT[k].kmh}km</span>`}</button>`;}
function seqHTML(){const a=G.ab.pitches;if(!a.length)return '<span style="font-family:inherit">この打席の1球目</span>';
  return a.map((p,i)=>p.kind==='pickoff'?`<span>${i+1} <b>牽制</b></span>`:`<span>${i+1} <b>${PT[p.type].k}</b> ${ZN[p.zone].s} ${p.c}</span>`).join('');}
function renderPitcherUI(){
  dockShow(true);
  const t=pitTeam(G),T=G.teams[t],P=T.cur,b=curBatter(G),side=batSide(b,P);stageSet('set','stance');
  const prev=prevPitch(G);
  const chips=(sel.type&&sel.zone)?(()=>{const d=deception(prev,{type:sel.type,zone:sel.zone,kmh:sel.card==='ws'?(sel.type==='FB'?fbBase(P)+1:0):(P.cards[sel.card]||{}).kmh},P,side);return d.tags.length?d.tags.map(([n,s,v])=>`<span class="chip ${v>0?'up':'dn'}">${n} ${s}</span>`).join(''):'<span class="chip">残像なし</span>';})():'<span class="chip">球とコースを選ぶと効果が出ます</span>';
  const canPO=G.bases.some(Boolean)&&G.ab.pickoffs<3;
  const fat=P.fatigued;
  let body;
  if(fat){
    body=`<div class="warn">山札が尽きました。切り札以外の球は、球種かコースの片方だけを決めます。</div>
    <div><div class="label">手札（山札 0枚）</div><div class="hand" id="wsHand">${P.ws?cardHTML(P.wsType,{id:'h-ws',ws:true,kmh:P.wsType==='FB'?fbBase(P)+1:0,pressed:sel.fat==='ws'}):'<span class="sub" style="padding:8px 0">残っているカードはありません</span>'}</div>${P.ws?'<div class="hint">決め球の切り札は、球種とコースを決めて球威そのままで投げられます（1回限り）。</div>':''}</div>
    <div><div class="label">${P.ws?'切り札を使わずに投げる':'投げ方'}</div><div class="seg2" id="fatMode"><button type="button" id="fm-type" data-v="type" aria-pressed="${sel.fat==='type'}">球種で勝負<small>コースは無作為・威力70%</small></button><button type="button" id="fm-zone" data-v="zone" aria-pressed="${sel.fat==='zone'}">コースで勝負<small>球種は無作為・2回に1回外れる</small></button></div></div>
    ${sel.fat==='type'?`<div><div class="label">球種</div><div class="hand" id="hand">${P.rep.map(k=>cardHTML(k,{id:'h-'+k,kmh:k==='FB'?fbBase(P)-6:0,pressed:sel.type===k})).join('')}</div></div>`:''}
    ${sel.fat==='zone'||sel.fat==='ws'?`<div><div class="label">コース${sel.fat==='ws'?`（決め球 ${PT[P.wsType].name}）`:''}</div>${zoneButtons(sel.zone,{balls:true,waste:sel.fat==='zone'&&!!G.bases[2]&&G.outs<2})}</div>`:''}`;
  }else{
    body=`<div><div class="label">手札（山札 ${sum(P.deck)}枚）</div><div class="hand" id="hand">${P.cards.map((c,i)=>cardHTML(c.type,{id:'h-'+i,kmh:c.kmh,pressed:sel.card===i})).join('')}${P.ws?cardHTML(P.wsType,{id:'h-ws',ws:true,kmh:P.wsType==='FB'?fbBase(P)+1:0,pressed:sel.card==='ws'}):''}</div></div>
    <div class="cols"><div><div class="label">コース</div>${zoneButtons(sel.zone,{balls:true,waste:!!G.bases[2]&&G.outs<2})}</div>
    <div style="display:flex;flex-direction:column;gap:10px"><div><div class="label">残像（前の球との組み合わせ・左右）</div><div class="chips">${chips}</div></div>
    <div><div class="label">この打席の配球</div><div class="seq">${seqHTML()}</div></div></div></div>`;
  }
  const ready=fat?(sel.fat==='type'?!!sel.type:(sel.fat==='zone'||sel.fat==='ws')?!!sel.zone:false):(sel.zone==='WA'||(sel.card!=null&&sel.zone));
  $('panel').innerHTML=`${miniHTML()}${newsHTML()}
   <div class="role"><span class="tag pit">投手</span><b>${esc(P.name)}</b><small>${handJ(P.hand)}投・${P.style}・${who(t)}・決め球 ${PT[P.wsType].name}${P.ws?'<span class="badge">切り札あり</span>':''}</small>${fat?'<span class="warn">疲労</span>':''}</div>
   <div class="sub">打者 <b>${(T_bat(G).bIdx%9)+1}番 ${esc(b.name)}</b>（${handJ(side)}打・ミート${RANK(b.con)} パワー${RANK(b.pow)} 選球${RANK(b.eye)} 走力${RANK(b.spd)}）${b.wide?'<span class="badge">広角の切り札を持つ</span>':''}</div>
   ${body}
   <div class="row"><button class="go" id="throwBtn" type="button" ${ready?'':'disabled'}>投げる</button></div>
   <div class="row"><button class="ghost" id="poBtn" type="button" ${canPO?'':'disabled'}>牽制（この打席 ${G.ab.pickoffs}/2${G.ab.pickoffs>=2?'・次はボークの危険':''}）</button>
   <button class="ghost" id="chgBtn" type="button" ${bullpen(T).length?'':'disabled'}>投手交代</button>
   ${!both()?'<button class="ghost" id="scoutOpen" type="button">試合前レポート</button>':''}</div>`;
  toFoot();
  const hand=$('hand');if(hand)hand.onclick=e=>{const c=e.target.closest('.card');if(!c||c.disabled)return;
    if(fat){sel.type=c.dataset.type;}else{sel.card=c.id==='h-ws'?'ws':+c.id.slice(2);sel.type=c.dataset.type;if(sel.zone==='WA')sel.zone=null;}sFlip();renderPitcherUI();};
  const wh=$('wsHand');if(wh)wh.onclick=e=>{const c=e.target.closest('.card');if(!c)return;sel={fat:'ws',type:P.wsType};sFlip();renderPitcherUI();};
  const fm=$('fatMode');if(fm)fm.onclick=e=>{const x=e.target.closest('button');if(!x)return;sel={fat:x.dataset.v};renderPitcherUI();};
  $('panel').querySelectorAll('[data-zone]').forEach(z=>z.onclick=()=>{sel.zone=z.dataset.zone;if(sel.zone==='WA')sel.card=null;renderPitcherUI();});
  $('throwBtn').onclick=()=>{let p;
    if(fat)p=sel.fat==='ws'?{kind:'pitch',type:P.wsType,zone:sel.zone,ws:true}:sel.fat==='type'?{kind:'pitch',type:sel.type,fat:'type'}:{kind:'pitch',zone:sel.zone,fat:'zone'};
    else if(sel.zone==='WA')p={kind:'pitch',type:'FB',zone:'WA'};
    else p={kind:'pitch',type:sel.type,zone:sel.zone,ws:sel.card==='ws',kmh:(sel.card!=='ws'&&P.cards[sel.card])?P.cards[sel.card].kmh:undefined};
    pending.pitch=p;sel={};afterPitch();};
  $('poBtn').onclick=()=>{pending.pitch={kind:'pickoff'};sel={};afterPitch();};
  $('chgBtn').onclick=()=>openPitcherChange(t);
  if($('scoutOpen'))$('scoutOpen').onclick=()=>showScout(false);
  renderMemo('pit');
}
function openPitcherChange(t){const T=G.teams[t];const ok=canChangePitcher(G,t);
  $('modalSheet').innerHTML=`<span class="label">投手交代</span><h2 class="big-h">${esc(T.cur.name)}に代えて</h2>
  ${ok?'':'<p class="warn">この投手はまだ打者1人との対戦を終えていないので、交代できません。</p>'}
  <div class="list">${bullpen(T).map((p,i)=>`<button type="button" id="bp-${i}" data-i="${i}" ${ok?'':'disabled'}><span><b>${esc(p.name)}</b><br><small>${{SP:'先発',RP:'中継ぎ',CL:'抑え'}[p.role]}・${handJ(p.hand)}投・${p.style}・決め球 ${PT[p.wsType].name}</small></span><small>${p.rep.map(k=>PT[k].k).join(' ')}<br>山札 ${p.total}枚</small></button>`).join('')||'<p class="sub">ブルペンに投手が残っていません。</p>'}</div>
  <button class="go alt" id="mClose" type="button">やめる</button>`;
  $('modal').hidden=false;$('mClose').onclick=()=>{$('modal').hidden=true;};
  $('modalSheet').querySelectorAll('[data-i]').forEach(x=>x.onclick=()=>{const p=bullpen(T)[+x.dataset.i];changePitcher(G,t,p);say(`${T.short}、投手交代 ${p.name}`);$('modal').hidden=true;sel={};renderPitcherUI();});
}

/* ---------- batter UI ---------- */
const MODE_HINT={swing:'球種とコースの両方を読みます。両方当たれば長打、本塁打もあります。',wide:'切り札。コースを2つまで張れます。当たればヒットか二塁打（本塁打なし）。',take:'振りません。ボールなら得、ストライクなら損です。',cut:'当てにいき、ファウルで粘ります。長打は出ません。',bunt:'コースだけで勝負。成功すれば走者が進み、打者はアウトです。2ストライクでのファウルは三振です。',squeeze:'コースだけで勝負。成功すれば三塁走者が生還。空振りや外されると三塁走者がアウトになります。'};
function renderBatterUI(){
  dockShow(true);
  const bt=batTeam(G),T=G.teams[bt],P=T_pit(G).cur,b=curBatter(G),side=batSide(b,P);stageSet('set','stance');
  const k=sel.kind;const needT=k==='swing'||k==='wide';const needZ=['swing','wide','bunt','squeeze'].includes(k);const maxZ=k==='wide'?2:1;
  sel.zones=sel.zones||[];
  const ready=k&&(!needT||sel.type)&&(!needZ||sel.zones.length>=1);
  const mb=(m,sub,dis)=>`<button type="button" id="mode-${m}" data-mode="${m}" aria-pressed="${k===m}" ${dis?'disabled':''}>${KIND[m]}<small>${sub}</small></button>`;
  const st=stealable(G);
  $('panel').innerHTML=`${miniHTML()}${newsHTML()}
   <div class="role"><span class="tag bat">打者</span><b>${(T.bIdx%9)+1}番 ${esc(b.name)}</b><small>${handJ(side)}打・ミート${RANK(b.con)} パワー${RANK(b.pow)} 選球${RANK(b.eye)} 走力${RANK(b.spd)}・${who(bt)}</small>${b.wide?'<span class="badge">広角 残り1</span>':''}</div>
   <div class="sub">投手 <b>${esc(P.name)}</b>（${handJ(P.hand)}投・${P.style}）・決め球 <b>${PT[P.wsType].name}</b>${P.fatigued?' <span class="warn">疲労：球種かコースの片方しか決められない</span>':''}</div>
   <div class="modes" id="modes">${mb('swing','球種＋コース')}${mb('wide','コース2つ',!b.wide)}${mb('take','振らない')}${mb('cut','粘る')}${mb('bunt','コースのみ',!canBunt(G))}${mb('squeeze','コースのみ',!canSqueeze(G))}</div>
   <div class="hint">${k?MODE_HINT[k]:'読み方を選んでください。'}</div>
   ${needT?`<div><div class="label">張る球種（${esc(P.name)}の持ち球）</div><div class="hand" id="ptypes">${P.rep.map(t=>cardHTML(t,{id:'g-'+t,noSpeed:true,pressed:sel.type===t})).join('')}</div></div>`:''}
   ${st.length?`<div><div class="label">走者への指示（盗塁）</div><div class="chips" id="stealChips">${st.map(i=>`<button type="button" class="chip steal" id="st-${i}" data-i="${i}" aria-pressed="${sel.steal===i}">${['一塁','二塁'][i]}走者 ${esc(G.bases[i].name)}が${['二塁','三塁'][i]}へ盗塁（走力${RANK(G.bases[i].spd)}）</button>`).join('')}</div></div>`:''}
   <div class="cols">${needZ?`<div><div class="label">張るコース${maxZ>1?'（2つまで）':''}</div>${zoneButtons(sel.zones,{})}</div>`:'<div></div>'}
     <div style="display:flex;flex-direction:column;gap:10px">
     <div><div class="label">この打席の配球</div><div class="seq">${seqHTML()}</div></div></div></div>
   <div class="row"><button class="go alt" id="betBtn" type="button" ${ready?'':'disabled'}>勝負</button></div>
   <div class="row"><button class="ghost" id="phBtn" type="button" ${canPinchHit(G)?'':'disabled'}>代打</button>${!both()?'<button class="ghost" id="scoutOpen" type="button">試合前レポート</button>':''}</div>`;
  toFoot();
  $('modes').onclick=e=>{const m=e.target.closest('button');if(!m||m.disabled)return;sel.kind=m.dataset.mode;if(sel.kind!=='wide')sel.zones=sel.zones.slice(0,1);renderBatterUI();};
  if(needT)$('ptypes').onclick=e=>{const c=e.target.closest('.card');if(!c)return;sel.type=c.dataset.type;sFlip();renderBatterUI();};
  $('panel').querySelectorAll('[data-zone]').forEach(z=>z.onclick=()=>{const v=z.dataset.zone;
    if(maxZ===1)sel.zones=[v];else{sel.zones=sel.zones.includes(v)?sel.zones.filter(x=>x!==v):[...sel.zones,v].slice(-2);}renderBatterUI();});
  if($('stealChips'))$('stealChips').onclick=e=>{const c=e.target.closest('button');if(!c)return;const i=+c.dataset.i;sel.steal=sel.steal===i?null:i;renderBatterUI();};
  $('betBtn').onclick=()=>{const a={kind:sel.kind};if(needT)a.type=sel.type;if(needZ)a.zones=[...sel.zones];pending.act=a;pending.steal=sel.steal!=null?sel.steal:null;sel={};reveal();};
  $('phBtn').onclick=openPinch;
  if($('scoutOpen'))$('scoutOpen').onclick=()=>showScout(false);
  renderMemo('bat');
}
function openPinch(){const T=T_bat(G),b=curBatter(G),P=T_pit(G).cur;
  $('modalSheet').innerHTML=`<span class="label">代打</span><h2 class="big-h">${esc(b.name)}に代えて</h2>
  ${b.wide?'<p class="warn">この打者の広角打法の切り札は、代打を出すと消えます。</p>':''}
  <div class="list">${T.benchLeft.map((x,i)=>`<button type="button" id="ph-${i}" data-i="${i}"><span><b>${esc(x.name)}</b><br><small>${handJ(batSide(x,P))}打（対${handJ(P.hand)}投）</small></span><small>ミート${RANK(x.con)} パワー${RANK(x.pow)}<br>選球${RANK(x.eye)} 走力${RANK(x.spd)}</small></button>`).join('')}</div>
  <p class="note">代打を出すと、投手側は配球を選び直します。</p>
  <button class="go alt" id="mClose" type="button">やめる</button>`;
  $('modal').hidden=false;$('mClose').onclick=()=>{$('modal').hidden=true;};
  $('modalSheet').querySelectorAll('[data-i]').forEach(x=>x.onclick=()=>{const nb=T.benchLeft[+x.dataset.i];const old=pinchHit(G,nb);say(`${T.short}、代打 ${nb.name}（${old.name}に代わって）`);$('modal').hidden=true;
    /* the pitcher re-chooses against the new batter */
    if(!isHuman(pitTeam(G))){const np=cpuPitchChange(G);if(np){changePitcher(G,pitTeam(G),np);say(`${T_pit(G).short}、投手交代 ${np.name}`);}}
    nextPitch();});
}

/* ---------- reveal ---------- */
function readLabel(a,ownView){
  if(a.kind==='take')return ['見','見送り','振らない'];if(a.kind==='cut')return ['当','カット','当てにいく'];
  const zs=a.zones||[];const zl=(ownView?zs:zs.slice(0,1)).map(z=>ZN[z].label).join('・');
  if(a.kind==='bunt'||a.kind==='squeeze')return ['バ',KIND[a.kind],zl];
  return [PT[a.type].k,ownView&&a.kind==='wide'?'広角打法':'球種＋コース',`${PT[a.type].name}・${zl}`];
}
async function reveal(){
  G.busy=true;const bt=batTeam(G),pt=pitTeam(G);
  const pitch=finalizePitch(G,pending.pitch),act=pending.act,steal=pending.steal!=null?pending.steal:null;
  const P=T_pit(G).cur,b=curBatter(G);
  const res=resolvePitch(G,pitch,act,steal);
  const ownBat=!both()&&isHuman(bt),ownPit=!both()&&isHuman(pt);
  const [rk,rt,rz]=readLabel(act,ownBat);
  const pk=pitch.kind==='pickoff'?['牽','牽制',`${['一塁','二塁','三塁'][res.pickoff.base]}へ`]:[pitch.zone==='WA'?'外':PT[pitch.type].k,pitch.zone==='WA'?'ウエスト':PT[pitch.type].name,`${ZN[pitch.zone].label}${pitch.zone!=='WA'?'・'+pitch.kmh+'km/h':''}`];
  const chips=[];
  if(pitch.kind==='pitch'&&['swing','wide'].includes(act.kind)&&!ZN[pitch.zone].ball){
    const lab=(v,n)=>v===1?`<span class="chip hitok">${n} 的中</span>`:v>0?`<span class="chip">${n} 惜しい</span>`:`<span class="chip dn">${n} 外れ</span>`;
    chips.push(lab(res.tm,'球種'),lab(res.zm,'コース'));}
  const BAND_TXT={A:'両方的中：長打・本塁打の帯',B:'的中＋惜しい：ヒット・二塁打まで',C:'片方だけ的中：ファウル・凡打中心',C2:'両方惜しい：ファウル・凡打中心',D:'両方外れ：空振りかファウル',W:'広角打法：ヒット・二塁打まで'};
  if(res.band&&(res.band!=='W'||ownBat))chips.push(`<span class="chip" style="border-color:var(--led);color:var(--led)">${BAND_TXT[res.band]}</span>`);
  if(act.kind==='cut'&&pitch.kind==='pitch')chips.push('<span class="chip">カット：長打なし</span>');
  if(ownPit&&pitch.ws)chips.push(`<span class="chip up">決め球を使用${res.wsEffect?'：惜しい読みを空振りに':''}</span>`);
  if(ownBat&&act.kind==='wide')chips.push('<span class="chip up">広角打法を使用</span>');
  for(const [n,s,v] of (res.dec.tags||[]))chips.push(`<span class="chip ${v>0?'up':'dn'}">${n}${s}</span>`);
  if(steal!=null)chips.push(`<span class="chip">${['一塁','二塁'][steal]}走者スタート</span>`);
  $('memo').hidden=true;
  $('panel').innerHTML=`<div class="reveal">
     <div class="rc"><div class="cap">投手</div><div class="face"><div class="k">${pk[0]}</div><div class="t">${pk[1]}</div><div class="z">${pk[2]}</div></div></div>
     <div class="vs">VS</div>
     <div class="rc read"><div class="cap">打者</div><div class="face"><div class="k">${rk}</div><div class="t">${rt}</div><div class="z">${rz}</div></div></div></div>
   <div class="verdict">${chips.join('')}</div>
   <div class="result" id="resBox" aria-live="polite"><div class="h">…</div></div>
   <button class="go" id="nextBtn" type="button" hidden>次の球へ</button>`;
  sFlip();dockShow();
  const prevMarks=ST.marks.slice();
  ST.freeze={P,b,order:(T_bat(G).bIdx%9)+1};
  const ev=applyResult(G,pitch,act,res);
  if(pitch.kind==='pitch')P.np=(P.np||0)+1;
  await sleep(900);dockAway();
  /* on-field animation */
  if(pitch.kind==='pitch'){
    await sleep(250);ST.pitPose='rel';stageSet('rel',null);sWhoosh(.5);
    const kmh=Math.round(pitch.kmh+(Math.random()*2-1)-(pitch.weak?7:0));
    const dur=520*Math.pow(148/pitch.kmh,1.3);
    const swing=res.swing&&!(res.bunt);
    if(swing)setTimeout(()=>{ST.batPose='swing';stageSet(null,'swing');},Math.max(0,dur-120));
    const [x,y]=await animateBall(pitch.type,pitch.zone,dur);
    if(res.contact&&(res.call==='inplay'||res.call==='foul'))sHit(res.call==='foul'?.3:.7);else if(!ev.scenes.length)sMitt(false);
    tvPitch(pitch.type,kmh);
    const c={ball:'B',strike:'S',foul:'F',inplay:'打',bunt:'バ'}[res.call];
    ST.marks=prevMarks.concat([{x,y,c}]);drawZone();
    await sleep(240);clearBall();
  }else{stamp('牽制！',{dur:800});await sleep(700);}
  if(ev.scenes.length)await playScenes(ev.scenes,{k:ev.k});
  else stamp(ev.head,{col:res.call==='ball'?'#5fd38d':'#ffd447',dur:900,sub:ev.sub||undefined});
  if(ev.runs>0)await showRuns(ev.runs,bt);
  ST.freeze=null;
  if(ev.abEnd)ST.marks=[];
  stageSet('set','stance');renderBoard();
  $('resBox').innerHTML=`<div class="h" style="color:${ev.tone==='hit'?'var(--hit)':ev.k?'var(--led)':'var(--chalk)'}">${esc(ev.head)}</div><div class="s">${esc(b.name)}${ev.sub?' · '+esc(ev.sub):''}</div>`;
  dockShow();
  const nb=$('nextBtn');nb.hidden=false;nb.textContent=G.over?'試合結果へ':ev.halfOver?'攻守交代':'次の球へ';
  G.busy=false;nb.focus();
  nb.onclick=()=>{if(G.over)return showEnd();
    if(ev.halfOver){const done=`${G.inning}回${G.half?'裏':'表'}`;nextHalf(G);if(G.over)return showEnd();ST.marks=[];halfBreak(done);}else nextPitch();};
}
function scoreline(mid){const t=G.teams;const tm=i=>`<div class="sl-tm" style="color:${uiColor(t[i].color)}">${esc(t[i].short)}<small>${esc(who(i))}</small></div>`;
  return `<div class="scoreline">${tm(0)}<div class="sl-sc">${mid}</div>${tm(1)}</div>`;}
function halfBreak(done){renderBoard();dockShow();const bt=batTeam(G);
  const msg=scoreline(`${G.score[0]} - ${G.score[1]}`);
  const role=!both()?(isHuman(bt)?`${who(bt)}の攻撃です`:`${who(pitTeam(G))}は守備です`):`${G.teams[bt].short}（${who(bt)}）の攻撃`;
  const tb=G.tiebreak?`<div class="s">タイブレーク：無死二塁から（二塁走者 ${esc(G.bases[1].name)}）</div>`:'';
  $('memo').hidden=true;
  $('panel').innerHTML=`<div class="result"><div class="label">${done} 終了</div>${msg}<div class="s">${G.inning}回${G.half?'裏':'表'}　${role}</div>${tb}</div><button class="go" id="hbBtn" type="button">続ける</button>`;
  stageSet('set','stance');$('hbBtn').focus();$('hbBtn').onclick=nextPitch;}

/* ---------- analysis ---------- */
const pct=(a,n)=>n?Math.round(a/n*100)+'%':'-';
function topN(o,n=2){return Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,n);}
function renderMemo(role){
  const m=$('memo');m.hidden=false;
  const tabs=role==='bat'?['カウント別','状況別','配球の流れ','コース']:['カウント別','張り球種','張りコース','作戦'];
  if(memoTab>=tabs.length)memoTab=0;
  const curS=sit(G.balls,G.strikes);let body='',title='';
  if(role==='bat'){const P=T_pit(G).cur;const ps=pStats(G.stats[pitTeam(G)],P.name);const prior=ps.prior?'（過去データ込み）':'';
    title=`相手投手 ${esc(P.name)} の配球${prior}`;
    if(memoTab===0)body=`<table class="tbl"><thead><tr><th>カウント</th><th>球数</th><th>多い球種</th><th>高さ・ボール率</th></tr></thead><tbody>${SITS.map(s=>{const x=ps.sit[s];if(x.n<2)return `<tr class="${s===curS?'now':''}"><td>${s}</td><td class="n">${Math.round(x.n)}</td><td colspan="2" class="sub">データ不足</td></tr>`;
      const hs=x.h.H+x.h.L;return `<tr class="${s===curS?'now':''}"><td>${s}</td><td class="n">${Math.round(x.n)}</td><td>${topN(x.t).map(([k,v])=>`${PT[k].name} ${pct(v,x.n)}`).join('<br>')}</td><td>${hs?(x.h.H>=x.h.L?'高め '+pct(x.h.H,hs):'低め '+pct(x.h.L,hs)):'-'}<br>ボール ${pct(x.ball,x.n)}</td></tr>`;}).join('')}</tbody></table>`;
    else if(memoTab===1){const r=(lab,o)=>`<tr><td>${lab}</td><td class="n">${o.n}</td><td>${o.n?topN(o.t).map(([k,v])=>`${PT[k].name} ${pct(v,o.n)}`).join(' / '):'<span class="sub">データ不足</span>'}</td></tr>`;
      body=`<table class="tbl"><thead><tr><th>状況</th><th>球数</th><th>多い球種</th></tr></thead><tbody>${r('走者なし',ps.run.off)}${r('走者あり',ps.run.on)}${r('対左打者',ps.hand.L)}${r('対右打者',ps.hand.R)}</tbody></table><p class="note">今は${runnersOn(G)?'走者あり':'走者なし'}・${handJ(batSide(curBatter(G),P))}打者です。</p>`;}
    else if(memoTab===2){const prev=prevPitch(G);const keys=Object.keys(ps.trans);
      body=keys.length?`<table class="tbl"><thead><tr><th>前の球</th><th>回数</th><th>次に投げた球</th></tr></thead><tbody>${keys.map(k=>{const o=ps.trans[k];return `<tr class="${prev&&prev.type===k?'now':''}"><td>${PT[k].name}</td><td class="n">${o.n}</td><td>${topN(o.t,3).map(([t,v])=>`${PT[t].name} ${pct(v,o.n)}`).join(' / ')}</td></tr>`;}).join('')}</tbody></table>`:'<p class="sub">同じ打席で2球以上投げると集計されます。</p>';}
    else{const z=ps.z,n=Object.values(z).reduce((a,b)=>a+b,0);const c=k=>`<b>${pct(z[k]||0,n)}</b>${ZN[k].s}`;
      body=n?`<div class="heat"><div class="wide">${c('HB')}</div><div>${c('HI')}</div><div>${c('HO')}</div><div>${c('LI')}</div><div>${c('LO')}</div><div class="wide">${c('LB')}</div></div><p class="note">内・外は打者から見た向きです。</p>`:'<p class="sub">データ不足</p>';}
  }else{const B=G.stats[batTeam(G)].B;title=`相手打線 ${G.teams[batTeam(G)].short} の狙い方`;
    if(memoTab===0)body=`<table class="tbl"><thead><tr><th>カウント</th><th>回数</th><th>読み方</th></tr></thead><tbody>${SITS.map(s=>{const x=B.sit[s];if(x.n<2)return `<tr class="${s===curS?'now':''}"><td>${s}</td><td class="n">${Math.round(x.n)}</td><td class="sub">データ不足</td></tr>`;
      return `<tr class="${s===curS?'now':''}"><td>${s}</td><td class="n">${Math.round(x.n)}</td><td>${topN(x.k).map(([k,v])=>`${KIND[k]} ${pct(v,x.n)}`).join(' / ')}</td></tr>`;}).join('')}</tbody></table>`;
    else if(memoTab===1){const n=Object.values(B.t).reduce((a,b)=>a+b,0);body=n?`<table class="tbl"><thead><tr><th>張った球種</th><th>割合</th></tr></thead><tbody>${topN(B.t,5).map(([k,v])=>`<tr><td>${PT[k].name}</td><td>${pct(v,n)}</td></tr>`).join('')}</tbody></table>`:'<p class="sub">データ不足</p>';}
    else if(memoTab===2){const z=B.z,n=Object.values(z).reduce((a,b)=>a+b,0);const c=k=>`<b>${pct(z[k]||0,n)}</b>${ZN[k].s}`;body=n?`<div class="heat"><div>${c('HI')}</div><div>${c('HO')}</div><div>${c('LI')}</div><div>${c('LO')}</div></div>`:'<p class="sub">データ不足</p>';}
    else{const r=B.run;body=`<table class="tbl"><tbody><tr><td>走者がいる場面</td><td class="n">${r.chances}</td></tr><tr><td>送りバント</td><td>${r.bunt}回</td></tr><tr><td>スクイズ</td><td>${r.squeeze}回</td></tr><tr><td>盗塁の指示</td><td>${r.steal}回</td></tr></tbody></table>`;}
  }
  m.innerHTML=`<summary>データ分析<small>${title}</small></summary><div class="tabs" id="memoTabs">${tabs.map((t,i)=>`<button type="button" id="mt-${i}" data-i="${i}" aria-pressed="${i===memoTab}">${t}</button>`).join('')}</div><div class="tbl-wrap">${body}</div>`;
  $('memoTabs').onclick=e=>{const b=e.target.closest('button');if(!b)return;memoTab=+b.dataset.i;renderMemo(role);};
}

/* ---------- lottery after 15 tied innings (tournament) ---------- */
function drawLot(){
  renderBoard();const t=G.teams;
  $('endSheet').innerHTML=`<span class="label">試合終了</span><h2 class="big-h">延長15回 決着つかず</h2>
   ${scoreline(`${G.score[0]} - ${G.score[1]}`)}<p class="lede">規定により、くじ引きで勝ち上がるチームを決めます。</p>
   <div class="champ" id="lotBox" aria-live="polite"><div class="label">くじ引き</div><div class="h" id="lotName">？</div></div>
   <button class="go" id="lotBtn" type="button">くじを引く</button>`;
  $('endOv').hidden=false;$('lotBtn').focus();
  $('lotBtn').onclick=async()=>{$('lotBtn').disabled=true;const el=$('lotName');sWhoosh(1.2);
    for(let i=0;i<14;i++){const k=i%2;el.textContent=t[k].short;el.style.color=uiColor(t[k].color);await sleep(60+i*12);}
    const w=G.lot;el.textContent=t[w].short;el.style.color=uiColor(t[w].color);sCrowd(1,2.4);$('lotBox').querySelector('.label').textContent='勝ち上がり';
    await sleep(1400);G.lotShown=true;showEnd();};
}
/* ---------- end ---------- */
function showEnd(){
  renderBoard();const s=G.score,t=G.teams;
  if(G.lot!=null&&!G.lotShown)return drawLot();
  let head;if(G.lot!=null){const w=G.lot;head=`抽選で${esc(t[w].short)}${both()?'（'+esc(who(w))+'）':''}の勝ち${!both()?(isHuman(w)?' ・勝ち上がり':' ・敗退'):''}`;}
  else if(G.draw||s[0]===s[1])head='引き分け';else{const w=s[0]>s[1]?0:1;head=!both()?(isHuman(w)?'勝利！':'敗戦'):`${who(w)}（${t[w].short}）の勝ち`;}
  const n=Math.max(G.cfg.innings,G.inning),cols=[...Array(n).keys()];
  const ls=`<div class="ls-wrap"><table class="ls"><thead><tr><th></th>${cols.map(i=>`<th>${i+1}</th>`).join('')}<th>R</th><th>H</th></tr></thead><tbody>${[0,1].map(k=>`<tr><td class="tn"><i style="background:${uiColor(t[k].color)}"></i>${t[k].short}</td>${cols.map(i=>`<td>${G.line[k][i]??''}</td>`).join('')}<td class="rh">${s[k]}</td><td class="rh">${G.hits[k]}</td></tr>`).join('')}</tbody></table></div>`;
  const st=(lab,f)=>`<tr><td>${lab}</td><td>${f(t[0])}</td><td>${f(t[1])}</td></tr>`;
  $('endSheet').innerHTML=`<span class="label">試合終了</span><h2 class="big-h">${head}</h2>${ls}
   <table class="end-stats"><thead><tr><th></th><th>${t[0].short}</th><th>${t[1].short}</th></tr></thead><tbody>
   ${st('安打',x=>x.box.H)}${st('本塁打',x=>x.box.HR)}${st('奪三振',x=>x.box.Kp)}${st('四球',x=>x.box.BB)}${st('盗塁',x=>x.box.SB)}${st('読み的中率',x=>x.box.reads?Math.round(x.box.readHits/x.box.reads*100)+'%':'-')}
   ${st('登板投手',x=>x.staff.filter(p=>p.used).map(p=>esc(p.name.split(' ')[0])).join('・'))}</tbody></table>
   <div class="row"><button class="go" id="againBtn" type="button">${G.sgid!=null?'大会の画面に戻る':'設定に戻る'}</button></div>`;
  if(G.sgid!=null&&!G.recorded){G.recorded=true;recordSeason(G.sgid,G);}
  $('endOv').hidden=false;$('againBtn').onclick=()=>{$('endOv').hidden=true;$('app').hidden=true;if(G.sgid!=null)return showHub();$('setup').hidden=false;renderSetup();};
}
