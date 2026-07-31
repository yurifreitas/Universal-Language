# Levantamento de funcionalidades

Tudo que o app faz hoje, contado do código e não de memória. Serve para decidir
o que construir a seguir sabendo o que já existe — e para achar o que ficou pela
metade.

Levantado em **30/07/2026**.

Legenda de estado: **✔** pronto e em uso · **◐** existe mas incompleto ·
**○** decidido e não construído.

---

## 1. O núcleo — a prancha

| | |
|---|---|
| Pranchas de fábrica | **12** · 221 cards |
| Frases prontas | **125** em 13 grupos |
| Roteiros de fábrica | **5** |
| Acervo de pictogramas | **13.800** buscáveis |
| Léxico | 250 à mão + **4.905** gerados + adivinhação |

As 11 pranchas: Núcleo (32) · Sentimentos (17) · Comida (18) · Pessoas (13) ·
Corpo (14) · Lugares (14) · Ações (16) · Qualidades (13) · Tempo (12) ·
Ligação (24) · Comentar (24) · **Pensar (24)**.

| recurso | estado | onde |
|---|---|---|
| Grade de cards com fala | ✔ | `CardGrid` |
| Barra da frase, montada card a card | ✔ | `SentenceBar` |
| Faixa de núcleo fixa acima da grade | ✔ | `coreStrip.ts` |
| Sugestão da próxima palavra, aprendida da pessoa | ✔ | `predict.ts` |
| Busca no acervo inteiro | ✔ | `search.ts` |
| Favoritos e pranchas próprias | ✔ | `boardEdits.ts` |
| Editor de pranchas e cards | ✔ | `BoardEditor` |
| Histórico do que já foi dito | ✔ | `storage.ts` |
| Trocar a forma da palavra na frase | ✔ | `alternativas.ts` |

---

## 2. O motor de frases

O maior investimento do projeto: **2.263 linhas** em `grammar.ts`, 212 casos de
teste e uma auditoria de 800 mil frases por rodada.

| recurso | estado |
|---|---|
| Conjugação: presente, passado, futuro, imperfeito | ✔ |
| Imperativo, subjuntivo presente e futuro | ✔ |
| Concordância de gênero e número | ✔ |
| Artigo decidido por contexto (e escolhível por card) | ✔ |
| Negação posicional, escopo por card, "nem" em série | ✔ |
| Pergunta, pedido, progressivo, plural | ✔ |
| Listas, coordenação, orações justapostas e encaixadas | ✔ |
| Regência de verbo e de substantivo | ✔ |
| Vocativo (chamar antes de falar) | ✔ |
| Caso oblíquo, contração `com`+pronome | ✔ |
| `tem` existencial | ✔ |
| Variedade regional (5) e registro (coloquial/normativo) | ✔ |
| Nível de fala: mamãe / mãe / minha mãe | ✔ |
| Reordenar palavra já escolhida | ○ | 
| Explicar a frase palavra a palavra | ○ |
| Modo telegráfico de verdade (tirar artigo por escolha) | ○ |

Os três ○ dependem da **árvore** (`ARVORE.md`): tipos e verificação existem
(`arvore.ts`, 13 testes), mas ela **não alimenta o app**.

---

## 3. Acesso e conforto — o que torna o app usável por quem precisa dele

Esta é a seção que costuma faltar em app de CAA, e aqui ela é das mais completas.

| recurso | estado |
|---|---|
| Varredura linha-coluna, velocidade ajustável | ✔ |
| Varredura auditiva (voz secundária anuncia) | ✔ |
| Earcons — som de passo, seleção, remoção | ✔ |
| Navegação por teclado com foco itinerante | ✔ |
| Diálogos conforme WAI-ARIA (foco preso, devolvido) | ✔ |
| Alto contraste | ✔ |
| Tipografia para dislexia | ✔ |
| Fonte, corpo, entreletras e entrelinhas ajustáveis | ✔ |
| Conforto sensorial contínuo (0–100) | ✔ |
| Cor por classe gramatical (Fitzgerald) | ✔ |
| Modo travado com destravar por pressão longa | ✔ |
| Colunas ajustáveis (alvo maior) | ✔ |
| Botão "voltar" do Android fecha painel, não o app | ✔ |
| Funciona offline | ◐ | 
| Auditoria de acessibilidade automatizada | ○ |

O ◐ do offline é o buraco mais concreto do app: o service worker existe e o
código funciona sem rede, mas **os pictogramas não estão no precache**. Uma
prancha de fábrica instalada e aberta pela primeira vez sem internet abre sem
imagem. Custo medido para resolver: **229 imagens, 2,2 MB, 1,24 % do acervo**.

---

## 4. Módulos — todos desligados por padrão

### Sempre visíveis

| módulo | o que tem | estado |
|---|---|---|
| **Frases** | 125 frases, 13 grupos, busca, escrever a própria | ✔ |
| **Roteiros** | 5 de fábrica + próprios, ensaio passo a passo, contagem | ✔ |
| **Achar** | jogo de achar a palavra — 3 modos (nome, inicial, silêncio), pista progressiva, embalo | ✔ |
| **Números** | 5 modos: números, contas, dinheiro, horas, símbolos | ✔ |
| **Progresso** | diário de prática — nunca pontua comunicação | ✔ |

### Ligáveis em Ajustes

| módulo | o que tem | estado |
|---|---|---|
| **Padrões visuais** | 4 tipos: o que vem depois, qual não pertence, está para, o que combina — com perfil de por onde a pessoa entra | ✔ |
| **Matemática avançada** | 4 modos a mais: frações, tabuada, formas, sequências | ✔ |
| **Poesia** | 6 modelos, contagem de sílabas, busca de rima no vocabulário da pessoa | ✔ |
| **Estúdio de formas** | 5 geradores (forma, mandala, caleidoscópio, roseta, tesselação) + pilha de 13 blocos, salvar criações | ✔ |

### De cuidador, no menu ⋯

| recurso | estado |
|---|---|
| Objetivos individuais com registro diário e leitura da semana | ✔ |
| Editor de pranchas | ✔ |
| Ajustes (~30 opções) | ✔ |
| Ajuda e atalhos | ✔ |
| Exportar / importar tudo | ◐ |

---

## 5. O que o levantamento revelou

Três coisas que só aparecem vendo a lista inteira de uma vez.

**A lógica já começou, sem ter sido chamada de lógica.** Os blocos do Estúdio
(`repetir`, `grade`, `radial`, aninhamento) são laço e composição; os Padrões
são sequência, categoria e analogia. São as duas metades de um mesmo assunto,
moram em módulos separados e nenhum dos dois se apresenta como raciocínio. É o
buraco mais evidente da lista — e é o que a seção 6 propõe.

**A prancha não fala sobre a própria prancha.** Há 13 grupos de frases e nenhum
sobre pensar: "eu acho que", "por quê", "se... então", "primeiro... depois",
"igual", "diferente". Sem essas palavras não há como discordar, supor ou
explicar — e a prancha de fábrica hoje não deixa.

**Um módulo pesado está a um passo de existir.** `formas.ts` (591 linhas) e
`blocos.ts` (577) foram construídos e estão ligados só ao Estúdio. A execução de
blocos já é um interpretador com custo estimado; falta pouco para ser o motor de
uma área de lógica de verdade.

---

## 6. Proposta — a seção de Lógica

Não é módulo novo do zero: é dar nome e lugar ao que já existe, e completar.

### O que reaproveita

- O executor de blocos de `blocos.ts` — já roda pilha com aninhamento.
- Os 4 tipos de desafio de `padroes.ts` e o perfil de "por onde você entra".
- Os geradores de `formas.ts` como saída visual imediata.

### O que acrescenta

1. **Causa e efeito** — "se eu apertar, acontece". O primeiro raciocínio, e o
   único pré-requisito real dos outros.
2. **Sequência de ações** — ordenar passos de uma rotina. Liga direto com
   Roteiros, que já tem as rotinas prontas.
3. **Verdadeiro / falso sobre o que está na tela** — julgar uma afirmação, que
   é o que falta para discordar.
4. **Condição** — "se X então Y" como bloco visual, sem sintaxe.
5. **Classificar por duas regras ao mesmo tempo** — cor *e* forma. O salto de
   uma dimensão para duas é onde o raciocínio realmente muda.

### O que precisa vir junto, na prancha

Uma prancha **Pensar** de fábrica: `acho que` · `talvez` · `porque` · `se` ·
`então` · `igual` · `diferente` · `antes` · `depois` · `verdade` · `mentira` ·
`não sei` · `e se` · `mesmo` · `outro`.

Sem isso, a seção de Lógica ensina a raciocinar num lugar onde a pessoa não pode
dizer o que concluiu — o que seria o inverso do objetivo do app.

### As travas que valem aqui

As mesmas de sempre, e uma a mais:

- Nasce **desligada**, como todo módulo.
- **Não pontua** — nem tempo, nem nota, nem comparação. Vale a regra do diário.
- **Sem texto obrigatório**: tudo tem de ser resolvível apontando.
- E a nova: **errar não pode ter penalidade nenhuma**. Numa área de raciocínio a
  tentação de marcar erro é grande, e é exatamente onde ela faz mais dano.
