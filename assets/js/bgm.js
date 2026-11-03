const BGM=(()=>{
  const N=m=>440*Math.pow(2,(m-69)/12);
  let ctx=null,master=null,rev=null,timer=null,nextT=0,step=0,on=false,vol=.7,duckOn=false,tk='march',melMap=null,nbuf=null;
  function chain(){
    if(master)return true;
    ctx=Snd.get();if(!ctx)return false;
    master=ctx.createGain();master.gain.value=0;
    const comp=ctx.createDynamicsCompressor();comp.threshold.value=-18;comp.knee.value=14;comp.ratio.value=3.5;comp.attack.value=.005;comp.release.value=.2;
    master.connect(comp);comp.connect(ctx.destination);
    const len=Math.floor(ctx.sampleRate*1.3),buf=ctx.createBuffer(2,len,ctx.sampleRate);
    for(let c=0;c<2;c++){const d=buf.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6)}
    rev=ctx.createConvolver();rev.buffer=buf;const wet=ctx.createGain();wet.gain.value=.3;rev.connect(wet);wet.connect(master);
    const nl=ctx.sampleRate;nbuf=ctx.createBuffer(1,nl,ctx.sampleRate);const nd=nbuf.getChannelData(0);for(let i=0;i<nl;i++)nd[i]=Math.random()*2-1;
    return true;
  }
  function out(n,send=.5){n.connect(master);if(send){const s=ctx.createGain();s.gain.value=send;n.connect(s);s.connect(rev)}}
  /* 악기 */
  function marimba(m,t,v,len=.5){
    const o=ctx.createOscillator(),o2=ctx.createOscillator(),g=ctx.createGain(),g2=ctx.createGain();
    o.type='sine';o.frequency.value=N(m);o2.type='sine';o2.frequency.value=N(m)*3.99;g2.gain.value=.22;o2.connect(g2);g2.connect(g);o.connect(g);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.004);g.gain.exponentialRampToValueAtTime(.0008,t+len);
    out(g,.6);o.start(t);o2.start(t);o.stop(t+len+.05);o2.stop(t+len+.05);
  }
  function ukulele(m,t,v){
    const o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();
    o.type='triangle';o.frequency.value=N(m);f.type='lowpass';f.frequency.value=2600;
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.004);g.gain.exponentialRampToValueAtTime(.001,t+.3);
    o.connect(f);f.connect(g);out(g,.35);o.start(t);o.stop(t+.35);
  }
  function celesta(m,t,v,len=1.6){
    const o=ctx.createOscillator(),o2=ctx.createOscillator(),g=ctx.createGain(),g2=ctx.createGain();
    o.type='sine';o.frequency.value=N(m);o2.type='sine';o2.frequency.value=N(m)*4.01;g2.gain.value=.16;o2.connect(g2);g2.connect(g);o.connect(g);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.006);g.gain.exponentialRampToValueAtTime(.0008,t+len);
    out(g,.9);o.start(t);o2.start(t);o.stop(t+len+.05);o2.stop(t+len+.05);
  }
  function flute(m,t,len,v){
    const o=ctx.createOscillator(),o2=ctx.createOscillator(),g2=ctx.createGain(),g=ctx.createGain(),lfo=ctx.createOscillator(),lg=ctx.createGain();
    o.type='sine';o.frequency.value=N(m);o2.type='triangle';o2.frequency.value=N(m)*2;g2.gain.value=.12;o2.connect(g2);
    lfo.frequency.value=5.5;lg.gain.value=4;lfo.connect(lg);lg.connect(o.detune);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.04);g.gain.setValueAtTime(v*.85,t+Math.max(.05,len-.08));g.gain.linearRampToValueAtTime(0,t+len+.08);
    o.connect(g);g2.connect(g);out(g,.5);[o,o2,lfo].forEach(x=>{x.start(t);x.stop(t+len+.2)});
  }
  function bassNote(m,t,len,v){
    const o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();
    o.type='triangle';o.frequency.value=N(m);f.type='lowpass';f.frequency.value=900;
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+len);
    o.connect(f);f.connect(g);g.connect(master);o.start(t);o.stop(t+len+.05);
  }
  function pad(notes,t,len,v){
    notes.forEach(m=>{const o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();
      o.type='sawtooth';o.frequency.value=N(m);f.type='lowpass';f.frequency.value=1100;
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+len*.3);g.gain.linearRampToValueAtTime(0,t+len);
      o.connect(f);f.connect(g);out(g,.6);o.start(t);o.stop(t+len+.05)});
  }
  function kick(t,v){
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sine';o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(48,t+.09);
    g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+.2);o.connect(g);g.connect(master);o.start(t);o.stop(t+.25);
  }
  function noise(t,len,v,type,freq,q=1){
    const s=ctx.createBufferSource();s.buffer=nbuf;const f=ctx.createBiquadFilter(),g=ctx.createGain();
    f.type=type;f.frequency.value=freq;f.Q.value=q;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+len);
    s.connect(f);f.connect(g);out(g,type==='bandpass'?.25:0);s.start(t);s.stop(t+len+.02);
  }
  const clap=(t,v)=>{noise(t,.11,v,'bandpass',1500,.9);noise(t+.012,.09,v*.7,'bandpass',1900,.9)};
  const hat=(t,v)=>noise(t,.04,v,'highpass',7500);
  const shaker=(t,v)=>noise(t,.07,v,'bandpass',6000,.8);
  const CH={C:[60,64,67],G:[59,62,67],Am:[57,60,64],F:[57,60,65],D:[57,62,66],Em:[55,59,64],Bb:[58,62,65],Dm:[57,62,65],Gm:[55,58,62]};
  const RT={C:48,G:43,Am:45,F:41,D:50,Em:40,Bb:46,Dm:50};
  const TRACKS={
    /* 1. 씩씩한 행진곡 (C장조) : 지킴이 출동! 마을 탐험 기본곡 */
    march:{name:'씩씩한 지킴이 행진',step:.21,bl:8,
      prog:['C','F','C','G','C','F','G','C'],
      mel:[[0,72,1],[1,72,1],[2,76,1],[3,72,1],[4,79,2],[6,76,1],[7,72,1],
           [8,77,1],[9,77,1],[10,81,1],[11,77,1],[12,84,2],[14,81,1],[15,77,1],
           [16,79,1],[17,76,1],[18,72,1],[19,76,1],[20,79,2],[22,81,1],[23,83,1],
           [24,83,1],[25,79,1],[26,74,1],[27,79,1],[28,83,2],[30,86,1],[31,83,1],
           [32,84,1],[33,84,1],[34,79,1],[35,76,1],[36,72,2],[38,76,1],[39,79,1],
           [40,81,1],[41,81,1],[42,77,1],[43,81,1],[44,84,2],[46,81,1],[47,77,1],
           [48,79,1],[49,83,1],[50,86,1],[51,83,1],[52,79,1],[53,83,1],[54,86,2],
           [56,84,2],[58,79,1],[59,76,1],[60,72,3]],
      play(s,bar,t,pass,T){
        const k=T.prog[bar],C=CH[k],r=RT[k];
        if(s===0||s===4)kick(t,.55);
        if(s===2||s===6)clap(t,.2);
        hat(t,s%2?.05:.09);
        if(s===0||s===4)bassNote(r,t,.28,.32);if(s===2||s===6)bassNote(r+7,t,.22,.24);
        if(s%2===1)C.forEach((m,i)=>ukulele(m+12,t+i*.012,.07));
        if(pass%2===1&&s===0)marimba(C[0]+24,t,.04,.3);
      },
      note(m,t,len,pass,T){flute(m[1],t,len*.9,.13);marimba(m[1],t,.12,.4)}},
    /* 2. 마을 순찰 (G장조) : 통통 튀는 산책 느낌 */
    patrol:{name:'마을 한 바퀴 순찰',step:.25,bl:8,
      prog:['G','C','G','D','Em','C','G','D'],
      mel:[[0,79,1],[2,83,1],[3,86,1],[4,83,2],[6,79,1],[7,74,1],
           [8,76,1],[9,79,1],[10,84,2],[12,79,1],[13,76,1],[14,72,2],
           [16,74,1],[17,79,1],[18,83,1],[19,79,1],[20,86,2],[22,83,1],[23,79,1],
           [24,81,1],[25,78,1],[26,74,2],[28,78,1],[29,81,1],[30,86,2],
           [32,88,1],[33,83,1],[34,79,2],[36,83,1],[37,88,1],[38,91,2],
           [40,88,1],[41,84,1],[42,79,2],[44,84,1],[45,88,1],[46,84,2],
           [48,86,1],[49,83,1],[50,79,1],[51,83,1],[52,86,2],[54,83,1],[55,79,1],
           [56,81,1],[57,78,1],[58,74,1],[59,78,1],[60,79,3]],
      play(s,bar,t,pass,T){
        const k=T.prog[bar],C=CH[k],r=RT[k];
        if(s===0)kick(t,.4);if(s===4)kick(t,.3);
        if(s===2||s===6)clap(t,.12);
        if(s%2===1)shaker(t,.06);
        if(s===0||s===4)bassNote(r,t,.32,.26);if(s===3||s===7)bassNote(r+7,t,.18,.16);
        if(s%2===1)C.forEach((m,i)=>ukulele(m+12,t+i*.015,.08));
        if(pass%2===1&&s%4===2)celesta(C[(s/2)%3]+24,t,.03,.8);
      },
      note(m,t,len,pass,T){marimba(m[1],t,.22,.55);if(pass%2===1)flute(m[1],t,len*.8,.07)}},
    /* 3. 포근한 자장가풍 (F장조) : 차분한 활동용 */
    calm:{name:'포근한 안전 약속',step:.34,bl:8,
      prog:['F','C','Dm','Bb','F','C','Bb','F'],
      mel:[[0,77,2],[2,81,1],[3,84,1],[4,81,2],[6,77,2],
           [8,79,2],[10,76,1],[11,72,1],[12,76,4],
           [16,81,2],[18,77,1],[19,74,1],[20,77,2],[22,81,2],
           [24,82,2],[26,77,1],[27,74,1],[28,77,4],
           [32,84,2],[34,81,1],[35,77,1],[36,81,2],[38,84,2],
           [40,83,1],[41,79,1],[42,76,2],[44,79,4],
           [48,82,2],[50,86,1],[51,82,1],[52,77,2],[54,74,2],
           [56,77,2],[58,72,1],[59,69,1],[60,65,4]],
      play(s,bar,t,pass,T){
        const k=T.prog[bar],C=CH[k],r=RT[k];
        if(s===0){bassNote(r,t,.8,.2);pad(C,t,T.step*8,.014)}
        if(s===4)bassNote(r+7,t,.5,.12);
        if(s%2===0)celesta(C[(s/2)%3]+12,t,.03,1);
        if(s===2||s===6)shaker(t,.03);
      },
      note(m,t,len,pass,T){celesta(m[1],t,.11,1.6);if(pass%2===1)marimba(m[1]-12,t,.03,.5)}},
  };
  function build(){const T=TRACKS[tk];melMap=new Map(T.mel.map(x=>[x[0],x]))}
  build();
  function schedule(){
    if(!on)return;const T=TRACKS[tk],total=T.prog.length*T.bl;
    while(nextT<ctx.currentTime+.6){
      const g=step%total,bar=Math.floor(g/T.bl),s=g%T.bl,pass=Math.floor(step/total);
      T.play(s,bar,nextT,pass,T);
      const m=melMap.get(g);if(m)T.note(m,nextT,m[2]*T.step,pass,T);
      step++;nextT+=T.step;
    }
  }
  function apply(ms){if(!master)return;const g=master.gain,t=ctx.currentTime;g.cancelScheduledValues(t);g.setValueAtTime(g.value,t);g.linearRampToValueAtTime((on?.8:0)*vol*(duckOn?.25:1),t+ms)}
  return{
    get on(){return on},get track(){return tk},get vol(){return vol},TRACKS,
    start(){
      if(on||!chain())return;on=true;ctx.resume&&ctx.resume();
      nextT=ctx.currentTime+.15;step=0;timer=setInterval(schedule,120);schedule();apply(.8);
    },
    stop(){if(!on)return;on=false;const t=timer;setTimeout(()=>clearInterval(t),500);timer=null;if(master){const g=master.gain,c=ctx.currentTime;g.cancelScheduledValues(c);g.setValueAtTime(g.value,c);g.linearRampToValueAtTime(0,c+.5)}},
    toggle(){on?this.stop():this.start();return on},
    duck(v){duckOn=!!v;if(on)apply(.5)},
    setVol(v){vol=Math.max(0,Math.min(1,v));if(on)apply(.15)},
    setTrack(n){if(!TRACKS[n])return;tk=n;build();step=0;if(on&&ctx)nextT=ctx.currentTime+.2},
  };
})();
document.addEventListener('visibilitychange',()=>{if(document.hidden&&BGM.on){BGM.stop();BGM._resume=true}else if(!document.hidden&&BGM._resume){BGM._resume=false;BGM.start()}});
