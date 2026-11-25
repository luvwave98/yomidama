
const SND={ctx:null,on:true,wanted:false,tries:0};
/* Mobile browsers suspend or interrupt audio when the app is backgrounded or the screen locks.
   Every user gesture checks the context: resume it, and if that has not worked by the next gesture, rebuild it. */
function audioEnsure(){
  if(!SND.ctx){audioInit();return;}
  const c=SND.ctx;if(c.state==='running'){SND.tries=0;return;}
  if(c.state==='closed'||SND.tries>=1){if(c.state!=='closed'){try{const r=c.close();if(r&&r.catch)r.catch(()=>{});}catch(e){}}SND.ctx=null;SND.tries=0;audioInit();return;}
  SND.tries++;try{const p=c.resume();if(p&&p.catch)p.catch(()=>{});}catch(e){}
}
['pointerdown','touchend','keydown'].forEach(ev=>document.addEventListener(ev,()=>{if(SND.wanted)audioEnsure();},true));
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&SND.ctx&&SND.ctx.state!=='running'){try{const p=SND.ctx.resume();if(p&&p.catch)p.catch(()=>{});}catch(e){}}});
function audioInit(){
  SND.wanted=true;
  if(SND.ctx){if(SND.ctx.state!=='running')audioEnsure();return;}
  const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
  try{
  const ctx=new C();SND.ctx=ctx;
  const comp=ctx.createDynamicsCompressor();comp.threshold.value=-12;comp.ratio.value=4;comp.connect(ctx.destination);
  const m=ctx.createGain();m.gain.value=.9;m.connect(comp);SND.master=m;
  const len=ctx.sampleRate*2,buf=ctx.createBuffer(1,len,ctx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;SND.noise=buf;
  const dl=ctx.createDelay(1);dl.delayTime.value=.14;const fb=ctx.createGain();fb.gain.value=.33;const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2200;
  dl.connect(lp);lp.connect(fb);fb.connect(dl);const wet=ctx.createGain();wet.gain.value=.5;lp.connect(wet);wet.connect(m);SND.echo=dl;
  const a=ctx.createBufferSource();a.buffer=buf;a.loop=true;const af=ctx.createBiquadFilter();af.type='lowpass';af.frequency.value=380;af.Q.value=.4;
  const ag=ctx.createGain();ag.gain.value=SND.on?.018:0;a.connect(af);af.connect(ag);ag.connect(m);a.start();SND.amb=ag;
  }catch(e){SND.ctx=null;}
}
function sndOK(){return SND.on&&SND.ctx;}
function nz(t,dur,type,freq,q,gain,dest,atk=.001){const c=SND.ctx,s=c.createBufferSource();s.buffer=SND.noise;const f=c.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;const g=c.createGain();
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+atk);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f);f.connect(g);g.connect(dest||SND.master);s.start(t,Math.random()*1.5);s.stop(t+dur+.05);return f;}
function tone(t,f0,f1,dur,gain,type='sine',dest){const c=SND.ctx,o=c.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+dur);const g=c.createGain();
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+.002);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(dest||SND.master);o.start(t);o.stop(t+dur+.05);}
/* 打音: 乾いた破裂 + 木の鳴り + 胴鳴り。power で余韻とエコーが増える */
function sHit(p){if(!sndOK())return;const t=SND.ctx.currentTime;
  nz(t,.05+.06*p,'bandpass',2600,.9,.8+.2*p);nz(t,.014,'highpass',5200,.7,.8);
  tone(t,1750,1580,.1+.14*p,.32,'triangle');tone(t,2950,2780,.08+.1*p,.16);tone(t,210,85,.1,.7);
  if(p>.55){nz(t,.06,'bandpass',2400,.9,.7,SND.echo);tone(t,1750,1600,.12,.25,'triangle',SND.echo);}}
/* ミット音: 低い衝撃 + 革が弾ける音。big で二段打ち + スタジアム残響 */
function sMitt(big){if(!sndOK())return;const t=SND.ctx.currentTime;
  tone(t,155,46,.16+(big?.14:0),big?1:.65);nz(t,.06,'lowpass',1700,.8,big?.95:.55);nz(t,.018,'highpass',3800,.8,big?.75:.35);
  if(big){nz(t+.022,.05,'lowpass',1100,.7,.7);tone(t,72,38,.38,.7);nz(t,.07,'lowpass',1500,.8,.8,SND.echo);}}
function sFoul(){if(!sndOK())return;const t=SND.ctx.currentTime;nz(t,.03,'bandpass',3400,1.5,.7);tone(t,2300,2000,.05,.18,'triangle');}
function sFlip(){if(!sndOK())return;const t=SND.ctx.currentTime;nz(t,.025,'highpass',2600,.7,.35);nz(t+.06,.02,'highpass',2600,.7,.25);}
function sWhoosh(d){if(!sndOK())return;const c=SND.ctx,t=c.currentTime,s=c.createBufferSource();s.buffer=SND.noise;const f=c.createBiquadFilter();f.type='bandpass';f.Q.value=2;
  f.frequency.setValueAtTime(300,t);f.frequency.exponentialRampToValueAtTime(1500,t+d);const g=c.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.16,t+d*.95);g.gain.exponentialRampToValueAtTime(.0001,t+d+.03);
  s.connect(f);f.connect(g);g.connect(SND.master);s.start(t);s.stop(t+d+.1);}

/* Crowd: many synthetic voices through vowel formants + clap grains, instead of filtered noise.
   shape 'cheer' rises ("わーっ"), 'groan' falls ("あぁ…") */
function crowdVoices(k,dur,shape){if(!sndOK())return;const c=SND.ctx,t=c.currentTime;
  const out=c.createGain();out.gain.value=1;out.connect(SND.master);
  const vow=shape==='groan'?[[650,5,1],[1050,6,.55],[2500,7,.18]]:[[780,4,1],[1250,5,.6],[2700,7,.22]];
  const bus=c.createGain();bus.gain.value=1;
  for(const [fq,q,gm] of vow){const f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=fq;f.Q.value=q;const g=c.createGain();g.gain.value=gm*2.2;bus.connect(f);f.connect(g);g.connect(out);}
  const N=Math.round(12+18*k);
  for(let i=0;i<N;i++){
    const o=c.createOscillator();o.type='sawtooth';
    const base=(i%3===0?240+Math.random()*140:120+Math.random()*90);
    const st=t+Math.random()*(shape==='groan'?.12:.2);
    const end=t+dur*(.75+Math.random()*.25);
    if(shape==='groan'){o.frequency.setValueAtTime(base*1.15,st);o.frequency.exponentialRampToValueAtTime(base*.72,end);}
    else{o.frequency.setValueAtTime(base*.85,st);o.frequency.exponentialRampToValueAtTime(base*1.18,st+.3);o.frequency.exponentialRampToValueAtTime(base*(1.02+Math.random()*.1),end);}
    const lfo=c.createOscillator();lfo.frequency.value=4.5+Math.random()*2.5;const lg=c.createGain();lg.gain.value=base*.03;lfo.connect(lg);lg.connect(o.frequency);
    const g=c.createGain();const pk=.03*k*(.5+Math.random()*.8);
    g.gain.setValueAtTime(.0001,st);g.gain.exponentialRampToValueAtTime(pk,st+.08+Math.random()*.15);
    g.gain.setValueAtTime(pk,Math.max(st+.25,end-dur*.4));g.gain.exponentialRampToValueAtTime(.0001,end);
    o.connect(g);g.connect(bus);o.start(st);lfo.start(st);o.stop(end+.05);lfo.stop(end+.05);}
  /* breath: soft vowel-shaped air under the voices */
  const br=c.createBufferSource();br.buffer=SND.noise;br.loop=true;const bf=c.createBiquadFilter();bf.type='bandpass';bf.frequency.value=900;bf.Q.value=.9;
  const bg=c.createGain();bg.gain.setValueAtTime(.0001,t);bg.gain.exponentialRampToValueAtTime(.05*k,t+.2);bg.gain.exponentialRampToValueAtTime(.0001,t+dur);
  br.connect(bf);bf.connect(bg);bg.connect(out);br.start(t,Math.random());br.stop(t+dur+.05);
  /* applause grains for cheers */
  if(shape!=='groan'){const n=Math.round(30*k*dur);for(let j=0;j<n;j++){const ct=t+.15+Math.random()*dur*.85;
    nz(ct,.018+Math.random()*.02,'bandpass',1800+Math.random()*1800,1.1,.05*k*(.4+Math.random()*.6),out);}}
}
function sCrowd(k,dur){crowdVoices(k,dur,'cheer');}
function sGroan(){crowdVoices(.6,1.3,'groan');}
