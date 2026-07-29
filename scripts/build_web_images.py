#!/usr/bin/env python3
"""
Converte o acervo local de PNG 500px para WebP 320px em web/public/pictos/.

Por que nao servir do CDN da ARASAAC: o app precisa funcionar offline de
verdade e sem depender de terceiro. Por que nao embarcar os PNGs originais:
300 MB (500px) e 2,9 GB (2500px) sao pesados demais para um repositorio.

320px e o alvo certo: numa grade de 5 colunas em tablet de 1024px cada card
ocupa ~200 CSS px; a 2x de DPR isso da ~400 px de dispositivo, e 320 cobre bem
sem inflar o repo. WebP lossy q85 preserva arte chapada sem artefato visivel.

Nota: lossless FICA MAIOR depois do resize (a reamostragem cria gradientes que
destroem a eficiencia de paleta do PNG original), por isso lossy.
"""

from __future__ import annotations

import argparse
import sys
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow ausente: pip install pillow")

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "images" / "arasaac"
DEST = ROOT / "web" / "public" / "pictos"

SIZE = 320
QUALITY = 85


def convert(src: Path) -> int:
    """Devolve os bytes escritos, ou 0 se ja existia."""
    pid = src.parent.name
    out = DEST / f"{pid}.webp"
    if out.exists() and out.stat().st_size > 0:
        return 0
    with Image.open(src) as im:
        im = im.convert("RGBA").resize((SIZE, SIZE), Image.LANCZOS)
        tmp = out.with_suffix(".tmp")
        im.save(tmp, "WEBP", quality=QUALITY, method=4)
    tmp.replace(out)
    return out.stat().st_size


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--limit", type=int)
    args = ap.parse_args()

    DEST.mkdir(parents=True, exist_ok=True)
    files = sorted(SRC.glob("*/*_500.png"))
    if args.limit:
        files = files[: args.limit]
    if not files:
        sys.exit(f"nenhum PNG 500px em {SRC}")

    print(f"[webp] {len(files)} pictogramas -> {SIZE}px q{QUALITY}")
    total = done = skipped = 0
    with ProcessPoolExecutor(max_workers=args.workers) as ex:
        futs = {ex.submit(convert, f): f for f in files}
        for fut in as_completed(futs):
            n = fut.result()
            total += n
            done += 1
            skipped += n == 0
            if done % 1000 == 0:
                print(f"  {done}/{len(files)}  {total/1e6:6.1f} MB", flush=True)

    written = done - skipped
    print(f"[webp] {written} convertidos, {skipped} ja existiam, {total/1e6:.0f} MB")


if __name__ == "__main__":
    main()
