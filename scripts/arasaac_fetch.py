#!/usr/bin/env python3
"""
Baixa a base completa de pictogramas ARASAAC e monta um indice local.

Subcomandos:
    meta    baixa o catalogo JSON de cada idioma
    images  baixa os PNGs de todos os pictogramas (resolucoes configuraveis)
    index   monta o SQLite (metadados + busca full-text com dobra de acentos)
    all     meta -> images -> index

Os pictogramas ARASAAC sao CC BY-NC-SA. Ver LICENSE-ARASAAC.md.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import urllib.error
import urllib.request

API = "https://api.arasaac.org/api"
CDN = "https://static.arasaac.org/pictograms"
UA = "autista-caa/0.1 (projeto academico de comunicacao alternativa)"

ROOT = Path(__file__).resolve().parent.parent
META_DIR = ROOT / "data" / "raw" / "metadata"
IMG_DIR = ROOT / "data" / "images" / "arasaac"
DB_PATH = ROOT / "data" / "arasaac.sqlite"

# pt primeiro: e o idioma alvo. en/es dao cobertura de busca e desempate semantico.
LANGS = ["pt", "en", "es", "fr", "de", "it", "ca", "gl", "eu", "nl", "pl", "ru"]
RESOLUTIONS = [500, 2500]


def get(url: str, timeout: int = 120, retries: int = 4) -> bytes:
    """GET com backoff exponencial. Levanta a ultima excecao se esgotar."""
    last: Exception | None = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code == 404:  # nao adianta repetir
                raise
            last = e
        except Exception as e:  # noqa: BLE001 - rede: qualquer falha e retentavel
            last = e
        time.sleep(2**attempt)
    raise last  # type: ignore[misc]


# ---------------------------------------------------------------- metadados


def cmd_meta(args: argparse.Namespace) -> None:
    META_DIR.mkdir(parents=True, exist_ok=True)
    for lang in args.langs:
        out = META_DIR / f"pictograms_{lang}.json"
        if out.exists() and not args.force:
            print(f"[meta] {lang}: ja existe, pulando")
            continue
        try:
            blob = get(f"{API}/pictograms/all/{lang}")
        except Exception as e:  # noqa: BLE001
            print(f"[meta] {lang}: FALHOU ({e})")
            continue
        data = json.loads(blob)
        out.write_bytes(blob)
        print(f"[meta] {lang}: {len(data)} pictogramas, {len(blob)/1e6:.1f} MB")


def load_ids() -> list[int]:
    src = META_DIR / "pictograms_pt.json"
    if not src.exists():
        sys.exit("rode `meta` antes de `images`")
    return sorted({p["_id"] for p in json.loads(src.read_text(encoding="utf-8"))})


# ---------------------------------------------------------------- imagens


class Counter:
    def __init__(self, total: int) -> None:
        self.total = total
        self.done = 0
        self.skipped = 0
        self.failed: list[str] = []
        self.bytes = 0
        self.lock = threading.Lock()
        self.t0 = time.time()

    def tick(self, *, skipped: bool = False, nbytes: int = 0, fail: str | None = None) -> None:
        with self.lock:
            self.done += 1
            self.bytes += nbytes
            if skipped:
                self.skipped += 1
            if fail:
                self.failed.append(fail)
            if self.done % 250 == 0 or self.done == self.total:
                el = time.time() - self.t0
                rate = self.done / el if el else 0
                eta = (self.total - self.done) / rate if rate else 0
                print(
                    f"  {self.done}/{self.total}  {self.bytes/1e6:7.1f} MB  "
                    f"{rate:5.1f}/s  eta {eta/60:4.1f} min  "
                    f"skip={self.skipped} fail={len(self.failed)}",
                    flush=True,
                )


def fetch_one(pid: int, res: int, ctr: Counter, force: bool) -> None:
    dest = IMG_DIR / str(pid) / f"{pid}_{res}.png"
    if dest.exists() and dest.stat().st_size > 0 and not force:
        ctr.tick(skipped=True)
        return
    try:
        blob = get(f"{CDN}/{pid}/{pid}_{res}.png", timeout=90)
    except Exception as e:  # noqa: BLE001
        ctr.tick(fail=f"{pid}_{res}: {e}")
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(".part")
    tmp.write_bytes(blob)
    tmp.replace(dest)  # atomico: nunca deixa arquivo truncado no lugar final
    ctr.tick(nbytes=len(blob))


def cmd_images(args: argparse.Namespace) -> None:
    ids = load_ids()
    if args.limit:
        ids = ids[: args.limit]
    jobs = [(pid, res) for pid in ids for res in args.resolutions]
    print(f"[img] {len(ids)} pictogramas x {len(args.resolutions)} resolucoes = {len(jobs)} arquivos")
    ctr = Counter(len(jobs))
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = [ex.submit(fetch_one, pid, res, ctr, args.force) for pid, res in jobs]
        for f in as_completed(futs):
            f.result()
    print(f"[img] concluido: {ctr.bytes/1e9:.2f} GB, {len(ctr.failed)} falhas")
    if ctr.failed:
        log = ROOT / "data" / "failed_images.txt"
        log.write_text("\n".join(ctr.failed), encoding="utf-8")
        print(f"[img] falhas registradas em {log}")


# ---------------------------------------------------------------- indice

SCHEMA = """
CREATE TABLE IF NOT EXISTS pictograms (
    id            INTEGER PRIMARY KEY,
    schematic     INTEGER, sex INTEGER, violence INTEGER,
    aac           INTEGER, aac_color INTEGER,
    skin          INTEGER, hair INTEGER,
    downloads     INTEGER,
    created       TEXT, last_updated TEXT,
    categories    TEXT, tags TEXT, synsets TEXT
);
CREATE TABLE IF NOT EXISTS keywords (
    pictogram_id  INTEGER NOT NULL REFERENCES pictograms(id),
    lang          TEXT NOT NULL,
    keyword       TEXT NOT NULL,
    plural        TEXT,
    meaning       TEXT,
    type          INTEGER,
    has_locution  INTEGER
);
CREATE INDEX IF NOT EXISTS ix_kw_pid  ON keywords(pictogram_id);
CREATE INDEX IF NOT EXISTS ix_kw_lang ON keywords(lang, keyword);
CREATE TABLE IF NOT EXISTS images (
    pictogram_id  INTEGER NOT NULL REFERENCES pictograms(id),
    resolution    INTEGER NOT NULL,
    path          TEXT NOT NULL,
    bytes         INTEGER,
    sha256        TEXT,
    PRIMARY KEY (pictogram_id, resolution)
);
-- remove_diacritics=2 faz "agua" achar "água": essencial pra busca em pt-BR
CREATE VIRTUAL TABLE IF NOT EXISTS kw_fts USING fts5(
    keyword, meaning, lang UNINDEXED, pictogram_id UNINDEXED,
    tokenize='unicode61 remove_diacritics 2'
);
"""


def cmd_index(args: argparse.Namespace) -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    if args.force and DB_PATH.exists():
        DB_PATH.unlink()
    db = sqlite3.connect(DB_PATH)
    db.executescript(SCHEMA)

    files = sorted(META_DIR.glob("pictograms_*.json"))
    if not files:
        sys.exit("nenhum metadado encontrado; rode `meta` antes")

    seen_pict = False
    for f in files:
        lang = f.stem.split("_", 1)[1]
        data = json.loads(f.read_text(encoding="utf-8"))
        # A ficha do pictograma e igual em todo idioma; so os keywords mudam.
        if not seen_pict:
            db.executemany(
                "INSERT OR REPLACE INTO pictograms VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                [
                    (
                        p["_id"], p.get("schematic"), p.get("sex"), p.get("violence"),
                        p.get("aac"), p.get("aacColor"), p.get("skin"), p.get("hair"),
                        p.get("downloads"), p.get("created"), p.get("lastUpdated"),
                        json.dumps(p.get("categories", []), ensure_ascii=False),
                        json.dumps(p.get("tags", []), ensure_ascii=False),
                        json.dumps(p.get("synsets", []), ensure_ascii=False),
                    )
                    for p in data
                ],
            )
            seen_pict = True

        rows = [
            (p["_id"], lang, k.get("keyword"), k.get("plural"),
             k.get("meaning"), k.get("type"), k.get("hasLocution"))
            for p in data
            for k in p.get("keywords", [])
            if k.get("keyword")
        ]
        db.execute("DELETE FROM keywords WHERE lang=?", (lang,))
        db.executemany("INSERT INTO keywords VALUES (?,?,?,?,?,?,?)", rows)
        db.execute("DELETE FROM kw_fts WHERE lang=?", (lang,))
        db.executemany(
            "INSERT INTO kw_fts (keyword, meaning, lang, pictogram_id) VALUES (?,?,?,?)",
            [(r[2], r[4] or "", lang, r[0]) for r in rows],
        )
        print(f"[idx] {lang}: {len(rows)} keywords")

    # catalogo das imagens de fato presentes em disco
    img_rows = []
    for png in IMG_DIR.rglob("*_*.png"):
        pid, res = png.stem.split("_")
        blob = png.read_bytes()
        img_rows.append(
            (int(pid), int(res), str(png.relative_to(ROOT)).replace("\\", "/"),
             len(blob), hashlib.sha256(blob).hexdigest())
        )
    db.executemany("INSERT OR REPLACE INTO images VALUES (?,?,?,?,?)", img_rows)
    print(f"[idx] {len(img_rows)} imagens catalogadas")

    db.commit()
    db.execute("PRAGMA optimize")
    db.close()
    print(f"[idx] pronto: {DB_PATH} ({DB_PATH.stat().st_size/1e6:.1f} MB)")


# ---------------------------------------------------------------- cli


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    m = sub.add_parser("meta")
    m.add_argument("--langs", nargs="+", default=LANGS)
    m.add_argument("--force", action="store_true")
    m.set_defaults(func=cmd_meta)

    i = sub.add_parser("images")
    i.add_argument("--resolutions", nargs="+", type=int, default=RESOLUTIONS)
    i.add_argument("--workers", type=int, default=12)
    i.add_argument("--limit", type=int)
    i.add_argument("--force", action="store_true")
    i.set_defaults(func=cmd_images)

    x = sub.add_parser("index")
    x.add_argument("--force", action="store_true")
    x.set_defaults(func=cmd_index)

    a = sub.add_parser("all")
    a.add_argument("--langs", nargs="+", default=LANGS)
    a.add_argument("--resolutions", nargs="+", type=int, default=RESOLUTIONS)
    a.add_argument("--workers", type=int, default=12)
    a.add_argument("--limit", type=int)
    a.add_argument("--force", action="store_true")
    a.set_defaults(func=lambda ns: (cmd_meta(ns), cmd_images(ns), cmd_index(ns)))

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
