/* (개발용) 자동 플레이 검사 스크립트.
   index.html?debug=1 로 열어 출동 구역(마을)에 들어간 뒤, 개발자 도구 콘솔에서
     const s=document.createElement('script');s.src='tools/test-harness.js';document.body.append(s);
   를 실행하면 window.__t 가 생겨요.
     await __t.check()          → 지도·마스크·입구 도달 여부
     await __t.run('home')      → 출동 장소 하나를 정답으로 자동 플레이
     await __t.runAll()         → 7곳 모두 */
window.__t={
  sleep:ms=>new Promise(r=>setTimeout(r,ms)),
  check(){
    const v=window.__village,M=v.WalkMask;
    const W=M.w,H=M.h,seen=new Uint8Array(W*H);const sx=Math.floor(VD.start[0]*M.s),sy=Math.floor(VD.start[1]*M.s);
    let q=[sy*W+sx];seen[q[0]]=1;
    while(q.length){const n=[];for(const i of q){const x=i%W,y=(i-x)/W;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=W||ny>=H)continue;const j=ny*W+nx;if(seen[j]||!M.data[j])continue;seen[j]=1;n.push(j)}}q=n}
    const reach={};for(const id in VD.shops){const d=VD.shops[id].door;reach[id]={doorReach:!!seen[Math.floor(d[1]*M.s)*M.w+Math.floor(d[0]*M.s)],spawnOk:M.ok(...VD.shops[id].spawn)}}
    const bg=document.querySelector('.vbg'),wi=document.querySelector('.wfig img');
    return {maskImg:!!M.img,map:bg&&bg.naturalWidth+'x'+bg.naturalHeight,walker:wi&&wi.naturalWidth+'x'+wi.naturalHeight,startOk:M.ok(v.P.x,v.P.y),hud:['.hud-id','.hud-map','.hud-radio','.hud-pad','.hud-act'].map(s=>!!document.querySelector(s)),target:v.targetId(),reach};
  },
  clickNext(){const btns=[...document.querySelectorAll('.q-body [data-act="next"]')];const b=btns[btns.length-1];if(!b)throw new Error('no next btn at '+document.querySelector('.q-title .qt')?.textContent);b.click()},
  async doStep(st){
    const T=this;
    if(st.type==='hazard'){const layer=document.querySelector('.hzlayer');const r=layer.getBoundingClientRect();
      for(const sp of st.spots){layer.dispatchEvent(new PointerEvent('pointerdown',{clientX:r.left+sp.x/100*r.width,clientY:r.top+sp.y/100*r.height,bubbles:true}));await T.sleep(20)}
      const found=document.querySelectorAll('.hzmark').length;if(found!==st.spots.length)throw new Error('hazard found '+found+'/'+st.spots.length);await T.sleep(80);T.clickNext()}
    else if(st.type==='order'){for(const it of st.items){const c=[...document.querySelectorAll('.ocard')].find(e=>e.textContent===it.t);if(!c)throw new Error('order card missing '+it.t);c.click();await T.sleep(20)}await T.sleep(80);T.clickNext()}
    else if(st.type==='choice'){for(const sc of st.scenes){const ok=sc.opts.find(o=>o.ok);const el=[...document.querySelectorAll('.opt')].find(e=>e.textContent===ok.t);if(!el)throw new Error('opt missing');el.click();await T.sleep(50);T.clickNext();await T.sleep(50)}}
    else if(st.type==='ox'){for(const it of st.items){document.querySelector(it.a?'.oxbtn.o':'.oxbtn.x').click();await T.sleep(50);T.clickNext();await T.sleep(50)}}
    else if(st.type==='match'){for(const p of st.pairs){const lt=(p.lico?p.lico+' ':'')+p.l,rt=(p.rico?p.rico+' ':'')+p.r;const le=[...document.querySelectorAll('.mitem.l')].find(e=>e.textContent===lt),re=[...document.querySelectorAll('.mitem.r')].find(e=>e.textContent===rt);if(!le||!re)throw new Error('match item missing: '+p.l);le.click();await T.sleep(20);re.click();await T.sleep(20)}await T.sleep(80);T.clickNext()}
    else if(st.type==='sort'){for(let i=0;i<st.items.length;i++){const q=document.querySelector('.qtext').textContent;const it=st.items.find(x=>x.t===q);document.querySelectorAll('.bin')[it.bin].click();await T.sleep(50);T.clickNext();await T.sleep(50)}}
    else if(st.type==='plan'){for(const pf of document.querySelectorAll('.pf')){pf.querySelector('.chip').click();await T.sleep(10)}[...document.querySelectorAll('.btn')].find(e=>e.textContent.includes('약속 카드 만들기')).click();await T.sleep(80);T.clickNext()}
    else throw new Error('unknown step '+st.type);
  },
  /* 실제 이동 엔진으로 BFS 경로를 따라 걸어가 보기 (끼는 곳이 있으면 stuck 위치를 알려 줘요) */
  async walkTo(bid,maxSec=40){
    const v=window.__village,M=v.WalkMask,s=M.s,d=VD.shops[bid].door;
    /* 검사 중에는 게임의 실제 루프가 끼어들지 않게: document.hidden 을 평소엔 true(루프 멈춤), 내 tick 호출 순간에만 false 로 */
    let hid=true;try{Object.defineProperty(document,'hidden',{get:()=>hid,configurable:true})}catch(e){}
    document.querySelectorAll('.modal-bg').forEach(e=>e.remove());   // 안내 창이 떠 있으면 입력이 막히므로 치워요
    const sc=M.nearestCell(Math.floor(v.P.x*s),Math.floor(v.P.y*s),12),tc=M.nearestCell(Math.floor(d[0]*s),Math.floor(d[1]*s),30);
    if(!sc||!tc)return {bid,error:'no cell'};
    const path=M.path(sc[0],sc[1],tc[0],tc[1]);if(!path)return {bid,error:'no path'};
    const W=M.w,cx=i=>((i%W)+.5)/s,cy=i=>(Math.floor(i/W)+.5)/s;
    let wi=0,ticks=0,stuck=0,last=[v.P.x,v.P.y],stuckAt=null;const maxT=maxSec*60,trace=[];
    while(ticks<maxT){
      let bj=wi,bd=1e9;for(let j=wi;j<Math.min(wi+40,path.length);j++){const dd=Math.hypot(cx(path[j])-v.P.x,cy(path[j])-v.P.y);if(dd<bd){bd=dd;bj=j}}wi=bj;   // 지금 위치에 가장 가까운 경로 지점부터
      const i=path[Math.min(wi+10,path.length-1)],dx=cx(i)-v.P.x,dy=cy(i)-v.P.y;
      v.keys.l=dx<-3?1:0;v.keys.r=dx>3?1:0;v.keys.u=dy<-3?1:0;v.keys.d=dy>3?1:0;
      if(ticks%10===0)document.querySelectorAll('.modal-bg').forEach(e=>e.remove());
      hid=false;v.tick(1/60);hid=true;ticks++;if(ticks%60===0)trace.push([Math.round(v.P.x),Math.round(v.P.y)]);
      if(v.nearId()===bid)break;
      if(Math.hypot(v.P.x-last[0],v.P.y-last[1])<.5)stuck++;else stuck=0;last=[v.P.x,v.P.y];
      if(stuck>90){stuckAt=[Math.round(v.P.x),Math.round(v.P.y)];break}
      if(ticks%30===0)await this.sleep(0);
    }
    v.keys.l=v.keys.r=v.keys.u=v.keys.d=0;hid=false;v.tick(1/60);try{delete document.hidden}catch(e){}
    return {bid,reached:v.nearId()===bid,sec:+(ticks/60).toFixed(1),stuckAt,pathLen:path.length,pos:[Math.round(v.P.x),Math.round(v.P.y)],trace:trace.slice(0,12)};
  },
  /* 아무 데서나 아무 방향으로 마구 눌러 본 뒤 꼼짝 못 하는 자리가 생기는지 검사 */
  async fuzz(n=60,seed=7){
    const v=window.__village,M=v.WalkMask,s=M.s,W=M.w;let hid=true;try{Object.defineProperty(document,'hidden',{get:()=>hid,configurable:true})}catch(e){}
    let rnd=seed;const R=()=>(rnd=(rnd*1103515245+12345)&0x7fffffff)/0x7fffffff;
    const cells=[];for(let i=0;i<M.fit.length;i++)if(M.fit[i])cells.push(i);
    const trapped=[];
    for(let t=0;t<n;t++){
      const c=cells[Math.floor(R()*cells.length)];v.P.x=((c%W)+.5)/s;v.P.y=(Math.floor(c/W)+.5)/s;
      for(let k=0;k<160;k++){if(k%20===0){v.keys.l=R()<.5?1:0;v.keys.r=R()<.5?1:0;v.keys.u=R()<.5?1:0;v.keys.d=R()<.5?1:0}hid=false;v.tick(1/60);hid=true}
      v.keys.l=v.keys.r=v.keys.u=v.keys.d=0;
      // 네 방향 중 하나라도 움직일 수 있나?
      const x0=v.P.x,y0=v.P.y;let can=false;
      for(const [l,r,u,d] of [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]]){v.P.x=x0;v.P.y=y0;v.keys.l=l;v.keys.r=r;v.keys.u=u;v.keys.d=d;for(let k=0;k<6;k++){hid=false;v.tick(1/60);hid=true}if(Math.hypot(v.P.x-x0,v.P.y-y0)>2){can=true;break}}
      v.keys.l=v.keys.r=v.keys.u=v.keys.d=0;
      if(!can)trapped.push([Math.round(x0),Math.round(y0)]);
      if(t%10===0)await this.sleep(0);
    }
    try{delete document.hidden}catch(e){}
    return {tried:n,trapped};
  },
  async walkAll(){const v=window.__village;v.P.x=VD.start[0];v.P.y=VD.start[1];const out=[];for(const b of B){out.push(await this.walkTo(b.id))}return out},
  async run(bid){
    const T=this;const v=window.__village;const b=BY[bid];const s=VD.shops[bid];
    v.P.x=s.spawn[0];v.P.y=s.spawn[1];v.tick(0.016);if(v.nearId()!==bid)return {bid,error:'near fail: '+v.nearId()};
    v.tryEnter();await T.sleep(300);
    const start=document.querySelector('[data-act="start"]');if(!start)return {bid,error:'no intro'};
    const radioMsgs=document.querySelectorAll('.rlog .rmsg').length;
    start.click();await T.sleep(250);
    for(const st of b.steps){await T.doStep(st);await T.sleep(150)}
    const title=document.querySelector('.q-title .qt')?.textContent;const verdict=document.querySelector('.verdict')?.firstChild?.textContent;
    const patches=document.querySelectorAll('.vestwrap .patch').length,newPatch=!!document.querySelector('.vestwrap .patch.new');
    const back=document.querySelector('[data-act="map"].go');if(back){back.click();await T.sleep(450)}
    return {bid,title,verdict,patches,newPatch,radioMsgs,done:!!Store.d.done[bid]};
  },
  async runAll(){const out=[];for(const b of B){try{out.push(await this.run(b.id))}catch(e){out.push({bid:b.id,error:String(e)});break}}return out}
};
console.log('test harness ready: __t.check(), __t.run(id), __t.runAll()');
