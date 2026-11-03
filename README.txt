안전 지킴이 마을
=====================================
초등 안전교육 영역(생활·교통·폭력예방 및 신변보호·약물 및 사이버중독 예방·재난(화재 / 지진·자연재난)·응급처치)을
마을 탐험 게임으로 익히는 프로그램이에요. 캐릭터가 마을을 돌아다니며 건물 7곳에 들어가 활동을 하고 안전 도장을 모아요.

■ 인터넷 주소로 열기 (설치·다운로드 없이)
  - 실행 주소: https://safety-village.vercel.app
  - 소스 저장소: https://github.com/Gi-A-Bi/safety-village  (여기에 올리면(push) Vercel 이 자동으로 다시 배포해요)
  - 쌤툴즈 소개 페이지: https://happydol.healthydol.workers.dev/projects/safety-village
  - 개인정보처리방침: privacy.html (주소 뒤에 /privacy 를 붙여도 열려요)

■ 실행 방법 (파일로 열기)
  1. 이 폴더(safety-village)를 통째로 원하는 곳에 둡니다. (index.html 과 assets 폴더가 같은 위치에 있어야 해요)
  2. index.html 을 더블클릭하면 브라우저(크롬·엣지·사파리 등)에서 바로 열립니다. 서버·로그인·설치가 필요 없어요.
     - 글꼴(Jua, Gowun Dodum)은 인터넷이 연결돼 있으면 구글 폰트에서 받아오고, 없으면 기기 글꼴로 대신 표시됩니다.
  3. 태블릿에서는 폴더를 복사해 넣고 index.html 을 열거나, 학급 서버·클라우드(정적 호스팅)에 올려 주소로 열어도 됩니다.

■ 세계관
  학생은 「신입 지킴이 대원」이에요. 본부(시작 화면)에서 등록증을 만들고(캐릭터 = 증명사진, 별명, 코드네임),
  출동 구역(마을)을 순찰하다 출동 장소(건물 7곳)에 들어가 임무를 수행해요. 임무를 마치면 신호등 판정(초록·노랑·빨강)을 받고
  조끼에 패치가 붙어요. 패치 7개를 모으면 「안전 지킴이 자격증」(ID 카드)을 받아요. 계급: 수습 → 정식 → 선임 → 베테랑 지킴이.

■ 조작
  - 이동: 방향키(⬅⬆⬇➡) 또는 W·A·S·D. 태블릿은 왼쪽 아래 방향 버튼을 꾹 누르면 움직이고, 손을 떼면 멈춥니다.
  - 크림색 길만 걸을 수 있어요. 화면 위 「본부 무전」에 다음 출동지가 뜨고, 지도에 그곳까지 점선 길이 표시돼요. (무전·미니맵·건물 이름표를 누르면 출동지를 바꿀 수 있어요)
  - 출동: 입구(점선 타원) 근처에 가면 입구가 빛나요. Enter·스페이스바 또는 오른쪽 아래 「출동!」 버튼을 누르면 임무가 열립니다.
  - 임무 화면: 왼쪽 무전기 창에 안내가 쌓이고, 오른쪽 작전판에서 활동해요. 「← 구역으로」는 지도로, 「🏠 본부」는 처음 화면으로(한 번 더 물어봐요).
  - 왼쪽 위 ID 카드(또는 🎒)를 누르면 내 조끼(패치·안전 약속·약속 카드)를 볼 수 있어요.
  - 지휘 본부(🔒 3초 길게 누르기)에서 오늘 열 출동 장소를 고를 수 있고, 닫힌 곳은 「오늘은 쉬는 곳」으로 표시돼요.

■ 건물 ↔ 안전교육 영역 ↔ 활동
  🏠 우리 집      생활안전              숨은 위험 찾기 · O X · 상황 선택
  🚦 횡단보도 정류장  교통안전          건너기 순서 · 숨은 위험 찾기 · 상황 선택 · O X
  🏪 안심 편의점   폭력예방·신변보호     상황 선택 · 도움 청할 곳 짝 맞추기 · O X
  💊 건강 약국     약물·사이버중독 예방  분류하기 · 거절 상황 선택 · O X · 나의 스마트폰 약속 카드
  🚒 소방서       재난안전(화재)        화재 대피 순서 · 119 신고 순서 · 불이 났을 때 상황 선택 · 소화기 순서 · 화재 예방 O X
  ⛑️ 안전 체험 훈련장  재난안전(지진·자연재난)  교실 속 지진 위험 찾기 · 교실 지진 대피 순서 · 장소별 지진 상황 선택 · 지진 대비 분류 · 태풍·폭염·한파 O X · 재난-행동 짝 맞추기
  🏥 보건소       응급처치              처치 상황 선택 · 심폐소생술 순서 · 구급상자 짝 맞추기 · O X
  임무를 마치면 신호등 판정(틀린 횟수 0~2번 초록, 3~5번 노랑, 그 이상 빨강)을 받고 조끼에 패치가 붙어요. 안전 약속은 조끼 기록에 모여요.
  7곳을 모두 마치면 「안전 지킴이 자격증」(ID 카드)을 그림(PNG)으로 저장할 수 있어요.

■ 폴더 구성
  index.html                       프로그램 화면과 디자인
  privacy.html                     개인정보처리방침 (시작 화면 아래 링크)
  vercel.json                      Vercel 호스팅 설정 (/privacy 처럼 .html 없는 주소 허용)
  assets/js/safety-data.js         ★ 건물·캐릭터·미션 문항 데이터 (내용을 바꾸려면 이 파일만 고치면 돼요)
  assets/js/village-data.js        지도 그림·통행 마스크·차단 영역·건물 입구 좌표 (지도 픽셀 좌표계)
  assets/js/embedded.js            통행 마스크·자격증 배경·패치·캐릭터 증명사진을 데이터로 넣어 둔 자동 생성 파일 (더블클릭으로 열어도 동작하게 해 줘요)
  assets/js/core.js                공통 코드 · 본부 시작 화면 · 등록증 만들기 · 지휘 본부(선생님) · 설정
  assets/js/village.js             출동 구역(마을) 이동 엔진 · HUD(ID 카드·미니맵·본부 무전·점선 길 안내·출동 버튼)
  assets/js/missions.js            임무(숨은 위험 찾기·순서·선택·OX·짝 맞추기·분류·약속 카드)·신호등 판정·조끼 패치·자격증(ID 카드)
  assets/js/bgm.js                 배경음악(웹오디오로 직접 연주)
  assets/img/village-map.jpg       마을 지도 (1672×941)
  assets/img/village-mask.png      통행 마스크 (흰색=걸을 수 있는 길). 지도의 길 색을 tools/make_mask.py 로 뽑아 만든 그림
  assets/img/village-entrance.jpg  시작 화면 배경(마을 입구)
  assets/img/scenes/*.jpg          숨은 위험 찾기 장면 3장 (kitchen·street·classroom)
  assets/img/rooms/*.jpg           건물 안 배경 7장 (활동 화면 뒤에 흐릿하게 깔려요)
  assets/img/idcard.jpg            자격증 ID 카드 배경 (1400×880). 없으면 앱이 같은 자리에 그려요
  assets/img/vest.webp             조끼 그림 (배경 제거본). 없으면 앱이 그린 조끼를 써요
  assets/img/patches/*.webp        패치(자수 와펜) 7개: home·road·store·pharmacy·fire·site·health. 없으면 건물 아이콘 동그라미를 써요
  assets/characters/hero1~6.png    마을을 걷는 캐릭터 6종 (배경 제거본, 발밑 기준 정렬)
  tools/make_mask.py               (선택) 지도 그림의 길 색을 뽑아 통행 마스크를 만드는 파이썬 도구 (Pillow·numpy 필요). 끝나면 embed_assets.py 도 자동 실행
  tools/embed_assets.py            (선택) village-mask.png·idcard.jpg·patches·캐릭터를 embedded.js 에 데이터로 넣는 도구. 이 그림들을 바꾸면 꼭 다시 실행
  tools/test-harness.js            (개발용) ?debug=1 로 열고 불러오면 건물 활동을 자동으로 플레이해 검사해요
  tools/walkmask.py                (선택) 통행 영역을 그림으로 확인하고 모든 입구 도달 여부를 검사하는 파이썬 도구

■ 그림 바꾸기 (GPT 등으로 만든 그림 넣기)
  - 마을 지도: assets/img/village-map.jpg 를 바꿔 넣고 village-data.js 의 "w","h" 를 그림 크기로 맞춰요.
    그다음 python tools/make_mask.py 를 실행하면 길 색을 찾아 village-mask.png 를 새로 만들고 tools/mask-overlay.png 로 결과를 보여 줘요.
    (길은 양옆으로 10px 넓혀서 캐릭터가 끼지 않게 하고(DILATE), 캐릭터 발판으로 입구 7곳까지 실제로 걸어갈 수 있는지도 검사해 알려 줘요)
    (길 색이 다르면 make_mask.py 안의 H_RANGE·S_RANGE·V_MIN 범위를 조정해요)
    건물 자리(blocked)와 입구·복귀·이름표(shops) 좌표도 새 그림에 맞춰 고쳐요. index.html?debug=1 로 열면 통행 영역이 파랗게 겹쳐 보이고,
    지도를 클릭하면 그 지점의 좌표가 화면에 떠서 좌표 잡기가 쉬워요.
  - 마스크 그림 없이 쓰려면 village-data.js 의 "mask" 줄을 지우고 roads(길 중심선·폭)·areas(통행 영역) 도형을 적어도 돼요.
  - 숨은 위험 찾기 장면: assets/img/scenes/ 에 그림을 넣고 safety-data.js 의 해당 step 에서 img 경로와 spots 좌표(x,y는 %, r은 가로 %)를 고쳐요.
    index.html?debug=1 로 열고 장면을 클릭하면 % 좌표가 떠요.
  - 캐릭터: assets/characters/hero1.png ~ hero6.png 를 같은 이름으로 바꿔 넣어요 (투명 배경, 발이 그림 아래 끝에 오도록). 이름은 safety-data.js 의 characters 에서 바꿔요.
  - 시작 화면: assets/img/village-entrance.jpg 를 넣으면 자동으로 배경이 돼요. 건물 안 배경: assets/img/rooms/{home,road,store,pharmacy,fire,site,health}.jpg
  - 자격증 배경: assets/img/idcard.jpg (1400×880, 왼쪽 사진 칸·오른쪽 위 바코드·오른쪽 아래 홀로그램 자리는 missions.js 의 idcard() 좌표와 맞춰요).
    조끼: assets/img/vest.webp (배경 제거본). 패치: assets/img/patches/{home,road,store,pharmacy,fire,site,health}.webp (정사각형, 투명 배경).
    넣은 뒤 python tools/embed_assets.py 를 한 번 실행해요.
  - 패치 자리(조끼 위 %, 7개)는 core.js 의 VEST_SLOTS 에서 바꿀 수 있어요.

■ 저장 데이터
  진행 상황(별명·코드네임·캐릭터·패치·신호등 판정·약속·스마트폰 약속 카드)은 이 기기 브라우저의 localStorage 'safety_village_v1' 에만 저장돼요.
  지휘 본부 ②에서 이 기기의 기록을 볼 수 있고, ⑥에서 지울 수 있어요.
