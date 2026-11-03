/* ===== 안전 지킴이 마을 : core (공통 도구·저장·본부 시작 화면·등록증·지휘 본부) ===== */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
function h(tag,attrs,...kids){
  const e=document.createElement(tag);
  for(const k in (attrs||{})){
    const v=attrs[k];
    if(k==='class')e.className=v;
    else if(k==='html')e.innerHTML=v;
    else if(k.startsWith('on'))e.addEventListener(k.slice(2),v);
    else if(k==='style'&&typeof v==='object'){for(const s in v){s.startsWith('--')?e.style.setProperty(s,v[s]):e.style[s]=v[s]}}
    else if(v!==false&&v!=null)e.setAttribute(k,v);
  }
  for(const c of kids.flat()){ if(c==null||c===false)continue; e.append(c.nodeType?c:document.createTextNode(c)); }
  return e;
}
const rnd=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
function shuffle(a){const b=a.slice();for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}
const strHash=s=>{let x=0;for(const c of String(s))x=(x*31+c.charCodeAt(0))>>>0;return x};
const S=window.SAFETY, B=S.buildings, BY=Object.fromEntries(B.map(b=>[b.id,b]));
const DEBUG=/debug/.test(location.search);
const EMBED=window.EMBED||{};

/* ---------- 세계관 : 계급·신호등·코드네임·조끼 ---------- */
const RANKS=[[0,'수습 지킴이'],[3,'정식 지킴이'],[6,'선임 지킴이'],[7,'베테랑 지킴이']];
const rankOf=n=>{let r=RANKS[0][1];for(const [k,v] of RANKS)if(n>=k)r=v;return r};
const LIGHT={3:{k:'g',t:'완벽해요!',sub:'틀린 게 거의 없어요'},2:{k:'a',t:'좋아요!',sub:'조금만 더 연습해요'},1:{k:'r',t:'다시 연습해요',sub:'한 번 더 하면 잘할 거예요'}};
const lightOf=st=>LIGHT[clamp(st,1,3)];
const CODE_A=['번개','씩씩','반짝','용감','슬기','든든','민첩','당당','초록','노랑','빨강','파랑','보라','주황','하늘','바람','햇살','튼튼'];
const CODE_B=['호루라기','헬멧','방패','소화기','구급상자','신호봉','손전등','안전모','사이렌','구조대원','소방차','신호등','나침반','무전기'];
const codename=()=>pick(CODE_A)+' '+pick(CODE_B);
const VEST_SLOTS=[[36.9,36.6],[63,36.6],[24.1,57.6],[49.9,57.6],[75.8,57.6],[22.3,82.5],[77.7,82.5]];   // 조끼 그림(assets/img/vest.webp) 위 패치 자리 (%): 가슴 2 · 반사띠 사이 3 · 주머니 2

/* ---------- 저장 (이 기기의 브라우저에만) ---------- */
const KEY='safety_village_v1';
const Store={
  d:null,
  def(){return{nick:'',codename:'',avatar:'hero1',done:{},best:{},miss:{},promises:{},plan:null,closed:{},log:[],cert:null,target:null,route:true,
    pin:'0000',bgm:true,bgmTrack:'march',bgmVol:.7,sfx:true,calm:false,village:{last:null,pos:null,from:null,tip:false},ver:2}},
  load(){
    try{this.d=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){this.d=null}
    this.d=Object.assign(this.def(),this.d||{});
    for(const k of ['done','best','miss','promises','closed'])if(!this.d[k]||typeof this.d[k]!=='object')this.d[k]={};
    if(!Array.isArray(this.d.log))this.d.log=[];
    if(this.d.nick&&!this.d.codename)this.d.codename=codename();
  },
  save(){try{localStorage.setItem(KEY,JSON.stringify(this.d))}catch(e){}},
  reset(){this.d=this.def();this.save()},
};
const isOpen=id=>!Store.d.closed[id];
const starsOf=id=>Store.d.done[id]?clamp(+Store.d.best[id]||1,1,3):0;
const doneCount=()=>B.filter(b=>Store.d.done[b.id]).length;
const allDone=()=>doneCount()===B.length;
const starsFor=miss=>miss<=2?3:miss<=5?2:1;
function finishBuilding(id,miss){
  const d=Store.d,st=starsFor(miss);
  d.done[id]=true;d.best[id]=Math.max(+d.best[id]||0,st);d.miss[id]=miss;d.promises[id]=BY[id].promise;
  d.log.push({id,date:today(),stars:st,miss});if(d.log.length>200)d.log=d.log.slice(-200);
  if(allDone()&&!d.cert)d.cert=today();
  if(d.target===id)d.target=null;
  Store.save();return st;
}
function lightEl(st){return h('span',{class:'light',title:st?lightOf(st).t:'아직'},h('i',{class:'r'+(st===1?' on':'')}),h('i',{class:'a'+(st===2?' on':'')}),h('i',{class:'g'+(st===3?' on':'')}))}

/* ---------- 알림·모달 ---------- */
function toast(msg,ms=2200){
  $$('.toast').forEach(t=>t.remove());
  const t=h('div',{class:'toast'},msg);document.body.append(t);setTimeout(()=>t.remove(),ms);
}
function modal(content,{noclose=false}={}){
  const bg=h('div',{class:'modal-bg'});
  const m=h('div',{class:'modal pop'});
  m.append(content);bg.append(m);
  const close=()=>bg.remove();
  if(!noclose)bg.addEventListener('pointerdown',e=>{if(e.target===bg)close()});
  document.body.append(bg);
  return {close,el:m};
}

/* ---------- 효과음 ---------- */
const Snd={
  ctx:null,mute:false,
  get(){ if(!this.ctx){try{this.ctx=new (window.AudioContext||window.webkitAudioContext)()}catch(e){}} if(this.ctx&&this.ctx.state==='suspended')this.ctx.resume(); return this.ctx; },
  tone(f,t0,dur,type='sine',vol=.18,f2=null){
    if(this.mute)return;const c=this.get();if(!c)return;const o=c.createOscillator(),g=c.createGain();
    o.type=type;o.frequency.setValueAtTime(f,t0);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t0+dur);
    g.gain.setValueAtTime(0.0001,t0);g.gain.exponentialRampToValueAtTime(vol,t0+.015);g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    o.connect(g).connect(c.destination);o.start(t0);o.stop(t0+dur+.05);
  },
  noise(t0,dur,{vol=.15,f0=2000,f1=null,q=1,type='bandpass'}={}){
    if(this.mute)return;const c=this.get();if(!c)return;
    const n=Math.floor(c.sampleRate*dur),b=c.createBuffer(1,n,c.sampleRate),d=b.getChannelData(0);
    for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);
    const s=c.createBufferSource();s.buffer=b;
    const f=c.createBiquadFilter();f.type=type;f.frequency.setValueAtTime(f0,t0);if(f1)f.frequency.exponentialRampToValueAtTime(f1,t0+dur);f.Q.value=q;
    const g=c.createGain();g.gain.setValueAtTime(vol,t0);g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    s.connect(f).connect(g).connect(c.destination);s.start(t0);
  },
  ping(){const c=this.get();if(!c)return;const t=c.currentTime;this.tone(660,t,.15,'triangle',.15);this.tone(990,t+.09,.2,'triangle',.15)},
  ok(){const c=this.get();if(!c)return;const t=c.currentTime;[523,659,784,1047].forEach((f,i)=>this.tone(f,t+i*.09,.22,'triangle',.16))},
  bad(){const c=this.get();if(!c)return;const t=c.currentTime;this.tone(220,t,.25,'sawtooth',.08,140)},
  pop(){const c=this.get();if(!c)return;const t=c.currentTime;this.tone(400,t,.08,'sine',.15,800)},
  chime(){const c=this.get();if(!c)return;const t=c.currentTime;[784,988,1175,988,784].forEach((f,i)=>this.tone(f,t+i*.18,.4,'sine',.14))},
  whistle(){const c=this.get();if(!c)return;const t=c.currentTime;this.tone(2100,t,.13,'square',.07,2500);this.noise(t,.14,{vol:.05,f0:2300,q:3});this.tone(2300,t+.17,.3,'square',.07,1900);this.noise(t+.17,.3,{vol:.05,f0:2200,q:3})},
};

/* ---------- 색종이 ---------- */
function confetti(n=90){
  const cv=h('canvas',{style:{position:'fixed',inset:0,width:'100%',height:'100%',zIndex:70,pointerEvents:'none'}});
  document.body.append(cv);cv.width=innerWidth;cv.height=innerHeight;
  const x=cv.getContext('2d'),C=['#FFC800','#C8F560','#3A86FF','#E63946','#fff','#2DC653'];
  const ps=Array.from({length:n},()=>({x:rnd(0,cv.width),y:rnd(-cv.height*.3,0),vx:rnd(-1.2,1.2),vy:rnd(2,5),r:rnd(6,14),a:rnd(0,6),va:rnd(-.2,.2),c:pick(C)}));
  let f=0;(function loop(){x.clearRect(0,0,cv.width,cv.height);ps.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.a+=p.va;x.save();x.translate(p.x,p.y);x.rotate(p.a);x.fillStyle=p.c;x.fillRect(-p.r/2,-p.r/4,p.r,p.r/2);x.restore()});
    if(++f<170)requestAnimationFrame(loop);else cv.remove()})();
}

/* ---------- 화면 교체 ---------- */
let _cleanup=null;
function mount(node,cleanup){
  if(_cleanup){try{_cleanup()}catch(e){}}
  _cleanup=cleanup||null;
  const st=$('#stage');st.innerHTML='';node.classList.add('screen');st.append(node);
}
const avatarSrc=k=>'assets/characters/'+(k||'hero1')+'.png';
const charOf=k=>S.characters.find(c=>c.id===k)||S.characters[0];
function avatarImg(k,size){
  const im=h('img',{class:'avimg',src:avatarSrc(k),alt:'',draggable:'false',style:{height:size+'px'}});
  im.onerror=()=>{im.replaceWith(h('span',{class:'avfb',style:{fontSize:Math.round(size*.8)+'px',lineHeight:size+'px'}},'🧒'))};
  return im;
}
function applyCalm(){document.body.classList.toggle('calm',!!Store.d.calm)}
function toggleFull(){
  try{
    if(document.fullscreenElement){document.exitFullscreen()}
    else{const p=document.documentElement.requestFullscreen();if(p&&p.catch)p.catch(()=>toast('이 화면에서는 전체 화면을 쓸 수 없어요'))}
  }catch(e){toast('이 화면에서는 전체 화면을 쓸 수 없어요')}
}

/* ---------- 지휘 본부(선생님) : 3초 길게 누르기 ---------- */
function teacherBtn(){
  let tm=null;
  const b=h('button',{class:'round',title:'지휘 본부 (3초 길게 누르기)'},h('span',{class:'ring'}),h('span',{class:'ico'},'🔒'),h('small',{},'지휘 본부'));
  const stop=()=>{clearTimeout(tm);tm=null;b.classList.remove('hold')};
  b.addEventListener('pointerdown',e=>{e.preventDefault();b.classList.add('hold');tm=setTimeout(()=>{stop();Snd.ok();teacherGate()},3000)});
  ['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,stop));
  b.addEventListener('click',()=>toast('지휘 본부는 3초 동안 길게 눌러 주세요'));
  b.addEventListener('contextmenu',e=>e.preventDefault());
  return b;
}
function teacherGate(){
  if(Store.d.pin==='0000'){teacherPanel();return}
  const pin=h('input',{type:'password',inputmode:'numeric',maxlength:'8',placeholder:'교사 암호',style:{width:'100%'}});
  const m=modal(h('div',{style:{display:'grid',gap:'10px'}},h('h2',{},'🔒 지휘 본부'),pin,
    h('div',{class:'row',style:{justifyContent:'flex-end'}},h('button',{class:'btn w sm',onclick:()=>m.close()},'닫기'),
      h('button',{class:'btn n sm',onclick:()=>{if(pin.value===Store.d.pin){m.close();teacherPanel()}else{Snd.bad();toast('암호가 달라요')}}},'열기'))));
  pin.focus();pin.addEventListener('keydown',e=>{if(e.key==='Enter')m.el.querySelector('.btn.n').click()});
}
function teacherPanel(){
  const d=Store.d;
  const body=h('div',{style:{display:'grid',gridTemplateColumns:'minmax(0,1fr)',gap:'12px',maxHeight:'82vh',overflow:'auto',minWidth:'min(720px,90vw)'}});
  const m=modal(body);
  const draw=()=>{
    body.innerHTML='';
    body.append(h('h2',{},'🛰️ 지휘 본부 상황판'));
    body.append(h('div',{class:'card'},h('b',{class:'dh'},'① 오늘 열 출동 장소 (차시에 맞게 골라요)'),
      h('div',{class:'row',style:{marginTop:'8px'}},...B.map(b=>h('button',{class:'btn sm'+(isOpen(b.id)?' l':' w'),onclick:()=>{if(isOpen(b.id))d.closed[b.id]=true;else delete d.closed[b.id];Store.save();draw()}},(isOpen(b.id)?'🔓 ':'🔒 ')+b.icon+' '+b.name)),
        h('button',{class:'btn sm n',onclick:()=>{d.closed={};Store.save();draw()}},'모두 열기')),
      h('p',{class:'hint',style:{margin:'6px 0 0'}},'닫힌 장소는 지도에서 「오늘은 쉬는 곳」으로 보이고 출동할 수 없어요.')));
    const rows=B.map(b=>{const last=[...d.log].reverse().find(l=>l.id===b.id);const st=starsOf(b.id);
      return h('tr',{},h('td',{},b.icon+' '+b.name),h('td',{},b.area),h('td',{},d.done[b.id]?'패치 획득':'—'),h('td',{},lightEl(st)),h('td',{},last?last.miss+'번':'—'),h('td',{},last?last.date:'—'))});
    body.append(h('div',{class:'card'},h('b',{class:'dh'},'② 이 기기의 대원 기록'+(d.nick?` · ${d.nick}${d.codename?' ('+d.codename+')':''} · ${rankOf(doneCount())}`:'')),
      h('div',{style:{overflowX:'auto',marginTop:'6px'}},h('table',{class:'rtable'},h('thead',{},h('tr',{},h('th',{},'출동 장소'),h('th',{},'영역'),h('th',{},'상태'),h('th',{},'신호등'),h('th',{},'틀린 횟수'),h('th',{},'날짜'))),h('tbody',{},...rows))),
      d.plan?h('p',{style:{margin:'8px 0 0'}},h('b',{},'📱 스마트폰 약속 카드: '),d.plan.text):null,
      h('small',{class:'hint'},`패치 ${doneCount()}/${B.length}개 · 신호등: 초록 = 틀린 횟수 0~2, 노랑 = 3~5, 빨강 = 6번 이상 · 순위는 표시하지 않고, 기록은 이 기기의 브라우저에만 저장돼요.`)));
    body.append(h('div',{class:'card'},h('b',{class:'dh'},'③ 영역별 지도 팁'),
      ...B.map(b=>{const g=S.guide[b.id];return h('details',{class:'gd'},h('summary',{},b.icon+' '+b.name+' · '+b.area),
        h('p',{},h('b',{},'배움 목표 '),g.goal),h('p',{style:{margin:'4px 0'}},h('b',{},'나눌 질문')),
        h('ul',{},...g.ask.map(a=>h('li',{},a))),h('p',{},h('b',{},'지도 팁 '),g.note))})));
    body.append(h('div',{class:'card'},h('b',{class:'dh'},'④ 40분 수업 흐름 예시'),
      h('ol',{style:{margin:'6px 0 0',paddingLeft:'20px',lineHeight:1.65,fontSize:'18px'}},
        h('li',{},'도입 5분 · 오늘 영역과 관련된 경험 이야기 나누기 (앱 없음)'),h('li',{},'앱 15~20분 · 출동 장소 1~2곳 (①에서 오늘 장소만 열기)'),
        h('li',{},'앱 밖 활동 8~10분 · 교실에서 몸으로 연습 (건너기 동작·대피 자세·"싫어요" 말하기 등)'),h('li',{},'나눔 5분 · 오늘의 안전 약속 한 줄 발표'))));
    body.append(h('div',{class:'card'},h('b',{class:'dh'},'⑤ 화면·설정'),
      h('div',{class:'row',style:{marginTop:'8px'}},
        h('button',{class:'btn sm w',onclick:()=>{m.close();toggleFull()}},'🖥 전체 화면'),
        h('button',{class:'btn sm w',onclick:()=>{m.close();goStart()}},'🏠 본부 화면'),
        h('button',{class:'btn sm w',onclick:()=>{const p=window.prompt?prompt('새 교사 암호 (숫자 4~8자리, 0000이면 암호 없음)'):null;if(p&&/^\d{4,8}$/.test(p)){d.pin=p;Store.save();toast('암호를 바꿨어요')}else if(p)toast('숫자 4~8자리로 해 주세요')}},'암호 바꾸기'),
        h('button',{class:'btn sm w',onclick:()=>{d.nick='';d.codename='';Store.save();m.close();goStart()}},'다른 대원으로 시작'))));
    body.append(h('div',{class:'card'},h('b',{class:'dh'},'⑥ 초기화'),
      h('div',{class:'row',style:{marginTop:'8px'}},h('button',{class:'btn sm',style:{background:'var(--red)',color:'#fff'},onclick:()=>{m.el.querySelector('.rz').hidden=false}},'진행 상황 모두 지우기'),
        h('span',{class:'rz',hidden:true,style:{display:'inline-flex',gap:'6px',alignItems:'center'}},'정말 지울까요?',
          h('button',{class:'btn sm',style:{background:'var(--red)',color:'#fff'},onclick:()=>{const k={pin:d.pin,closed:d.closed,bgm:d.bgm,calm:d.calm,sfx:d.sfx};Store.reset();Object.assign(Store.d,k);Store.save();m.close();goStart()}},'네, 지울게요'),
          h('button',{class:'btn sm w',onclick:()=>draw()},'아니요')))));
    body.append(h('div',{class:'row',style:{justifyContent:'flex-end'}},h('button',{class:'btn n sm',onclick:()=>{m.close();if(d.nick&&!$('.quest'))goWorld()}},'닫기')));
  };
  draw();
}

/* ---------- 설정·임무 안내·홈 ---------- */
function tg(label,sub,get,set){
  const b=h('button',{class:'tg'+(get()?' on':''),role:'switch','aria-checked':!!get(),onclick:()=>{set(!get());b.classList.toggle('on',!!get());b.setAttribute('aria-checked',!!get())}},h('i'));
  return h('div',{class:'trow'},h('div',{},h('b',{},label),h('div',{class:'hint'},sub)),b);
}
function settings(){
  const vol=h('input',{type:'range',min:0,max:100,value:Math.round(BGM.vol*100),'aria-label':'배경음악 크기'});
  vol.oninput=()=>{BGM.setVol(vol.value/100);Store.d.bgmVol=vol.value/100;Store.save()};
  const chips=h('div',{class:'row'},...Object.entries(BGM.TRACKS).map(([k,v])=>h('button',{class:'chip'+(BGM.track===k?' on':''),onclick:e=>{BGM.setTrack(k);Store.d.bgmTrack=k;Store.save();if(!BGM.on){BGM.start();Store.d.bgm=true;Store.save()}chips.querySelectorAll('.chip').forEach(c=>c.classList.remove('on'));e.currentTarget.classList.add('on')}},'🎵 '+v.name)));
  const m=modal(h('div',{style:{display:'grid',gap:'6px',minWidth:'min(420px,80vw)'}},h('h2',{},'⚙ 설정'),
    tg('배경음악','켜고 끌 수 있어요',()=>BGM.on,v=>{v?BGM.start():BGM.stop();Store.d.bgm=v;Store.save()}),
    h('div',{class:'trow',style:{display:'grid'}},h('b',{},'음악 크기'),vol),
    h('div',{class:'trow',style:{display:'grid'}},h('b',{},'음악 고르기'),chips),
    tg('효과음','호루라기·삑 소리',()=>!Snd.mute,v=>{Snd.mute=!v;Store.d.sfx=v;Store.save()}),
    tg('경로 안내','지도에 다음 출동지까지 점선 길을 보여 줘요',()=>Store.d.route!==false,v=>{Store.d.route=v;Store.save()}),
    tg('움직임 줄이기','흔들림과 반짝임을 줄여요',()=>Store.d.calm,v=>{Store.d.calm=v;Store.save();applyCalm()}),
    h('div',{class:'row',style:{justifyContent:'center',marginTop:'8px'}},h('button',{class:'btn n',onclick:()=>m.close()},'닫기'))));
}
function howto(){
  const c=(n,t,d)=>h('div',{class:'hcard'},h('b',{},n+'. '+t),h('p',{},d));
  const m=modal(h('div',{},h('h2',{},'📻 임무 안내'),
    h('div',{class:'hgrid'},
      c(1,'등록증 만들기','증명사진(캐릭터)과 별명을 고르면 코드네임이 생겨요. 진짜 이름은 쓰지 않아도 돼요!'),
      c(2,'구역 순찰하기','방향키(⬅⬆⬇➡·WASD)나 화면의 방향 버튼으로 크림색 길을 따라 걸어요. 다음 출동지까지 점선 길이 안내해요. 입구에서 Enter 또는 「출동!」'),
      c(3,'임무와 패치','출동 장소마다 임무가 있어요(숨은 위험 찾기·순서 맞추기·상황 선택·O X·짝 맞추기 등). 마치면 신호등 판정을 받고 조끼에 패치가 붙어요.'),
      c(4,'자격증 받기','일곱 곳의 패치를 모두 모으면 「안전 지킴이 자격증」(ID 카드)을 받아 저장할 수 있어요.')),
    h('div',{class:'row',style:{justifyContent:'center',marginTop:'10px'}},h('button',{class:'btn n',onclick:()=>m.close()},'확인'))));
}
/* 본부(처음 화면)로: 임무 중이면 한 번 물어봐요 */
function confirmHome(){
  if(!$('.quest')){Snd.pop();goStart();return}
  const m=modal(h('div',{},h('h2',{},'본부로 돌아갈까요?'),
    h('p',{style:{fontSize:'20px',margin:'0 0 12px'}},'지금 하던 임무는 저장되지 않아요. 이미 받은 패치는 그대로 남아요.'),
    h('div',{class:'row',style:{justifyContent:'flex-end'}},
      h('button',{class:'btn w',onclick:()=>m.close()},'임무 계속'),
      h('button',{class:'btn n',onclick:()=>{m.close();Snd.pop();goStart()}},'🏠 본부로'))));
}

/* ---------- 본부 시작 화면 ---------- */
function goStart(){
  BGM.duck(false);const d=Store.d;
  preloadVillage();
  const btn=(t,f,cls='')=>h('button',{class:'btn '+cls,onclick:f},t);
  const bg=h('img',{class:'herobg',src:'assets/img/village-entrance.jpg',alt:'',draggable:'false'});
  bg.onerror=()=>bg.remove();
  const sound=h('button',{class:'btn sm n',title:'배경음악 켜기/끄기',style:{opacity:BGM.on?1:.55},onclick:e=>{const on=BGM.toggle();d.bgm=on;Store.save();e.currentTarget.style.opacity=on?1:.55}},'🎵');
  mount(h('div',{class:'start hq'},bg,h('div',{class:'hqart','aria-hidden':'true'}),
    h('div',{class:'hqin'},
      h('div',{class:'hqtop'},h('span',{class:'tag'},'🛰️ 지킴이 본부'),h('div',{class:'sp'}),sound,h('button',{class:'btn sm n',title:'설정',onclick:settings},'⚙'),teacherBtn()),
      h('div',{class:'logo-sign pop'},h('div',{class:'ls-top'},'SAFETY GUARD VILLAGE'),h('h1',{},S.title),
        h('div',{class:'ls-sub'},d.nick?`${d.nick} 대원, 다시 출동 준비!`:'신입 대원, 출동 준비!')),
      h('div',{class:'hqact'},
        d.nick?btn('🚨 출동 계속',()=>{Snd.ok();goWorld()},'go big'):btn('🚨 출동 준비',()=>{Snd.ok();goCard()},'go big'),
        h('div',{class:'row',style:{justifyContent:'center'}},btn('📻 임무 안내',howto,'w sm'),
          d.nick?btn('↺ 새 대원으로',()=>{
            const m=modal(h('div',{},h('h2',{},'새 대원으로 시작할까요?'),h('p',{style:{fontSize:'20px'}},'지금까지 모은 패치와 약속이 모두 사라져요.'),
              h('div',{class:'row',style:{justifyContent:'flex-end'}},h('button',{class:'btn w',onclick:()=>m.close()},'아니요'),
                h('button',{class:'btn',style:{background:'var(--red)',color:'#fff'},onclick:()=>{const k={pin:d.pin,closed:d.closed,bgm:d.bgm,calm:d.calm,sfx:d.sfx};Store.reset();Object.assign(Store.d,k);Store.save();m.close();goStart()}},'네, 새로 시작'))))},'w sm'):null),
        h('small',{class:'hint'},S.subtitle)))));
}
/* 지킴이 등록증 만들기 */
function goCard(){
  const d=Store.d;let av=d.avatar||'hero1',code=d.codename||codename();
  const nick=h('input',{type:'text',maxlength:'8',placeholder:'별명 (진짜 이름 대신!)',value:d.nick||''});
  const photo=h('div',{class:'photo'});const drawPhoto=()=>photo.replaceChildren(avatarImg(av,200));drawPhoto();
  const codeEl=h('span',{class:'val'},code);
  const avRow=h('div',{class:'avgrid'});
  const drawAv=()=>avRow.replaceChildren(...S.characters.map(c=>h('button',{class:'av'+(av===c.id?' on':''),onclick:()=>{av=c.id;Snd.pop();drawAv();drawPhoto()}},avatarImg(c.id,64),h('small',{},c.name))));drawAv();
  mount(h('div',{class:'start reg'},h('div',{class:'panel regcard pop'},h('div',{class:'stripebar'}),
    h('h2',{},'🪪 지킴이 등록증 만들기'),
    h('div',{class:'reggrid'},photo,
      h('div',{class:'fields'},
        h('div',{class:'field'},h('b',{},'이름 (별명)'),nick),
        h('div',{class:'field'},h('b',{},'코드네임'),h('div',{class:'row'},codeEl,h('button',{class:'btn sm w',onclick:()=>{code=codename();codeEl.textContent=code;Snd.pop()}},'🎲 다시 뽑기'))),
        h('div',{class:'field'},h('b',{},'계급'),h('span',{class:'val'},rankOf(doneCount()))),
        h('div',{class:'field'},h('b',{},'소속'),h('span',{class:'val',style:{fontSize:'20px'}},S.title+' 지킴이 본부')))),
    h('span',{class:'lbl'},'증명사진 고르기'),avRow,
    h('div',{class:'row',style:{justifyContent:'space-between',padding:'14px 20px 0'}},h('button',{class:'btn w',onclick:goStart},'← 돌아가기'),
      h('button',{class:'btn go big',onclick:()=>{
        if(!nick.value.trim()){toast('이름(별명)을 써 주세요');nick.focus();return}
        d.nick=nick.value.trim();d.avatar=av;d.codename=code;d.village={last:null,pos:null,from:null,tip:false};Store.save();Snd.whistle();goWorld();
      }},'등록 완료 · 출동! 🚨')))));
}
function goWorld(){
  BGM.duck(false);
  const d=Store.d;
  if(!d.nick){goStart();return}
  if(!window.VILLAGE_DATA){toast('지도 데이터(assets/js/village-data.js)를 찾을 수 없어요');goStart();return}
  const my=++goWorld.seq;
  WalkMask.load().then(()=>{
    if(my!==goWorld.seq||!Store.d.nick)return;
    const scene=Village.create();
    mount(scene.el,scene.cleanup);
    scene.start();
  });
}
goWorld.seq=0;

/* ---------- 시작 ---------- */
document.addEventListener('DOMContentLoaded',()=>{
  Store.load();applyCalm();Snd.mute=!Store.d.sfx;
  if(!BGM.TRACKS[Store.d.bgmTrack])Store.d.bgmTrack='march';BGM.setTrack(Store.d.bgmTrack);BGM.setVol(Store.d.bgmVol==null?.7:Store.d.bgmVol);
  const go=()=>{document.removeEventListener('pointerdown',go);if(Store.d.bgm!==false)BGM.start()};
  document.addEventListener('pointerdown',go);
  document.body.append(h('div',{id:'app'},h('div',{id:'stage'})));
  if(DEBUG){ // ?debug=1 : 오류를 화면 왼쪽 아래에 표시해요
    window.__errs=[];
    const log=m=>{window.__errs.push(m);let e=$('#errlog');if(!e){e=h('pre',{id:'errlog',style:{position:'fixed',left:0,bottom:0,zIndex:99,background:'rgba(255,255,255,.95)',color:'#c00',fontSize:'15px',maxWidth:'70vw',margin:0,padding:'4px 6px',whiteSpace:'pre-wrap'}});document.body.append(e)}e.textContent+=m+'\n'};
    window.addEventListener('error',e=>log('error: '+e.message));
    window.addEventListener('unhandledrejection',e=>log('rejection: '+(e.reason&&(e.reason.stack||e.reason.message)||e.reason)));
  }
  if(DEBUG&&/autostart/.test(location.search)){if(!Store.d.nick){Store.d.nick='테스트';Store.d.codename=codename();Store.save()}goWorld()}
  else goStart();
});
