# Universal-Language

Prancha de **Comunicação Alternativa e Aumentativa (CAA)**: o usuário toca
cards com pictogramas e o dispositivo fala. Acervo completo do **ARASAAC**,
voz em português, funciona offline.



🌐 **[Abrir o app](https://yurifreitas.github.io/Universal-Language/)**
📚 **[Referências, metodologias e normas](REFERENCES.md)** — a base documental de
cada decisão de projeto

> ⚠️ Os pictogramas são **CC BY-NC-SA**. Leia [LICENSE-ARASAAC.md](LICENSE-ARASAAC.md)
> antes de qualquer decisão de produto — a cláusula NC impede monetização.

## Conteúdo

| Item | Volume |
|---|---|
| Pictogramas | **13.801** |
| Idiomas de metadados | **12** (pt, en, es, fr, de, it, ca, gl, eu, nl, pl, ru) |
| Termos indexados | **~262.000** |
| Imagens PNG | **27.602** (13.801 × 500px e 2500px) |
| Tamanho em disco | ~2,7 GB |
| Categorias distintas | 567 |
| Tags distintas | 526 |

## Estrutura

```
data/
  raw/metadata/pictograms_{lang}.json   catálogo bruto da API, por idioma
  images/arasaac/{id}/{id}_{res}.png    500px (UI) e 2500px (impressão/hi-dpi)
  arasaac.sqlite                        índice consultável + busca full-text
scripts/
  arasaac_fetch.py                      meta | images | index | all
  arasaac_query.py                      search | show | category | stats
```

## Uso

```bash
python scripts/arasaac_fetch.py all          # baixa tudo e indexa (retomável)
python scripts/arasaac_query.py search agua  # busca ignora acentos
python scripts/arasaac_query.py show 2244
python scripts/arasaac_query.py category "core vocabulary-communication"
python scripts/arasaac_query.py stats
```

O download é **retomável**: arquivos já presentes são pulados, e a escrita é
atômica (`.part` → `rename`), então uma interrupção nunca deixa PNG truncado.

## Índice SQLite

`pictograms` (ficha), `keywords` (termos por idioma), `images` (arquivos em
disco com sha256) e `kw_fts` — tabela virtual FTS5 com
`tokenize='unicode61 remove_diacritics 2'`, para que **"agua" encontre "água"**.
Sem isso a busca em pt-BR falha exatamente onde mais importa: usuário digitando
rápido, sem acento.

---

# Aplicativo web

PWA em Vite + React + TypeScript, publicado no GitHub Pages. Toque no card →
o dispositivo fala. Funciona offline depois da primeira visita.

```bash
cd web
npm install
npm run dev                     # desenvolvimento
BASE_PATH=/ npm run build       # build para raiz de domínio
npm run build                   # build para GitHub Pages (/Universal-Language/)
```

## Decisão: as imagens são servidas pelo próprio site, não por CDN

O app **não** consome `static.arasaac.org`. Todos os 13.801 pictogramas vão no
build, em `web/public/pictos/{id}.webp`.

| | |
|---|---|
| Acervo bruto local | 3,2 GB (500px + 2500px PNG) — não vai para o repo |
| Embarcado no site | **184 MB** — 13.801 WebP de 320px, qualidade 85 |
| Bundle JS + CSS | 214 KB (62 KB gzip) |

Por que 320px: numa grade de 5 colunas em tablet de 1024px cada card ocupa
~200 CSS px; a 2× de DPR isso dá ~400 px de dispositivo. E por que *lossy*:
WebP lossless fica **maior** depois do resize — a reamostragem cria gradientes
que destroem a eficiência de paleta do PNG original.

O que se ganha abrindo mão do CDN:

- **Offline de verdade.** Sem depender de um primeiro toque online por card.
- **Privacidade.** Nenhuma requisição sai para terceiros. Quais pictogramas uma
  pessoa usa revela diagnóstico e rotina — é dado sensível, e mandá-lo para um
  servidor externo a cada toque não se justifica.
- **Durabilidade.** O app não quebra se o CDN mudar de rota ou sair do ar.

O que se perde: as variantes de tom de pele e cor de cabelo, que só existiam via
API da ARASAAC. Elas foram removidas das configurações. O caminho para
recuperá-las sem CDN é pré-gerar a combinação escolhida no build.

## Service worker

O shell (HTML/JS/CSS, 210 KB) entra no precache. Os 13.801 `.webp` **não** —
seriam 184 MB baixados na primeira visita. Ficam em `CacheFirst`, permanentes
após o primeiro uso de cada card. `search.json` (513 KB) é `StaleWhileRevalidate`
e só carrega quando a busca abre.

## Navegação e métodos de acesso

Nem todo usuário aponta. Este é o eixo que separa um app de CAA sério de um app
de figuras. Fundamentação em [REFERENCES.md § 5](REFERENCES.md).

| Acesso | Como |
|---|---|
| **Toque / mouse** | Seleção direta |
| **Teclado** | Setas movem o foco na grade (padrão *Grid* do WAI-ARIA, com roving tabindex); `Home`/`End`, `PageUp`/`PageDown` |
| **Varredura linha-coluna** | A grade percorre as linhas sozinha; acionar entra na linha, acionar de novo seleciona |
| **Switch** | `Espaço`/`Enter` — é como switches comerciais se apresentam ao sistema |
| **Toque longo** | Fala o card **sem** inseri-lo na frase — explorar sem consequência |

Atalhos: `1`–`9` trocam de prancha, `B` abre a busca, `Backspace` apaga o último
card, `Esc` interrompe a varredura. A tela **Ajuda** documenta tudo no próprio app.

A varredura volta às linhas sozinha se a linha terminar sem acionamento — um erro
não pode prender a pessoa dentro de uma linha. Velocidade regulável de 0,4 s a
3 s; o valor certo é individual e clínico, e 1,2 s é só um ponto de partida.

**Favoritos** vivem numa prancha própria, acrescentada ao fim. Personalizar é
essencial, mas não pode custar a estabilidade posicional das células já
aprendidas.

## Decisões de acessibilidade

- **Alvo mínimo de 88px.** WCAG 2.2 exige 24×24 px no nível AA (SC 2.5.8) e
  44×44 px no AAA (SC 2.5.5). Usamos 88 — 3,7× o AA. CAA com dificuldade motora
  precisa de muito mais. As colunas são reguláveis de 2 a 8 — menos colunas,
  alvos maiores.
- **Posição de célula nunca muda.** Nada de reordenar por frequência ou
  "recentes no topo": o aprendizado se apoia em memória motora, e mover a célula
  apaga o que a pessoa aprendeu.
- **Modo bloqueado** esconde busca e configurações. Sai com pressão longa de 2
  segundos, para que um toque acidental não tire a criança da prancha.
- **Fallback textual** quando a imagem falha — sem isso, a pessoa perde a
  capacidade de dizer aquela palavra.
- **Alto contraste** é uma paleta separada (preto/branco puros, bordas grossas),
  não um tema escuro turbinado.
- **Sem shimmer** no carregamento: animação chamativa compete com o pictograma
  pela atenção de quem tem sensibilidade sensorial.
- `prefers-reduced-motion` respeitado; `touch-action: manipulation` elimina zoom
  por duplo-toque.

## Deploy

`.github/workflows/deploy.yml` faz checkout → `npm ci` → typecheck → build →
publica em Pages. O `BASE_PATH` deriva do nome do repositório, então funciona em
`yurifreitas.github.io/Universal-Language/` sem editar o `vite.config.ts`.

Em **Settings → Pages**, escolha *Source: GitHub Actions*.

---

# Análise da base — o que ela permite e onde ela falha

## 1. Vocabulário-núcleo já vem demarcado

A categoria `core vocabulary-communication` tem **357 pictogramas**, e a tag
`core vocabulary` marca **855**. Isso é o ativo mais valioso do acervo.

Em CAA, ~80% do que uma pessoa fala no dia sai de ~200 palavras-núcleo
("quero", "mais", "acabou", "não", "ir", "ajuda"). A tentação de um app novo é
exibir os 13.801 símbolos; o resultado é uma pessoa perdida navegando categorias
em vez de comunicando. **A tela inicial deve sair dessa categoria, não do
catálogo inteiro.** O resto é periferia, alcançável por busca.

Distribuição por categoria (top 10), que confirma o viés do acervo:

| Categoria | Pictogramas |
|---|---|
| verb | 2.674 |
| signaling system | 491 |
| qualifying adjective | 462 |
| professional | 424 |
| core vocabulary-communication | 357 |
| routine | 300 |
| land transport | 285 |
| disruptive behavior | 259 |
| country | 249 |
| commercial building | 216 |

2.674 verbos é uma cobertura excelente — verbos são o gargalo da maioria dos
acervos de CAA, porque são difíceis de desenhar.

## 2. Português **não** tem áudio gravado — TTS é obrigatório

Achado decisivo. O campo `hasLocution` por idioma:

| Idioma | Termos | Sem termo | Com locução |
|---|---:|---:|---:|
| en | 26.513 | 0 | 9.744 |
| fr | 25.981 | 105 | 10.195 |
| de | 24.482 | 3 | 8.987 |
| pl | 22.887 | 1.089 | 10.196 |
| it | 22.403 | 2 | 9.754 |
| gl | 22.145 | 271 | **0** |
| es | 21.014 | 0 | 12.235 |
| ru | 20.535 | 661 | 10.880 |
| ca | 20.288 | 75 | 9.760 |
| **pt** | **20.049** | **1** | **0** |
| eu | 19.948 | 1.485 | **0** |
| nl | 15.807 | 3.669 | **0** |

Espanhol tem 12.235 locuções; **português tem zero**. Consequências:

- A voz do app tem de vir de **síntese (TTS)**. Não há atalho por áudio pronto.
- TTS de sistema (Android/iOS) é gratuito e offline, mas soa robótico e sempre
  adulto — para uma criança de 6 anos, isso é uma voz errada, e a voz *é* a
  identidade do usuário no ato de falar.
- Vale prever, desde o schema, um campo de **áudio gravado pelo cuidador** por
  card, sobrepondo o TTS. É barato de implementar e resolve o problema de voz
  melhor que qualquer engine.

A cobertura de português é sólida em quantidade (20.049 termos, apenas **1**
pictograma sem tradução), então a lacuna é só de áudio, não de vocabulário.

## 3. Plurais vêm prontos, mas conjugação não

**11.261** termos em pt trazem campo `plural` preenchido. Isso permite que o
card "bola" vire "bolas" sem tabela externa.

O que **não** existe é flexão verbal — 2.674 verbos, todos no infinitivo. Um app
que queira montar "eu **quero** água" em vez de "eu querer água" precisa de uma
camada de conjugação em pt-BR própria. É o maior trabalho linguístico do
projeto, e nenhum concorrente brasileiro resolve bem.

## 4. Variantes de pele e cabelo: 6.316 pictogramas

`skin: true` em **6.316** e `hair: true` em **2.686**. A API gera variantes sob
demanda (`?skin=white|black|assian|mulatto|aztec`, `?hair=blonde|brown|red|
black|gray|darkGray|darkBrown`).

**Não foram baixadas de propósito**: 5 tons × 7 cabelos seriam ~220 mil arquivos
extras. O certo é gerá-las sob demanda na configuração inicial do usuário — a
criança deve se ver no pictograma que a representa, mas só precisa de *uma*
combinação, não de 35.

## 5. Flags de curadoria que o app precisa respeitar

- `violence: 106` e `sex: 77` — precisam de filtro por faixa etária/contexto.
  Existem por bons motivos (comunicar dor, denúncia de abuso, educação sexual),
  mas não podem estar no vocabulário padrão de uma criança.
- `schematic: 3.712` — versão esquemática, mais abstrata. Útil para usuários
  avançados; ruim como padrão para iniciantes.
- `aac: 858` / `aacColor: 159` — símbolos desenhados especificamente para CAA.
- `disruptive behavior: 259` — categoria voltada a manejo comportamental. Uso
  delicado: serve para o usuário *comunicar* estado, não para o cuidador
  policiá-lo.

## 6. O acervo "pt" e portugues EUROPEU

Descoberto ao resolver o vocabulario-nucleo: a base traz `sanita` (nao
banheiro), `autocarro` (nao onibus), `sumo` (nao suco), `saltar` (nao pular),
`comboio` (nao trem), `camiao` (nao caminhao), `telemovel` (nao celular),
`frigorifico` (nao geladeira).

Um app brasileiro que exiba os termos da base direto soa estrangeiro — e em CAA
o rotulo e o que o cuidador le em voz alta e o que o TTS fala. Por isso
`scripts/build_web_data.py` mantem um mapa `ALIASES` pt-BR -> pt-PT: **a busca
usa o termo lusitano, o rotulo exibido e sempre o brasileiro**. Sem esse mapa,
10 das 149 palavras do nucleo ficavam sem pictograma; com ele, 149/149 resolvem.

## 7. Limitações da fonte

- **Sem SVG.** O CDN só entrega PNG (`.svg` retorna 404). Em 2500px dá para
  imprimir e para telas hi-dpi, mas não há vetor para recolorir programaticamente.
- **Sem embeddings.** Busca é lexical (FTS5). Digitar "sede" não encontra "água".
  Um índice semântico sobre os `synsets` (WordNet, já presentes nos metadados) ou
  sobre embeddings dos termos resolveria — é o próximo salto de qualidade da busca.
- **Cláusula NC.** Trava qualquer modelo comercial. Ver LICENSE-ARASAAC.md.

## Próximos passos sugeridos

1. Extrair o subconjunto núcleo (357 + 855 tags) como grade inicial fixa.
2. Camada de conjugação verbal pt-BR sobre os 2.674 verbos.
3. Índice semântico via `synsets` para busca por intenção.
4. Schema de personalização: foto própria e áudio do cuidador sobrepondo o card.
5. ~~Protótipo consumindo esta base~~ — feito.
6. Validar a curadoria das 149 palavras com fonoaudiólogos.
7. Varredura auditiva (as opções faladas), para quem não enxerga a grade.
