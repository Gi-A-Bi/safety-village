# -*- coding: utf-8 -*-
"""통행 마스크, 자격증(ID 카드) 배경, 패치 7개, 캐릭터 증명사진(작게 줄인 것)을 assets/js/embedded.js 에 데이터(base64)로 넣어요.
왜 필요하냐면: index.html 을 더블클릭(file://)으로 열면 브라우저 보안 규칙 때문에 그림 파일을 캔버스에서 읽을 수 없어요.
데이터로 넣어 두면 어디서 열어도 동작하고, 자격증도 저장돼요. 그림을 바꾸면 다시 실행:  python tools/embed_assets.py
"""
import base64, io, json, os, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.normpath(os.path.join(HERE, ".."))
IDS = ["home", "road", "store", "pharmacy", "fire", "site", "health"]
out = {}


def put(key, rel):
    fp = os.path.join(ROOT, rel)
    if os.path.exists(fp):
        mime = "image/png" if rel.lower().endswith(".png") else "image/jpeg"
        out[key] = "data:%s;base64,%s" % (mime, base64.b64encode(open(fp, "rb").read()).decode("ascii"))
        print("넣음:", rel, "%d KB" % (len(out[key]) // 1024))
    else:
        print("없음(건너뜀):", rel)


put("mask", "assets/img/village-mask.png")
put("idcard", "assets/img/idcard.jpg")

try:
    from PIL import Image

    def data_url(im, fmt, **kw):
        b = io.BytesIO(); im.save(b, fmt, **kw)
        return "data:image/%s;base64,%s" % (fmt.lower(), base64.b64encode(b.getvalue()).decode("ascii"))

    # 캐릭터 증명사진: 자격증 캔버스에 그리기 위해 높이 240px 로 줄여서 넣어요
    av = {}
    for i in range(1, 7):
        fp = os.path.join(ROOT, "assets", "characters", "hero%d.png" % i)
        if not os.path.exists(fp):
            continue
        im = Image.open(fp).convert("RGBA")
        hgt = 240; w = round(im.width * hgt / im.height)
        im = im.resize((w, hgt), Image.LANCZOS).quantize(160, method=Image.FASTOCTREE)   # 색을 줄여 용량을 작게
        av["hero%d" % i] = data_url(im, "PNG", optimize=True)
    out["avatars"] = av
    print("넣음: 캐릭터 증명사진 %d장 (%d KB)" % (len(av), sum(len(v) for v in av.values()) // 1024))

    # 패치 7개: 자격증 캔버스에 그리기 위해 128px 로 줄여서 넣어요 (화면의 조끼에는 assets/img/patches/*.webp 를 그대로 써요)
    pat = {}
    for pid in IDS:
        fp = os.path.join(ROOT, "assets", "img", "patches", pid + ".webp")
        if not os.path.exists(fp):
            continue
        im = Image.open(fp).convert("RGBA").resize((128, 128), Image.LANCZOS)
        pat[pid] = data_url(im, "WEBP", quality=80, method=6)
    if pat:
        out["patches"] = pat
        print("넣음: 패치 %d개 (%d KB)" % (len(pat), sum(len(v) for v in pat.values()) // 1024))
    else:
        print("없음(건너뜀): assets/img/patches/*.webp")
except ImportError:
    print("Pillow 가 없어 캐릭터 증명사진·패치는 넣지 않았어요 (pip install pillow)")

head = ("/* 자동 생성 파일 (python tools/embed_assets.py). 더블클릭(file://)으로 열어도 캔버스에서 읽을 수 있도록\n"
        "   통행 마스크·자격증 배경·패치·캐릭터 증명사진을 데이터로 넣어 둔 것. 그림을 바꾸면 다시 실행하세요. */\n")
js = head + "window.EMBED=" + json.dumps(out) + ";\n"
open(os.path.join(ROOT, "assets", "js", "embedded.js"), "w", encoding="utf-8").write(js)
print("저장: assets/js/embedded.js (%d KB)" % (len(js) // 1024))
