#!/usr/bin/env python3
"""
Consulta a base local ARASAAC.

    python scripts/arasaac_query.py search agua
    python scripts/arasaac_query.py search "comer" --lang pt --limit 20
    python scripts/arasaac_query.py show 2244
    python scripts/arasaac_query.py category "core vocabulary-communication"
    python scripts/arasaac_query.py stats
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "arasaac.sqlite"


def connect() -> sqlite3.Connection:
    if not DB_PATH.exists():
        sys.exit(f"base nao encontrada em {DB_PATH}; rode `arasaac_fetch.py index`")
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    return db


def cmd_search(db: sqlite3.Connection, args: argparse.Namespace) -> None:
    # FTS5 trata caracteres como '-' e '"' como sintaxe; aspas duplas isolam o termo.
    term = '"' + args.term.replace('"', '""') + '"'
    rows = db.execute(
        """
        SELECT f.pictogram_id AS id, f.keyword, f.meaning, p.categories, p.tags
        FROM kw_fts f JOIN pictograms p ON p.id = f.pictogram_id
        WHERE kw_fts MATCH ? AND f.lang = ?
        ORDER BY rank LIMIT ?
        """,
        (term, args.lang, args.limit),
    ).fetchall()
    if not rows:
        print("nada encontrado")
        return
    for r in rows:
        cats = ", ".join(json.loads(r["categories"])[:3])
        print(f"{r['id']:>6}  {r['keyword']:<28} [{cats}]")
        if args.verbose and r["meaning"]:
            print(f"        {r['meaning']}")


def cmd_show(db: sqlite3.Connection, args: argparse.Namespace) -> None:
    p = db.execute("SELECT * FROM pictograms WHERE id=?", (args.id,)).fetchone()
    if not p:
        sys.exit("id inexistente")
    print(f"pictograma {p['id']}")
    print(f"  categorias : {', '.join(json.loads(p['categories']))}")
    print(f"  tags       : {', '.join(json.loads(p['tags']))}")
    flags = [k for k in ("schematic", "aac", "skin", "hair", "sex", "violence") if p[k]]
    print(f"  flags      : {', '.join(flags) or '-'}")
    print("  termos:")
    for k in db.execute(
        "SELECT lang, keyword, plural FROM keywords WHERE pictogram_id=? ORDER BY lang", (args.id,)
    ):
        pl = f"  (pl: {k['plural']})" if k["plural"] else ""
        print(f"    {k['lang']}: {k['keyword']}{pl}")
    print("  imagens:")
    for i in db.execute("SELECT resolution, path, bytes FROM images WHERE pictogram_id=?", (args.id,)):
        print(f"    {i['resolution']:>5}px  {i['path']}  ({i['bytes']/1024:.0f} KB)")


def cmd_category(db: sqlite3.Connection, args: argparse.Namespace) -> None:
    rows = db.execute(
        """
        SELECT p.id, (SELECT keyword FROM keywords k
                      WHERE k.pictogram_id=p.id AND k.lang=? LIMIT 1) AS kw
        FROM pictograms p
        WHERE p.categories LIKE ?
        ORDER BY p.id LIMIT ?
        """,
        (args.lang, f'%"{args.name}"%', args.limit),
    ).fetchall()
    print(f"{len(rows)} pictogramas em '{args.name}'")
    for r in rows:
        print(f"{r['id']:>6}  {r['kw'] or '(sem termo)'}")


def cmd_stats(db: sqlite3.Connection, _: argparse.Namespace) -> None:
    q = lambda s, *a: db.execute(s, a).fetchone()[0]  # noqa: E731
    print(f"pictogramas : {q('SELECT COUNT(*) FROM pictograms')}")
    print(f"keywords    : {q('SELECT COUNT(*) FROM keywords')}")
    print(f"imagens     : {q('SELECT COUNT(*) FROM images')}")
    print(f"bytes img   : {q('SELECT COALESCE(SUM(bytes),0) FROM images')/1e9:.2f} GB")
    print("por idioma:")
    for r in db.execute("SELECT lang, COUNT(*) n FROM keywords GROUP BY lang ORDER BY n DESC"):
        print(f"  {r['lang']:<4} {r['n']:>7}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("search")
    s.add_argument("term")
    s.add_argument("--lang", default="pt")
    s.add_argument("--limit", type=int, default=25)
    s.add_argument("-v", "--verbose", action="store_true")
    s.set_defaults(func=cmd_search)

    h = sub.add_parser("show")
    h.add_argument("id", type=int)
    h.set_defaults(func=cmd_show)

    c = sub.add_parser("category")
    c.add_argument("name")
    c.add_argument("--lang", default="pt")
    c.add_argument("--limit", type=int, default=100)
    c.set_defaults(func=cmd_category)

    t = sub.add_parser("stats")
    t.set_defaults(func=cmd_stats)

    args = ap.parse_args()
    args.func(connect(), args)


if __name__ == "__main__":
    main()
