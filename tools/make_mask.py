# -*- coding: utf-8 -*-
"""지도 그림에서 '길 색'을 뽑아 통행 마스크(assets/img/village-mask.png)를 만들어요.
사용법:  python tools/make_mask.py [erode]
  erode : 가장자리를 몇 픽셀 깎을지 (기본 0)
  DILATE: 길을 양옆으로 몇 픽셀 넓힐지 (기본 10). 캐릭터 발판이 지나가기 좁은 길을 넓혀 줘요 (건물·강 등 blocked 는 넓어지지 않아요)
  길 색 범위는 아래 H_RANGE / S_RANGE / V_MIN 으로 조정해요.
결과:  assets/img/village-mask.png (흰=길), tools/mask-overlay.png (확인용: 파랑=길, 초록 원=입구, 분홍=복귀, 노랑=시작)
SAMPLES 는 확인용 표본 좌표예요(판정 결과를 출력만 해요).
"""
import sys, os, re, json
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.normpath(os.path.join(HERE, ".."))
SAMPLES = [(300,355),(660,330),(1000,330),(840,545),(620,700),(1100,600),(860,820),(1300,800),(1580,600),(760,400),(1180,470)]
erode = int(sys.argv[1]) if len(sys.argv) > 1 else 0
DILATE = 10

src = open(os.path.join(ROOT, "assets/js/village-data.js"), encoding="utf-8").read()
src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
D = json.loads(src[src.index("{", src.index("VILLAGE_DATA")):src.rindex("}") + 1])
W, H = D["w"], D["h"]
im = Image.open(os.path.join(ROOT, D["img"])).convert("RGB").resize((W, H))
a = np.asarray(im).astype(int)

# 길 색 판정: HSV 범위 (크림·베이지 길은 색상 20~55°, 채도 0.10~0.45, 명도 0.55 이상)
hsv = np.asarray(im.convert("HSV")).astype(int)            # PIL HSV: 0~255
Hh, Ss, Vv = hsv[..., 0] * 360 / 255, hsv[..., 1] / 255, hsv[..., 2] / 255
H_RANGE, S_RANGE, V_MIN = (20, 55), (0.10, 0.45), 0.55
sel = (Hh >= H_RANGE[0]) & (Hh <= H_RANGE[1]) & (Ss >= S_RANGE[0]) & (Ss <= S_RANGE[1]) & (Vv >= V_MIN)
for (x, y) in SAMPLES:
    print("표본", (x, y), "RGB", tuple(a[y, x]), "H %.0f S %.2f V %.2f" % (Hh[y, x], Ss[y, x], Vv[y, x]), "→", "길" if sel[y, x] else "길 아님")
m = sel.astype(np.uint8) * 255
mask = Image.fromarray(m, "L")
mask = mask.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7))   # 작은 틈 메우기
mask = mask.filter(ImageFilter.MinFilter(7)).filter(ImageFilter.MaxFilter(7))   # 가는 잡티 지우기
if DILATE: mask = mask.filter(ImageFilter.MaxFilter(DILATE * 2 + 1))              # 길 넓히기

# 길 안의 작은 섬(가로등 받침·화분 등) 메우기: 둘레가 모두 길로 둘러싸인 면적 HOLE_MAX 미만의 덩어리는 걷는 땅으로
HOLE_MAX = 4000
inv = np.asarray(mask) < 128
try:
    from scipy import ndimage
    lab, n = ndimage.label(inv)
except ImportError:
    lab, n = None, 0
if n:
    sizes = np.bincount(lab.ravel()); sizes[0] = 0
    border = np.zeros(n + 1, bool); border[np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))] = True
    small = (sizes < HOLE_MAX) & ~border; small[0] = False
    holes = small[lab]
    arr = np.asarray(mask).copy(); arr[holes] = 255; mask = Image.fromarray(arr, "L")
    print("길 안의 작은 섬 %d개(%d픽셀) 메움" % (int(np.count_nonzero(small)), int(holes.sum())))
else:
    print("(scipy 가 없어 길 안의 작은 섬 메우기는 건너뜀: pip install scipy)")

# 추가 통행 영역(areas)을 흰색으로 덧칠 → 좁게 잡힌 길 보강
dr = ImageDraw.Draw(mask)
for b in D.get("areas", []):
    if "poly" in b: dr.polygon([tuple(p) for p in b["poly"]], fill=255)
    elif "circle" in b: cx, cy, r = b["circle"]; dr.ellipse([cx-r, cy-r, cx+r, cy+r], fill=255)
    elif "ellipse" in b: cx, cy, rx, ry = b["ellipse"]; dr.ellipse([cx-rx, cy-ry, cx+rx, cy+ry], fill=255)
# 차단 영역(건물 등) 먼저 지우기 → 건물 벽의 비슷한 색이 길로 잡히는 것 방지
dr = ImageDraw.Draw(mask)
for b in D.get("blocked", []):
    if "poly" in b: dr.polygon([tuple(p) for p in b["poly"]], fill=0)
    elif "circle" in b: cx, cy, r = b["circle"]; dr.ellipse([cx-r, cy-r, cx+r, cy+r], fill=0)
    elif "ellipse" in b: cx, cy, rx, ry = b["ellipse"]; dr.ellipse([cx-rx, cy-ry, cx+rx, cy+ry], fill=0)

# 시작 지점과 이어진 덩어리만 남기기
sx, sy = D["start"]
if mask.getpixel((sx, sy)) == 0:
    print("⚠ 시작 지점", (sx, sy), "이 길 색이 아니에요. start 좌표나 tol 을 조정하세요"); 
ImageDraw.floodfill(mask, (sx, sy), 128)
mask = mask.point(lambda v: 255 if v == 128 else 0)
if erode: mask = mask.filter(ImageFilter.MinFilter(erode * 2 + 1))

out = os.path.join(ROOT, D.get("mask", "assets/img/village-mask.png")); mask.save(out, optimize=True)
print("저장:", out, "통행 비율 %.1f%%" % (np.asarray(mask).mean() / 255 * 100))

# 확인용 겹침 그림 + 입구 도달 검사
ov = im.convert("RGBA"); blue = Image.new("RGBA", (W, H), (30, 144, 255, 120))
ov = Image.alpha_composite(ov, Image.composite(blue, Image.new("RGBA", (W, H), (0, 0, 0, 0)), mask))
d2 = ImageDraw.Draw(ov); px = mask.load()
for sid, s in D["shops"].items():
    x, y = s["door"]; R = D["doorR"]
    ok = px[x, y] > 0; sp = s["spawn"]; spok = px[sp[0], sp[1]] > 0
    d2.ellipse([x-R, y-R, x+R, y+R], outline=(0, 255, 0, 255) if ok else (255, 0, 0, 255), width=5)
    d2.rectangle([sp[0]-7, sp[1]-7, sp[0]+7, sp[1]+7], fill=(255, 0, 255, 255) if spok else (255, 0, 0, 255))
    lx, ly = s["label"]; d2.rectangle([lx-40, ly-14, lx+40, ly], outline=(255, 255, 0, 255), width=3)
    print(("✔" if ok else "✘ 입구가 길 밖"), sid, s["door"], "" if spok else "⚠ 복귀 위치가 길 밖")
d2.ellipse([sx-12, sy-12, sx+12, sy+12], fill=(255, 220, 0, 255))
ov.convert("RGB").save(os.path.join(HERE, "mask-overlay.png"))
print("확인 그림:", os.path.join(HERE, "mask-overlay.png"))

# 캐릭터 발판(foot 타원, village.js 의 9점 검사와 같은 규칙)으로 실제로 걸어갈 수 있는지 검사
ms = np.asarray(mask.resize((W // 2, H // 2), Image.NEAREST)) > 127; mh, mw = ms.shape
rx, ry = D["foot"]["rx"], D["foot"]["ry"]; k = .7
PTS = [(0, 0), (rx, 0), (-rx, 0), (0, ry), (0, -ry), (rx * k, ry * k), (-rx * k, ry * k), (rx * k, -ry * k), (-rx * k, -ry * k)]
def fits(x, y):
    for dx, dy in PTS:
        cx, cy = int((x + dx) * .5), int((y + dy) * .5)
        if not (0 <= cx < mw and 0 <= cy < mh and ms[cy, cx]): return False
    return True
STEP = 4; gw, gh = W // STEP + 1, H // STEP + 1
G = np.zeros((gh, gw), bool)
for gy in range(gh):
    for gx in range(gw): G[gy, gx] = fits(gx * STEP, gy * STEP)
from collections import deque
seen = np.zeros_like(G); q = deque([(sx // STEP, sy // STEP)]); seen[sy // STEP, sx // STEP] = True
while q:
    x, y = q.popleft()
    for ddx, ddy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nx, ny = x + ddx, y + ddy
        if 0 <= nx < gw and 0 <= ny < gh and G[ny, nx] and not seen[ny, nx]: seen[ny, nx] = True; q.append((nx, ny))
ys, xs = np.mgrid[0:gh, 0:gw]
bad = 0
for sid, s_ in D["shops"].items():
    dx_, dy_ = s_["door"]; R = D["doorR"]
    okd = bool((((xs * STEP - dx_) ** 2 + (ys * STEP - dy_) ** 2 <= R * R) & seen).any())
    sp = s_["spawn"]; oks = bool(seen[sp[1] // STEP, sp[0] // STEP])
    if not (okd and oks): bad += 1
    print(("✔" if okd and oks else "✘"), "발판 검사", sid, "입구 도달" if okd else "입구까지 못 감(길이 좁음)", "" if oks else "· 복귀 위치에 설 수 없음")
print("발판으로 걸을 수 있는 비율 %.1f%%" % (G.mean() * 100), "" if not bad else "⚠ 좁은 길이 있어요: DILATE 를 키우거나 areas 로 그 부분을 덧칠하세요")

# 마스크를 데이터로도 내장 (file:// 로 열어도 동작하도록)
import runpy; runpy.run_path(os.path.join(HERE, "embed_assets.py"))
