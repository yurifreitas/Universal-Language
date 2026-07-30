# Roadmap — conversa do cotidiano, navegação e estrutura

Este documento não é lista de funcionalidades. É a ordem em que os problemas
aparecem para quem usa, com a razão de cada prioridade. Funcionalidade sem
problema atrás é peso morto num app que precisa abrir rápido e funcionar
offline.

Complementa [GRAMMAR.md](GRAMMAR.md) (o que o motor faz),
[SENSORY.md](SENSORY.md) (cor, tipografia, som) e
[LANGUAGE-SYSTEMS.md](LANGUAGE-SYSTEMS.md) (por que as decisões têm a forma que
têm).

---

## 0. Onde o app está hoje

| Camada | Estado |
|---|---|
| Vocabulário | 9 pranchas fixas, 149 células curadas + 13.801 pictogramas por busca |
| Frase | motor com conjugação, concordância, coordenação, regionalismo — 66 casos de regressão |
| Atalhos | 7 grupos de frases prontas, 5 roteiros, favoritos, histórico |
| Personalização | editor de cards e pranchas, perfil exportável |
| Acesso | toque, teclado, varredura linha-coluna, varredura auditiva |
| Sensorial | conforto contínuo, dislexia, alto contraste, earcons |
| Telas | mobile-first verificado em 320 / 390 / 780 px |

**O que isso ainda não é:** um app de *conversa*. Tudo acima serve a **emitir**
mensagem. Conversa é outra coisa — tem duas pontas, turnos, reparo, história
compartilhada e assunto. É aí que está a maior lacuna, e é o eixo 1 abaixo.

---

## Eixo 1 — Conversa do cotidiano

O problema real: uma prancha excelente produz **falas isoladas**. A pessoa pede
água, diz que dói, responde sim. O que ela ainda não consegue é **participar de
uma conversa** — entrar, sustentar, mudar de assunto, contar o que aconteceu.

A literatura de CAA chama isso de diferença entre *necessidade* e
*participação social*, e é a queixa mais recorrente de quem usa: o aparelho
resolve o pedido e falha na convivência.

### 1.1 Falas de manutenção de conversa (alta prioridade, custo baixo)

Palavras que não têm conteúdo mas seguram o turno:

> "sério?" · "que legal" · "e aí?" · "conta mais" · "eu também" · "nossa" ·
> "deixa eu ver" · "espera" · "hmm" · "sei lá" · "tanto faz"

São curtas, altíssima frequência, e hoje exigem montar frase. Numa conversa
real, montar frase **é perder o turno**. Devem ficar a um toque, numa faixa
sempre visível — não dentro de um painel.

**Por que primeiro:** custo de implementação baixo, ganho de participação alto,
e é o que separa "responder" de "conversar".

### 1.2 Contar o que aconteceu

Hoje o app fala no presente e no passado, mas não ajuda a **narrar**. Falta:

- **conectivos de narrativa** — "aí", "depois", "porque", "mas", "quando"
- **prancha de eventos recentes** alimentada pelo cuidador ("hoje teve
  educação física", "a vó veio")
- o motor não trata **subordinação** ("quando eu cheguei", "porque eu queria")

Sem isso a pessoa não conta o dia dela, que é o conteúdo de quase toda conversa
familiar.

**Dependência:** exige o eixo 2 do motor (subordinação).

### 1.3 Perguntar

O app responde bem e pergunta mal. Uma conversa em que um lado só responde não
é conversa — é entrevista. Faltam perguntas prontas e fáceis:

> "e você?" · "o que você acha?" · "cadê…?" · "por que?" · "quando?" ·
> "posso?" · "você viu?"

**Nota de projeto:** o marcador `?` já existe, mas transformar afirmação em
pergunta exige montar a afirmação antes. Pergunta precisa de caminho próprio.

### 1.4 Assuntos (topic boards)

Pranchas por assunto, não por classe de palavra: futebol, desenho animado,
escola, animais, música, jogo. É como conversa real se organiza — por tema, não
por gramática.

O editor já permite criar pranchas; o que falta é **conteúdo pronto** e a noção
de "assunto ativo" que muda o vocabulário sugerido.

---

## Eixo 2 — Motor de frases: o que ainda não existe

Em ordem de impacto sobre conversa real:

1. **Subordinação** — "quando eu chegar", "porque eu quero", "se você deixar",
   "que nem ontem". É o que permite narrar e justificar. Hoje o motor só faz
   coordenação.
2. **Pretérito imperfeito fora do progressivo** — "eu comia", "a gente ia".
   Tempo da narrativa habitual; sem ele, contar rotina fica travado.
3. **Pronome possessivo de 3ª** — "o carro dele", "a mãe dela".
4. **Comparação** — "maior que", "igual", "mais que você".
5. **Quantidade e número** — "dois biscoitos", "muitos".

Todos são incrementos sobre a arquitetura atual, e todos devem entrar com casos
no `npm run test:grammar` antes de entrar na interface.

---

## Eixo 3 — Navegação

O problema: **sete botões na barra e nove pranchas em abas** já é o limite do
que se acha sem procurar. Cada recurso novo piora isso, e recurso que não se
acha não existe.

### 3.1 O que já foi feito

- barra separada em *falar* e *ajustar*
- ajustes com índice de seções no celular (nove grupos deixaram de ser um túnel)
- abas com rolagem lateral em vez de quebra de linha

### 3.2 O que falta

**Voltar previsível.** O botão físico "voltar" do Android fecha o app em vez de
fechar o painel. Painel aberto deveria empilhar no histórico do navegador.
*Custo baixo, incômodo alto.*

**Um caminho, não seis.** Frases, Roteiros e Busca são três portas para
"encontrar o que dizer". Poderiam ser uma só superfície com filtros. Exige
desenho antes de código.

**Acesso rápido sem entrar em painel.** As falas do item 1.1 não podem morar
atrás de um botão. Provavelmente uma faixa fixa, configurável, acima ou abaixo
da prancha.

**Voz do próprio aparelho para navegar.** Quem usa varredura hoje só varre a
grade — não varre as abas, nem a barra de frases prontas. A varredura precisa
alcançar a interface inteira, senão metade do app é inacessível a quem mais
depende dele. **Esta é a maior dívida de acessibilidade em aberto.**

---

## Eixo 4 — Estrutura do código

O que já dói:

- **`SettingsPanel.tsx` com 560 linhas.** Cada seção deveria ser um componente
  próprio; o arquivo já é difícil de editar sem quebrar coisa ao lado.
- **`styles.css` com 1.700 linhas num arquivo só.** Precisa virar camadas
  (tokens, base, componentes, responsivo) — de preferência com `@layer`, que
  também resolve a briga de especificidade entre alto contraste e conforto
  sensorial.
- **Sem teste de componente.** Só o motor tem rede. Uma quebra de layout ou de
  foco só aparece quando alguém olha.
- **Armadilha recorrente do grid.** Toda grade precisa de
  `grid-template-columns: minmax(0, 1fr)`; já mordeu em `.app`, `.overlay`,
  `.settings`, `.settings__group` e `.field`. Merece um comentário no topo do
  arquivo e, idealmente, um padrão de base aplicado a `display: grid`.

---

## Eixo 5 — O que precisa ser verificado com gente, não com código

Nada abaixo se resolve programando melhor:

1. **Nenhum recurso foi testado com o público-alvo.** Tudo é aplicação fiel de
   literatura. A primeira sessão com um fonoaudiólogo vale mais que os próximos
   dez recursos.
2. **A velocidade de varredura certa é clínica**, e 1,2 s é chute.
3. **Os earcons não foram testados** quanto a discriminabilidade.
4. **A tabela de regionalismos tem ~20 palavras** e fronteira dialetal não
   coincide com fronteira de estado.
5. **As frases prontas são um chute informado.** Quais faltam só se descobre
   observando alguém usar.

---

## Sequência sugerida

| Ordem | O quê | Por quê |
|---|---|---|
| 1 | Falas de manutenção de conversa (1.1) + faixa fixa (3.2) | maior ganho por linha de código; muda o app de "pedir" para "conversar" |
| 2 | Voltar do Android fecha painel (3.2) | incômodo diário, custo baixo |
| 3 | Varredura alcançar a interface inteira (3.2) | maior dívida de acessibilidade |
| 4 | Subordinação e imperfeito (2.1, 2.2) | destrava narrar o dia |
| 5 | Perguntar (1.3) | conversa deixa de ser entrevista |
| 6 | Quebrar `SettingsPanel` e `styles.css` (4) | antes que o custo de mexer trave o resto |
| 7 | Assuntos (1.4) | depende de conteúdo curado, não só de código |

O item 5 do eixo 5 — sentar com quem usa — deveria acontecer **entre o 1 e o
2**, não no fim. Toda a ordem acima é hipótese até lá.

---

## Adendo — o que a revisão por agentes mudou (2026)

Cinco levantamentos em paralelo (léxico, frases, vocabulário das pranchas,
regras do motor, literatura recente) mais dois de aprofundamento (abordagens
atípicas, organização de vocabulário). O que saiu deles:

### Feito

| O quê | Origem |
|---|---|
| Prancha **Comentar** | Spencer, Tönsing & Dada (2025): 14 estudos sobre comentar contra centenas sobre pedir |
| **Faixa de núcleo** em todas as pranchas | consenso unânime de Proloquo2Go, LAMP WFL e Grid 3 |
| **Faixa de sugestão** da própria pessoa | Predictive Anchoring; ressalva de Valencia et al. (CHI 2023) sobre perda de agência |
| **Subordinação** e **futuro do subjuntivo** | revisão do motor: "porque", "quando", "se" produziam frase quebrada |
| **Registro coloquial** nas frases prontas | incoerência: o app abre em coloquial e falava em normativo |
| Seis grupos de frases de casa | as sete existentes eram todas de vida pública |
| **ABNT NBR 17225:2025** declarada | norma brasileira de acessibilidade web, publicada em março de 2025 |

### Não feito — e por quê

**Agrupar símbolos por cor dentro de cada prancha.** É a evidência experimental
mais forte de todo o levantamento (Wilkinson et al., replicado em TEA e Down:
busca significativamente mais rápida quando símbolos de cor semelhante ficam
contíguos, com rastreio ocular mostrando fixação em distratores na condição
espalhada). **Tem prazo:** é reordenação dentro da prancha, e depois que alguém
aprende as posições vira violação do LAMP. Fazer agora ou nunca — e a decisão é
de produto, não técnica.

**Reorganizar as pranchas por rotina em vez de por categoria.** A evidência diz
que crianças pequenas organizam por evento, não por categoria (Fallon, Light &
Achenbach, 2003) — mas três estudos compararam grade esquemática com
taxonômica e **empataram**. A única vantagem significativa é de **cena visual
integrada**, que é outra arquitetura. Reorganizar não compra nada.

**Cenas visuais com fotos do ambiente da criança.** É onde está a única
vantagem estatisticamente significativa sobre grades (Drager et al.,
2003/2004). Continua fora de escopo, mas deixou de ser "talvez um dia": é a
melhoria com maior evidência ainda não implementada.

### Abordagens atípicas que valem a pena, em ordem de retorno

1. **Modo auditivo de varredura** com earcons por categoria — reaproveita
   `useScanning.ts`, `speech.ts` e `audio.ts` quase inteiros. É o único caminho
   para quem não enxerga a grade.
2. **Filtro de toque involuntário** (dwell mínimo + janela de bloqueio após
   seleção) — poucas linhas, e é o problema que o Livox resolveu para o público
   de paralisia cerebral.
3. **Texto dinâmico (T2L)** — a palavra escrita aparece grande e some junto com
   a fala ao tocar o card. Evidência publicada (Penn State), mudança trivial.
4. **Modo interlocutor** — a frase em tela cheia para virar o aparelho ao
   parceiro. Resgata o que o Talking Brooch (1973) fazia e a grade moderna
   perdeu: o interlocutor olha o rosto, não o tablet.
5. **Import/export OpenBoard (.obf/.obz)** — pranchas montadas por
   fonoaudiólogos em outros apps entrariam neste. Interoperabilidade em vez de
   mais um silo.
