/* ===== ヨミダマ game logic (no DOM) ===== */
const PT={
  FB:{name:'ストレート',k:'直',kmh:148,fam:'fast'},
  SL:{name:'スライダー',k:'滑',kmh:134,fam:'break'},
  CB:{name:'カーブ',k:'曲',kmh:116,fam:'break'},
  FK:{name:'フォーク',k:'落',kmh:137,fam:'off'},
  CH:{name:'チェンジアップ',k:'緩',kmh:127,fam:'off'}
};
const FAM_NAME={fast:'速球系',break:'曲がり系',off:'落ち・緩い系'};
const ZN={
  HI:{label:'内角高め',s:'内高',h:'H',side:'I'},HO:{label:'外角高め',s:'外高',h:'H',side:'O'},
  LI:{label:'内角低め',s:'内低',h:'L',side:'I'},LO:{label:'外角低め',s:'外低',h:'L',side:'O'},
  HB:{label:'高めボール',s:'釣り球',h:'H',side:'-',ball:true},LB:{label:'低めボール',s:'低ボール',h:'L',side:'-',ball:true},
  WA:{label:'ウエスト',s:'ウエスト',h:'M',side:'O',ball:true,waste:true},
  MID:{label:'真ん中（失投）',s:'失投',h:'M',side:'M',mid:true}
};
const SZ=['HI','HO','LI','LO'];
const PZ=['HI','HO','LI','LO','HB','LB'];
const SITS=['初球','平行','打者有利','追い込み'];
const KIND={swing:'振る',wide:'広角打法',take:'見送り',cut:'カット',bunt:'送りバント',squeeze:'スクイズ'};

const R=()=>Math.random();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const sum=o=>Object.values(o).reduce((a,b)=>a+b,0);
function pickW(items,ws){const t=ws.reduce((a,b)=>a+Math.max(0,b),0);if(t<=0)return items[Math.floor(R()*items.length)];let r=R()*t;for(let i=0;i<items.length;i++){r-=Math.max(0,ws[i]);if(r<=0)return items[i];}return items[items.length-1];}

/* ---------- rosters ---------- */
const P_=(name,hand,role,style,rep,ws)=>{const base=style==='本格派'?{FB:.44,FK:.26,SL:.18,CB:.12,CH:.1}:{FB:.3,SL:.26,CB:.2,CH:.22,FK:.1};
  const mix={};for(const k of rep)mix[k]=base[k];return {name,hand,role,style,tend:style==='本格派'?'power':'finesse',rep,mix,wsType:ws};};
const B_=(name,bats,con,pow,eye,spd)=>({name,bats,con,pow,eye,spd});
const TEAMS=[
 {name:'ブルーオウルズ',short:'オウルズ',color:'#2f6bff',alt:'#0e9fb8',def:1.0,stuff:0,stam:1.0,
  tag:'平均型',traits:'打・投・守とも平均的。穴がなく、どんな展開にも対応する',
  batStyle:{style:'積極型',firstTake:.2,cut2S:.22,threeTake:.4,steal:1.2,bunt:.8},
  sp:[P_('宮下 迅','R','SP','本格派',['FB','SL','FK','CH'],'FK'),P_('藤代 蒼','R','SP','技巧派',['FB','SL','CB','CH'],'SL'),P_('早乙女 翔','L','SP','技巧派',['FB','CB','SL','CH'],'CB')],
  rp:[P_('白石 剛','R','RP','本格派',['FB','SL','FK','CH'],'FB'),P_('雨宮 律','L','RP','技巧派',['FB','SL','CB','CH'],'SL')],
  cl:P_('剛田 豪','R','CL','本格派',['FB','FK','SL','CH'],'FK'),
  lineup:[B_('早瀬','L',1.12,.85,1.08,1.12),B_('柴田','R',1.06,.88,1.0,1.1),B_('古賀','L',1.0,1.15,.98,1.0),B_('大河内','R',.95,1.3,.92,.92),
          B_('三森','L',1.02,1.2,1.0,.96),B_('堀','S',1.0,1.08,1.0,1.0),B_('浅野','R',1.0,.92,1.15,1.0),B_('久保田','L',.97,.95,.96,1.04),B_('根岸','R',.94,.88,.94,1.08)],
  bench:[B_('真壁','R',.98,1.15,.95,.95),B_('小野寺','L',1.06,.88,1.04,1.12),B_('桐生','R',1.0,1.0,1.0,1.0)]},
 {name:'レッドフォックス',short:'フォックス',color:'#e5322d',alt:'#2b3442',def:1.06,stuff:0,stam:1.0,
  tag:'巧打・守備型',traits:'長打はないが、短打と選球眼、鉄壁の守備で1点を守り切る',
  batStyle:{style:'粘り型',firstTake:.55,cut2S:.5,threeTake:.62,steal:1.0,bunt:1.5},
  sp:[P_('榊 景','R','SP','技巧派',['FB','SL','CB','CH'],'SL'),P_('大門 獅','R','SP','本格派',['FB','FK','SL','CH'],'FK'),P_('綾瀬 凪','L','SP','技巧派',['FB','SL','CB','CH'],'CB')],
  rp:[P_('黒岩 剛志','R','RP','本格派',['FB','SL','FK','CH'],'SL'),P_('柚木 透','L','RP','技巧派',['FB','CB','CH','SL'],'CH')],
  cl:P_('鬼頭 嵐','R','CL','本格派',['FB','FK','SL','CB'],'FK'),
  lineup:[B_('七瀬','S',1.18,.78,1.12,1.14),B_('羽田','L',1.14,.78,1.2,1.05),B_('黒木','R',1.2,.9,1.05,1.0),B_('獅子堂','L',1.14,.98,1.02,.96),
          B_('野々村','R',1.14,.95,1.05,.98),B_('寺島','R',1.1,.9,1.1,1.0),B_('江口','L',1.12,.82,1.08,1.08),B_('菅','R',1.07,.85,1.12,1.0),B_('若林','L',1.08,.78,1.05,1.1)],
  bench:[B_('鷹野','R',1.1,.95,1.0,.95),B_('秋山','L',1.16,.8,1.1,1.12),B_('森','R',1.07,.9,1.05,1.0)]},
 {name:'アイアンタイタンズ',short:'タイタンズ',color:'#5b6b80',alt:'#b8bfc8',def:.92,stuff:-.08,stam:.9,
  tag:'打高投低',traits:'強打者がずらりと並ぶ重量打線。ただし投手陣は弱く、守備も粗い',
  batStyle:{style:'強振型',firstTake:.12,cut2S:.15,threeTake:.3,steal:.5,bunt:.4},
  sp:[P_('荒巻 慎','R','SP','本格派',['FB','SL','FK','CH'],'FB'),P_('大鋸 剛','R','SP','本格派',['FB','SL','CB','FK'],'SL'),P_('鍛冶 亮','L','SP','技巧派',['FB','CB','SL','CH'],'CB')],
  rp:[P_('重松 豪','R','RP','本格派',['FB','SL','FK','CH'],'FK'),P_('鎚田 誠','L','RP','技巧派',['FB','SL','CB','CH'],'SL')],
  cl:P_('黒鉄 迅','R','CL','本格派',['FB','FK','SL','CB'],'FB'),
  lineup:[B_('岩城','R',1.14,1.15,.98,1.0),B_('轟','L',1.16,1.2,1.0,.95),B_('鉄村','R',1.14,1.32,.98,.92),B_('剛力','R',1.1,1.42,.95,.9),
          B_('金剛','L',1.11,1.36,.98,.9),B_('斧田','R',1.1,1.26,.96,.92),B_('鋼島','L',1.12,1.16,1.0,.95),B_('槌谷','R',1.06,1.12,.95,.94),B_('熊沢','S',1.06,1.1,.95,.98)],
  bench:[B_('大岩','R',1.06,1.3,.92,.9),B_('千石','L',1.14,1.05,1.0,1.0),B_('石動','R',1.06,1.15,.96,.95)]},
 {name:'グリーンヘロンズ',short:'ヘロンズ',color:'#16a34a',alt:'#84cc16',def:1.06,stuff:.13,stam:1.12,
  tag:'投手王国',traits:'先発から抑えまで全員がずば抜けた投手陣。ただし打線は貧打で、1点を取るのに苦労する',
  batStyle:{style:'小技型',firstTake:.45,cut2S:.45,threeTake:.55,steal:1.0,bunt:1.4},
  sp:[P_('鷺沼 静','R','SP','本格派',['FB','FK','SL','CB'],'FK'),P_('翠川 凛','R','SP','技巧派',['FB','SL','CB','CH'],'SL'),P_('碧井 湊','L','SP','技巧派',['FB','CB','CH','SL'],'CH')],
  rp:[P_('葉月 誠','R','RP','本格派',['FB','SL','FK','CH'],'SL'),P_('苔口 涼','L','RP','技巧派',['FB','CB','SL','CH'],'CB')],
  cl:P_('鷲尾 晴','R','CL','本格派',['FB','FK','SL','CB'],'FK'),
  lineup:[B_('白鷺','L',1.03,.8,1.05,1.06),B_('青葉','R',1.0,.8,1.0,1.04),B_('柳','L',1.03,.9,1.02,1.0),B_('森下','R',0.98,1.0,.98,.98),
          B_('若葉','L',0.99,.96,1.0,.98),B_('川端','R',0.97,.9,1.0,1.0),B_('葦原','L',0.98,.85,1.02,1.02),B_('水野','R',0.95,.82,.98,1.0),B_('早苗','R',0.93,.8,.98,1.02)],
  bench:[B_('沢渡','R',1.01,.98,1.0,1.0),B_('蘆田','L',1.03,.85,1.05,1.05),B_('泉','R',0.98,.9,1.0,1.0)]},
 {name:'ゴールドファルコンズ',short:'ファルコンズ',color:'#e0a800',alt:'#2b3442',def:1.05,stuff:0,stam:1.0,
  tag:'機動力野球',traits:'俊足ぞろい。盗塁とバントで塁をかき回し、少ない安打で点をもぎ取る',
  batStyle:{style:'機動力型',firstTake:.35,cut2S:.35,threeTake:.5,steal:2.6,bunt:1.6},
  sp:[P_('鷹宮 煌','R','SP','本格派',['FB','SL','FK','CH'],'FK'),P_('金森 輝','R','SP','技巧派',['FB','SL','CB','CH'],'SL'),P_('黄瀬 遥','L','SP','技巧派',['FB','CB','SL','CH'],'CB')],
  rp:[P_('日向 誠','R','RP','本格派',['FB','SL','FK','CH'],'FB'),P_('朝比奈 光','L','RP','技巧派',['FB','SL','CH','CB'],'CH')],
  cl:P_('鳳 隼人','R','CL','本格派',['FB','FK','SL','CB'],'FK'),
  lineup:[B_('隼田','L',1.1,.8,1.02,1.28),B_('飛鳥','S',1.08,.82,1.0,1.25),B_('速水','R',1.12,.9,1.0,1.18),B_('矢島','L',1.05,1.05,1.0,1.12),
          B_('駿河','R',1.04,1.02,.98,1.15),B_('翔田','L',1.06,.92,1.0,1.2),B_('風間','R',1.02,.85,1.0,1.22),B_('千早','L',1.04,.8,1.02,1.25),B_('天馬','R',1.0,.8,.98,1.3)],
  bench:[B_('迅野','L',1.05,.82,1.0,1.3),B_('金城','R',1.0,1.1,.98,1.0),B_('光岡','S',1.06,.85,1.0,1.2)]},
 {name:'パープルレイヴンズ',short:'レイヴンズ',color:'#7c3aed',alt:'#db2777',def:.96,stuff:.04,stam:1.0,
  tag:'一発長打',traits:'当たれば飛ぶ一発長打の打線だが、三振も多い。左腕を中心とした本格派の投手陣',
  batStyle:{style:'一発狙い',firstTake:.1,cut2S:.1,threeTake:.25,steal:.5,bunt:.3},
  sp:[P_('紫苑 嶺','L','SP','本格派',['FB','SL','FK','CH'],'FK'),P_('宵宮 蓮','L','SP','技巧派',['FB','CB','SL','CH'],'CB'),P_('黒崎 剛','R','SP','本格派',['FB','SL','FK','CB'],'SL')],
  rp:[P_('鴉羽 透','L','RP','本格派',['FB','SL','FK','CH'],'SL'),P_('朧谷 月','L','RP','技巧派',['FB','CB','CH','SL'],'CH')],
  cl:P_('黒瀬 雷','R','CL','本格派',['FB','FK','SL','CB'],'FK'),
  lineup:[B_('黒羽','L',0.97,1.2,.92,1.02),B_('烏丸','R',0.93,1.28,.88,.96),B_('紫藤','L',0.93,1.38,.9,.92),B_('鴉田','R',0.89,1.46,.86,.9),
          B_('暮林','L',0.91,1.4,.88,.92),B_('影山','R',0.93,1.32,.9,.95),B_('宵野','L',0.95,1.25,.9,.98),B_('冥加','R',0.91,1.22,.88,.95),B_('月島','L',0.98,1.12,.92,1.0)],
  bench:[B_('漆原','R',0.89,1.42,.85,.9),B_('藍沢','L',0.98,1.15,.95,1.0),B_('墨田','R',0.93,1.2,.9,.95)]}
];
const COVER={9:{SP:6.8,RP:1.9,CL:1.3},7:{SP:5.2,RP:1.6,CL:1.3},3:{SP:2.5,RP:1.3,CL:1.3},1:{SP:1.4,RP:1.3,CL:1.3}};
const PER_INN=15;

/* ---------- deck ---------- */
function makeDeck(rep,mix,total){const d={};let s=0;const fr=[];const t=rep.reduce((a,k)=>a+mix[k],0);
  for(const k of rep){const v=mix[k]/t*total;d[k]=Math.floor(v);s+=d[k];fr.push([v-d[k],k]);}fr.sort((a,b)=>b[0]-a[0]);let i=0;while(s<total){d[fr[i%fr.length][1]]++;s++;i++;}return d;}
function drawCard(p){const t=sum(p.deck);if(!t)return null;let r=Math.floor(R()*t);for(const k in p.deck){r-=p.deck[k];if(r<0){p.deck[k]--;return k;}}return null;}
function fbBase(p){return p.role==='CL'?152:p.style==='本格派'?150:143;}
const FB_OFF=[-8,-6,-5,-4,-3,-2,-1,0,0,1,2];
function speedOf(p,k){return k==='FB'?fbBase(p)+FB_OFF[Math.floor(R()*FB_OFF.length)]:PT[k].kmh;}
function spd(x){return x.kmh||PT[x.type].kmh;}
function fillHand(p){while(p.cards.length<5){const c=drawCard(p);if(!c)break;p.cards.push({type:c,kmh:speedOf(p,c)});}if(!p.cards.length&&!sum(p.deck))p.fatigued=true;}
function remaining(p){return sum(p.deck)+p.cards.length;}

/* ---------- game setup ---------- */
function mkPitcher(def,inn,T){const total=Math.round(PER_INN*COVER[inn][def.role]*((T&&T.stam)||1));
  const p={...def,stuff:(T&&T.stuff)||0,deck:makeDeck(def.rep,def.mix,total),total,cards:[],fatigued:false,ws:true,bf:0,used:false,out:false,retired:false};fillHand(p);return p;}
function mkStats(){const o={P:{},B:{n:0,sit:{},t:{},z:{},run:{bunt:0,squeeze:0,steal:0,chances:0}}};for(const s of SITS)o.B.sit[s]={n:0,k:{},t:{}};return o;}
function pStats(st,name){if(!st.P[name]){const o={n:0,sit:{},run:{off:{n:0,t:{}},on:{n:0,t:{}}},hand:{L:{n:0,t:{}},R:{n:0,t:{}}},trans:{},z:{},prior:0};for(const s of SITS)o.sit[s]={n:0,t:{},h:{H:0,L:0},ball:0};st.P[name]=o;}return st.P[name];}
function createGame(cfg){
  const n=cfg.innings;
  const g={cfg,inning:1,half:0,outs:0,balls:0,strikes:0,bases:[null,null,null],score:[0,0],hits:[0,0],line:[[0],[]],
    ab:{pitches:[],pickoffs:0},over:false,draw:false,log:[],stats:[mkStats(),mkStats()],tiebreak:false};
  const ids=cfg.teamIds||[0,1];
  g.teams=ids.map(id=>TEAMS[id]).map((T,i)=>{
    const spIdx=(cfg.starters&&cfg.starters[i]!=null)?cfg.starters[i]:0;
    const staff=[mkPitcher(T.sp[spIdx],n,T)];
    if(n>=7)T.rp.forEach(r=>staff.push(mkPitcher(r,n,T)));else if(n>=3)staff.push(mkPitcher(T.rp[0],n,T));
    staff.push(mkPitcher(T.cl,n,T));
    staff[0].used=true;
    const order=T.lineup.map((b,j)=>({...b,wide:[0,3,4,5].includes(j),slot:j}));
    return {...T,id:ids[i],color:(cfg.colors&&cfg.colors[i])||T.color,staff,cur:staff[0],order,benchLeft:T.bench.map(b=>({...b,wide:false})),bIdx:0,
      box:{H:0,HR:0,K:0,Kp:0,BB:0,reads:0,readHits:0,SB:0,CS:0}};
  });
  return g;
}
const batTeam=g=>g.half, pitTeam=g=>1-g.half;
const T_bat=g=>g.teams[g.half], T_pit=g=>g.teams[1-g.half];
function curBatter(g){const T=T_bat(g);return T.order[T.bIdx%9];}
function batSide(b,p){return b.bats==='S'?(p.hand==='R'?'L':'R'):b.bats;}
function prevPitch(g){const a=g.ab.pitches.filter(x=>x.type);return a.length?a[a.length-1]:null;}
function sit(b,s){if(b===0&&s===0)return '初球';if(s===2)return '追い込み';if(b>s)return '打者有利';return '平行';}
function canChangePitcher(g,t){const T=g.teams[t];return T.cur.bf>=1||T.cur.retired;}
function bullpen(T){return T.staff.filter(p=>!p.used);}
function canPinchHit(g){return g.ab.pitches.length===0&&T_bat(g).benchLeft.length>0;}
function runnersOn(g){return g.bases.some(Boolean);}
function stealable(g){const out=[];if(g.bases[0]&&!g.bases[1])out.push(0);if(g.bases[1]&&!g.bases[2])out.push(1);return out;}
function canBunt(g){return (g.bases[0]||g.bases[1])&&g.outs<2;}
function canSqueeze(g){return !!g.bases[2]&&g.outs<2;}

/* ---------- deception ---------- */
function deception(prev,cur,pit,side){
  let d=0;const tags=[];
  if(prev&&cur.type&&prev.type){
    const hp=ZN[prev.zone].h,hc=ZN[cur.zone].h;
    if(hp!=='M'&&hc!=='M'&&hp!==hc){d+=.18;tags.push(['目線','+',1]);}
    const dv=Math.abs(spd(prev)-spd(cur));
    if(dv>=25){d+=.22;tags.push(['緩急','++',1]);}else if(dv>=12){d+=.1;tags.push(['緩急','+',1]);}
    if(prev.type===cur.type&&prev.zone===cur.zone){d-=.3;tags.push(['同じ球','−−',-1]);}
    else if(prev.type===cur.type){d-=.08;tags.push(['同球種','−',-1]);}
  }
  if(pit&&pit.stuff)d+=pit.stuff;
  if(cur.type==='FB'&&cur.kmh){d+=(cur.kmh-148)*.012;if(cur.kmh>=151)tags.push([`球威 ${cur.kmh}km`,'+',1]);else if(cur.kmh<=143)tags.push([`球速 ${cur.kmh}km`,'−',-1]);}
  if(cur.type&&pit&&side){
    const same=pit.hand===side;const f=PT[cur.type].fam;
    if(same&&f==='break'){d+=.1;tags.push(['同じ利き手','+',1]);}
    if(!same){if(f==='off'){d+=.06;tags.push(['逆の利き手・落ち球','+',1]);}else{d-=.06;tags.push(['逆の利き手','−',-1]);}}
  }
  return {d,tags};
}

/* ---------- batted ball ---------- */
function fence(sp){return 100+22*Math.cos(sp*2*Math.PI/180);}
function battedBall(hit,sub){
  const rr=(a,b)=>a+R()*(b-a);let spray=rr(-40,40),ev,la,dist;
  if(hit==='HR'){ev=rr(162,186);la=rr(23,34);spray=rr(-36,36);dist=fence(spray)+rr(4,24);}
  else if(hit==='3B'){ev=rr(155,172);la=rr(14,24);spray=(R()<.5?-1:1)*rr(28,40);dist=fence(spray)-rr(2,6);}
  else if(hit==='2B'){ev=rr(150,172);la=rr(12,26);spray=(R()<.5?-1:1)*rr(12,34);dist=fence(spray)-rr(8,22);}
  else if(hit==='1B'){ev=rr(128,160);la=rr(2,16);dist=rr(42,68);}
  else if(sub==='ground'){ev=rr(105,150);la=rr(-12,7);dist=rr(22,40);}
  else if(sub==='pop'){ev=rr(90,125);la=rr(52,68);dist=rr(18,40);spray=rr(-30,30);}
  else if(sub==='liner'){ev=rr(142,165);la=rr(9,18);dist=rr(30,60);}
  else {ev=rr(125,158);la=rr(26,46);dist=Math.min(fence(spray)-4,rr(68,104));}
  return {ev:Math.round(ev),la:Math.round(la),dist:Math.round(dist),spray};
}
/* fielder is decided from where the ball goes, and the play's name from the fielder */
function fielderFor(sub,sp,dist){
  if(sub==='ground'||sub==='liner'&&dist<45||sub==='pop'){
    if(sp<-22)return '3B';if(sp<0)return 'SS';if(sp<22)return '2B';return '1B';}
  if(sp<-14)return 'LF';if(sp<14)return 'CF';return 'RF';
}
const POS={'1B':'ファースト','2B':'セカンド','3B':'サード','SS':'ショート','LF':'レフト','CF':'センター','RF':'ライト'};
function outName(sub,f){
  if(sub==='ground')return POS[f]+'ゴロ';
  if(sub==='pop')return POS[f]+'フライ';
  if(sub==='liner')return POS[f]+'ライナー';
  return POS[f]+'フライ';
}
function pickOutcome(tbl){return pickW(tbl.map(x=>x[0]),tbl.map(x=>x[1]));}

/* ---------- reading ---------- */
function readLevel(P,A,zone){
  let tm=0,zm=0;
  if(A.type)tm=A.type===P.type?1:PT[A.type].fam===PT[P.type].fam?.5:0;
  const zs=A.zones||[];
  for(const z of zs){let v;
    if(ZN[zone].mid)v=.5;else if(z===zone)v=1;else if(ZN[z].h===ZN[zone].h||ZN[z].side===ZN[zone].side)v=.5;else v=0;
    zm=Math.max(zm,v);}
  return {tm,zm};
}
/* home-run share of a perfectly read pitch, by power (E 5% .. A 35%) */
function hrRate(pow){const P=[[.8,.04],[.9,.06],[.95,.1],[1,.18],[1.08,.26],[1.2,.34],[1.45,.4]];
  if(pow<=P[0][0])return P[0][1];for(let i=1;i<P.length;i++){if(pow<=P[i][0]){const [x0,y0]=P[i-1],[x1,y1]=P[i];return y0+(y1-y0)*(pow-x0)/(x1-x0);}}return P.at(-1)[1];}
function bandOf(tm,zm,wide){
  if(tm===1&&zm===1)return wide?'W':'A';
  if((tm===1&&zm===.5)||(tm===.5&&zm===1))return 'B';
  if(tm===1||zm===1)return 'C';
  if(tm===.5&&zm===.5)return 'C2';
  return 'D';
}

/* ---------- resolve one pitch ---------- */
/* pitch: {kind:'pitch'|'pickoff', type, zone, ws, fat:'type'|'zone'|null, missed}
   act:   {kind, type, zones}   steal: base index (0 or 1) or null */
function finalizePitch(g,pitch){
  const P=T_pit(g).cur;
  if(pitch.kind!=='pitch')return pitch;
  if(P.fatigued&&pitch.zone!=='WA'&&!pitch.ws){
    if(pitch.fat==='type'){pitch.zone=PZ[Math.floor(R()*PZ.length)];pitch.weak=true;}
    else{pitch.type=P.rep[Math.floor(R()*P.rep.length)];if(R()<.5){pitch.missed=true;pitch.zone=R()<.5?(R()<.5?'HB':'LB'):'MID';}}
  }
  if(pitch.zone==='WA'&&!pitch.type)pitch.type='FB';
  if(pitch.kmh==null)pitch.kmh=pitch.zone==='WA'?138:pitch.type==='FB'?fbBase(P)+(pitch.ws?1:0)-(P.fatigued&&!pitch.ws?6:0):PT[pitch.type].kmh;
  return pitch;
}
function resolvePitch(g,pitch,act,steal){
  const T=T_pit(g),P=T.cur,b=curBatter(g),side=batSide(b,P);
  const res={pitch,act,steal,call:'',swing:false,contact:false,band:null,tm:0,zm:0,read:false,
    dec:{d:0,tags:[]},hit:null,sub:null,bunt:null,stealRes:null,pickoff:null,wsEffect:false};
  /* pickoff */
  if(pitch.kind==='pickoff'){
    const n=g.ab.pickoffs+1;const runnerBase=steal!=null?steal:(g.bases[1]&&!g.bases[2]?1:0);
    if(steal!=null){res.pickoff={base:steal,out:R()<.85,balk:false,n};if(!res.pickoff.out&&n>=3)res.pickoff.balk=true;}
    else res.pickoff={base:runnerBase,out:R()<.03,balk:false,n,noRun:true};
    if(!res.pickoff.out&&n>=3)res.pickoff.balk=true;
    res.call='pickoff';return res;
  }
  const z=ZN[pitch.zone],pt=PT[pitch.type];
  const dec=deception(prevPitch(g),pitch,P,side);res.dec=dec;let d=dec.d;
  if(pitch.weak){d-=.25;dec.tags.push(['球威70%','−−',-1]);}
  if(pitch.missed){dec.tags.push(['制球ミス','−−',-1]);if(z.mid)d-=.2;}
  const skill=(b.con-1)*.6,pw=b.pow-1;
  const powerFactor=pitch.weak?.7:1;
  const pcAdj=pc=>pitch.weak?1-(1-pc)*.7:pc;
  const k=act.kind;
  const contactFrom=(tbl,q)=>{res.contact=true;const o=pickOutcome(tbl);
    if(o==='F'){res.call='foul';return res;}
    res.call='inplay';res.power=clamp((q||.5)-.25,0,1);
    if(o==='OUT'){res.hit='OUT';const r=R();res.sub=q<.5?(r<.62?'ground':'pop'):(r<.4?'ground':r<.85?'fly':'liner');}
    else res.hit=o;
    res.bb=battedBall(res.hit,res.sub);
    if(res.hit==='OUT'){res.fielder=fielderFor(res.sub,res.bb.spray,res.bb.dist);res.outName=outName(res.sub,res.fielder);}
    return res;};
  /* bunt / squeeze */
  if(k==='bunt'||k==='squeeze'){
    res.swing=true;const sq=k==='squeeze';const two=g.strikes===2;
    const lv=(()=>{if(z.waste)return 'WA';if(z.ball)return pitch.zone;const gz=act.zones[0];if(z.mid)return .5;if(gz===pitch.zone)return 1;if(ZN[gz].h===z.h||ZN[gz].side===z.side)return .5;return 0;})();
    let out;
    if(lv==='WA'){out=sq?'runnerOut':'pullBall';}
    else if(lv==='HB'){out=sq?(R()<.45?'popDP':'runnerOut'):'pullBall';}
    else if(lv==='LB'){out=sq?(R()<.35?'success':'runnerOut'):'pullBall';}
    else if(lv===1){out=R()<.82?'success':'foul';}
    else if(lv===.5){const r=R();out=sq?(r<.4?'success':r<.7?'foul':(z.h==='H'?'popDP':'foul')):(r<.45?'success':r<.85?'foul':(z.h==='H'?'pop':'foul'));}
    else{out=sq?'runnerOut':(R()<.55?'whiff':'foul');}
    res.bunt={sq,out,lv};
    if(out==='pullBall'){res.swing=false;res.call=z.waste||z.ball?'ball':'strike';res.strikeKind='looking';return res;}
    if(out==='foul'){res.contact=true;res.call=two?'strike':'foul';res.strikeKind=two?'buntfoul':'';return res;}
    if(out==='whiff'){res.call='strike';res.strikeKind='swinging';return res;}
    if(out==='runnerOut'){res.call=z.ball?'ball':'strike';res.strikeKind='swinging';res.bunt.runnerOut=true;return res;}
    res.contact=true;res.call='bunt';return res;
  }
  /* take */
  if(k==='take'){
    if(z.ball){res.call='ball';return res;}
    if(!z.mid&&R()<(P.fatigued?.2:.14)){res.call='ball';res.edge=true;return res;}
    res.call='strike';res.strikeKind='looking';return res;
  }
  /* ball zones vs swingers */
  if(z.ball){
    if(k==='cut'){const lay=.45+(b.eye-1);if(R()<lay||z.waste){res.call='ball';return res;}
      res.swing=true;if(R()<.9){res.contact=true;res.call='foul';return res;}return contactFrom([['OUT',1]],.3);}
    if(z.waste&&R()<.92){res.call='ball';res.laidOff=true;return res;}
    const lv=readLevel(pitch,act,'HI');const tm=lv.tm;res.tm=tm;
    let lay=.6+(b.eye-1)*.8-d*.5+(tm===1?.25:0);
    const gh=(act.zones||[]).map(x=>ZN[x].h);lay+=gh.includes(z.h)?-.1:.3;
    if(pitch.type==='FK'&&pitch.zone==='LB')lay-=.12;if(pitch.type==='FB'&&pitch.zone==='HB')lay-=.08;
    if(R()<clamp(lay,.05,.92)){res.call='ball';res.laidOff=true;return res;}
    res.swing=true;
    if(pitch.ws&&tm<1){res.call='strike';res.strikeKind='swinging';res.wsEffect=true;return res;}
    const pc=clamp(.66+tm*.2+skill-d*.6,.25,.9);
    if(R()>pcAdj(pc)){res.call='strike';res.strikeKind='swinging';return res;}
    return contactFrom([['F',.68],['OUT',.32]],.3);
  }
  /* strike zone (incl. fatigue MID) */
  res.swing=true;
  if(k==='cut'){
    const pc=clamp(.88+skill-d*.4,.45,.96);
    if(R()>pcAdj(pc)){res.call='strike';res.strikeKind='swinging';return res;}
    if(R()<.78){res.contact=true;res.call='foul';return res;}
    return contactFrom([['OUT',.88],['1B',.12]],.35);
  }
  const {tm,zm}=readLevel(pitch,act,pitch.zone);res.tm=tm;res.zm=zm;
  let band=bandOf(tm,zm,k==='wide');res.band=band;
  res.read=tm===1||zm===1;
  if(pitch.ws&&band!=='A'&&band!=='W'){res.call='strike';res.strikeKind='swinging';res.wsEffect=true;return res;}
  const midQ=z.mid?.12:0;
  let pc,tbl,q;
  if(band==='A'){
    /* a perfect read: nearly always squared up; power decides how far it goes, contact decides hit or out */
    const dd=Math.max(0,d);
    if(R()>clamp(.985-dd*.1+skill*.1,.93,.995)){res.swing=true;if(R()<.75){res.contact=true;res.call='foul';return res;}res.call='strike';res.strikeKind='swinging';return res;}
    let hr=hrRate(b.pow)*(1-dd*.8)*(z.mid?1.3:1)*(pitch.weak?1.25:1);
    let out=clamp(.2-(b.con-1)*.9,.08,.32)+dd*.25;
    const xb=clamp(.35+(b.pow-1)*1.0,.2,.65),rest=Math.max(0,1-hr-out);
    tbl=[['HR',hr],['OUT',out],['2B',rest*xb*.88],['3B',rest*xb*.12],['1B',rest*(1-xb)]];
    return contactFrom(tbl,.75+hr);}
  else if(band==='W'){pc=clamp(.88-d*.25+skill*.5,.6,.97);q=.6;tbl=[['OUT',.36],['1B',.46],['2B',.18]];}
  else if(band==='B'){pc=clamp(.78-d*.35+skill,.45,.95);q=.45+R()*.45+pw*.3+midQ;
    tbl=q<.7?[['OUT',.45],['1B',.45],['2B',.1]]:[['OUT',.3],['1B',.45],['2B',.22],['3B',.03]];}
  else if(band==='C'){pc=clamp(.76-d*.4+skill,.4,.92);q=.35;tbl=[['F',.55],['OUT',.4],['1B',.05]];}
  else if(band==='C2'){pc=clamp(.68-d*.4+skill,.3,.88);q=.3;tbl=[['F',.6],['OUT',.37],['1B',.03]];}
  else {pc=clamp(.7-d*.3+skill*.6,.28,.82);q=.25;tbl=[['F',.75],['OUT',.25]];}
  if(R()>pcAdj(pc)){res.call='strike';res.strikeKind='swinging';return res;}
  return contactFrom(tbl,q);
}

/* ---------- running ---------- */
function forceWalk(g,batter){let r=0;const b=g.bases;const scored=[];
  if(b[0]){if(b[1]){if(b[2]){r++;scored.push(b[2]);}b[2]=b[1];}b[1]=b[0];}b[0]=batter;return {runs:r,scored};}
function advanceHit(g,hit,batter,running){const b=g.bases;let runs=0;const n=[null,null,null];const on=b.filter(Boolean);
  const sp=x=>x?x.spd:1;
  if(hit==='HR'){g.bases=[null,null,null];return on.length+1;}
  if(hit==='3B'){g.bases=[null,null,batter];return on.length;}
  if(hit==='2B'){if(b[2])runs++;if(b[1])runs++;if(b[0]){if(running||R()<.35+(sp(b[0])-1)*1.5)runs++;else n[2]=b[0];}n[1]=batter;g.bases=n;return runs;}
  if(b[2])runs++;
  if(b[1]){if(running||R()<.55+(sp(b[1])-1)*1.5)runs++;else n[2]=b[1];}
  if(b[0]){if(!n[2]&&(running||R()<.25+(sp(b[0])-1)*1.5))n[2]=b[0];else n[1]=b[0];}
  n[0]=batter;g.bases=n;return runs;}
function outPlay(g,sub,running,batter){const b=g.bases;let runs=0,outs=1,note='';
  const [r1,r2,r3]=b;
  if(sub==='ground'){
    if(g.outs===2)return {outs:1,runs:0,note:''};
    const f3=!!(r1&&r2);
    if(r1&&!running&&R()<.45*(T_pit(g).def||1)){ /* 6-4-3: runner from first and batter out, forced runners move up */
      outs=2;note='併殺';const nb=[null,null,null];
      if(r3){if(f3){if(g.outs===0)runs++;}else if(g.outs===0&&R()<.5)runs++;else nb[2]=r3;}
      if(r2)nb[2]=r2;
      g.bases=nb;return {outs,runs,note};}
    const nb=[null,null,null];let fc=false;
    if(r1&&!running&&R()<.6){fc=true;nb[0]=batter;note='二塁でフォースアウト、打者は一塁に残る';}
    if(r3){if(f3||running||R()<.45){runs++;if(!f3&&!note)note='内野ゴロの間に1点';}else nb[2]=r3;}
    if(r2){if(r1||running||(!nb[2]&&R()<.6)){if(!nb[2])nb[2]=r2;else nb[1]=r2;}else nb[1]=r2;}
    if(r1&&!fc)nb[1]=nb[1]||r1;
    if(f3&&runs&&!note)note='三塁走者がホームイン';
    g.bases=nb;return {outs,runs,note};
  }
  if(sub==='fly'&&g.outs<2&&r3&&R()<.55){runs++;b[2]=null;note='犠牲フライ';}
  else if(running&&(sub==='liner'||sub==='pop'||sub==='fly')&&g.outs<2){
    const i=r2?1:r1?0:-1;if(i>=0&&R()<.6){b[i]=null;outs=2;note='飛び出して併殺';}}
  return {outs,runs,note};}

/* ---------- stats ---------- */
function record(g,pitch,act,res){
  const bt=batTeam(g),pt=pitTeam(g),P=T_pit(g).cur,b=curBatter(g),side=batSide(b,P),s=sit(g.balls,g.strikes);
  if(pitch.kind==='pitch'&&pitch.type){
    const ps=pStats(g.stats[pt],P.name);ps.n++;
    const z=ZN[pitch.zone];const add=(o,k)=>{o[k]=(o[k]||0)+1;};
    const sc=ps.sit[s];sc.n++;add(sc.t,pitch.type);if(z.ball||z.mid)sc.ball+=z.ball?1:0;if(z.h==='H'||z.h==='L')if(!z.ball)sc.h[z.h]++;
    const ro=runnersOn(g)?ps.run.on:ps.run.off;ro.n++;add(ro.t,pitch.type);
    const hd=ps.hand[side];hd.n++;add(hd.t,pitch.type);
    const prev=prevPitch(g);if(prev){ps.trans[prev.type]=ps.trans[prev.type]||{n:0,t:{}};ps.trans[prev.type].n++;add(ps.trans[prev.type].t,pitch.type);}
    add(ps.z,pitch.zone);
  }
  const B=g.stats[bt].B;B.n++;const bs=B.sit[s];bs.n++;bs.k[act.kind]=(bs.k[act.kind]||0)+1;
  if(act.type){bs.t[act.type]=(bs.t[act.type]||0)+1;B.t[act.type]=(B.t[act.type]||0)+1;}
  for(const z of act.zones||[])B.z[z]=(B.z[z]||0)+1;
  if(runnersOn(g)){B.run.chances++;if(act.kind==='bunt')B.run.bunt++;if(act.kind==='squeeze')B.run.squeeze++;}
  if(res&&res.steal!=null)B.run.steal++;
}
/* scouting prior for a CPU staff */
function seedPrior(g,t,weight=14){
  const T=g.teams[t];
  for(const p of T.staff){const ps=pStats(g.stats[t],p.name);const tot=p.rep.reduce((a,k)=>a+p.mix[k],0);ps.prior=weight;
    for(const s of SITS){const sc=ps.sit[s];const n=Math.round(weight/2);sc.n+=n;
      for(const k of p.rep){let w=p.mix[k]/tot;
        if(p.tend==='power'){if(s==='初球'&&k==='FB')w*=1.6;if(s==='追い込み'&&k==='FK')w*=2.2;}
        else{if(s==='初球'&&(k==='SL'||k==='CB'))w*=1.5;if(s==='追い込み'&&k==='SL')w*=1.8;if(s==='打者有利'&&k==='CH')w*=1.5;}
        sc.t[k]=(sc.t[k]||0)+w*n*.9;}
      sc.h.H+=n*(p.tend==='power'&&s!=='追い込み'?.55:.4);sc.h.L+=n*(p.tend==='power'&&s!=='追い込み'?.45:.6);sc.ball+=n*(s==='追い込み'?.4:.2);}
    ps.n+=weight*2;
    for(const k of p.rep){ps.z[k==='FK'?'LB':'LO']=(ps.z[k==='FK'?'LB':'LO']||0)+p.mix[k]*3;}
  }
  const bs=T.batStyle,B=g.stats[t].B;
  for(const s of SITS){const sc=B.sit[s];const n=4;sc.n+=n;
    if(s==='初球')sc.k.take=(sc.k.take||0)+n*bs.firstTake;
    if(s==='追い込み')sc.k.cut=(sc.k.cut||0)+n*bs.cut2S;
    sc.k.swing=(sc.k.swing||0)+n*(1-(s==='初球'?bs.firstTake:s==='追い込み'?bs.cut2S:.1));}
}

/* ---------- apply ---------- */
const HIT_NAME={'1B':'ヒット','2B':'ツーベース','3B':'スリーベース','HR':'ホームラン'};
function applyResult(g,pitch,act,res){
  const bt=batTeam(g),pt=pitTeam(g),T=g.teams[bt],PT_=g.teams[pt],P=PT_.cur,batter=curBatter(g);
  if(res.call!=='pickoff')record(g,pitch,act,res);
  const ev={head:'',sub:'',runs:0,abEnd:false,halfOver:false,scenes:[],tone:'neutral',k:false};
  const sceneOf=(img,text,o={})=>ev.scenes.push({img,text,...o});
  const score=(r)=>{if(!r)return;g.score[bt]+=r;g.line[bt][g.inning-1]=(g.line[bt][g.inning-1]||0)+r;ev.runs+=r;
    if(g.half===1&&g.inning>=g.cfg.innings&&g.score[1]>g.score[0]){g.over=true;ev.walkoff=true;}};
  const endAB=()=>{ev.abEnd=true;T.bIdx++;P.bf++;g.balls=0;g.strikes=0;g.ab={pitches:[],pickoffs:0};};
  const addOut=(n=1)=>{g.outs+=n;};
  /* pickoff */
  if(res.call==='pickoff'){
    g.ab.pickoffs++;const po=res.pickoff;const runner=g.bases[po.base];
    if(po.out&&runner){g.bases[po.base]=null;addOut();ev.head='牽制アウト';ev.sub=`${runner.name}が刺された`;sceneOf('c14_slide',null);sceneOf('c15_out','アウト！',{big:true});if(!po.noRun)T.box.CS++;}
    else if(po.balk){const r=g.bases[2]?1:0;g.bases=[null,g.bases[0],g.bases[1]];score(r);ev.head='ボーク';ev.sub='3回目の牽制で刺せず、走者が進む';sceneOf('c16_safe','ボーク',{});}
    else{ev.head='牽制';ev.sub=po.noRun?'走者は帰塁':'セーフ';if(!po.noRun){sceneOf('c14_slide',null);sceneOf('c16_safe','セーフ！',{big:true});}}
    g.ab.pitches.push({kind:'pickoff',c:'牽'});
    if(g.outs>=3&&!g.over){ev.halfOver=true;P.retired=true;}
    return ev;
  }
  if(pitch.kind==='pitch'&&pitch.zone!=='WA'&&!pitch.ws){let i=P.cards.findIndex(c=>c.type===pitch.type&&c.kmh===pitch.kmh);if(i<0)i=P.cards.findIndex(c=>c.type===pitch.type);if(i>=0){P.cards.splice(i,1);fillHand(P);}}
  if(pitch.ws)P.ws=false;
  if(act.kind==='wide')batter.wide=false;
  if(['swing','wide'].includes(act.kind)){T.box.reads++;if(res.read)T.box.readHits++;}
  const callShort={ball:'B',strike:'S',foul:'F',inplay:'打',bunt:'バ'}[res.call];
  g.ab.pitches.push({type:pitch.type,zone:pitch.zone,kmh:pitch.kmh,kind:act.kind,c:callShort});
  /* steal resolution helpers */
  let running=res.steal!=null;
  const stealCheck=(swMiss)=>{
    const from=res.steal;const runner=g.bases[from];if(!runner)return;
    let p=.62+(runner.spd-1)*.9-((PT_.def||1)-1)*.6+({CB:.12,CH:.08,FK:.04,SL:0,FB:-.06}[pitch.type]||0);
    const z=ZN[pitch.zone];if(z.h==='H'||z.side==='O')p-=.06;if(z.waste)p-=.3;if(from===1)p-=.06;if(swMiss)p-=.08;
    const ok=R()<clamp(p,.12,.93);res.stealRes={from,ok,runner};g.bases[from]=null;
    if(ok){g.bases[from+1]=runner;T.box.SB++;}else{addOut();T.box.CS++;}
    return ok;};
  const two=g.strikes===2;
  if(res.call==='ball'){
    g.balls++;
    if(res.bunt&&res.bunt.runnerOut){const r=g.bases[2];g.bases[2]=null;addOut();ev.head='スクイズ失敗';ev.sub=`${r.name}が本塁で挟まれてアウト`;sceneOf('c14_slide',null);sceneOf('c15_out','アウト！',{big:true});}
    if(g.balls===4){const w=forceWalk(g,batter);T.box.BB++;ev.head=ev.head||'フォアボール';ev.sub=ev.sub||'歩いて出塁';sceneOf('c10_walk','フォアボール');res.stealRes=null;endAB();score(w.runs);}
    else{if(!ev.head){ev.head=pitch.zone==='WA'?'ウエスト':'ボール';ev.sub=res.edge?'コーナーをわずかに外れた':res.laidOff?'よく見極めた':'';}
      if(running&&!res.bunt){const ok=stealCheck(false);sceneOf('c14_slide',null);sceneOf(ok?'c16_safe':'c15_out',ok?'セーフ！':'アウト！',{big:true});ev.sub=ok?'盗塁成功':'盗塁失敗';}}
  }else if(res.call==='strike'){
    g.strikes++;
    if(res.bunt&&res.bunt.runnerOut){const r=g.bases[2];g.bases[2]=null;addOut();ev.head='スクイズ失敗';ev.sub=`空振りで${r.name}が挟まれてアウト`;sceneOf('c07_mitt',null);sceneOf('c14_slide',null);sceneOf('c15_out','アウト！',{big:true});}
    if(g.strikes===3){
      T.box.K++;PT_.box.Kp++;addOut();ev.k=true;
      const sk=res.strikeKind==='looking'?'見逃し三振':res.strikeKind==='buntfoul'?'スリーバント失敗':'空振り三振';
      ev.head=sk;ev.sub=sk==='スリーバント失敗'?'2ストライクからのファウルで三振':'';
      if(res.strikeKind==='buntfoul')sceneOf('c13_bunt','ファウル');else sceneOf('c07_mitt',null);
      sceneOf('c09_k',sk,{big:true});
      if(running&&g.outs<3){const ok=stealCheck(res.strikeKind==='swinging');if(!ok){ev.sub=(ev.sub?ev.sub+'、':'')+'盗塁も阻止（三振ゲッツー）';sceneOf('c14_slide',null);sceneOf('c15_out','アウト！',{big:true});}else{sceneOf('c14_slide',null);sceneOf('c16_safe','セーフ！',{big:true});}}
      endAB();
    }else{
      if(!ev.head){ev.head=res.strikeKind==='looking'?'見逃しストライク':'空振り';
        sceneOf('c07_mitt',res.strikeKind==='looking'?null:'空振り');if(res.strikeKind==='looking')sceneOf('c08_strike','ストライク');}
      if(running&&!res.bunt){const ok=stealCheck(res.strikeKind==='swinging');sceneOf('c14_slide',null);sceneOf(ok?'c16_safe':'c15_out',ok?'セーフ！':'アウト！',{big:true});ev.sub=ok?'盗塁成功':'盗塁失敗';}
    }
  }else if(res.call==='foul'){
    if(g.strikes<2)g.strikes++;ev.head='ファウル';
    if(res.bunt)sceneOf('c13_bunt','ファウル');else sceneOf('c06_impact','ファウル');
  }else if(res.call==='bunt'){
    const bu=res.bunt;
    if(bu.out==='success'){
      if(bu.sq){const r3=g.bases[2];g.bases[2]=null;g.bases=[null,g.bases[0],g.bases[1]];addOut();ev.head='スクイズ成功';ev.sub=`${r3.name}が生還`;sceneOf('c13_bunt','スクイズ',{});endAB();if(g.outs<3)score(1);else ev.sub='';}
      else{let [r1,r2,r3]=g.bases,runs=0;
        if(r1){if(r2){if(r3)runs++;r3=r2;}r2=r1;r1=null;}else if(r2&&!r3){r3=r2;r2=null;}
        g.bases=[null,r2,r3];addOut();ev.head='送りバント成功';ev.sub='走者を進めた';sceneOf('c13_bunt','送りバント',{});endAB();if(g.outs<3)score(runs);}
    }else if(bu.out==='pop'||bu.out==='popDP'){
      addOut();let note='';if(bu.out==='popDP'&&g.bases[2]&&g.outs<3){g.bases[2]=null;addOut();note='三塁走者も戻れず併殺';}
      ev.head='小フライ';ev.sub=note||'バント失敗';sceneOf('c13_bunt',null);sceneOf('c12_fly','バント失敗',{});endAB();
    }
  }else{ /* in play */
    const DEF=PT_.def||1;
    if(res.hit==='1B'&&DEF>1&&R()<(DEF-1)*1.6){res.hit='OUT';res.sub=res.bb.la>10?'liner':'ground';res.fielder=fielderFor(res.sub,res.bb.spray,res.bb.dist);res.outName=outName(res.sub,res.fielder);res.fine=true;}
    else if(res.hit==='2B'&&DEF>1&&R()<(DEF-1)*1.0){res.hit='1B';res.cutoff=true;}
    else if(res.hit==='OUT'&&res.sub==='ground'&&DEF<1&&R()<(1-DEF)*1.5){res.hit='1B';res.infield=true;}
    if(res.hit==='OUT'){
      const o=outPlay(g,res.sub,running,batter);addOut(o.outs);
      ev.head=res.outName+(o.note==='併殺'||o.note==='飛び出して併殺'?'（併殺）':'');ev.sub=o.note&&!o.note.includes('併殺')?o.note:o.note.includes('併殺')?o.note:'';
      if(res.fine)ev.sub=(ev.sub?ev.sub+'・':'')+'ファインプレー';
      if(res.sub==='ground'){sceneOf('c11_grounder',res.outName+(res.fine?'！':''));if(o.note==='併殺')sceneOf('c17_dp','ゲッツー',{big:true});}
      else sceneOf('c12_fly',res.outName);
      endAB();if(g.outs<3)score(o.runs);
    }else{
      T.box.H++;g.hits[bt]++;if(res.hit==='HR')T.box.HR++;
      const r=advanceHit(g,res.hit,batter,running);
      ev.head=HIT_NAME[res.hit]+(res.hit==='HR'&&r>1?`（${r}ラン）`:'');ev.sub=r?`${r}点が入る`:'';ev.tone='hit';
      if(res.infield){ev.head='内野安打';ev.sub=(ev.sub?ev.sub+'・':'')+'守備の乱れ';sceneOf('c11_grounder','内野安打');}
      else{if(res.cutoff)ev.sub=(ev.sub?ev.sub+'・':'')+'長打を防ぐ好守';sceneOf('c06_impact',HIT_NAME[res.hit]+(res.hit==='HR'?'!!':'!'),{vision:true,big:res.hit==='HR'});}
      endAB();score(r);
    }
  }
  if(ev.walkoff){ev.sub='サヨナラ！ '+(ev.sub||'');sceneOf('c18_celebrate','サヨナラ！',{big:true});}
  if(g.outs>=3&&!g.over){ev.halfOver=true;P.retired=true;}
  return ev;
}

/* ---------- inning flow ---------- */
function maxInning(g){return g.cfg.noDraw?30:(g.cfg.innings===9?12:g.cfg.innings+3);}
function nextHalf(g){const n=g.cfg.innings;
  g.outs=0;g.balls=0;g.strikes=0;g.bases=[null,null,null];g.ab={pitches:[],pickoffs:0};
  if(g.half===0){if(g.inning>=n&&g.score[1]>g.score[0]){g.line[1][g.inning-1]='X';g.over=true;return;}g.half=1;g.line[1][g.inning-1]=0;}
  else{if(g.inning>=n&&g.score[0]!==g.score[1]){g.over=true;return;}if(g.inning>=maxInning(g)){g.over=true;g.draw=true;return;}g.inning++;g.half=0;g.line[0][g.inning-1]=0;}
  g.teams.forEach(T=>T.cur.retired=false);
  if(g.inning>n){g.tiebreak=true;const T=T_bat(g);const prev=T.order[(T.bIdx+8)%9];g.bases[1]=prev;}
}
function changePitcher(g,t,p){const T=g.teams[t];T.cur.out=true;p.used=true;T.cur=p;p.bf=0;}
function pinchHit(g,b){const T=T_bat(g);const slot=T.bIdx%9;const old=T.order[slot];T.benchLeft=T.benchLeft.filter(x=>x!==b);T.order[slot]={...b,wide:false,slot,ph:true};return old;}

/* ---------- CPU ---------- */
function habit(g,t){const B=g.stats[t].B;const tn=sum(B.t),zn=sum(B.z);return {t:B.t,z:B.z,tn,zn};}
function cpuPitch(g){
  const T=T_pit(g),P=T.cur,s=sit(g.balls,g.strikes),prev=prevPitch(g),b=curBatter(g),side=batSide(b,P);
  const lead=g.score[pitTeam(g)]-g.score[batTeam(g)];const late=g.inning>=g.cfg.innings-1;
  const st=stealable(g);
  if(st.length&&g.ab.pickoffs<2&&R()<.035*(g.bases[0]&&g.bases[0].spd>1.08?2:1))return {kind:'pickoff'};
  if(g.bases[2]&&g.outs<2&&g.balls<3&&R()<(b.pow<1?.12:.05))return {kind:'pitch',type:'FB',zone:'WA'};
  const risp=g.bases[1]||g.bases[2];
  /* the winning shot is a card of its own: still usable after the deck runs out */
  if(P.ws&&((g.strikes===2&&R()<(P.fatigued?.6:.3))||(late&&risp&&Math.abs(lead)<=2&&R()<.25))){
    return {kind:'pitch',type:P.wsType,ws:true,zone:pickW(PZ,P.wsType==='FB'?[1.3,1.3,.7,.7,1,.3]:[.4,.6,1.2,1.4,.2,1])};}
  if(P.fatigued){if(R()<.55){const type=pickW(P.rep,P.rep.map(k=>P.mix[k]));return {kind:'pitch',type,fat:'type'};}
    return {kind:'pitch',zone:pickW(PZ,[1,1,1.2,1.2,.6,.6]),fat:'zone'};}
  const types=[...new Set(P.cards.map(c=>c.type))],items=[],ws=[];const h=habit(g,batTeam(g));
  for(const t of types)for(const z of PZ){
    const Z=ZN[z];let w=1;if(Z.ball)w*=1.4;
    w*=Math.exp(deception(prev,{type:t,zone:z},P,side).d*3.5);
    if(g.balls===3){if(Z.ball)w*=.45;if(t==='FB')w*=1.3;}else if(g.strikes===2&&Z.ball)w*=2.0;else if(g.balls>g.strikes&&Z.ball)w*=.85;
    if(P.tend==='power'){if(s==='初球'&&t==='FB')w*=1.8;if(s==='追い込み'&&t==='FK'&&(z==='LB'||z==='LO'))w*=2.6;if(s==='打者有利'&&t==='FB')w*=1.5;}
    else{if(s==='初球'&&(t==='SL'||t==='CB'))w*=1.6;if(s==='追い込み'&&((t==='SL'&&z==='LO')||(t==='FB'&&z==='HB')))w*=2.2;if(s==='打者有利'&&t==='CH')w*=1.5;}
    if(h.tn>=4){const f=(h.t[t]||0)/h.tn;w*=1-.6*Math.max(0,f-.22);}
    if(h.zn>=4&&!Z.ball){const f=(h.z[z]||0)/h.zn;w*=1-.6*Math.max(0,f-.25);}
    items.push({kind:'pitch',type:t,zone:z});ws.push(Math.pow(w,1.2));
  }
  const ch=pickW(items,ws);const cs=P.cards.filter(c=>c.type===ch.type);
  ch.kmh=(ch.type==='FB'&&g.strikes===2)?Math.max(...cs.map(c=>c.kmh)):cs[Math.floor(R()*cs.length)].kmh;
  return ch;
}
function cpuBat(g){
  const T=T_bat(g),B=T.batStyle,P=T_pit(g).cur,s=sit(g.balls,g.strikes),prev=prevPitch(g),b=curBatter(g);
  const ps=pStats(g.stats[pitTeam(g)],P.name).sit[s];
  const diff=g.score[batTeam(g)]-g.score[pitTeam(g)];const late=g.inning>=g.cfg.innings-1;
  let steal=null;const st=stealable(g);
  if(st.length&&g.outs<2){const i=st[st.length-1];const rn=g.bases[i];if(rn.spd>=1.05&&R()<.07*B.steal*(rn.spd>1.12?2:1))steal=i;}
  const mk=a=>({act:a,steal});
  if(canSqueeze(g)&&g.strikes<2&&b.pow<1.05&&Math.abs(diff)<=1&&late&&R()<.3*B.bunt)return mk({kind:'squeeze',zones:[pickW(SZ,[1,1.2,1.1,1])]});
  if(canBunt(g)&&g.outs===0&&!g.bases[2]&&g.strikes<2&&b.pow<1.0&&Math.abs(diff)<=2&&R()<.3*B.bunt)return mk({kind:'bunt',zones:[pickW(SZ,[1,1.2,1.1,1])]});
  if(g.balls===3&&g.strikes<2&&R()<B.threeTake)return mk({kind:'take'});
  if(s==='初球'&&R()<B.firstTake)return mk({kind:'take'});
  if(g.strikes===2&&R()<B.cut2S)return mk({kind:'cut'});
  if(R()<.06)return mk({kind:'take'});
  const rep=P.rep;
  const tw=rep.map(k=>{let w=ps.n>=3?(ps.t[k]||0)/ps.n:P.mix[k]*.5+.125;if(prev&&prev.type===k)w*=.75;return Math.pow(w+.02,2);});
  const hs=ps.h.H+ps.h.L;const hH=hs>=3?ps.h.H/hs:.5;
  const zw=SZ.map(z=>Math.pow((ZN[z].h==='H'?hH:1-hH)*.5+.06,2));
  const type=pickW(rep,tw);const zone=pickW(SZ,zw);
  if(b.wide&&(g.strikes===2||g.bases[1]||g.bases[2])&&R()<.3){
    const pair=ZN[zone].h==='H'?['HI','HO']:['LI','LO'];return mk({kind:'wide',type,zones:pair});}
  return mk({kind:'swing',type,zones:[zone]});
}
function cpuPinch(g){const T=T_bat(g),P=T_pit(g).cur,b=curBatter(g);if(!canPinchHit(g))return null;
  if(g.inning<g.cfg.innings-2)return null;const side=batSide(b,P);
  if(side!==P.hand)return null;
  const opp=T.benchLeft.filter(x=>batSide(x,P)!==P.hand&&(x.con+x.pow)>=(b.con+b.pow)-.12);
  if(!opp.length||R()>.55)return null;return opp[0];}
function cpuPitchChange(g){const t=pitTeam(g),T=g.teams[t],P=T.cur;if(!canChangePitcher(g,t))return null;
  const bp=bullpen(T);if(!bp.length)return null;const n=g.cfg.innings;
  const lead=g.score[t]-g.score[1-t];const cl=bp.find(p=>p.role==='CL');
  if(cl&&g.inning>=n&&lead>=1&&lead<=3&&P!==cl&&g.ab.pitches.length===0&&g.outs===0&&g.bases.every(x=>!x))return cl;
  if(remaining(P)<=3||P.fatigued){const rp=bp.find(p=>p.role==='RP')||cl;return rp||null;}
  const b=curBatter(g);if(g.inning>=n-1&&b.bats==='L'&&b.pow>=1.2&&P.hand==='R'&&g.ab.pitches.length===0){const lp=bp.find(p=>p.hand==='L'&&p.role==='RP');if(lp&&R()<.5)return lp;}
  return null;}

function simGame(cfg){const g=createGame(cfg);seedPrior(g,0);seedPrior(g,1);let guard=0;
  while(!g.over&&guard++<9000){
    if(g.ab.pitches.length===0&&g.ab.pickoffs===0){const ph=cpuPinch(g);if(ph)pinchHit(g,ph);const np=cpuPitchChange(g);if(np)changePitcher(g,pitTeam(g),np);}
    let p=cpuPitch(g);if(p.kind==='pickoff'&&!g.bases.some(Boolean))p=cpuPitch(g);p=finalizePitch(g,p);const b=cpuBat(g);
    const r=resolvePitch(g,p,b.act,b.steal);const ev=applyResult(g,p,b.act,r);if(ev.halfOver&&!g.over)nextHalf(g);}
  return g;}
if(typeof module!=='undefined')module.exports={simGame,fbBase,PT,ZN,SZ,PZ,SITS,KIND,TEAMS,createGame,cpuPitch,cpuBat,cpuPinch,cpuPitchChange,finalizePitch,resolvePitch,applyResult,nextHalf,changePitcher,pinchHit,batTeam,pitTeam,T_bat,T_pit,curBatter,seedPrior,remaining,maxInning};
