/* ===== 출동 구역(마을) : 캐릭터가 지도를 걸어 다니고, HUD(ID 카드·미니맵·본부 무전·출동 버튼)가 화면 모서리에 떠요 ===== */
const VD=window.VILLAGE_DATA||null;
function preloadVillage(){
  if(preloadVillage.done||!VD)return;preloadVillage.done=true;
  [VD.img,avatarSrc(Store.d.avatar)].forEach(s=>{const i=new Image();i.src=s});
  WalkMask.load();
}
/* 통행 영역 : 마스크 그림(흰색=길) 또는 도형을 캔버스에 그려 비트맵으로 판정 (지도 좌표계, 1/2 해상도) */
const WalkMask={
  s:.5,w:0,h:0,data:null,img:null,_ready:null,
  load(){
    if(this._ready)return this._ready;
    this._ready=new Promise(res=>{
      const src=(window.EMBED&&window.EMBED.mask)||(VD&&VD.mask);
      if(!src){res(null);return}
      const im=new Image();im.onload=()=>{this.img=im;res(im)};im.onerror=()=>res(null);im.src=src;
    });
    return this._ready;
  },
  shape(x,a){
    x.beginPath();
    if(a.poly){a.poly.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.closePath()}
    else if(a.ellipse){const [cx,cy,rx,ry]=a.ellipse;x.ellipse(cx,cy,rx,ry,0,0,Math.PI*2)}
    else if(a.circle){const [cx,cy,r]=a.circle;x.arc(cx,cy,r,0,Math.PI*2)}
    x.fill();
  },
  paint(x){
    x.fillStyle='#000';x.fillRect(0,0,VD.w,VD.h);
    if(this.img){x.drawImage(this.img,0,0,VD.w,VD.h)}
    else{
      x.strokeStyle='#fff';x.lineCap='round';x.lineJoin='round';
      for(const r of (VD.roads||[])){x.lineWidth=r.w;x.beginPath();r.pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.stroke()}
    }
    x.fillStyle='#fff';for(const a of (VD.areas||[]))this.shape(x,a);
    x.fillStyle='#000';for(const b of (VD.blocked||[]))this.shape(x,b);
  },
  build(){
    if(this.data||!VD)return;
    const s=this.s,w=this.w=Math.ceil(VD.w*s),h=this.h=Math.ceil(VD.h*s);
    const cv=document.createElement('canvas');cv.width=w;cv.height=h;
    const x=cv.getContext('2d',{willReadFrequently:true});x.scale(s,s);this.paint(x);
    let id;
    try{id=x.getImageData(0,0,w,h).data}
    catch(e){console.warn('통행 마스크 그림을 읽을 수 없어 도형으로 대신합니다',e);this.img=null;this.fallback=true;x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,w,h);x.scale(s,s);this.paint(x);id=x.getImageData(0,0,w,h).data}
    const d=this.data=new Uint8Array(w*h);
    for(let i=0;i<w*h;i++)d[i]=id[i*4]>127?1:0;
    /* 발판 전체가 들어서는 셀만 모은 격자 : 점선 길 안내가 길 한가운데로 지나가게 하고, 자동 걷기 검사에도 써요 */
    const f=this.fit=new Uint8Array(w*h);
    for(let iy=0;iy<h;iy++)for(let ix=0;ix<w;ix++){if(d[iy*w+ix]&&this.ok((ix+.5)/s,(iy+.5)/s))f[iy*w+ix]=1}
  },
  at(px,py){
    const ix=Math.floor(px*this.s),iy=Math.floor(py*this.s);
    if(ix<0||iy<0||ix>=this.w||iy>=this.h)return false;
    return this.data[iy*this.w+ix]===1;
  },
  ok(px,py){
    const {rx,ry}=VD.foot,k=.7;
    return this.at(px,py)&&this.at(px-rx,py)&&this.at(px+rx,py)&&this.at(px,py-ry)&&this.at(px,py+ry)
      &&this.at(px-rx*k,py-ry*k)&&this.at(px+rx*k,py-ry*k)&&this.at(px-rx*k,py+ry*k)&&this.at(px+rx*k,py+ry*k);
  },
  /* 가장 가까운 길 셀 찾기 (경로 목적지용) */
  nearestCell(cx,cy,R=24,grid){
    const g=grid||this.fit||this.data;
    if(g[cy*this.w+cx])return [cx,cy];
    for(let r=1;r<=R;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(Math.abs(dx)!==r&&Math.abs(dy)!==r)continue;const x=cx+dx,y=cy+dy;if(x<0||y<0||x>=this.w||y>=this.h)continue;if(g[y*this.w+x])return [x,y]}
    return null;
  },
  /* 너비 우선 탐색으로 길 찾기 : 셀 번호 배열을 돌려줘요 */
  path(sx,sy,tx,ty,grid){
    const W=this.w,H=this.h,data=grid||this.fit||this.data,N=W*H;
    const si=sy*W+sx,ti=ty*W+tx;if(!data[si]||!data[ti])return null;
    const par=new Int32Array(N).fill(-1),q=new Int32Array(N);let qh=0,qt=0;par[si]=si;q[qt++]=si;let found=false;
    while(qh<qt){const i=q[qh++];if(i===ti){found=true;break}const x=i%W;
      if(x>0){const j=i-1;if(data[j]&&par[j]<0){par[j]=i;q[qt++]=j}}
      if(x<W-1){const j=i+1;if(data[j]&&par[j]<0){par[j]=i;q[qt++]=j}}
      if(i>=W){const j=i-W;if(data[j]&&par[j]<0){par[j]=i;q[qt++]=j}}
      if(i<N-W){const j=i+W;if(data[j]&&par[j]<0){par[j]=i;q[qt++]=j}}}
    if(!found)return null;
    const out=[];let i=ti;while(i!==si){out.push(i);i=par[i]}out.push(si);out.reverse();return out;
  },
  debugCanvas(){
    const cv=h('canvas',{class:'vdebug',width:this.w,height:this.h}),x=cv.getContext('2d');
    const im=x.createImageData(this.w,this.h),p=im.data;
    for(let i=0;i<this.w*this.h;i++){if(this.data[i]){p[i*4]=30;p[i*4+1]=144;p[i*4+2]=255;p[i*4+3]=255}}
    x.putImageData(im,0,0);x.scale(this.s,this.s);x.strokeStyle='#0f0';x.lineWidth=4;
    for(const id in VD.shops){const s=VD.shops[id];x.beginPath();x.arc(s.door[0],s.door[1],VD.doorR,0,Math.PI*2);x.stroke();x.fillStyle='#f0f';x.fillRect(s.spawn[0]-6,s.spawn[1]-6,12,12)}
    return cv;
  }
};
/* 터치 방향판 : 누르고 있는 동안만 이동 (대각선 가능) */
function makeDpad(set){
  const el=h('div',{class:'dpad',role:'group','aria-label':'이동 버튼'},h('b',{class:'u'},'▲'),h('b',{class:'l'},'◀'),h('span',{class:'c'}),h('b',{class:'r'},'▶'),h('b',{class:'d'},'▼'));
  const Bt={u:el.children[0],l:el.children[1],r:el.children[3],d:el.children[4]};
  let pid=null;
  const apply=(l,r,u,d)=>{set(l,r,u,d);Bt.l.classList.toggle('on',!!l);Bt.r.classList.toggle('on',!!r);Bt.u.classList.toggle('on',!!u);Bt.d.classList.toggle('on',!!d)};
  const calc=e=>{
    const rc=el.getBoundingClientRect(),dx=e.clientX-(rc.left+rc.width/2),dy=e.clientY-(rc.top+rc.height/2);
    if(Math.hypot(dx,dy)<rc.width*.09){apply(0,0,0,0);return}
    const a=Math.atan2(dy,dx),c=Math.cos(a),s=Math.sin(a);
    apply(c<-.38,c>.38,s<-.38,s>.38);
  };
  el.addEventListener('pointerdown',e=>{e.preventDefault();pid=e.pointerId;try{el.setPointerCapture(pid)}catch(_){}calc(e)});
  el.addEventListener('pointermove',e=>{if(pid!==null&&e.pointerId===pid)calc(e)});
  const end=e=>{if(pid!==null&&(e.type==='lostpointercapture'||e.pointerId===pid)){pid=null;apply(0,0,0,0)}};
  ['pointerup','pointercancel','lostpointercapture'].forEach(t=>el.addEventListener(t,end));
  el.addEventListener('contextmenu',e=>e.preventDefault());
  return {el,clear:()=>{pid=null;apply(0,0,0,0)}};
}
const Village={
  SPEED:250,
  reduced:(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches),
  create(){
    const d=Store.d;
    if(!d.village||typeof d.village!=='object')d.village={last:null,pos:null,from:null,tip:false};
    const v=d.village;
    WalkMask.build();
    const W=VD.w,H=VD.h;
    /* --- 지도 세계 --- */
    const world=h('div',{class:'vworld',style:{width:W+'px',height:H+'px'}});
    const bgImg=h('img',{class:'vbg',src:VD.img,alt:'안전 지킴이 마을 지도',draggable:'false'});
    const routeCv=h('canvas',{class:'vroute',width:WalkMask.w,height:WalkMask.h});
    world.append(bgImg,routeCv);
    const shops={};
    let near=null,target=null;
    B.forEach(b=>{
      const s=VD.shops[b.id];if(!s)return;
      const on=isOpen(b.id),dn=!!d.done[b.id],st=starsOf(b.id);
      const door=h('div',{class:'vdoor'+(on?'':' closed'),style:{left:s.door[0]+'px',top:s.door[1]+'px'}});
      const lbl=h('button',{class:'vlabel'+(on?'':' off')+(dn?' done':''),style:{left:s.label[0]+'px',top:s.label[1]+'px'},'aria-label':b.name+' · '+b.area,
        onclick:e=>{e.currentTarget.blur();
          if(near===b.id){tryEnter();return}
          if(!on){Snd.bad();toast('오늘은 쉬는 곳이에요. 지휘 본부에서 열어 주면 출동할 수 있어요');return}
          Snd.pop();setTarget(b.id);toast(`${b.name}까지 점선 길을 표시했어요. 길을 따라가서 입구에서 출동!`);
          door.classList.remove('ping');void door.offsetWidth;door.classList.add('ping');}},
        h('span',{class:'vico'},on?b.icon:'🔒'),
        h('span',{class:'vtx'},h('span',{class:'vnm'},b.name,dn?h('span',{class:'vdone'},'✔ 패치'):null),
          h('small',{class:'vsub'},on?(dn?lightOf(st).t:b.area):'오늘은 쉬는 곳이에요')));
      const prompt=h('div',{class:'vprompt'+(on?'':' closed'),style:{left:s.door[0]+'px',top:(s.door[1]-30)+'px'}},on?'⏎ Enter 또는 「출동!」':'🔒 오늘은 쉬는 곳이에요');
      world.append(door,lbl,prompt);
      shops[b.id]={door,lbl,prompt,b,s,on};
    });
    const fig=h('div',{class:'wfig'});
    const img=h('img',{src:avatarSrc(d.avatar),alt:'',draggable:'false'});
    img.onerror=()=>{fig.innerHTML='<span class="wfb">🧒</span>'};
    fig.append(img);
    const shadow=h('div',{class:'wshadow'});
    const walker=h('div',{class:'walker'},shadow,fig);
    world.append(walker);
    if(DEBUG)world.append(WalkMask.debugCanvas());
    const vp=h('div',{class:'mapbox vp'},world,h('div',{class:'vhint'},'⬅⬆⬇➡ / WASD 이동 · 입구에서 Enter = 출동'));
    /* --- HUD --- */
    const n=doneCount();
    const idCard=h('button',{class:'hud hud-id',title:'내 조끼·임무 기록',onclick:e=>{e.currentTarget.blur();vest()}},
      h('div',{class:'pic'},avatarImg(d.avatar,54)),
      h('div',{},h('b',{},d.nick),h('small',{},rankOf(n)+(d.codename?' · '+d.codename:'')),h('span',{class:'pc'},`패치 ${n}/${B.length}`)));
    const mini=h('canvas',{width:352,height:198});
    const miniBox=h('button',{class:'hud hud-map',title:'구역 지도 · 출동지 고르기',onclick:e=>{e.currentTarget.blur();pickTarget()}},mini);
    const radioTxt=h('span',{class:'rt'});
    const radio=h('button',{class:'hud hud-radio',title:'출동지 고르기',onclick:e=>{e.currentTarget.blur();pickTarget()}},h('span',{class:'led'}),radioTxt);
    const pad={l:0,r:0,u:0,d:0},keys={l:0,r:0,u:0,d:0};
    const dpad=makeDpad((l,r,u,d2)=>{pad.l=l?1:0;pad.r=r?1:0;pad.u=u?1:0;pad.d=d2?1:0;if(l||r||u||d2)dismissTip()});
    const enterBtn=h('button',{class:'btn go enterbtn',disabled:true,onclick:e=>{e.currentTarget.blur();tryEnter()}},'🚨 출동!');
    const ib=(ico,title,f)=>h('button',{class:'ib',title,onclick:e=>{e.currentTarget.blur();f(e)}},ico);
    const icons=h('div',{class:'hudicons'},
      ib('🎒','내 조끼·임무 기록',()=>vest()),
      allDone()?ib('🪪','지킴이 자격증',()=>idcard()):null,
      ib('🏠','본부(처음 화면)',()=>confirmHome()),
      ib('🎵','배경음악 켜기/끄기',e=>{const on=BGM.toggle();d.bgm=on;Store.save();e.currentTarget.style.opacity=on?1:.5}),
      ib('⚙','설정',()=>settings()),
      ib('🖥','전체 화면',()=>toggleFull()),
      teacherBtn());
    icons.querySelector('[title="배경음악 켜기/끄기"]').style.opacity=BGM.on?1:.5;
    const act=h('div',{class:'hud hud-act'},icons,enterBtn);
    vp.append(idCard,miniBox,radio,h('div',{class:'hud hud-pad'},dpad.el),act);
    const el=h('div',{class:'world village'},vp);
    /* --- 상태 --- */
    const P={x:0,y:0,dir:1,walkT:0,moving:false};
    if(DEBUG)window.__village={P,WalkMask,shops,VD,keys,pad,tick:dt=>{step(dt);updateNear();camera(dt);draw();updateRoute(false);drawMini()},tryEnter:()=>tryEnter(),nearId:()=>near,setTarget,targetId:()=>target};
    let sp=VD.start;
    if(v.from==='shop'&&v.last&&VD.shops[v.last])sp=VD.shops[v.last].spawn;
    else if(v.pos&&WalkMask.ok(v.pos.x,v.pos.y))sp=[v.pos.x,v.pos.y];
    else if(v.last&&VD.shops[v.last])sp=VD.shops[v.last].spawn;
    P.x=sp[0];P.y=sp[1];
    if(WalkMask.fallback&&!WalkMask.ok(P.x,P.y))setTimeout(()=>toast('통행 지도 그림을 읽지 못했어요. tools/embed_assets.py 를 실행하거나 서버에서 열어 주세요',5000),300);
    let raf=0,last=0,scale=1,camX=0,camY=0,camInit=false,vw=0,vh=0,alive=true,entering=false,tipEl=null,tipTimer=0;
    const calm=()=>!!(d.calm||Village.reduced);
    function layout(){
      vw=vp.clientWidth;vh=vp.clientHeight;if(!vw||!vh)return;
      scale=Math.max(vw/W,vh/H);
      world.style.setProperty('--inv',(1/scale).toFixed(4));
      camera(0,true);
    }
    function camera(dt,snap){
      const tx=clamp(vw/2-P.x*scale,vw-W*scale,0),ty=clamp(vh/2-P.y*scale,vh-H*scale,0);
      if(snap||!camInit||calm()){camX=tx;camY=ty;camInit=true}
      else{const k=1-Math.exp(-dt*7);camX+=(tx-camX)*k;camY+=(ty-camY)*k}
      world.style.transform=`translate3d(${camX.toFixed(1)}px,${camY.toFixed(1)}px,0) scale(${scale.toFixed(4)})`;
    }
    if(DEBUG){
      vp.addEventListener('pointerdown',e=>{if(e.target.closest('.vlabel,.hud'))return;const r=vp.getBoundingClientRect();const mx=(e.clientX-r.left-camX)/scale,my=(e.clientY-r.top-camY)/scale;console.log('map',Math.round(mx),Math.round(my));toast(`지도 좌표 [${Math.round(mx)}, ${Math.round(my)}]`,1800)});
    }
    /* --- 목표 출동지와 경로 안내 --- */
    const nextTarget=()=>{const b=B.find(b=>isOpen(b.id)&&!d.done[b.id]);return b?b.id:null};
    function setTarget(id){target=id;d.target=id;Store.save();for(const k in shops)shops[k].lbl.classList.toggle('target',k===target);updateRadio();routeDirty=true;try{updateRoute(true)}catch(e){}}
    function updateRadio(){
      const t=target?BY[target]:null;
      radioTxt.textContent=allDone()?'본부: 모든 임무 완료! 자격증을 받으세요 🪪':t?`본부: 다음 출동지 → ${t.icon} ${t.name}`:'본부: 출동할 곳을 골라 주세요';
    }
    function pickTarget(){
      const m=modal(h('div',{},h('h2',{},'📻 본부 무전 · 출동지 고르기'),
        h('div',{style:{display:'grid',gap:'8px'}},...B.map(b=>{const on=isOpen(b.id),dn=!!d.done[b.id];
          return h('button',{class:'btn w',style:{display:'flex',justifyContent:'space-between',alignItems:'center',whiteSpace:'normal',textAlign:'left',opacity:on?1:.55},onclick:()=>{if(!on){toast('오늘은 쉬는 곳이에요');return}m.close();Snd.pop();setTarget(b.id)}},
            h('span',{},(on?b.icon:'🔒')+' '+b.name,h('small',{class:'hint',style:{display:'block'}},b.area)),dn?lightEl(starsOf(b.id)):h('span',{class:'pill'},target===b.id?'안내 중':'미완료'))})),
        h('div',{class:'row',style:{justifyContent:'space-between',marginTop:'12px'}},
          h('button',{class:'btn sm w',onclick:()=>{d.route=!(d.route!==false);Store.save();routeDirty=true;m.close();toast(d.route?'점선 길 안내를 켰어요':'점선 길 안내를 껐어요')}},(d.route!==false?'점선 길 끄기':'점선 길 켜기')),
          h('button',{class:'btn n sm',onclick:()=>m.close()},'닫기'))));
    }
    let routeDirty=true,routePos=null,routeT=0;
    function drawRoute(cells){
      const x=routeCv.getContext('2d');x.clearRect(0,0,routeCv.width,routeCv.height);
      if(!cells||cells.length<2)return;
      const W2=WalkMask.w,pts=[];for(let i=0;i<cells.length;i+=4)pts.push(cells[i]);if(pts[pts.length-1]!==cells[cells.length-1])pts.push(cells[cells.length-1]);
      x.lineCap='round';x.lineJoin='round';
      const trace=()=>{x.beginPath();pts.forEach((c,i)=>{const px=c%W2+.5,py=(c-c%W2)/W2+.5;i?x.lineTo(px,py):x.moveTo(px,py)});};
      trace();x.setLineDash([]);x.strokeStyle='rgba(27,27,27,.7)';x.lineWidth=6;x.stroke();
      trace();x.setLineDash([7,6]);x.strokeStyle='#C8F560';x.lineWidth=3.2;x.stroke();
      const e=pts[pts.length-1],ex=e%W2+.5,ey=(e-e%W2)/W2+.5;x.setLineDash([]);x.beginPath();x.arc(ex,ey,7,0,Math.PI*2);x.fillStyle='#FFC800';x.fill();x.lineWidth=2.5;x.strokeStyle='#1B1B1B';x.stroke();
    }
    function updateRoute(force){
      if(!target||d.route===false||!isOpen(target)||d.done[target]){drawRoute(null);return}
      if(!force&&routePos&&Math.hypot(P.x-routePos[0],P.y-routePos[1])<28)return;
      routePos=[P.x,P.y];
      const s=WalkMask.s,W2=WalkMask.w,H2=WalkMask.h;
      const sc=WalkMask.nearestCell(clamp(Math.floor(P.x*s),0,W2-1),clamp(Math.floor(P.y*s),0,H2-1),6);
      const dd=shops[target].s.door,tc=WalkMask.nearestCell(clamp(Math.floor(dd[0]*s),0,W2-1),clamp(Math.floor(dd[1]*s),0,H2-1),30);
      if(!sc||!tc){drawRoute(null);return}
      drawRoute(WalkMask.path(sc[0],sc[1],tc[0],tc[1]));
    }
    /* --- 미니맵 --- */
    let miniT=0;
    function drawMini(){
      const x=mini.getContext('2d'),mw=mini.width,mh=mini.height;
      x.clearRect(0,0,mw,mh);
      if(bgImg.complete&&bgImg.naturalWidth){try{x.drawImage(bgImg,0,0,mw,mh)}catch(e){x.fillStyle='#79B266';x.fillRect(0,0,mw,mh)}}else{x.fillStyle='#79B266';x.fillRect(0,0,mw,mh)}
      x.fillStyle='rgba(20,33,61,.25)';x.fillRect(0,0,mw,mh);
      const kx=mw/W,ky=mh/H;
      for(const id in shops){const s=shops[id].s,b=shops[id].b;const cx=s.door[0]*kx,cy=s.door[1]*ky;
        x.beginPath();x.arc(cx,cy,id===target?11:8,0,Math.PI*2);x.fillStyle=!isOpen(id)?'#9CA3AF':d.done[id]?'#C8F560':'#FFC800';x.fill();x.lineWidth=3;x.strokeStyle=id===target?'#fff':'#1B1B1B';x.stroke();
        x.font='11px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#1B1B1B';x.fillText(d.done[id]?'✓':'',cx,cy+1);}
      x.beginPath();x.arc(P.x*kx,P.y*ky,7,0,Math.PI*2);x.fillStyle='#fff';x.fill();x.lineWidth=3;x.strokeStyle='#E63946';x.stroke();
    }
    /* --- 입력·이동 --- */
    function inputBlocked(){
      const a=document.activeElement;
      if(a&&(a.tagName==='INPUT'||a.tagName==='TEXTAREA'||a.isContentEditable))return true;
      if(document.querySelector('.modal-bg'))return true;
      return document.hidden;
    }
    function clearKeys(){keys.l=keys.r=keys.u=keys.d=0;dpad.clear()}
    function moveAxis(dx,dy){
      for(const f of [1,.5,.25]){const nx=P.x+dx*f,ny=P.y+dy*f;if(WalkMask.ok(nx,ny)){P.x=nx;P.y=ny;return}}
      /* 길 모서리나 좁은 통로 입구에 걸리면 수직 방향으로 비켜 서서 미끄러져 들어가요 (가까운 쪽부터, 최대 48px) */
      for(const n of [6,12,18,24,32,40,48]){
        if(dx){for(const sg of [-1,1]){const nx=P.x+dx*.5,ny=P.y+sg*n;if(WalkMask.ok(nx,ny)){P.x=nx;P.y=P.y+sg*Math.min(n,Math.abs(dx));return}}}
        else{for(const sg of [-1,1]){const nx=P.x+sg*n,ny=P.y+dy*.5;if(WalkMask.ok(nx,ny)){P.x=P.x+sg*Math.min(n,Math.abs(dy));P.y=ny;return}}}
      }
      /* 마지막 수단: 가려는 방향 쪽 반원(반지름 40px) 안에서 가장 가까운 '설 수 있는 자리'를 찾아 그쪽으로 한 걸음 (모서리에 끼었을 때 빠져나오기) */
      const st=Math.hypot(dx,dy),ux=dx/st,uy=dy/st;let best=null,bd=1e9;
      for(let r=6;r<=40;r+=6)for(let a=0;a<16;a++){const th=a*Math.PI/8,ox=Math.cos(th)*r,oy=Math.sin(th)*r;const fwd=ox*ux+oy*uy;if(fwd<=0)continue;
        if(!WalkMask.ok(P.x+ox,P.y+oy))continue;const sc=r-fwd*.5;if(sc<bd){bd=sc;best=[ox,oy]}}
      if(best){const L=Math.hypot(best[0],best[1]),m=Math.min(L,st*1.5);P.x+=best[0]/L*m;P.y+=best[1]/L*m}
    }
    function step(dt){
      if(inputBlocked()){clearKeys();P.moving=false;P.walkT=0;return}
      let vx=((keys.r||pad.r)?1:0)-((keys.l||pad.l)?1:0),vy=((keys.d||pad.d)?1:0)-((keys.u||pad.u)?1:0);
      P.moving=!!(vx||vy);
      if(!P.moving){P.walkT=0;return}
      const len=Math.hypot(vx,vy);vx/=len;vy/=len;
      const st=Village.SPEED*dt;
      if(vx)moveAxis(vx*st,0);
      if(vy)moveAxis(0,vy*st);
      if(vx)P.dir=vx<0?-1:1;
      P.walkT+=dt*11;
    }
    function draw(){
      walker.style.transform=`translate3d(${P.x.toFixed(1)}px,${P.y.toFixed(1)}px,0)`;
      let bob=0,rot=0;
      if(P.moving&&!calm()){bob=-Math.abs(Math.sin(P.walkT))*5;rot=Math.sin(P.walkT)*4}
      fig.style.transform=`translate(-50%,${bob.toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scaleX(${P.dir})`;
      shadow.style.transform=`translate(-50%,-50%) scale(${(1+bob/50).toFixed(3)})`;
    }
    function updateNear(){
      let best=null,bd=1e9;
      for(const id in shops){const s=shops[id].s,dd=Math.hypot(P.x-s.door[0],P.y-s.door[1]);if(dd<VD.doorR&&dd<bd){bd=dd;best=id}}
      if(best===near)return;
      if(near&&shops[near]){shops[near].door.classList.remove('near');shops[near].prompt.classList.remove('on')}
      near=best;
      if(near){
        const e=shops[near];e.door.classList.add('near');e.prompt.classList.add('on');
        enterBtn.disabled=false;enterBtn.textContent=e.on?`🚨 ${e.b.name} 출동!`:'🔒 오늘은 쉬는 곳이에요';enterBtn.classList.toggle('closed',!e.on);
        if(e.on)Snd.pop();
      }else{enterBtn.disabled=true;enterBtn.textContent='🚨 출동!';enterBtn.classList.remove('closed')}
    }
    function tryEnter(){
      if(!near||!alive)return;
      const e=shops[near];
      if(!e.on){Snd.bad();toast('오늘은 쉬는 곳이에요. 지휘 본부에서 열어 주면 출동할 수 있어요');e.lbl.classList.remove('shake');void e.lbl.offsetWidth;e.lbl.classList.add('shake');return}
      entering=true;v.last=near;v.from='shop';v.pos={x:Math.round(P.x),y:Math.round(P.y)};Store.save();
      Snd.pop();runBuilding(e.b);
    }
    function loop(t){
      if(!alive)return;
      raf=requestAnimationFrame(loop);
      const dt=Math.min(.05,last?(t-last)/1000:0);last=t;
      if(document.hidden)return;
      step(dt);updateNear();camera(dt);draw();
      routeT+=dt;if(routeDirty||(P.moving&&routeT>.3)){updateRoute(routeDirty);routeDirty=false;routeT=0}
      miniT+=dt;if(miniT>.25){drawMini();miniT=0}
    }
    const KEYMAP={ArrowLeft:'l',KeyA:'l',ArrowRight:'r',KeyD:'r',ArrowUp:'u',KeyW:'u',ArrowDown:'d',KeyS:'d'};
    function onKey(e){
      const a=document.activeElement;
      if(a&&(a.tagName==='INPUT'||a.tagName==='TEXTAREA'||a.tagName==='SELECT'||a.isContentEditable))return;
      if(document.querySelector('.modal-bg'))return;
      const k=KEYMAP[e.code];
      if(k){e.preventDefault();keys[k]=e.type==='keydown'?1:0;if(e.type==='keydown')dismissTip();return}
      if(e.code==='Enter'||e.code==='NumpadEnter'||e.code==='Space'){
        if(a&&a.tagName==='BUTTON')a.blur();
        e.preventDefault();
        if(e.type==='keydown'&&!e.repeat)tryEnter();
      }
    }
    const onBlur=()=>clearKeys();
    const onVis=()=>{if(document.hidden)clearKeys();else last=0};
    function showTip(){
      tipEl=h('div',{class:'vtip'},h('div',{class:'vtipin pop'},h('b',{},'📻 본부에서 알립니다'),
        h('div',{},`${d.nick} 대원, 출동 구역에 도착했어요!`),
        h('div',{class:'keys2'},h('kbd',{},'⬅'),h('kbd',{},'⬆'),h('kbd',{},'⬇'),h('kbd',{},'➡'),h('span',{},' 또는 '),h('kbd',{},'W'),h('kbd',{},'A'),h('kbd',{},'S'),h('kbd',{},'D')),
        h('div',{},'크림색 길을 따라 점선 안내를 따라가서, 입구에서 ',h('kbd',{},'Enter'),' 또는 「출동!」'),
        h('small',{class:'hint'},'태블릿은 왼쪽 아래 방향 버튼을 꾹 누르고, 오른쪽 아래 「출동!」을 눌러요'),
        h('button',{class:'btn sm l',onclick:dismissTip},'알겠어요!')));
      vp.append(tipEl);tipTimer=setTimeout(dismissTip,10000);
    }
    function dismissTip(){if(!tipEl)return;tipEl.remove();tipEl=null;clearTimeout(tipTimer);if(!v.tip){v.tip=true;Store.save()}}
    const ro=('ResizeObserver' in window)?new ResizeObserver(()=>layout()):null;
    return {
      el,
      start(){
        if(ro)ro.observe(vp);else window.addEventListener('resize',layout);
        window.addEventListener('keydown',onKey);window.addEventListener('keyup',onKey);
        window.addEventListener('blur',onBlur);document.addEventListener('visibilitychange',onVis);
        layout();draw();updateNear();
        setTarget(d.target&&shops[d.target]&&isOpen(d.target)&&!d.done[d.target]?d.target:nextTarget());
        bgImg.addEventListener('load',()=>drawMini());drawMini();
        if(!v.tip)showTip();
        raf=requestAnimationFrame(loop);
      },
      cleanup(){
        alive=false;cancelAnimationFrame(raf);
        if(ro)ro.disconnect();else window.removeEventListener('resize',layout);
        window.removeEventListener('keydown',onKey);window.removeEventListener('keyup',onKey);
        window.removeEventListener('blur',onBlur);document.removeEventListener('visibilitychange',onVis);
        clearTimeout(tipTimer);
        if(!entering){v.from='pos';v.pos={x:Math.round(P.x),y:Math.round(P.y)};Store.save()}
      }
    };
  }
};
