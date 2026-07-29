# Licença dos pictogramas — ARASAAC

Os pictogramas em `data/images/arasaac/` e os metadados em `data/raw/metadata/`
são propriedade do **Governo de Aragão (Espanha)** e foram criados por
**Sergio Palao** para o **ARASAAC** (Portal Aragonés de la Comunicación
Aumentativa y Alternativa).

**Licença: Creative Commons BY-NC-SA 4.0**
<https://creativecommons.org/licenses/by-nc-sa/4.0/deed.pt_BR>

## O que isso obriga

| Cláusula | Consequência prática neste projeto |
|---|---|
| **BY** — Atribuição | Todo produto que exiba os pictogramas precisa creditar, de forma visível: *"Pictogramas: Sergio Palao para ARASAAC (arasaac.org), Governo de Aragão — CC BY-NC-SA"*. Em app, isso vive numa tela "Sobre"/"Créditos" acessível a partir da tela inicial. |
| **NC** — Não comercial | **Não pode** haver versão paga, assinatura, anúncios ou venda destes pictogramas. Distribuição gratuita e uso acadêmico/terapêutico estão liberados. |
| **SA** — Compartilha igual | Qualquer derivado dos pictogramas (recorte, recolorização, remix, prancha montada) herda obrigatoriamente a mesma licença CC BY-NC-SA. |

## Consequência arquitetural

A restrição **NC é viral sobre o conteúdo, não sobre o código**. Portanto:

- O **código** deste repositório pode ter a licença que se quiser (MIT, etc.).
- O **acervo de imagens** fica isolado em `data/`, fora do bundle do código,
  carregado como asset substituível.

Se um dia o projeto precisar de modelo comercial, troca-se o banco de imagens
sem reescrever o app. Alternativas com licença permissiva:

- **Mulberry Symbols** — ~3.000 símbolos em SVG, **CC BY-SA**. É a única
  alternativa madura que permite uso comercial.
- **Global Symbols** — agregador; a licença varia por conjunto, verifique caso a caso.
- Acervo próprio (fotos reais do usuário) — sem restrição.

⚠️ **Sclera não serve como saída**: apesar de frequentemente descrito como
"livre", é **CC BY-NC** — a mesma trava de não comercial. Ver
[REFERENCES.md § 7](REFERENCES.md#7-símbolos--acervos-e-licenças).

## Fonte dos dados

- API: `https://api.arasaac.org/api/pictograms/all/{lang}`
- Imagens: `https://static.arasaac.org/pictograms/{id}/{id}_{res}.png`
- Baixado em: julho de 2026 — 13.801 pictogramas, 12 idiomas
