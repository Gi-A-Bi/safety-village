# -*- coding: utf-8 -*-
"""안전 지킴이 마을 · 통행 영역 검사 도구 (선택)

assets/js/village-data.js 의 길·광장·차단 영역을 그림으로 그려 확인하고,
시작 지점에서 모든 건물 입구에 걸어서 갈 수 있는지 검사해요.

사용법 (이 폴더의 한 단계 위, safety-village 폴더에서):
    python tools/walkmask.py                 → tools/walkmask.png 저장 (지도 그림이 jpg/png면 그 위에 겹쳐 그려요)
    python tools/walkmask.py 지도그림.jpg     → 다른 지도 그림 위에 겹쳐 그려요
필요한 것: Python 3, Pillow (pip install pillow)
"""
import json, os, re, sys
from collections import deque
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # 윈도우 콘솔에서 한글·기호 깨짐 방지
except Exception:
    pass

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, ".."))
DATA_JS = os.path.join(ROOT, "assets", "js", "village-data.js")


def load_data():
    src = open(DATA_JS, encoding="utf-8").read()
    src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)           # 주석 제거
    body = src[src.index("{", src.index("VILLAGE_DATA")):src.rindex("}") + 1]
    return json.loads(body)


def main():
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        print("Pillow 가 필요해요:  pip install pillow"); return
    D = load_data()
    W, H = D["w"], D["h"]
    mask = Image.new("L", (W, H), 0)
    dr = ImageDraw.Draw(mask)
    mp = os.path.join(ROOT, D["mask"]) if D.get("mask") else None
    if mp and os.path.exists(mp):   # 통행 마스크 그림이 있으면 그 그림을 써요 (tools/make_mask.py 로 생성)
        mask = Image.open(mp).convert("L").resize((W, H)).point(lambda v: 255 if v > 127 else 0)
        dr = ImageDraw.Draw(mask); print("마스크 그림 사용:", mp)
    for r in D.get("roads", []):
        pts = [tuple(p) for p in r["pts"]]
        dr.line(pts, fill=255, width=int(r["w"]), joint="curve")
        for (x, y) in pts:
            dr.ellipse([x - r["w"] / 2, y - r["w"] / 2, x + r["w"] / 2, y + r["w"] / 2], fill=255)
    def shape(a, fill):
        if "poly" in a: dr.polygon([tuple(p) for p in a["poly"]], fill=fill)
        elif "ellipse" in a:
            cx, cy, rx, ry = a["ellipse"]; dr.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=fill)
        elif "circle" in a:
            cx, cy, r = a["circle"]; dr.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill)
    for a in D.get("areas", []): shape(a, 255)
    for b in D.get("blocked", []): shape(b, 0)

    # 배경: 지도 그림(jpg/png)이 있으면 그 위에, svg 등이면 풀색 바탕에
    src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, D.get("img", "assets/img/village-map.jpg"))
    try:
        bg = Image.open(src).convert("RGBA").resize((W, H))
    except Exception:
        bg = Image.new("RGBA", (W, H), (121, 178, 102, 255))
    blue = Image.new("RGBA", (W, H), (30, 144, 255, 110))
    out = Image.composite(blue, Image.new("RGBA", (W, H), (0, 0, 0, 0)), mask)
    out = Image.alpha_composite(bg, out)
    d2 = ImageDraw.Draw(out)
    for sid, s in D["shops"].items():
        x, y = s["door"]; R = D["doorR"]
        d2.ellipse([x - R, y - R, x + R, y + R], outline=(0, 255, 0, 255), width=4)
        sx, sy = s["spawn"]; d2.rectangle([sx - 6, sy - 6, sx + 6, sy + 6], fill=(255, 0, 255, 255))
        d2.text((x - 20, y - R - 16), sid, fill=(255, 255, 255, 255))
    sx, sy = D["start"]; d2.ellipse([sx - 10, sy - 10, sx + 10, sy + 10], fill=(255, 220, 0, 255))
    png = os.path.join(HERE, "walkmask.png"); out.save(png); print("저장:", png)

    # 도달 가능성 검사 (BFS)
    px = mask.load(); seen = bytearray(W * H); q = deque()
    sx, sy = int(D["start"][0]), int(D["start"][1])
    if px[sx, sy] == 0: print("⚠ 시작 지점이 통행 영역 밖이에요"); return
    seen[sy * W + sx] = 1; q.append((sx, sy))
    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < W and 0 <= ny < H and not seen[ny * W + nx] and px[nx, ny]:
                seen[ny * W + nx] = 1; q.append((nx, ny))
    ok = True
    for sid, s in D["shops"].items():
        x, y = int(s["door"][0]), int(s["door"][1])
        r = bool(seen[y * W + x]); ok &= r
        print(("✔" if r else "✘"), sid, "입구", s["door"], "복귀", s["spawn"], "" if px[int(s["spawn"][0]), int(s["spawn"][1])] else "⚠ 복귀 위치가 길 밖")
    print("모든 입구 도달 가능" if ok else "⚠ 도달할 수 없는 입구가 있어요")


if __name__ == "__main__":
    main()
