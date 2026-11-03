/* ===== 임무(작전판) : 출동 장소에 들어가면 브리핑 → 임무 여러 단계 → 신호등 판정과 조끼 패치 ===== */
const TYPEICON={hazard:'🔍',order:'🔢',choice:'🤔',ox:'⭕',match:'🔗',sort:'🗂️',plan:'📝'};
const MATCHCOLORS=['#FF8A3D','#3A86FF','#2DC653','#9B59D6','#E63946','#D9A800','#20B2AA'];
const nextBtn=(ctx,label='다음 ▶')=>h('button',{class:'btn n big','data-act':'next',onclick:()=>{Snd.pop();ctx.next()}},label);
function dots(n,i){return h('div',{class:'stepbar'},Array.from({length:n},(_,k)=>h('i',{class:k<=i?'on':''})))}
/* 무전기 창 : 교신 내용이 채팅처럼 쌓여요 */
let RLOG=null;
function radioMsg(name,text,cls){return h('div',{class:'rmsg pop'+(cls?' '+cls:'')},h('b',{},'📻 '+name),h('span',{},text))}
function say(b,text,cls){if(!RLOG||!text)return;RLOG.append(radioMsg(b.npc.ico+' '+b.npc.name,text,cls));RLOG.scrollTop=RLOG.scrollHeight}
function shell(b,title,body,stepIdx){
  const steps=h('div',{class:'q-steps'},...b.steps.map((s,i)=>h('i',{class:i<stepIdx?'done':i===stepIdx?'cur':'',title:s.title},TYPEICON[s.type]||'•')));
  const head=h('div',{class:'q-top'},h('div',{class:'stripebar'}),h('div',{class:'q-row'},
    h('button',{class:'btn sm w','data-act':'map',onclick:()=>{Snd.pop();goWorld()}},'← 구역으로'),
    h('button',{class:'btn sm w','data-act':'home',title:'본부(처음 화면)으로',onclick:()=>{Snd.pop();confirmHome()}},'🏠 본부'),
    h('div',{class:'q-title'},h('span',{class:'qi'},b.icon),h('span',{class:'qt'},title)),steps));
  RLOG=h('div',{class:'rlog'});
  const radio=h('div',{class:'radio'},h('div',{class:'rtop'},h('span',{class:'led'}),`교신 · ${b.npc.ico} ${b.npc.name}`),h('div',{class:'grille'}),RLOG);
  const board=h('div',{class:'board'},body);
  const bg=b.room?h('div',{class:'qbg','aria-hidden':'true',style:{backgroundImage:'url("'+b.room+'")'}}):null;   // 건물 안 배경(assets/img/rooms/*.jpg)을 작전판 뒤에 흐릿하게
  return h('div',{class:'world quest'},bg,head,h('div',{class:'q-body'},h('div',{class:'ops'},radio,board)));
}

/* ---------- 활동 종류별 화면 ---------- */
const RENDER={
  /* 숨은 위험 찾기 */
  hazard(s,root,ctx){
    const found=new Set(),total=s.spots.length;
    const box=h('div',{class:'hz',style:{aspectRatio:(s.ar||[16,9]).join(' / ')}});
    const img=h('img',{src:s.img,alt:'',draggable:'false'});
    const layer=h('div',{class:'hzlayer'});
    box.append(img,layer);
    const status=h('div',{class:'hzstatus'});
    const list=h('div',{class:'hzlist'});
    const hint=h('button',{class:'btn sm w',onclick:hintFn},'💡 힌트 (신호등이 조금 내려가요)');
    const btns=h('div',{class:'row',style:{justifyContent:'center'}},hint);
    root.append(h('h3',{},'🔍 숨은 위험 찾기'),box,status,btns,list);
    const upd=()=>{status.textContent=`찾은 위험 ${found.size} / ${total}`};upd();
    layer.addEventListener('pointerdown',e=>{
      if(found.size===total)return;
      const r=layer.getBoundingClientRect();const px=(e.clientX-r.left)/r.width*100,py=(e.clientY-r.top)/r.height*100;
      if(DEBUG){console.log('spot',px.toFixed(1),py.toFixed(1));toast(`그림 좌표 x:${px.toFixed(1)} y:${py.toFixed(1)}`,1800)}
      let hit=-1;
      s.spots.forEach((sp,i)=>{if(hit>=0||found.has(i))return;const dx=(px-sp.x)/100*r.width,dy=(py-sp.y)/100*r.height,rr=sp.r/100*r.width;if(Math.hypot(dx,dy)<=rr)hit=i});
      if(hit>=0){found.add(hit);mark(hit);Snd.ok();upd();if(found.size===total)done()}
      else{ctx.miss();Snd.bad();ripple(px,py);if(!DEBUG)toast('여기는 괜찮아 보여요. 다른 곳을 찾아봐요!',1200)}
    });
    function mark(i){
      const sp=s.spots[i];
      layer.append(h('div',{class:'hzmark pop',style:{left:sp.x+'%',top:sp.y+'%',width:sp.r*2+'%'}},h('b',{},found.size)));
      list.prepend(h('div',{class:'hzitem pop'},h('b',{},`${found.size}. ${sp.name}`),h('div',{},sp.why)));
    }
    function ripple(x,y){const rp=h('div',{class:'hzrip',style:{left:x+'%',top:y+'%'}});layer.append(rp);setTimeout(()=>rp.remove(),700)}
    function hintFn(){
      const left=s.spots.map((_,i)=>i).filter(i=>!found.has(i));if(!left.length)return;
      ctx.miss();Snd.pop();const sp=s.spots[left[0]];
      const g=h('div',{class:'hzhint',style:{left:sp.x+'%',top:sp.y+'%',width:sp.r*2.6+'%'}});layer.append(g);setTimeout(()=>g.remove(),2200);
    }
    function done(){
      Snd.whistle();btns.innerHTML='';ctx.say(s.done||'위험을 모두 찾았어요! 훌륭해요.');
      btns.append(nextBtn(ctx));
    }
  },
  /* 순서 맞추기 */
  order(s,root,ctx){
    const n=s.items.length;let k=0;
    let ord=shuffle(s.items.map((_,i)=>i));if(ord.every((v,i)=>v===i))ord.reverse();
    const slots=h('div',{class:'slots'},...s.items.map((_,i)=>h('div',{class:'slot'},h('i',{},i+1))));
    const pool=h('div',{class:'pool'});
    ord.forEach(i=>pool.append(h('button',{class:'ocard',onclick:e=>pickIt(i,e.currentTarget)},s.items[i].t)));
    root.append(h('h3',{},'🔢 순서 맞추기'),h('p',{class:'hint center',style:{margin:0}},'가장 먼저 할 일부터 차례대로 카드를 눌러 위 칸에 채워요'),slots,pool);
    function pickIt(i,el){
      if(i===k){Snd.pop();const sl=slots.children[k];sl.classList.add('on');sl.append(h('span',{class:'pop'},s.items[i].t));el.remove();k++;if(k===n)done()}
      else{ctx.miss();Snd.bad();el.classList.remove('shake');void el.offsetWidth;el.classList.add('shake');toast(k===0?'가장 먼저 할 일부터 골라요':'그건 아직이에요. 그다음에 할 일을 골라요',1300)}
    }
    function done(){
      Snd.whistle();ctx.say(s.done||'순서를 모두 맞췄어요!');
      const box=h('div',{class:'whylist pop'},h('b',{class:'dh',style:{color:'var(--green)',fontSize:'22px'}},'✔ 순서를 모두 맞췄어요!'),
        h('ol',{},...s.items.map(it=>h('li',{},h('b',{},it.t),it.why?h('div',{class:'hint'},it.why):null))),
        h('div',{class:'row',style:{justifyContent:'center',marginTop:'10px'}},nextBtn(ctx)));
      root.append(box);box.scrollIntoView({behavior:'smooth',block:'end'});
    }
  },
  /* 상황 선택 (맞출 때까지) */
  choice(s,root,ctx){
    let i=0;const area=h('div',{class:'marea'});root.append(h('h3',{},'🤔 상황 선택'),area);show();
    function show(){
      area.innerHTML='';const sc=s.scenes[i];
      area.append(dots(s.scenes.length,i),h('div',{class:'qcard'},h('div',{class:'qico'},sc.ico||'❓'),h('p',{class:'qtext'},sc.q)));
      const opts=h('div',{class:'opts'}),fb=h('div',{class:'fb'});
      shuffle(sc.opts).forEach(o=>opts.append(h('button',{class:'opt',onclick:e=>pickOpt(o,e.currentTarget)},o.t)));
      area.append(opts,fb);
      function pickOpt(o,el){
        fb.innerHTML='';
        if(o.ok){Snd.ok();el.classList.add('ok');$$('.opt',opts).forEach(b=>b.disabled=true);ctx.say('맞아요! '+o.why,'ok');
          fb.append(h('div',{class:'fbbox ok pop'},h('b',{},'⭕ 맞아요! '),o.why),
            h('div',{class:'row',style:{justifyContent:'center'}},i+1<s.scenes.length?h('button',{class:'btn n big','data-act':'next',onclick:()=>{Snd.pop();i++;show()}},'다음 상황 ▶'):nextBtn(ctx)));
          fb.scrollIntoView({behavior:'smooth',block:'end'});}
        else{ctx.miss();Snd.bad();el.classList.add('no');el.disabled=true;ctx.sayNo('다시 생각해 봐요. '+o.why);
          fb.append(h('div',{class:'fbbox no pop'},h('b',{},'❌ 다시 생각해 봐요. '),o.why));}
      }
    }
  },
  /* O X 퀴즈 */
  ox(s,root,ctx){
    let i=0;const area=h('div',{class:'marea'});root.append(h('h3',{},'⭕ O X 퀴즈'),area);show();
    function show(){
      area.innerHTML='';const it=s.items[i];
      area.append(dots(s.items.length,i),h('div',{class:'qcard'},h('div',{class:'qico'},'🤔'),h('p',{class:'qtext'},it.q)));
      const fb=h('div',{class:'fb'}),row=h('div',{class:'oxrow'});
      row.append(h('button',{class:'oxbtn o',onclick:()=>ans(true)},'O'),h('button',{class:'oxbtn x',onclick:()=>ans(false)},'X'));
      area.append(row,fb);
      function ans(v){
        $$('.oxbtn',row).forEach(b=>b.disabled=true);const ok=v===it.a;if(!ok)ctx.miss();ok?Snd.ok():Snd.bad();
        row.querySelector(it.a?'.o':'.x').classList.add('ok');if(!ok)row.querySelector(v?'.o':'.x').classList.add('no');
        (ok?ctx.say:ctx.sayNo)((ok?'맞아요! ':'정답은 '+(it.a?'O':'X')+'예요. ')+it.why);
        fb.append(h('div',{class:'fbbox '+(ok?'ok':'no')+' pop'},h('b',{},ok?'⭕ 맞아요! ':'❌ 정답은 '+(it.a?'O':'X')+'예요. '),it.why),
          h('div',{class:'row',style:{justifyContent:'center'}},i+1<s.items.length?h('button',{class:'btn n big','data-act':'next',onclick:()=>{Snd.pop();i++;show()}},'다음 문제 ▶'):nextBtn(ctx)));
        fb.scrollIntoView({behavior:'smooth',block:'end'});
      }
    }
  },
  /* 짝 맞추기 */
  match(s,root,ctx){
    const n=s.pairs.length;let selL=null,done=0;
    const L=h('div',{class:'mcol'}),R=h('div',{class:'mcol'});
    shuffle(s.pairs.map((_,i)=>i)).forEach(i=>L.append(h('button',{class:'mitem l',onclick:e=>{const el=e.currentTarget;if(el.classList.contains('lock'))return;$$('.mitem.l',L).forEach(b=>b.classList.remove('sel'));el.classList.add('sel');selL=i;Snd.pop()}},(s.pairs[i].lico?s.pairs[i].lico+' ':'')+s.pairs[i].l)));
    shuffle(s.pairs.map((_,i)=>i)).forEach(i=>R.append(h('button',{class:'mitem r',onclick:e=>pickR(i,e.currentTarget)},(s.pairs[i].rico?s.pairs[i].rico+' ':'')+s.pairs[i].r)));
    root.append(h('h3',{},'🔗 짝 맞추기'),h('p',{class:'hint center',style:{margin:0}},'왼쪽에서 하나를 누르고, 짝이 되는 오른쪽을 눌러요'),h('div',{class:'mgrid'},L,R));
    function pickR(i,el){
      if(el.classList.contains('lock'))return;
      if(selL==null){toast('먼저 왼쪽에서 하나를 골라요',1200);return}
      if(i===selL){Snd.ok();const le=L.querySelector('.mitem.sel');const c=MATCHCOLORS[done%MATCHCOLORS.length];
        le.classList.remove('sel');le.classList.add('lock');le.style.setProperty('--c',c);el.classList.add('lock');el.style.setProperty('--c',c);selL=null;done++;if(done===n)fin()}
      else{ctx.miss();Snd.bad();el.classList.remove('shake');void el.offsetWidth;el.classList.add('shake');toast('짝이 아니에요. 다시 생각해 봐요',1200)}
    }
    function fin(){
      Snd.whistle();ctx.say(s.done||'짝을 모두 맞췄어요!');
      const box=h('div',{class:'whylist pop',style:{textAlign:'center'}},h('b',{class:'dh',style:{color:'var(--green)',fontSize:'22px'}},'✔ 짝을 모두 맞췄어요!'),
        h('div',{class:'row',style:{justifyContent:'center',marginTop:'10px'}},nextBtn(ctx)));
      root.append(box);box.scrollIntoView({behavior:'smooth',block:'end'});
    }
  },
  /* 두 상자로 분류 */
  sort(s,root,ctx){
    let i=0;const order=shuffle(s.items);const area=h('div',{class:'marea'});root.append(h('h3',{},'🗂️ 분류하기'),area);show();
    function show(){
      area.innerHTML='';const it=order[i];
      area.append(dots(order.length,i),h('div',{class:'qcard'},h('div',{class:'qico'},it.ico||'🃏'),h('p',{class:'qtext'},it.t)));
      const fb=h('div',{class:'fb'}),row=h('div',{class:'bins'});
      s.bins.forEach((bn,bi)=>row.append(h('button',{class:'bin',style:{'--c':bn.color},onclick:()=>ans(bi)},h('span',{class:'bico'},bn.ico),bn.t)));
      area.append(row,fb);
      function ans(bi){
        $$('.bin',row).forEach(b=>b.disabled=true);const ok=bi===it.bin;if(!ok)ctx.miss();ok?Snd.ok():Snd.bad();
        row.children[it.bin].classList.add('ok');if(!ok)row.children[bi].classList.add('no');
        (ok?ctx.say:ctx.sayNo)((ok?'맞아요! ':`「${s.bins[it.bin].t}」예요. `)+it.why);
        fb.append(h('div',{class:'fbbox '+(ok?'ok':'no')+' pop'},h('b',{},ok?'⭕ 맞아요! ':`❌ 「${s.bins[it.bin].t}」예요. `),it.why),
          h('div',{class:'row',style:{justifyContent:'center'}},i+1<order.length?h('button',{class:'btn n big','data-act':'next',onclick:()=>{Snd.pop();i++;show()}},'다음 카드 ▶'):nextBtn(ctx)));
        fb.scrollIntoView({behavior:'smooth',block:'end'});
      }
    }
  },
  /* 나만의 약속 카드 */
  plan(s,root,ctx){
    const v={};s.fields.forEach(f=>v[f.k]=f.multi?[]:null);
    const form=h('div',{class:'planform'});
    s.fields.forEach(f=>{
      const grp=h('div',{class:'chips'});
      const draw=()=>{grp.innerHTML='';f.opts.forEach(o=>grp.append(h('button',{class:'chip'+((f.multi?v[f.k].includes(o):v[f.k]===o)?' on':''),onclick:()=>{if(f.multi){const a=v[f.k];a.includes(o)?a.splice(a.indexOf(o),1):a.push(o)}else v[f.k]=o;Snd.pop();draw()}},o)))};
      draw();form.append(h('div',{class:'pf'},h('b',{},f.label),grp));
    });
    const out=h('div');
    root.append(h('h3',{},'📝 나만의 약속 카드'),form,h('div',{class:'row',style:{justifyContent:'center'}},h('button',{class:'btn l',onclick:make},'약속 카드 만들기 ✨')),out);
    function make(){
      for(const f of s.fields){const val=v[f.k];if(val==null||(Array.isArray(val)&&!val.length)){toast(`「${f.label}」을 골라 주세요`);return}}
      const text=s.make(v,Store.d.nick);Store.d.plan={text,date:today()};Store.save();Snd.whistle();ctx.say('약속 카드가 만들어졌어요. 조끼 기록에 저장할게요!');
      out.innerHTML='';
      out.append(h('div',{class:'promise pop'},h('b',{},'📱 나의 스마트폰·게임 약속'),h('p',{},text),h('small',{class:'hint'},today()+' · '+Store.d.nick)),
        h('p',{class:'hint center'},'약속 카드는 내 조끼(임무 기록)에 저장돼요. 다시 만들면 바뀌어요.'),
        h('div',{class:'row',style:{justifyContent:'center'}},nextBtn(ctx)));
      out.scrollIntoView({behavior:'smooth',block:'end'});
    }
  }
};

/* ---------- 출동 장소 임무 흐름 ---------- */
function runBuilding(b){
  BGM.duck(true);
  const st={i:0,miss:0};
  intro();
  function intro(){
    const body=h('div',{class:'marea'},
      h('h3',{},'📋 작전 브리핑'),
      h('div',{class:'brief'},h('b',{},'출동 장소'),h('span',{},b.icon+' '+b.name),h('b',{},'임무 영역'),h('span',{},b.area),h('b',{},'예상 시간'),h('span',{},'약 '+b.intro.time)),
      h('p',{style:{margin:0,fontSize:'19px',lineHeight:1.6}},b.intro.desc),
      h('h3',{},'✅ 임무 목록'),
      h('ol',{class:'mission-list'},...b.steps.map((s,i)=>h('li',{},h('span',{class:'no'},String(i+1).padStart(2,'0')),h('span',{class:'ti'},TYPEICON[s.type]||'•'),s.title))),
      h('div',{class:'row',style:{justifyContent:'center',marginTop:'6px'}},h('button',{class:'btn go big','data-act':'start',onclick:()=>{Snd.pop();step()}},'임무 시작 ▶')));
    mount(shell(b,'작전 브리핑',body,-1));say(b,b.intro.say);
  }
  function step(){
    if(st.i>=b.steps.length){result();return}
    const s=b.steps[st.i];
    const body=h('div',{class:'marea'});
    mount(shell(b,`임무 ${st.i+1}. ${s.title}`,body,st.i));
    say(b,s.say);
    const r=RENDER[s.type];
    const ctx={b,miss:()=>{st.miss++},next:()=>{st.i++;step()},say:t=>say(b,t,'ok'),sayNo:t=>say(b,t,'no')};
    if(!r){body.append(h('p',{},'알 수 없는 임무 종류: '+s.type),nextBtn(ctx));return}
    r(s,body,ctx);
    $('.q-body').scrollTop=0;
  }
  function result(){
    const stars=finishBuilding(b.id,st.miss),L=lightOf(stars);confetti(stars===3?150:90);Snd.whistle();
    const body=h('div',{class:'res'},
      h('div',{class:'tl pop'},h('i',{class:'r'+(L.k==='r'?' on':'')}),h('i',{class:'a'+(L.k==='a'?' on':'')}),h('i',{class:'g'+(L.k==='g'?' on':'')}),
        h('div',{class:'verdict'},L.t,h('small',{},st.miss===0?'한 번도 틀리지 않았어요!':`틀린 횟수 ${st.miss}번 · ${L.sub}`))),
      h('div',{class:'marea'},
        h('h3',{},`🎖️ ${b.name} 패치 획득! · ${rankOf(doneCount())}`),
        vestView(b.id),
        h('div',{class:'promise'},h('b',{},'🤙 오늘의 안전 약속'),h('p',{},b.promise)),
        h('div',{class:'row',style:{justifyContent:'center'}},
          h('button',{class:'btn w',onclick:()=>vest()},'🎒 내 조끼'),
          allDone()?h('button',{class:'btn l',onclick:()=>idcard()},'🪪 자격증 받기'):null,
          h('button',{class:'btn go big','data-act':'map',onclick:()=>{Snd.pop();goWorld()}},'구역으로 돌아가기 🚨'))));
    mount(shell(b,'임무 완료!',body,b.steps.length));say(b,b.outro,'ok');
    if(allDone())setTimeout(()=>say(b,'본부에서 알립니다: 일곱 곳의 패치를 모두 모았어요! 🪪 자격증을 받으세요.','ok'),600);
  }
}

/* ---------- 조끼와 패치 ---------- */
function vestSvg(){
  return `<svg viewBox="0 0 300 360" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs><linearGradient id="vg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9FF80"/><stop offset="1" stop-color="#B5E640"/></linearGradient></defs>
  <path d="M62 52 L112 26 C124 72 176 72 188 26 L238 52 L268 128 L236 140 L236 338 L64 338 L64 140 L32 128 Z" fill="url(#vg)" stroke="#1B1B2F" stroke-width="6" stroke-linejoin="round"/>
  <rect x="64" y="196" width="172" height="18" fill="#C0C7D2"/><rect x="64" y="203" width="172" height="4" fill="#fff"/>
  <rect x="64" y="258" width="172" height="18" fill="#C0C7D2"/><rect x="64" y="265" width="172" height="4" fill="#fff"/>
  <rect x="92" y="96" width="14" height="242" fill="#C0C7D2"/><rect x="194" y="96" width="14" height="242" fill="#C0C7D2"/>
  <path d="M150 64 V338" stroke="#1B1B2F" stroke-width="4" stroke-dasharray="6 6"/>
  <path d="M62 52 L112 26 L150 64 L112 74 Z" fill="#14213D" stroke="#1B1B2F" stroke-width="4" stroke-linejoin="round"/>
  <path d="M238 52 L188 26 L150 64 L188 74 Z" fill="#14213D" stroke="#1B1B2F" stroke-width="4" stroke-linejoin="round"/>
  <rect x="80" y="290" width="56" height="38" rx="6" fill="#B5E640" stroke="#1B1B2F" stroke-width="4"/><rect x="164" y="290" width="56" height="38" rx="6" fill="#B5E640" stroke="#1B1B2F" stroke-width="4"/>
  </svg>`;
}
/* 패치 그림(자수 와펜, assets/img/patches/*.webp). 그림이 없으면 건물 아이콘 동그라미로 대신해요 */
function patchEl(b,o){
  o=o||{};const st={'--c':b.color};if(o.left!=null){st.left=o.left+'%';st.top=o.top+'%'}
  const el=h('div',{class:'patch img'+(o.cls?' '+o.cls:''),title:b.name,style:st});
  const img=h('img',{src:'assets/img/patches/'+b.id+'.webp',alt:'',draggable:'false'});
  img.onerror=()=>{el.classList.remove('img');img.replaceWith(document.createTextNode(b.icon))};
  el.append(img);return el;
}
function vestView(newId){
  const wrap=h('div',{class:'vestwrap'});
  const img=h('img',{class:'vestimg',src:'assets/img/vest.webp',alt:'',draggable:'false'});
  img.onerror=()=>{img.replaceWith(h('div',{html:vestSvg()}))};
  wrap.append(img);
  B.forEach((b,i)=>{const [x,y]=VEST_SLOTS[i]||[50,50];
    if(Store.d.done[b.id])wrap.append(patchEl(b,{cls:b.id===newId?'new':'',left:x,top:y}));
    else wrap.append(h('div',{class:'vslot',style:{left:x+'%',top:y+'%'},title:b.name+' (아직)'}))});
  return wrap;
}
function vest(){
  const d=Store.d;
  const legend=h('div',{class:'vestlegend'},...B.map(b=>{const dn=d.done[b.id];return h('div',{class:'lg'+(dn?'':' off')},patchEl(b,{cls:'sm'}),h('span',{style:{flex:1}},b.name),dn?lightEl(starsOf(b.id)):h('small',{class:'hint'},'미완료'))}));
  const proms=B.filter(b=>d.promises[b.id]).map(b=>h('li',{},h('b',{},b.icon+' '),d.promises[b.id]));
  const m=modal(h('div',{style:{minWidth:'min(680px,88vw)'}},h('h2',{},`🎒 ${d.nick}의 조끼 · ${rankOf(doneCount())}`),
    h('p',{class:'hint',style:{margin:'0 0 8px'}},`패치 ${doneCount()}/${B.length}개${d.codename?' · 코드네임 '+d.codename:''}`),
    vestView(null),
    h('div',{style:{marginTop:'10px'}},legend),
    h('div',{class:'card',style:{marginTop:'10px'}},h('b',{class:'dh'},'🤙 내가 모은 안전 약속 '+proms.length+'/'+B.length),proms.length?h('ul',{class:'plist'},...proms):h('p',{class:'hint',style:{margin:'4px 0 0'}},'임무를 마치면 약속이 여기에 모여요')),
    d.plan?h('div',{class:'promise',style:{marginTop:'10px'}},h('b',{},'📱 나의 스마트폰·게임 약속'),h('p',{},d.plan.text),h('small',{class:'hint'},d.plan.date)):null,
    h('div',{class:'row',style:{justifyContent:'flex-end',marginTop:'12px'}},allDone()?h('button',{class:'btn l',onclick:()=>{m.close();idcard()}},'🪪 자격증 받기'):null,h('button',{class:'btn n',onclick:()=>m.close()},'닫기'))));
}

/* ---------- 지킴이 자격증 (ID 카드, 그림으로 저장) ----------
   글씨·사진·패치 자리는 배경 그림(assets/img/idcard.jpg, 1400×880)의 빈 칸에 맞춰 두었어요.
   배경 그림이 없으면 같은 자리에 앱이 사진 칸·바코드·홀로그램을 직접 그려요. */
function idcard(){
  const d=Store.d;if(!allDone()){toast('일곱 곳의 패치를 모두 모으면 받을 수 있어요');return}
  const W=1400,H=880;const cv=h('canvas',{width:W,height:H,class:'idcv'});const x=cv.getContext('2d');
  const EMOJI='"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  const KT='"Black Han Sans","Do Hyeon","Malgun Gothic","Apple SD Gothic Neo",sans-serif',KD='"Do Hyeon","Malgun Gothic","Apple SD Gothic Neo",sans-serif';
  const issued=(d.cert||today());
  const no='SG-'+issued.replace(/-/g,'').slice(2)+'-'+String(strHash(d.nick+'|'+d.codename)%10000).padStart(4,'0');
  const rr=(x0,y0,w,hh,r)=>{x.beginPath();x.moveTo(x0+r,y0);x.arcTo(x0+w,y0,x0+w,y0+hh,r);x.arcTo(x0+w,y0+hh,x0,y0+hh,r);x.arcTo(x0,y0+hh,x0,y0,r);x.arcTo(x0,y0,x0+w,y0,r);x.closePath()};
  const PH=[40,287,318,535],BAR=[1128,282,238,66],HOLO=[1275,748,88],FX=410,FX2=830;   // 사진 칸 · 바코드 · 홀로그램 · 글씨 두 줄의 x
  const fit=(txt,max,px,font)=>{let p=px;x.font=p+'px '+font;while(x.measureText(txt).width>max&&p>22){p-=4;x.font=p+'px '+font}};
  const draw=(bg,photo,pats)=>{
    x.clearRect(0,0,W,H);
    if(bg)x.drawImage(bg,0,0,W,H);
    else{
      rr(0,0,W,H,48);x.fillStyle='#F4F6FB';x.fill();
      x.save();rr(0,0,W,H,48);x.clip();x.fillStyle='#14213D';x.fillRect(0,0,W,212);
      for(let i=0;i<W;i+=44){x.fillStyle=(i/44)%2?'#1B1B1B':'#FFC800';x.fillRect(i,212,44,38)}
      rr(PH[0]-7,PH[1]-7,PH[2]+14,PH[3]+14,14);x.fillStyle='#fff';x.fill();x.lineWidth=5;x.strokeStyle='#14213D';x.stroke();
      let bx=BAR[0];for(let i=0;i<34;i++){const w=2+((i*7)%3)*2;x.fillStyle='#1B1B1B';x.fillRect(bx,BAR[1],w,BAR[3]);bx+=w+3}
      const g=x.createRadialGradient(HOLO[0],HOLO[1],10,HOLO[0],HOLO[1],HOLO[2]);g.addColorStop(0,'rgba(200,245,96,.95)');g.addColorStop(.5,'rgba(58,134,255,.45)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.beginPath();x.arc(HOLO[0],HOLO[1],HOLO[2],0,Math.PI*2);x.fill();
      x.restore();
    }
    x.textBaseline='alphabetic';x.textAlign='left';
    x.fillStyle='#fff';x.font='74px '+KT;x.fillText('안전 지킴이 자격증',60,122);
    x.fillStyle='#C8F560';x.font='26px '+KD;x.fillText('SAFETY GUARD LICENSE · 지킴이 본부 발급',62,166);
    x.textAlign='right';x.font='32px '+KD;x.fillStyle='#fff';x.fillText(S.title,W-60,122);x.textAlign='left';
    if(photo){const s=Math.min((PH[2]-24)/photo.width,(PH[3]-24)/photo.height);const w=photo.width*s,hh=photo.height*s;x.drawImage(photo,PH[0]+(PH[2]-w)/2,PH[1]+PH[3]-hh-14,w,hh)}
    else{x.font='170px '+EMOJI;x.textAlign='center';x.fillText('🧒',PH[0]+PH[2]/2,PH[1]+PH[3]*.68);x.textAlign='left'}
    const fld=(lab,val,fx,y,big,max)=>{x.fillStyle='#5A6276';x.font='24px '+KD;x.fillText(lab,fx,y);x.fillStyle='#1B1B2F';fit(val,max,big?66:40,KT);x.fillText(val,fx,y+(big?76:50))};
    fld('이름',d.nick,FX,300,true,690);fld('코드네임',d.codename||'—',FX,425,false,400);fld('계급',rankOf(B.length),FX,515,false,400);
    fld('발급일',issued.replace(/-/g,'. ')+'.',FX2,425,false,330);
    x.fillStyle='#5A6276';x.font='24px '+KD;x.fillText('자격 번호',FX2,515);x.fillStyle='#1B1B2F';x.font='34px '+KD;x.fillText(no,FX2,562);
    x.fillStyle='#5A6276';x.font='18px '+KD;x.textAlign='right';x.fillText(no,BAR[0]+BAR[2],BAR[1]+BAR[3]+28);x.textAlign='left';
    B.forEach((b,i)=>{const cx=452+i*104,cy=716,r=46;const im=pats&&pats[b.id];
      if(im)x.drawImage(im,cx-r,cy-r,r*2,r*2);
      else{x.beginPath();x.arc(cx,cy,r-4,0,Math.PI*2);x.fillStyle='#fff';x.fill();x.lineWidth=6;x.strokeStyle=b.color;x.stroke();x.font='44px '+EMOJI;x.textAlign='center';x.textBaseline='middle';x.fillText(b.icon,cx,cy+2);x.textBaseline='alphabetic';x.textAlign='left'}});
    x.fillStyle='#1B1B2F';x.font='28px '+KD;x.fillText('지킴이 본부장 (선생님)  ______________',FX,834);
  };
  let bgImg=null,ph=null;const pats={};const redraw=()=>draw(bgImg,ph,pats);
  draw(null,null,null);
  const photo=new Image();photo.onload=()=>{ph=photo;redraw()};photo.src=(EMBED.avatars&&EMBED.avatars[d.avatar])||avatarSrc(d.avatar);
  if(EMBED.idcard){const bg=new Image();bg.onload=()=>{bgImg=bg;redraw()};bg.src=EMBED.idcard}
  if(EMBED.patches)B.forEach(b=>{const u=EMBED.patches[b.id];if(!u)return;const im=new Image();im.onload=()=>{pats[b.id]=im;redraw()};im.src=u});
  const m=modal(h('div',{class:'center',style:{display:'grid',gridTemplateColumns:'minmax(0,1fr)',gap:'10px',width:'min(760px,86vw)',maxWidth:'100%'}},
    h('h2',{},'🪪 안전 지킴이 자격증'),cv,
    h('p',{class:'hint',style:{margin:0}},'그림으로 저장해서 인쇄하거나 학급 게시판에 붙여요'),
    h('div',{class:'row',style:{justifyContent:'center'}},h('button',{class:'btn l',onclick:()=>saveCanvas(cv,`안전지킴이_자격증_${d.nick}.png`)},'💾 그림으로 저장'),h('button',{class:'btn n',onclick:()=>m.close()},'닫기'))));
  confetti(170);Snd.whistle();
}
function saveCanvas(cv,name){
  try{
    cv.toBlob(bl=>{if(!bl){toast('저장할 수 없어요');return}const a=h('a',{href:URL.createObjectURL(bl),download:name});document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);toast('그림으로 저장했어요')},'image/png');
  }catch(e){toast('이 환경에서는 그림 저장이 막혀 있어요. 화면을 캡처해 주세요',3500)}
}
