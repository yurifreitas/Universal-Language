# Plano de escala — padronização, offline e fundamentação gramatical

Este documento não é lista de desejos. É a **ordem de execução** de um trabalho
que já tem duas bases prontas e um problema aberto sério, com as tarefas
quebradas pequenas o bastante para caberem numa sessão cada.

Complementa [ROADMAP.md](ROADMAP.md) (o que o app ainda não é),
[GRAMMAR.md](GRAMMAR.md) (o que o motor faz) e
[LANGUAGE-SYSTEMS.md](LANGUAGE-SYSTEMS.md) (por que as decisões têm a forma que
têm).

---

## 0. O que já existe, nos dois lados

| | **Fala** (`autista/`) | **Desenhos para pintar** (`Pictures/Desenhos para pintar/`) |
|---|---|---|
| Natureza | Prancha de CAA | Gerador de SVG para colorir |
| Build | Vite + TypeScript + React | **Nenhum** — abre o `index.html` e roda |
| Módulos | ESM tipado, um arquivo por assunto | Scripts globais em ordem no `<script>` |
| Dados | `boards.json`, `search.json` (sem envelope) | `dataset.json` **com envelope versionado** |
| Testes | 4 suítes, 175 casos, esbuild + node | Nenhum |
| Offline | PWA, mas **213 MB de imagem** em runtime cache | Total — SVG é gerado na hora, byte nenhum baixado |
| Idioma do código | Domínio em pt-BR, docs longos no cabeçalho | Igual |

**As duas bases têm o mesmo DNA e convenções opostas.** O DNA — browser puro,
offline, sem servidor, dado versionado, domínio em português — é o que se
aproveita. As convenções é o que se padroniza.

### O problema aberto

O Fala serve **13.801 imagens WebP, ~213 MB**, do próprio site. A decisão está
certa (nada sai para terceiros; CDN de terceiro num app de CAA revela
diagnóstico e rotina de quem usa), mas **não escala**: o repositório carrega
213 MB, o precache do service worker teve de excluir as imagens, e a primeira
vez que cada card aparece ainda depende de rede. Isso é o Eixo C, e é a única
parte do plano onde a resposta ainda não está decidida.

---

## Eixo A — Padronização de arquivos

**Objetivo:** um arquivo novo, em qualquer um dos dois projetos, ter forma
óbvia antes de alguém abrir. Isso não é estética: é o que faz o projeto
suportar mais gente e mais tempo sem virar dois estilos brigando.

### A1. Escrever `PADROES.md` — o contrato dos arquivos
**Tamanho:** 1 sessão · **Depende de:** nada

Um documento curto e normativo, com exemplo bom e exemplo ruim de cada regra:

- **Cabeçalho obrigatório** em todo módulo: o que é, **por que existe**, e a
  decisão que ele carrega. É o que os dois projetos já fazem bem — só falta
  estar escrito como regra em vez de hábito.
- **Um assunto por arquivo**, nome do arquivo = nome do assunto, em pt-BR
  quando for domínio (`grammar.ts` é exceção herdada; novos vão em pt-BR:
  `poesia.ts`, `padroes.ts`, `objetivos.ts`, `diario.ts`).
- **Lógica pura em `lib/`, tela em `components/`.** Nada de `localStorage`,
  `document` ou `window` dentro de `lib/` — exceto `storage.ts`, que é a
  fronteira declarada.
- **Aleatoriedade e relógio entram por parâmetro** (`aleatorio: () => number`,
  `agora: Date`). Já é a regra de fato em `game.ts`, `padroes.ts` e
  `diario.ts` — o que permite testar.
- **Comentário explica o porquê, nunca o quê.** Se o comentário descreve o
  código, apaga-se o comentário; se descreve a decisão, ele fica para sempre.

**Pronto quando:** o documento existe e três arquivos existentes são citados
como exemplo de cada regra.

### A2. Envelope versionado em todo dado
**Tamanho:** 1 sessão · **Depende de:** A1

O projeto de desenhos já acerta: `{ versao, atualizadoEm, descricao, ...dados }`.
O Fala serve `boards.json` como array cru — quando o formato mudar, nada avisa.

- Envelopar `boards.json` e `search.json`.
- `lib/storage.ts` passa a ler `versao` e migrar explicitamente (já há um
  precedente bom: a migração `palette` → `sensory`).
- Toda chave de `localStorage` já tem `:v1` — documentar isso como regra e
  criar `migracoes.ts` com uma função por salto de versão.

**Pronto quando:** carregar um dado de versão desconhecida mostra recado claro
em vez de quebrar, e há um teste para isso.

### A3. Registro declarativo de módulo
**Tamanho:** 2 sessões · **Depende de:** A1

O `dataset.json` dos desenhos descreve cada gerador com
`{ id, nome, icone, descricao, porque, faixaEtaria, areas, params }`. **É o
melhor artefato dos dois projetos** e não tem equivalente no Fala, onde os
módulos (jogo, ensaio, padrões, poesia, matemática) estão descritos só em
prosa dentro do código.

- Criar `lib/modulos.ts` com o mesmo esquema, um registro por módulo.
- Ajustes, menu "Mais" e o painel de Progresso passam a **derivar do registro**
  em vez de repetir rótulo, ícone e explicação em três lugares.
- `areas` reaproveita a taxonomia pronta dos desenhos (visual, motora,
  espacial, criativa, atenção, padrões, linguagem, emocional).

**Pronto quando:** acrescentar um módulo é acrescentar uma entrada, e nenhuma
tela precisa ser editada.

### A4. Núcleo compartilhado entre os dois projetos
**Tamanho:** 3 sessões · **Depende de:** A2, A3

- Extrair para `nucleo/` o que é comum: envelope de dados, taxonomia de áreas,
  esquema de parâmetros, utilidades de SVG.
- Publicado como **ESM puro, sem build** — assim o projeto de desenhos, que
  não tem build, importa o mesmo arquivo que o Fala compila.
- O Fala consome via `import`; os desenhos via `<script type="module">`.

**Pronto quando:** a taxonomia de áreas existe em um lugar só e os dois
projetos leem dela.

---

## Eixo B — Aproveitar os geradores no Fala

**Objetivo:** 26 geradores de SVG que rodam no navegador, sem rede e sem peso,
resolvem de uma vez três coisas que hoje custam imagem ou não existem.

### B1. Portar o núcleo de geração para ESM tipado
**Tamanho:** 2 sessões · **Depende de:** A4

`generators.js` tem 55 KB de funções globais. Portar **os cinco de simetria**
primeiro (forma, mandala, caleidoscópio, roseta, tesselação), que são os que o
Fala usa nos Eixos B2 e B3.

- Assinatura padronizada: `(params, aleatorio) => string` devolvendo SVG.
- Sem `document` dentro do gerador — string entra, string sai, testável.

**Pronto quando:** há teste de regressão comparando a saída de cada gerador
com um SVG golden, e a mesma semente devolve sempre o mesmo desenho.

### B2. Padrões visuais com formas geradas
**Tamanho:** 1 sessão · **Depende de:** B1

O módulo de Padrões hoje desenha em CSS quatro formas (círculo, quadrado,
triângulo, losango) — suficiente para começar, pobre para durar. Com os
geradores, a dificuldade passa a ter faixas de verdade: simetria, rotação,
número de elementos, aninhamento.

**Pronto quando:** há três níveis de dificuldade e nenhum deles usa imagem.

### B3. Estúdio de formas — o "Scratch de imagens"
**Tamanho:** 3 sessões · **Depende de:** B1

O `studio.js` do projeto de desenhos é a peça mais valiosa dos dois projetos e
não tem equivalente em nenhum app de CAA que eu conheça: uma **fonte** (um
gerador) e uma **pilha de blocos** executada de cima para baixo — repetir,
grade, radial, mover, escalar, girar, espelhar —, com laços que aninham.

Por que isto vale numa prancha de comunicação: **laço e aninhamento são a
primeira lógica de programação que alguém aprende, e aqui eles aparecem sem
texto e sem sintaxe.** Dá para construir uma ideia complexa sem escrever uma
linha nem ler uma palavra — que é exatamente a condição de quem usa CAA e é
sistematicamente subestimado por causa dela.

- Motor em `lib/blocos.ts`, puro: string de SVG entra, string sai.
- Laços aninhados precisam de teto: `custoEstimado` avisa antes de a tela travar.
- Animação SMIL desligável — quem pediu menos movimento não recebe tela girando.

**Pronto quando:** dá para empilhar três blocos, ver o resultado ao vivo e
salvar o desenho, tudo offline.

### B3b. Módulo "Pintar" — atividade nova
**Tamanho:** 3 sessões · **Depende de:** B1, A3

A tela de pintar do projeto de desenhos, embarcada como módulo opcional
(desligado por padrão, como todos). Pintar região a região é **coordenação
motora fina e figura-fundo** — as mesmas habilidades que sustentam achar a
célula na prancha, que é o que o jogo "Cadê?" treina do outro lado.

- Reaproveitar a paleta e o zoom/pan que já existem lá.
- O desenho pintado entra na Coleção e pode virar card de prancha própria.

**Pronto quando:** dá para gerar, pintar, salvar e usar como card, offline.

### B4. Pictogramas de emergência gerados
**Tamanho:** 2 sessões · **Depende de:** B1

Hoje, quando um `.webp` não carrega, o card cai num fallback de **duas letras**.
Para quem não lê, isso é a célula deixando de existir. Um gerador determinístico
(mesma palavra → mesmo desenho) dá uma figura estável e reconhecível no lugar.

**Pronto quando:** desligar a rede e limpar o cache ainda deixa toda célula com
figura distinguível.

---

## Eixo C — Imagens (o problema em aberto)

**Objetivo:** manter a garantia — nada sai para terceiros — e sair dos 213 MB.
Esta é a única parte do plano que começa por **medir**, não por implementar.

### C1. Medir antes de decidir — ✅ **FEITO**
**Tamanho:** 1 sessão · **Depende de:** nada

Medido em 30/07/2026, com `web/public/pictos` e as 11 pranchas de fábrica:

| | |
|---|---|
| Acervo completo | **13.801 arquivos · 175,4 MB** |
| Peso por arquivo | média 13,0 KB · p50 12,3 KB · p95 23,7 KB · maior 80,1 KB |
| **O que o app usa sem busca** | **229 ids distintos · 2,2 MB** |
| Proporção | **1,24 % do acervo** |

Os 229 são 184 das pranchas de fábrica mais 45 da faixa de núcleo, das frases
prontas e dos roteiros. As 11 pranchas somam de 12 a 32 cards cada.

**O número decide o eixo inteiro.** A dúvida era se valeria a pena separar
essencial de acervo; a resposta é que **98,76 % do peso serve só à busca**, que
por definição é exploração de quem acompanha — não o caminho de quem está
falando. Não há trade-off a discutir: C2 vira execução, não investigação.

Fica pendente só o que exige rede para medir: quanto AVIF economizaria sobre
WebP, e o tempo do primeiro uso de um card em 3G.

### C2. Camadas de acervo — **decidido por C1**
**Tamanho:** 2 sessões · **Depende de:** C1 ✅

| Camada | O que tem | Peso | Onde vive |
|---|---|---|---|
| **Essencial** | os 229 do uso sem busca | **2,2 MB** | no bundle, **no precache** |
| **Sob demanda** | o resto do acervo | 173 MB | runtime cache, como hoje |
| **Pacote** | acervo inteiro, um `.zip` | 173 MB | baixado uma vez, por escolha |

O terceiro item é o que resolve a escola sem internet: o cuidador baixa uma vez,
em casa, e o aparelho fica completo.

A mudança que mais rende é a primeira linha, e é pequena: `build_web_images.py`
passa a emitir os 229 numa pasta própria, e o `globPatterns` do service worker
— que hoje exclui `pictos/**` inteiro — passa a incluí-la. **Custo: 2,2 MB de
precache. Ganho: a prancha de fábrica inteira funciona no primeiro uso, sem
nenhum toque online.** Hoje ela não funciona.

**Pronto quando:** com o cache limpo e o avião ligado, as 11 pranchas de fábrica
abrem com todas as figuras.

### C3. Escolha explícita de acervo
**Tamanho:** 1 sessão · **Depende de:** C2

Um ajuste que diz o que está baixado, quanto ocupa, e permite baixar o pacote
completo ou apagá-lo. Sem número escondido: quem usa um aparelho emprestado
precisa saber o que está gastando.

### C4. Investigar acervo alternativo
**Tamanho:** 2 sessões · **Depende de:** C1

ARASAAC é CC BY-NC-SA — bom, mas não comercial, o que limita distribuição. Vale
levantar acervos com licença mais livre e medir cobertura em português, sem
trocar nada por enquanto. **Decisão só depois dos números.**

---

## Eixo D — Fundamentação gramatical em lote

**Objetivo:** o motor de frases tem 125 casos de regressão. O espaço de
combinações é de ordem de **centenas de milhares**. Este eixo constrói a
ferramenta que percorre esse espaço por horas, separa o suspeito, e transforma
revisão humana em teste permanente.

> **Isto não é um servidor.** É uma ferramenta de construção que roda na
> máquina de quem desenvolve e cospe um arquivo. O app publicado continua
> estático, offline e sem back-end — essa garantia não se negocia. O "backend"
> aqui é **de qualidade**, não de produção.

### D1. Enumerador do espaço de combinações
**Tamanho:** 2 sessões · **Depende de:** nada

Um script que gera o produto cartesiano de:

`sujeito × verbo × complemento × tempo × negação × pergunta × progressivo ×
pedido × plural × artigo × gênero do falante × região × registro`

Com 8 regiões e 2 registros, o espaço passa de 10⁵ facilmente. O enumerador
precisa saber **amostrar** — cobertura combinatória de pares e trios, não força
bruta cega.

**Pronto quando:** `node ferramentas/enumerar.mjs --amostra=pares` devolve um
JSONL com entrada e saída do motor para cada caso.

### D2. Detectores automáticos de suspeita
**Tamanho:** 3 sessões · **Depende de:** D1

Nenhum detector decide sozinho; todos apenas **separam para revisão**:

- **Invariantes duras** — o motor nunca acrescenta palavra de conteúdo, nunca
  reordena o que a pessoa escolheu, nunca perde uma palavra. Violação aqui é
  erro certo, não suspeita.
- **Concordância** — gênero e número entre determinante, substantivo e
  adjetivo.
- **Regência e preposição** — `ir a`, `gostar de`, `precisar de`.
- **Diferença entre regiões** — se trocar a região muda algo que não seja
  léxico nem tratamento, é bandeira vermelha.
- **Diferença entre registros** — coloquial e normativo devem diferir só onde
  GRAMMAR.md diz que diferem.
- **Duplicação e repetição** — "a a água", "de de".

**Pronto quando:** rodar sobre a amostra devolve um relatório ordenado por
gravidade, com contagem por detector.

### D3. Fila de revisão humana
**Tamanho:** 2 sessões · **Depende de:** D2

Uma página estática local (sem build, no espírito do projeto de desenhos) que
mostra um caso por vez: entrada, saída, detector que disparou. Três botões:
**certo**, **errado**, **não sei**. Grava em `revisao.jsonl`.

- Agrupa casos idênticos em forma: revisar um resolve mil.
- Guarda quem revisou e quando — revisão de gramática é trabalho de linguista,
  e o registro é o que permite auditar depois.

**Pronto quando:** dá para revisar 200 casos em meia hora sem sair do teclado.

### D4. Corpus revisado vira teste
**Tamanho:** 1 sessão · **Depende de:** D3

Tudo que foi marcado **certo** vira arquivo golden versionado; tudo **errado**
vira caso de regressão que deve falhar até ser corrigido.

- `npm run test:corpus` roda o corpus inteiro.
- Uma mudança no motor que altere qualquer saída aprovada **falha o teste**, e
  a diferença aparece caso a caso.

**Pronto quando:** o corpus tem 5.000 casos aprovados e a suíte roda em menos
de 30 segundos.

### D5. Cobertura como número, não como sensação
**Tamanho:** 1 sessão · **Depende de:** D4

Relatório do que o corpus cobre: quais combinações de marcadores, quantos
verbos por conjugação, quais regiões. **Buraco de cobertura vira tarefa
automaticamente.**

**Pronto quando:** `npm run cobertura` imprime o que ainda não foi visto.

### D5b. A árvore — a mudança estrutural
**Tamanho:** contínuo · **Depende de:** D2

A auditoria em lote mostrou que os defeitos que sobram são todos do mesmo tipo:
o motor decide numa passada só e não pode rever. A resposta é uma árvore
sintática entre a decisão e a escrita — raiz, tronco, galho, folha.

Desenho completo, defeitos que ela resolve caso a caso, e a estratégia de troca
por **comparação diferencial** (os dois motores sobre os mesmos 20.000 casos)
em [ARVORE.md](ARVORE.md). `web/src/lib/arvore.ts` tem os tipos, os percursos e
a verificação estrutural das garantias; o construtor ainda não alimenta o app.

### D6. Rodada longa
**Tamanho:** contínuo · **Depende de:** D5

Com D1–D5 prontos, a ferramenta roda por horas sem supervisão, acumula
suspeitas, e a revisão vira trabalho de fundo — meia hora por dia, indefinidamente.
É assim que se chega a uma gramática fundamentada de verdade: não numa
sessão heroica, mas em muitas sessões curtas com ferramenta boa.

---

## Eixo E — Qualidade contínua

### E1. CI mínimo
**Tamanho:** 1 sessão · **Depende de:** nada

`typecheck`, `test`, `build` a cada push. Já existe `.github/` — falta o fluxo.

### E2. Orçamento de tamanho
**Tamanho:** 1 sessão · **Depende de:** C2

Teto declarado para JS, CSS e precache. Estourar reprova o build. Sem isso, o
Eixo C se desfaz sozinho em seis meses.

### E3. Acessibilidade automatizada
**Tamanho:** 2 sessões · **Depende de:** E1

`axe` sobre as telas principais, em claro/escuro/alto contraste. Não substitui
teste com quem usa — pega o que é mecânico e libera atenção humana para o que
não é.

### E4. Testes de tela sem navegador
**Tamanho:** 2 sessões · **Depende de:** E1

Hoje toda verificação de componente é feita à mão no navegador. Um runner leve
sobre os painéis pega regressão de estado — o `MathPanel` com teclado fora de
ordem, por exemplo, teria sido pego aqui.

---

## Ordem sugerida

```
A1 ──► A2 ──► A3 ──► A4 ──► B1 ──┬─► B2
                                  ├─► B3
                                  └─► B4
C1 ──► C2 ──► C3        C1 ──► C4
D1 ──► D2 ──► D3 ──► D4 ──► D5 ──► D6
E1 ──► E3, E4           C2 ──► E2
```

Três frentes independentes. **A e D podem correr em paralelo desde já** — não
se tocam. **C começa por medir** e só decide depois. **B espera A4**, senão o
porte dos geradores nasce fora do padrão que o Eixo A está criando.

### Primeira semana, se fosse hoje

1. **A1** — escrever `PADROES.md` (meia sessão, destrava tudo)
2. **D1** — enumerador (é o que rende mais por hora investida)
3. **C1** — medir as imagens (é barato e muda o resto do plano)
4. **E1** — CI (uma vez, protege para sempre)

---

## O que este plano preserva, aconteça o que acontecer

Estas quatro coisas não são negociáveis por nenhuma tarefa acima. Se uma tarefa
exigir quebrar uma delas, a tarefa está errada.

1. **O app abre e funciona offline.** Sem servidor, sem conta, sem rede.
2. **Nada sai para terceiros.** Quem usa uma prancha de CAA revela diagnóstico
   e rotina em cada toque.
3. **A parte simples continua simples.** Todo módulo novo nasce desligado. Uma
   prancha precisa funcionar para quem só quer pedir água.
4. **Célula não muda de lugar.** Nenhuma otimização, dado ou recurso justifica
   mover uma posição que a mão já aprendeu.
