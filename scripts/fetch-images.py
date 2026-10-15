"""
Outil de préparation des photos (à lancer une seule fois, hors appli).

1. `python scripts/fetch-images.py candidates [slug...]`
   cherche des photos sous licence libre sur Wikimedia Commons et produit une
   planche contact par activité dans .work/cand/<slug>.jpg (+ manifest.json).
2. `python scripts/fetch-images.py download`
   télécharge les photos retenues (scripts/image-picks.json) en 1280 px dans
   public/images/activities/ et régénère public/images/activities/CREDITS.md.

Unsplash bloque les robots et Pexels exige une clé : voir DECISIONS.md.
"""
import io, json, os, re, sys, time, urllib.parse, urllib.request
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK = os.path.join(ROOT, ".work", "cand")
DEST = os.path.join(ROOT, "public", "images", "activities")
PICKS = os.path.join(ROOT, "scripts", "image-picks.json")
UA = "DenicheStudentPrototype/0.1 (HELMo Gramme student project)"

QUERIES = {
    "karting-indoor-herstal": ["indoor karting", "kart track indoor"],
    "karting-circuit-malmedy": ["kart racing", "karting circuit"],
    "bloc-grivegnee": ["bouldering gym", "bouldering wall"],
    "falaise-aywaille": ["rock climbing belgium", "rock climbing rope"],
    "quad-durbuy": ["quad bike forest", "ATV trail"],
    "buggy-aywaille": ["buggy mud", "side by side UTV"],
    "paintball-malmedy": ["paintball forest", "paintball player"],
    "tir-arc-hesbaye": ["archery field target", "archer bow"],
    "kayak-ourthe-durbuy": ["Ourthe kayak", "kayak river Ourthe", "Durbuy Ourthe"],
    "kayak-ambleve-aywaille": ["Amblève canoe", "Amblève river", "canoe river forest"],
    "trail-fagnes-malmedy": ["Hautes Fagnes", "Hautes Fagnes boardwalk", "trail running"],
    "trail-nocturne-seraing": ["trail running forest", "night headlamp", "Seraing"],
    "trottinette-durbuy": ["mountain scooter", "electric scooter offroad", "trottinette"],
    "gaufres-liege": ["Liège waffle", "gaufre de Liège"],
    "ceramique-verviers": ["pottery wheel", "potter throwing"],
    "boulets-herstal": ["boulets à la liégeoise", "meatballs liège", "cooking class"],
    "anes-hesbaye": ["donkey walk", "donkeys meadow", "Hesbaye"],
    "alpagas-verviers": ["alpaca", "alpacas meadow"],
    # Deuxième passe, pour les sujets mal servis par la première recherche
    "falaise-aywaille~2": ["climber limestone cliff", "escalade falaise", "rock climbing outdoor"],
    "quad-durbuy~2": ["quad riding", "ATV mud", "all-terrain vehicle rider"],
    "buggy-aywaille~2": ["off-road buggy", "dune buggy", "UTV mud"],
    "tir-arc-hesbaye~2": ["archer shooting", "archery woman", "field archery"],
    "trail-fagnes-malmedy~2": ["trail runner", "trail running race", "Hautes Fagnes Botrange"],
    "trail-nocturne-seraing~2": ["night trail running", "headlamp forest", "night run"],
    "trottinette-durbuy~2": ["electric kick scooter", "off-road electric scooter", "kick scooter forest"],
    "anes-hesbaye~2": ["donkey", "donkeys", "donkey hiking"],
    "trottinette-durbuy~3": ["trottinette tout terrain", "dirt scooter", "mountain trottinette", "electric scooter forest path"],
    "alpagas-verviers~2": ["alpaca portrait", "alpaca farm", "alpaca herd", "llama walk"],
}

OK_LIC = re.compile(r"^(CC0|Public domain|CC BY(-SA)?( [0-9.]+)?)$", re.I)


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def strip(html):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", html or "")).strip()


def search(q):
    params = {
        "action": "query", "format": "json", "generator": "search",
        "gsrsearch": f"{q} filetype:bitmap", "gsrnamespace": "6", "gsrlimit": "30",
        "prop": "imageinfo", "iiprop": "url|extmetadata|size|mime", "iiurlwidth": "360",
    }
    d = json.loads(get("https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)))
    out = []
    for p in (d.get("query") or {}).get("pages", {}).values():
        ii = p["imageinfo"][0]
        if ii.get("mime") != "image/jpeg":
            continue
        w, h = ii["width"], ii["height"]
        if w < 1400 or not (1.15 <= w / h <= 1.9):
            continue
        md = ii.get("extmetadata", {})
        lic = strip(md.get("LicenseShortName", {}).get("value"))
        if not OK_LIC.match(lic):
            continue
        out.append({
            "title": p["title"], "thumb": ii["thumburl"], "url": ii["url"],
            "page": ii["descriptionurl"], "license": lic,
            "artist": strip(md.get("Artist", {}).get("value"))[:80] or "Auteur inconnu",
            "w": w, "h": h, "index": p.get("index", 99),
        })
    return sorted(out, key=lambda x: x["index"])


def candidates(slugs):
    os.makedirs(WORK, exist_ok=True)
    path = os.path.join(WORK, "manifest.json")
    manifest = json.load(open(path, encoding="utf-8")) if os.path.exists(path) else {}
    for slug in slugs:
        seen, cands = set(), []
        for q in QUERIES[slug]:
            try:
                for c in search(q):
                    if c["title"] not in seen:
                        seen.add(c["title"]); cands.append(c)
            except Exception as e:
                print("ERR", slug, q, e, flush=True)
            time.sleep(0.3)
        cands = cands[:12]
        sheet = Image.new("RGB", (4 * 360, 3 * 260), "white")
        d = ImageDraw.Draw(sheet)
        for i, c in enumerate(cands):
            try:
                im = Image.open(io.BytesIO(get(c["thumb"]))).convert("RGB")
                im.thumbnail((360, 240))
                x, y = (i % 4) * 360, (i // 4) * 260
                sheet.paste(im, (x, y))
                d.rectangle([x, y, x + 34, y + 24], fill="black")
                d.text((x + 6, y + 5), str(i), fill="white")
            except Exception as e:
                print("thumb err", c["title"], e, flush=True)
        sheet.save(os.path.join(WORK, f"{slug}.jpg"), quality=80)
        manifest[slug] = cands
        json.dump(manifest, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(slug, len(cands), flush=True)


def clean_author(a):
    # Certains fichiers Commons mettent la mention de licence dans le champ « auteur ».
    if re.search(r"copyright holder|hereby publish|^Auteur inconnu$", a, re.I):
        return "Contributeur Wikimedia Commons"
    return re.sub(r"^Photo by\s+", "", a).strip()


def download():
    os.makedirs(DEST, exist_ok=True)
    manifest = json.load(open(os.path.join(WORK, "manifest.json"), encoding="utf-8"))
    picks = json.load(open(PICKS, encoding="utf-8"))
    credits = {}
    prev_path = os.path.join(ROOT, "prisma", "image-credits.json")
    previous = {}
    if os.path.exists(prev_path):
        for items in json.load(open(prev_path, encoding="utf-8")).values():
            previous.update({it["file"]: it["source"] for it in items})
    for slug, idxs in picks.items():
        credits[slug] = []
        for n, ref in enumerate(idxs, start=1):
            key, i = (ref.rsplit(":", 1) + ["0"])[:2] if isinstance(ref, str) else (slug, ref)
            c = manifest[key][int(i)]
            name = f"{slug}-{n}.jpg"
            out = os.path.join(DEST, name)
            stale = previous.get(name) not in (None, c["page"])
            if stale or not os.path.exists(out) or Image.open(out).size[0] < 1000:
                # Wikimedia n'accepte que des largeurs de vignette standard (… 960, 1280, 1920)
                thumb = re.sub(r"/\d+px-", "/1280px-", c["thumb"])
                im = Image.open(io.BytesIO(get(thumb))).convert("RGB")
                im.thumbnail((1280, 1280))
                im.save(out, quality=82, optimize=True, progressive=True)
                time.sleep(0.3)
            credits[slug].append({"file": name, "author": clean_author(c["artist"]), "license": c["license"], "source": c["page"]})
            print("ok", name, flush=True)
    json.dump(credits, open(os.path.join(ROOT, "prisma", "image-credits.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    lines = ["# Crédits photos", "",
             "Photos issues de Wikimedia Commons, sous licence libre (CC0, domaine public, CC BY ou CC BY-SA).",
             "Redimensionnées à 1280 px. Les licences CC BY-SA s'appliquent aux images, pas au code.", ""]
    for slug, items in credits.items():
        lines.append(f"## {slug}")
        for it in items:
            lines.append(f"- `{it['file']}` — {it['author']} — {it['license']} — {it['source']}")
        lines.append("")
    open(os.path.join(DEST, "CREDITS.md"), "w", encoding="utf-8").write("\n".join(lines))


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "candidates"
    if cmd == "candidates":
        candidates(sys.argv[2:] or list(QUERIES))
    elif cmd == "download":
        download()
