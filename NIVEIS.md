# Níveis, limites e abordagens do motor

Até onde o motor de frases chega, onde ele para, por quê, e quais caminhos
existem para ir além.

Existe porque "melhorar a gramática" não é uma direção — é oito direções
diferentes com custos diferentes, e sem uma escala não dá para saber se uma
mudança é um degrau ou um enfeite.

Escrito em **31/07/2026**; a § 3 foi revista e ampliada em **02/08/2026** — de
cinco abordagens numa fila só para dois eixos, dez abordagens e critérios
explícitos. O que a revisão mudou está no fim da § 3b.

Complementa `GRAMMAR.md` (o que o motor faz),
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

**É aqui que o motor está**, e com folga: 239 casos fixados e 800.160 frases por
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
lista declarada tem o tamanho que alguém escreveu.

**O número deste parágrafo estava medindo a coisa errada, e a correção é de
02/08/2026.** Ele dizia "44 dos 978 verbos do acervo", e estimava por amostra que
quase todos os restantes corretamente não levam marca. A estimativa estava certa
— mas 978 é o **acervo**, e o que a pessoa toca são os **39 verbos em card**.
Desses, **18 têm marca e 21 são ação concreta que corretamente não leva
nenhuma**: `comer`, `beber`, `dormir`, `abrir`, `fechar`, `correr`, `pular`.

Medido assim, **este teto não está limitando a frase de ninguém hoje.** Ele
descreve a distância entre acervo e uso — e essa distância só vira problema
quando alguém traz pela busca um verbo que precise de marca. Continua sendo
limite real; deixou de ser prioridade. Ver `RECURSOS-LINGUISTICOS.md` § 2c.

**Saída — e aqui esta página estava errada.** A primeira versão dizia "nenhuma
automática. Ou alguém revisa, ou fica assim". Isso valia para o método que eu
estava usando — inferir da *forma* da palavra —, não para o problema.

Existe corpus de português com **estrutura argumental anotada**, e estrutura
argumental é exatamente o que estas seis marcas descrevem. `UD_Portuguese-GSD` é
brasileiro e CC BY-SA 4.0; `ccomp` com `Mood=Sub` é volitivo, `ccomp` com
`Mood=Ind` é opinião, `obj`+`iobj` é ditransitivo. A distinção que me custou uma
sessão inteira para formular está anotada frase a frase por linguistas.

Não é veredito: é evidência com contagem, precisa de corte medido, e não cobre
vocabulário de prancha (`dodói`, `xixi`). Mas é caminho, e eu havia declarado que
não havia. Ver [RECURSOS-LINGUISTICOS.md](RECURSOS-LINGUISTICOS.md).

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

### 3.0 Dois eixos, não um

A primeira versão desta seção listava cinco caminhos numa fila só, e isso
escondia uma distinção que custa caro: **como a frase é montada** e **de onde
vem o que o motor sabe** são perguntas independentes. Um motor em árvore com
léxico raso continua produzindo frase pobre; um motor linear com valência
completa produz frase melhor sem mudar uma linha de arquitetura.

|  | eixo I — **motor de composição** | eixo II — **origem do conhecimento** |
|---|---|---|
| pergunta | como decidir e escrever | como saber que "dar" tem dois complementos |
| teto que ataca | Teto 1 (passada única) | Teto 2 (forma não carrega significado) |
| destrava | N5 | N2 e N3 mais fundos |
| abordagens | A, B, C, F | G, H, I |
| ortogonal aos dois | | D, E, J — *quem escolhe entre alternativas* |

A separação vale independentemente de qual eixo rende mais. Ela evita a confusão
de tratar conhecimento como consequência de arquitetura — e permite perguntar de
cada um **quanto ele rende**, em vez de supor.

Escrito primeiro aqui: "o eixo II é mais barato e rende mais hoje". **Medido no
mesmo dia: não rende** — a extração de valência do UD alcançou um verbo do
vocabulário de prancha (ver G e a § 3b). O eixo II é barato e está perto de
esgotado; o eixo I é caro e é onde o teto está. A separação continua certa; a
aposta sobre ela estava errada.

### 3.1 Os critérios

Toda abordagem abaixo é medida contra os mesmos seis, e os dois primeiros são
eliminatórios — não são preferências, são a definição do projeto
(`GRAMMAR.md` § 2):

| # | critério | por quê |
|---|---|---|
| 1 | **garante as três regras duras** | não acrescenta conteúdo, não reordena, não perde palavra |
| 2 | **determinística** | sem isso a auditoria de 800 mil frases deixa de significar algo |
| 3 | auditável por humano | quem acompanha a terapia precisa saber o que a máquina pôs na boca da pessoa |
| 4 | roda offline em aparelho antigo | é requisito de acesso, não de desempenho |
| 5 | custo de manutenção | o projeto tem um mantenedor |
| 6 | o que destrava | N5, N6, Teto 2 |

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

**Veredito:** descartado para a composição — mas a formulação "modelo neural =
descartado" era larga demais. O que viola as regras é **gerar texto livre**. Um
modelo que nunca emite palavra, e apenas *escolhe* entre saídas que o motor já
produziu, não pode acrescentar nem reordenar nada: é a abordagem J. O veredito
correto é **descartado como gerador, aberto como juiz**.

### E. Híbrido — árvore + sugestão estatística

A árvore compõe e garante as invariantes; um modelo só **sugere** o que a pessoa
pode querer tocar a seguir, e ela decide.

É o que o app já faz em pequena escala com `predict.ts`, que aprende pares de
palavras da própria pessoa. Escalar isso é caminho aberto, e não conflita com
nada — e a fonte de sinal mais promissora para escalar não é mais histórico, é
**affordance**: o que o objeto permite fazer. Ver [SEMANTICA.md](SEMANTICA.md)
§ 4.

### F. Realização a partir de estrutura — o realizador estreito

Entre a árvore (B) e a gramática formal (C) há um degrau que o texto anterior
pulava: um **realizador** no sentido de geração de linguagem natural — a
estrutura entra abstrata (predicado, argumentos, traços de tempo e polaridade) e
uma camada estreita e declarativa cuida de concordância, contração e ordem.
`SimpleNLG` é o exemplo canônico; há porte para português.

**A favor:** é exatamente o que a Fase 3 do `ARVORE.md` chama de linearizador,
com a diferença de já existir como componente maduro e testado, em vez de
escrito aqui.
**Contra:** um realizador de propósito geral assume que quem chama tem a
estrutura completa e correta — e o problema difícil deste app é justamente
**construir** a estrutura a partir de 2 a 8 cards ambíguos, não realizá-la. Ele
também não conhece registro, variedade regional nem nível de fala, que são três
eixos que aqui atravessam tudo. Dependência a mais para resolver a parte fácil.
**Veredito:** não como dependência. Vale como **referência de projeto** para o
linearizador da árvore: a separação estrutura/realização já está validada por
essa literatura, e o `arvore.ts` está reinventando-a — melhor reinventar
olhando.

### G. Extração de valência de corpus anotado — **o eixo II, e o item de maior retorno**

O comportamento dos verbos deixa de ser lista escrita à mão e passa a ser
**medido** em corpus com estrutura argumental anotada (`UD_Portuguese-GSD`,
CC BY-SA 4.0): `obj`+`iobj` é ditransitivo, `ccomp`+`Mood=Sub` é volitivo,
`ccomp`+`Mood=Ind` é opinião.

**A favor:** não toca no motor, não altera arquitetura, não muda uma garantia. O
resultado é dado estático, versionado, auditável linha a linha, e continua
determinístico.
**Contra — e foi medido em 02/08/2026, depois de esta seção ser escrita:** o
rendimento sobre o vocabulário que a pessoa toca é **de um verbo**. Dos 118
lemas extraídos, 42 têm pictograma no acervo, **9 estão em card de prancha, e 8
desses já estavam anotados à mão**. Sobrou `pensar`, mais uma correção em
`parar`. Ver [RECURSOS-LINGUISTICOS.md](RECURSOS-LINGUISTICOS.md) § 2c.
**Veredito, corrigido:** **feito, e esgotado.** Não é o item de maior retorno —
eu escrevi que era, sem medir. A extração alcança a cauda do acervo
(`ressaltar`, `frisar`, `conquistar`), não a prancha.

> **A métrica "44 de 978" tem o denominador errado.** 978 é o acervo. O que se
> toca são 39 verbos em card, dos quais 18 têm marca e 21 são ação concreta que
> corretamente não leva marca nenhuma. **O Teto 2 não está limitando a frase de
> ninguém hoje** — ele descreve a distância entre acervo e uso, e fechá-la não
> melhora enunciado algum. A § 2 desta página trata isso como teto; é mais
> honesto chamar de lacuna sem consequência prática, até que alguém traga pela
> busca um verbo que precise de marca.

### H. Conhecimento como dado, não como código

`grammar.ts` tem 2.373 linhas, e parte delas é conhecimento sobre o português
codificado como `if`. Contrações, regência, escolha de cópula e irregulares são
**tabelas** escritas em forma de fluxo de controle.

**A favor:** tabela é diffável, revisável por quem entende de língua e não de
TypeScript, e testável sozinha. Reduz a superfície onde uma regra nova pode
interagir com as outras 19 — que é metade do Teto 1, sem tocar na arquitetura.
Também é o que permitiria a alguém que não é o mantenedor contribuir vocabulário.
**Contra:** parte do que parece tabela **não é** — depende de contexto que só o
motor tem, e forçar em tabela vira uma linguagem de regras improvisada, que é a
pior versão da abordagem C. A fronteira precisa ser desenhada com cuidado, caso
a caso.
**Veredito:** sim, incremental e por trecho, começando pelo que já é
inequivocamente tabela. Não é degrau de nível; é o que torna os degraus
seguintes mais baratos.

### I. Correção guardada da própria pessoa

Quando a saída flexionada não é o que a pessoa quis, ela hoje só pode desligar a
gramática. A alternativa: **corrigir uma vez, e o app lembra** — para aquela
combinação, naquele aparelho.

**A favor:** é o único caminho que aprende com uso real sem coletar nada — o dado
não sai do aparelho, e é a própria pessoa (ou quem a acompanha) declarando o que
está certo, não um modelo inferindo. Resolve por cima o que o léxico não cobre
(nome próprio, apelido de família, palavra regional que a tabela não tem) e dá,
de graça, o primeiro registro de **erro real** que o projeto teria — hoje a
validação com usuário é zero.
**Contra:** correção acumulada vira um léxico paralelo invisível, que pode
mascarar defeito do motor em vez de expô-lo; e há um risco de autoria ao
contrário — quem corrige costuma ser o adulto, não quem fala. Exige que a
correção seja visível e reversível, e que o app saiba distinguir "a pessoa
preferiu assim" de "o motor errou".
**Veredito:** promissor, e **depende do N5**: corrigir uma palavra específica sem
desmontar a frase é exatamente o que a passada única impede. Fica atrás de B.

### J. Modelo neural como juiz, nunca como gerador

O motor produz **N saídas alternativas legítimas** — com e sem artigo, "pra" e
"para", coordenação com vírgula ou com "e" — e um modelo pequeno apenas
**ordena** essa lista. Ele nunca escreve; escolhe.

**A favor:** as três regras duras ficam garantidas **por construção**, e não por
confiança no modelo: se todos os candidatos vêm do motor, nenhum contém palavra
que a pessoa não escolheu, nenhum reordena o que ela montou, nenhum perde nada.
O pior caso deixa de ser "alguém foi ouvido dizendo o que não disse" e passa a
ser "saiu a variante menos natural entre as corretas" — um erro de grau, não de
tipo. É a diferença que separa D de J e que o texto anterior não fazia.
**Contra:** a determinismo se mantém (mesmo modelo, mesma entrada, mesma ordem),
mas a **auditoria muda de objeto**: passa a ser preciso auditar o conjunto de
candidatos, não uma saída. O tamanho do modelo continua brigando com abrir
offline em aparelho antigo. E há um contra novo: gerar candidatos exige que o
motor saiba enumerar suas próprias alternativas — o que ele hoje não faz, porque
decide uma vez e escreve. **Pressupõe B.**
**Veredito:** aberto, e é o único uso de modelo neural compatível com este
projeto na composição. Mas é o último da fila, não o primeiro: depende da árvore,
e o ganho é polimento sobre uma frase que já está certa.

---

## 3b. As abordagens, lado a lado

Contra os seis critérios da § 3.1. `✔` cumpre, `◐` cumpre com condição, `✗` não.

| | abordagem | 1 regras | 2 determ. | 3 auditável | 4 offline | 5 custo | destrava | veredito |
|---|---|---|---|---|---|---|---|---|
| A | linear (atual) | ✔ | ✔ | ✔ | ✔ | cresce ao quadrado | — | esgotada em N5 |
| B | árvore | ✔ | ✔ | ✔ **melhor** | ✔ | alto, uma vez | N5 | **fazer, com comparação diferencial** |
| C | gramática formal | ✔ | ✔ | ◐ | ✔ | proibitivo | N5+ | não, por proporção |
| D | neural gerador | ✗ | ✗ | ✗ | ✗ | — | N6, N7 | **descartado** |
| E | híbrido (sugestão) | ✔ | ◐ | ✔ | ✔ | baixo | conforto | já existe, escalar |
| F | realizador pronto | ✔ | ✔ | ◐ | ◐ | dependência | — | referência, não dependência |
| G | valência de corpus | ✔ | ✔ | ✔ | ✔ | baixo | 1 verbo | **feito, e esgotado** |
| H | conhecimento como dado | ✔ | ✔ | ✔ **melhor** | ✔ | incremental | meio Teto 1 | fazer por trecho |
| I | correção da pessoa | ✔ | ✔ | ◐ | ✔ | médio | uso real | depende de B |
| J | neural como juiz | ✔ | ✔ | ◐ | ✗ | alto | polimento | aberto, depois de B |

### A ordem que sai daí

~~1. **G** — valência do corpus.~~ **Feito e esgotado em 02/08/2026**, com
rendimento de um verbo. Ver o veredito corrigido em G.

1. **B** — a árvore, com comparação diferencial. Destrava o N5 inteiro, e é o
   único item desta lista que destrava um nível.
2. **H** — o que já é tabela vira tabela. Barateia B e reduz metade do Teto 1.
   Pode andar em paralelo.
3. **E** — sugestão por affordance na faixa (`SEMANTICA.md` § 4). É a única
   abordagem barata que ainda tem retorno não medido — e a medida é fácil:
   affordance contra bigrama, sobre as frases já ditas.
4. **I**, depois **J** — os dois pressupõem B.

### O que duas revisões seguidas mudaram, e a lição

**Primeira revisão:** a árvore deixou de ser o próximo passo, porque duas
abordagens de conhecimento (G, H) pareciam render mais barato.

**Segunda revisão, no mesmo dia:** G foi medido e rendeu **um verbo**. A árvore
voltou a ser o próximo passo.

A lição não é sobre G. É que eu ordenei dez abordagens por argumento e a
primeira que encontrou um número desabou. **As outras nove continuam ordenadas
por argumento.** As estimativas com mais chance de estar erradas pelo mesmo
motivo — denominador do acervo em vez do uso — são E (affordance rende mais que
bigrama?) e H (quanto de `grammar.ts` é mesmo tabela?). As duas são mediçãos
baratas, e nenhuma foi feita.

Vale ainda mais como método: a mudança de uma marca de léxico expôs **1.561
falsos positivos** num detector que estava lá desde sempre — e esse conserto vale
mais que os dois verbos, porque um detector que grita à toa é um detector que
ninguém lê. Ver `RECURSOS-LINGUISTICOS.md` § 2c.

---

## 4. Como a revisão funciona hoje

Três camadas, e cada uma pega o que as outras não pegam. Isto importa porque
nenhuma delas sozinha justificaria confiança.

| camada | o que é | o que pega | o que **não** pega |
|---|---|---|---|
| **Testes fixos** | 239 casos entrada→saída | regressão no que já foi consertado | qualquer coisa que ninguém escreveu |
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
| Próxima **ação** | B — a árvore (§ 3b). G foi medido e esgotou em 1 verbo. |
| `grammar.ts` | 2.338 linhas |
| Casos fixos do motor | 239 (327 no total) |
| Auditoria | 40 sementes · 800.160 frases · 14 detectores · **0 violações** |
| Léxico | 250 à mão + 4.905 gerados |
| Marcas que uma palavra gerada carrega | 22 |
| Verbos com comportamento declarado | 52 de 978 no acervo — **18 de 39 em card**, e os 21 restantes corretamente sem marca |
| Validação com usuário | **0** |

---

## Ver também

- [GRAMMAR.md](GRAMMAR.md) — o que o motor faz, regra a regra.
- [ARVORE.md](ARVORE.md) — a abordagem B, em detalhe, com plano de migração.
- [LEXICO-PADRAO.md](LEXICO-PADRAO.md) — onde o conhecimento mora, e por quê.
- [RECURSOS-LINGUISTICOS.md](RECURSOS-LINGUISTICOS.md) — corpora externos com
  licença compatível, e o caminho que corrige o Teto 2.
- [SEMANTICA.md](SEMANTICA.md) — frames, papéis, affordance e pragmática: o que
  dessa abordagem entra no N5–N7 e o que é recusado.
- [ferramentas/gramatica/REVISAO.md](ferramentas/gramatica/REVISAO.md) — a
  auditoria em massa, detector a detector.
- [ESTADO.md](ESTADO.md) — o que foi feito, em ordem cronológica.
