const L=require('./logic.js');const N=+process.argv[2]||300,inn=+process.argv[3]||9;
const W=Array(6).fill(0),G=Array(6).fill(0),RS=Array(6).fill(0),RA=Array(6).fill(0),HR=Array(6).fill(0),H=Array(6).fill(0);
for(let a=0;a<6;a++)for(let b=0;b<6;b++){if(a===b)continue;for(let i=0;i<N;i++){
 const g=L.simGame({innings:inn,teamIds:[a,b],starters:[i%3,(i+1)%3]});const ids=[a,b];
 for(const k of [0,1]){const t=ids[k];G[t]++;RS[t]+=g.score[k];RA[t]+=g.score[1-k];HR[t]+=g.teams[k].box.HR;H[t]+=g.teams[k].box.H;if(g.score[k]>g.score[1-k])W[t]++;else if(g.score[k]===g.score[1-k])W[t]+=.5;}}}
L.TEAMS.forEach((T,i)=>console.log(T.short.padEnd(6,'　'),'勝率',(W[i]/G[i]).toFixed(3),'得点',(RS[i]/G[i]).toFixed(2),'失点',(RA[i]/G[i]).toFixed(2),'安打',(H[i]/G[i]).toFixed(1),'本塁打',(HR[i]/G[i]).toFixed(2)));
