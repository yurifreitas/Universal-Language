#!/usr/bin/env python3
"""
Gera os datasets que o front-end consome, a partir de data/arasaac.sqlite.

Saidas em web/public/data/:
    boards.json   pranchas curadas (vocabulario-nucleo pt-BR resolvido a pictogramas)
    search.json   indice leve de busca sobre os 13.801 pictogramas (carga tardia)

Por que curar em vez de exportar a categoria crua: a categoria
`core vocabulary-communication` tem 647 linhas em pt, cheias de duplicatas
(varios pictogramas para a mesma palavra, varios sinonimos por pictograma).
Uma prancha de CAA precisa de UMA celula estavel por conceito.
"""

from __future__ import annotations

import json
import sqlite3
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "arasaac.sqlite"
OUT_DIR = ROOT / "web" / "public" / "data"

# O acervo pt da ARASAAC e portugues EUROPEU: "sanita", "autocarro", "sumo",
# "saltar", "comboio", "camiao", "telemovel", "frigorifico". Para um app
# brasileiro o rotulo exibido tem de ser pt-BR, entao aqui mapeamos o termo
# brasileiro para o(s) termo(s) de busca lusitanos. O `label` mostrado ao
# usuario e sempre o nosso, nunca o da base.
ALIASES: dict[str, list[str]] = {
    "banheiro": ["casa de banho", "sanita"],
    "bravo": ["zangado", "irritado"],
    "animado": ["contente", "alegre"],
    "entediado": ["aborrecido"],
    "suco": ["sumo"],
    "parque": ["parque infantil"],
    "ônibus": ["autocarro"],
    "pular": ["saltar"],
    "fome": ["ter fome"],
    "sede": ["ter sede"],
    "trem": ["comboio"],
    "caminhão": ["camião"],
    "celular": ["telemóvel"],
    "geladeira": ["frigorífico"],
}

# Vocabulario-nucleo pt-BR. A ordem importa: em CAA a posicao da celula e
# memoria motora, entao ela nunca deve ser reordenada por frequencia de uso.
BOARDS: list[dict] = [
    {
        "id": "nucleo",
        "name": "Núcleo",
        "icon": "★",
        "words": [
            "eu", "você", "querer", "não", "sim", "mais", "acabou", "ajudar",
            "gostar", "ir", "vir", "parar", "dar", "pegar", "olhar", "fazer",
            "comer", "beber", "brincar", "dormir", "banheiro", "dor",
            "meu", "aqui", "agora", "depois", "onde", "quem",
            "abrir", "fechar", "esperar", "terminar",
        ],
    },
    {
        "id": "sentimentos",
        "name": "Sentimentos",
        "icon": "☺",
        "words": [
            "feliz", "triste", "bravo", "medo", "cansado", "animado",
            "calmo", "nervoso", "entediado", "envergonhado", "sozinho",
            "doente", "fome", "sede", "confuso", "orgulhoso", "amar",
        ],
    },
    {
        "id": "comida",
        "name": "Comida",
        "icon": "🍎",
        "words": [
            "água", "suco", "leite", "pão", "arroz", "feijão", "fruta",
            "banana", "maçã", "bolo", "biscoito", "macarrão", "carne",
            "ovo", "queijo", "sorvete", "iogurte", "chocolate",
        ],
    },
    {
        "id": "pessoas",
        "name": "Pessoas",
        "icon": "👤",
        "words": [
            "mãe", "pai", "irmão", "irmã", "avó", "avô", "amigo",
            "professor", "médico", "família", "bebê", "menino", "menina",
        ],
    },
    {
        "id": "corpo",
        "name": "Corpo",
        "icon": "✋",
        "words": [
            "cabeça", "barriga", "mão", "pé", "olho", "ouvido", "boca",
            "nariz", "dente", "braço", "perna", "costas", "garganta", "cabelo",
        ],
    },
    {
        "id": "lugares",
        "name": "Lugares",
        "icon": "🏠",
        "words": [
            "casa", "escola", "quarto", "cozinha", "parque", "rua", "loja",
            "hospital", "carro", "ônibus", "praia", "cama", "mesa", "porta",
        ],
    },
    {
        "id": "acoes",
        "name": "Ações",
        "icon": "⚡",
        "words": [
            "correr", "pular", "sentar", "levantar", "andar", "escrever",
            "ler", "desenhar", "cantar", "dançar", "lavar", "vestir",
            "escovar os dentes", "tomar banho", "ouvir", "falar",
        ],
    },
    {
        "id": "qualidades",
        "name": "Qualidades",
        "icon": "◐",
        "words": [
            "grande", "pequeno", "quente", "frio", "sujo", "limpo",
            "rápido", "devagar", "bonito", "muito", "pouco", "novo", "velho",
        ],
    },
    {
        "id": "tempo",
        "name": "Tempo",
        "icon": "◷",
        "words": [
            "hoje", "amanhã", "ontem", "manhã", "tarde", "noite",
            "dia", "semana", "mês", "ano", "antes", "depois",
        ],
    },
]


def fold(s: str) -> str:
    """Minusculas sem acento — mesma normalizacao do FTS (remove_diacritics 2)."""
    return "".join(
        c for c in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(c) != "Mn"
    )


def load_pt_index(db: sqlite3.Connection) -> dict[str, list[sqlite3.Row]]:
    """Termo pt normalizado -> linhas candidatas. Uma varredura, nao uma por palavra."""
    idx: dict[str, list[sqlite3.Row]] = {}
    for r in db.execute(
        """
        SELECT k.pictogram_id AS id, k.keyword, k.plural,
               p.aac, p.schematic, p.violence, p.sex, p.skin, p.hair
        FROM keywords k JOIN pictograms p ON p.id = k.pictogram_id
        WHERE k.lang = 'pt'
        """
    ):
        idx.setdefault(fold(r["keyword"]), []).append(r)
    return idx


def resolve(idx: dict[str, list[sqlite3.Row]], word: str) -> dict | None:
    """
    Escolhe UM pictograma para a palavra pt-BR, caindo nos alias pt-PT se preciso.
    Desempate, em ordem:
      1. flag `aac` (desenhado especificamente para CAA)
      2. NAO esquematico (mais concreto, melhor para iniciante)
      3. sem flag de violencia/sexo
      4. menor id (pictogramas antigos sao os mais consolidados do acervo)
    """
    cands: list[sqlite3.Row] = []
    for term in [word, *ALIASES.get(word, [])]:
        cands = idx.get(fold(term), [])
        if cands:
            break
    if not cands:
        return None
    best = sorted(
        cands,
        key=lambda r: (
            not r["aac"],
            bool(r["schematic"]),
            bool(r["violence"]) or bool(r["sex"]),
            r["id"],
        ),
    )[0]
    return {
        "id": best["id"],
        "label": word,
        "plural": best["plural"],
        "skin": bool(best["skin"]),
        "hair": bool(best["hair"]),
    }


def main() -> None:
    if not DB_PATH.exists():
        sys.exit("rode arasaac_fetch.py index antes")
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    idx = load_pt_index(db)
    out_boards, missing = [], []
    for b in BOARDS:
        cards = []
        for w in b["words"]:
            c = resolve(idx, w)
            if c:
                cards.append(c)
            else:
                missing.append(f"{b['id']}/{w}")
        out_boards.append({"id": b["id"], "name": b["name"], "icon": b["icon"], "cards": cards})
        print(f"[board] {b['name']:<14} {len(cards)}/{len(b['words'])}")

    (OUT_DIR / "boards.json").write_text(
        json.dumps(out_boards, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )

    # indice de busca: um registro por pictograma, termos pt deduplicados
    idx: dict[int, set[str]] = {}
    for r in db.execute("SELECT pictogram_id, keyword FROM keywords WHERE lang='pt'"):
        idx.setdefault(r["pictogram_id"], set()).add(r["keyword"])
    search = [{"i": pid, "k": sorted(kws)} for pid, kws in sorted(idx.items())]
    (OUT_DIR / "search.json").write_text(
        json.dumps(search, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )

    print(f"\n[out] boards.json  {(OUT_DIR/'boards.json').stat().st_size/1024:.0f} KB")
    print(f"[out] search.json  {(OUT_DIR/'search.json').stat().st_size/1024:.0f} KB "
          f"({len(search)} pictogramas)")
    if missing:
        print(f"\n[!] {len(missing)} palavras sem pictograma exato: {', '.join(missing)}")


if __name__ == "__main__":
    main()
