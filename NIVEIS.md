# Níveis, limites e abordagens do motor

Até onde o motor de frases chega, onde ele para, por quê, e quais caminhos
existem para ir além.

Existe porque "melhorar a gramática" não é uma direção — é oito direções
diferentes com custos diferentes, e sem uma escala não dá para saber se uma
mudança é um degrau ou um enfeite.

Escrito em **31/07/2026**. Complementa `GRAMMAR.md` (o que o motor faz),
`ARVORE.md` (a arquitetura proposta) e `ferramentas/gramatica/REVISAO.md` (como
se audita).

---

## 1. A escala

Oito níveis. Cada um pressupõe o anterior, e cada um custa mais que o anterior —
não em linhas de código, mas em **quanta informação a decisão exige**.

| | nível | o que exige | estado |
|---|---|---|---|
| **N0** | Telegráfico | nada — imprime os cards | ✔ (é o fallback) |
| **N1** | Morfologia local | a palavra e a vizinha | ✔ |
| **N2** | Regência e valência | o que o verbo exige do complemento | ✔ |
| **N3** | Oração completa | a oração inteira | ✔ |
| **N4** | Várias orações | a frase inteira | ✔ |
| **N5** | Revisão da decisão | **poder voltar atrás** | ✗ |
| **N6** | Discurso | as frases anteriores | ✗ |
| **N7** | Pragmática | quem ouve, onde, e para quê | ✗ |

### N1 — morfologia local
Concordância de gênero e número, artigo, plural, conjugação.
`ÁGUA · QUENTE` → "a água quente". Decide olhando uma ou duas posições.

### N2 — regência e valência
O verbo diz o que o complemento precisa: `GOSTAR` pede "de", `DAR` pede duas
coisas e a segunda recebe, `TER` sem sujeito e com pergunta é existência.
`DAR · ÁGUA · MÃE` → "dá água **pra** mãe", e não "da mãe".

### N3 — oração completa
Cópula inserida onde não há verbo, negação com escopo, pergunta, imperativo,
sujeito composto, sujeito posposto na interrogativa.
`ONDE · ESTAR · MÃE` → "onde **está** a mãe?".

### N4 — várias orações
Coordenação, justaposição com vírgula, subordinação com conectivo, encaixe com
"que" — e a distinção entre subjuntivo e indicativo, que é o que separa pedir de
afirmar.
`EU · ACHAR · MÃE · VIR` → "eu acho que a mãe **vem**".
`EU · QUERER · VOCÊ · VIR` → "eu quero que você **venha**".

**É aqui que o motor está**, e com folga: 227 casos fixados e 800.160 frases por
rodada de auditoria sem violação.

### N5 — revisão da decisão
Tirar o artigo por escolha. Modo telegráfico de verdade. Explicar a frase palavra
por palavra. Desfazer *uma* inserção específica.

Tudo isso exige uma coisa só que o motor não tem: **poder rever uma decisão já
tomada**. Ver seção 2.

### N6 — discurso
Saber que "ele" na segunda frase é o "pai" da primeira. Não repetir o sujeito.
Responder "sim" a uma pergunta que ficou no ar.

Exige memória entre enunciados — e memória entre enunciados é registro do que a
pessoa disse, o que esbarra na decisão de privacidade do projeto. Não é
impossível; é uma escolha que ainda não foi feita.

### N7 — pragmática
Falar diferente com a mãe e com a professora. Saber que "quero água" na escola é
pedido e em casa é aviso. Escolher o nível de polidez pela situação.

O app já tem os **controles** disso — registro, variedade regional, nível de fala
— mas quem os move é uma pessoa em Ajustes, não o motor. Automatizar exigiria o
motor saber onde a pessoa está e com quem fala, que é exatamente o dado que este
projeto decidiu não coletar.

---

## 2. Os três tetos

Não são bugs. São consequências da forma do motor, e nenhuma quantidade de regra
nova as remove.

### Teto 1 — a passada única

O motor percorre os cards da esquerda para a direita **uma vez** e escreve
conforme decide. Uma decisão tomada na posição 2 não pode ser revista quando a
posição 5 mostra que ela estava errada.

Quase todo defeito difícil desta sessão foi um caso disso, e a cura sempre foi a
mesma gambiarra: **olhar mais à frente antes de decidir**. `next`, ignorando a
negação. `modalAindaAberto`. `proximoIgnorandoNegacao`. `pendingIntensidade`, que
segura uma palavra até a cópula existir. `infinitivoDaPreposicao`, que marca um
verbo que ainda não chegou.

Cada uma funciona. Somadas, são a admissão de que a forma está errada: **o motor
está simulando uma segunda passada com espiadela e memória**, e simulação de
árvore não vira árvore.

O que este teto impede: tudo do N5.

**Saída:** `ARVORE.md`. Tipos, percursos e verificação estrutural já existem em
`web/src/lib/arvore.ts`, com 13 testes. Não alimenta o app.

### Teto 2 — a forma não carrega o significado

O léxico infere gênero e plural muito bem porque são propriedades
**morfológicas**: a palavra carrega o sinal na terminação.

Comportamento não. *"Dar" rege dois complementos e "danar" não, e as duas
terminam igual.* Ver `LEXICO-PADRAO.md` § 7.

Consequência prática: as seis marcas de comportamento vêm de lista declarada, e
lista declarada tem o tamanho que alguém escreveu. Hoje: **44 dos 978 verbos** do
acervo. Amostrado, quase todos os 934 restantes são verbos de ação concreta que
corretamente não levam marca — mas isso é estimativa por amostra, não medida.

**Saída:** nenhuma automática. Ou alguém revisa, ou fica assim. É o argumento
mais forte a favor de uma fila de revisão humana com prioridade por frequência.

### Teto 3 — nenhum contexto além da frase

O motor recebe uma lista de cards e devolve um texto. Não sabe o que foi dito
antes, quem está por perto, nem que horas são.

Isso é **decisão, não limitação acidental**: guardar essas coisas é guardar o que
a pessoa fala, e a regra 2 do projeto diz que nada sai do aparelho. Mas nada
impede que fique *no* aparelho — a decisão de não guardar é mais forte do que a
regra exige, e vale saber que ela é uma escolha.

O que este teto impede: N6 e N7 inteiros.

---

## 3. As abordagens

Quatro caminhos conhecidos para um motor de composição. Só um está descartado.

### A. Linear de passada única — **o atual**

Percorre e escreve.

**A favor:** rápido, determinístico, auditável, cabe na cabeça de quem lê. As
três regras duras (`GRAMMAR.md` § 2) são triviais de garantir porque só há um
lugar que escreve.
**Contra:** o Teto 1. Cada regra nova precisa saber com quais das outras 19 ela
interage, e essa conta cresce ao quadrado.
**Sinal de esgotamento:** já apareceu — os cinco mecanismos de espiadela citados
acima.

### B. Árvore — **decidida, não construída**

Monta uma estrutura (raiz → tronco → galho → folha) e só depois lineariza.
Separa **decidir** de **escrever**.

**A favor:** destrava o N5 inteiro. Uma folha sabe se é `card`, `flexionada` ou
`inserida`, e se é `opcional` — então "tirar o artigo" vira filtrar folhas
opcionais, não uma regra nova. Explicar a frase vira percorrer a árvore.
**Contra:** é reescrever o núcleo do app. O risco não é o código, é a
**regressão silenciosa** em 800 mil frases que hoje saem certas.
**Como fazer sem quebrar:** comparação diferencial — os dois motores sobre o
mesmo corpus, diferença a diferença, antes de trocar. `ARVORE.md` § 4.

### C. Gramática formal (CFG, HPSG, LFG)

Escrever o português como gramática declarativa e gerar por unificação.

**A favor:** é o estado da arte acadêmico, e cobre fenômenos que nenhuma regra
ad-hoc cobre.
**Contra:** desproporcional. Uma prancha de CAA produz enunciados de 2 a 8
palavras, e o custo de manter uma gramática formal do português é de ordem
comparável ao do app inteiro. A árvore captura a parte que importa aqui —
estrutura explícita e revisável — sem o resto.
**Veredito:** não, e por proporção, não por preconceito.

### D. Modelo estatístico ou neural no dispositivo

Um modelo pequeno transformando cards em frase.

**A favor:** resolveria N6 e N7 de graça, e cobriria o Teto 2 sem lista.
**Contra, e é decisivo:** um modelo generativo **não pode garantir as três regras
duras**. Ele pode acrescentar uma palavra que a pessoa não escolheu, trocar uma
por sinônimo, ou reordenar. Num app de fala, isso significa alguém ser ouvido
dizendo o que não disse — e sem como perceber, porque a saída é fluente.

Some-se: não é determinístico, então a auditoria de 800 mil frases deixa de
valer; e o tamanho do modelo brigaria com abrir offline em aparelho antigo.

**Veredito:** descartado para a composição. Continua plausível *fora* dela —
sugerir o próximo card, ordenar a busca — onde um erro custa um toque a mais e
não uma frase falsa.

### E. Híbrido — árvore + sugestão estatística

A árvore compõe e garante as invariantes; um modelo só **sugere** o que a pessoa
pode querer tocar a seguir, e ela decide.

É o que o app já faz em pequena escala com `predict.ts`, que aprende pares de
palavras da própria pessoa. Escalar isso é caminho aberto, e não conflita com
nada.

---

## 4. Como a revisão funciona hoje

Três camadas, e cada uma pega o que as outras não pegam. Isto importa porque
nenhuma delas sozinha justificaria confiança.

| camada | o que é | o que pega | o que **não** pega |
|---|---|---|---|
| **Testes fixos** | 227 casos entrada→saída | regressão no que já foi consertado | qualquer coisa que ninguém escreveu |
| **Auditoria em massa** | 40 sementes · 800.160 frases · 14 detectores | violação de invariante e padrão suspeito, em escala | o que os detectores não sabem procurar |
| **Varredura linguística** | eu montando construções do português à mão | famílias inteiras que nenhuma dimensão enumerava | o que eu não pensei em montar |

### O que cada uma já provou valer

- **Auditoria:** achou `EU · CANSADO · NÃO · ESPERAR` (191 casos), "Os crianças"
  (74), "Umas umas titias" (2), e "A mesa não é errado" (1.179) — este último um
  defeito **meu**, no mesmo dia, que os 227 testes não pegaram.
- **Varredura:** achou o caso oblíquo ("para eu"), o clítico que engolia a
  preposição ("você me vai"), o intensificador ("eu muito estou feliz"), o `tem`
  existencial, `ir`/`vir` como direções opostas. Nenhum apareceria por
  combinação — nenhuma dimensão enumerada os cobria.
- **Trava de conflito no léxico:** achou `tentar` marcado como volitivo por
  parentesco semântico com "querer", quando ele rege infinitivo.

### As duas lições que custaram caro, e estão embutidas nas ferramentas

1. **Uma semente só mente.** Semente 1 dava zero; a 77 dava 14 suspeitas. O
   padrão passou a ser 40.
2. **Zero é indistinguível de detector quebrado.** Relatório limpo e ferramenta
   morta imprimem exatamente a mesma coisa. Por isso `rodada.mjs` imprime esse
   aviso ao terminar limpo, e há sondas de defeito injetado.

---

## 5. O limite que nenhuma camada cobre

**Nada disto foi validado com quem usa uma prancha.**

As três camadas medem se o motor faz o que eu disse que ele deve fazer. Nenhuma
mede se o que ele deve fazer está certo — se a frase que sai é a frase que a
pessoa quis dizer, se ela reconhece a própria fala ali, se o interlocutor
entende.

Isso não se descobre com 800 mil frases. Descobre-se observando alguém usar, e é
o único item desta página que não tem caminho técnico.

Vale afirmar sem rodeio: **o motor pode estar num N4 sólido e ainda assim estar
resolvendo o problema errado**, e as ferramentas construídas aqui são
estruturalmente incapazes de perceber isso.

---

## 6. Estado, com número

| | |
|---|---|
| Nível alcançado | **N4**, sólido |
| Próximo degrau | N5 — bloqueado pelo Teto 1 |
| `grammar.ts` | 2.338 linhas |
| Casos fixos do motor | 227 (315 no total) |
| Auditoria | 40 sementes · 800.160 frases · 14 detectores · **0 violações** |
| Léxico | 250 à mão + 4.905 gerados |
| Marcas que uma palavra gerada carrega | 22 |
| Verbos com comportamento declarado | 44 de 978 |
| Validação com usuário | **0** |

---

## Ver também

- [GRAMMAR.md](GRAMMAR.md) — o que o motor faz, regra a regra.
- [ARVORE.md](ARVORE.md) — a abordagem B, em detalhe, com plano de migração.
- [LEXICO-PADRAO.md](LEXICO-PADRAO.md) — onde o conhecimento mora, e por quê.
- [ferramentas/gramatica/REVISAO.md](ferramentas/gramatica/REVISAO.md) — a
  auditoria em massa, detector a detector.
- [ESTADO.md](ESTADO.md) — o que foi feito, em ordem cronológica.
