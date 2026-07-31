# Estado — onde o trabalho está

Documento de retomada. Existe para que qualquer sessão nova — humana ou não —
saiba em dez minutos o que já foi decidido, o que está medido e o que falta,
sem reler histórico.

Atualizado em **30/07/2026**.

---

## 1. O que o app é hoje

Prancha de CAA em português brasileiro. Browser puro, offline, sem servidor e
sem conta. `web/` é Vite + TypeScript + React; `ferramentas/` são scripts de
build e auditoria que **não** vão para o navegador.

### Números

| | |
|---|---|
| Testes | **325** em 6 suítes (`npm test`) |
| Auditoria do motor | **40 sementes · 800.160 casos · 0 suspeitas** |
| Léxico revisado à mão | 250 palavras |
| Léxico gerado do acervo | **4.905** publicadas · 1.249 em revisão |
| Pictogramas | 13.801 · **229 usados sem busca (2,2 MB, 1,24 %)** |

### Módulos, todos desligados por padrão

Frases · Roteiros · Achar · Números · Progresso — sempre visíveis.
Padrões visuais · Poesia · Estúdio de formas · Matemática avançada — em Ajustes.
Objetivos individuais e o resto dos controles de cuidador vivem no menu **⋯ Mais**.

---

## 2. As decisões que não se negociam

Estas governam tudo. Se uma tarefa exigir quebrar uma delas, a tarefa está
errada.

1. **Abre e funciona offline.** Sem servidor, sem conta, sem rede.
2. **Nada sai para terceiros.** Quem usa uma prancha revela diagnóstico e rotina
   a cada toque.
3. **A parte simples continua simples.** Todo módulo novo nasce desligado.
4. **Célula não muda de lugar.** Nenhuma otimização justifica mover uma posição
   que a mão já aprendeu (LAMP).
5. **Comunicação não pontua.** O diário conta prática — jogo e ensaio —, nunca
   fala. Ver `lib/diario.ts`.
6. **O motor nunca** acrescenta palavra de conteúdo, reordena ou perde palavra
   escolhida. Verificado a cada rodada da auditoria: **zero violações**.

---

## 3. O motor de frases — o que aprendeu nesta rodada

Cada item saiu de um defeito real, achado usando o app ou pela auditoria. Todos
com regressão fixada em `web/tests/grammar.test.ts`.

| conserto | o que saía antes |
|---|---|
| Regência declarada (`nounPrepInf`) | "quero suco **de querer** leite" |
| Modal satisfeito coordena | "quero suco querer leite" |
| Escopo da negação por card | "não quero suco, **quero** leite" (invertia o sentido) |
| "nem" só em série negativa | "quero água, **nem** quero pão" |
| Numeral em algarismo | "quero 9 **e** pão" |
| Oração encaixada por volitivo | "quero você **vem**" |
| Orações justapostas com vírgula | "eu posso você vem" |
| Negação transparente na leitura do próximo | "cansado **esperar**", "um titias" |
| Plural sobre a variante regional | "**Os** crianças" |
| Artigo do bloco não duplica | "**umas umas** titias" |
| Oração abre por predicado, não por card de verbo | "vou estar feliz **eu gostar**" |
| Duas predicações no mesmo sujeito | "estou feliz **medo**" |
| Vocativo | "a mãe, o pai **e vocês**" |
| `vocês` no léxico | era adivinhado como substantivo masculino |
| `com` + pronome | "brincar **com eu**" |
| `agree()` f→m (`femininoBase`) | "o beijo está **preguiçosa**" |
| Substantivo sem gênero não leva artigo | "**o** dentista" para uma mulher |

### A revisão de linguagem natural — 30/07

Varredura de construções do português que a auditoria **não enumerava**. O ponto
cego é estrutural: um detector só acha o que sabe procurar, e as 800 mil frases
por rodada só combinam as dimensões já previstas. Estas quatro famílias passavam
por fora de todas elas.

| conserto | o que saía antes |
|---|---|
| Caso oblíquo (`OBLIQUO`) | "isso para **eu**", "gosta de **eu**" |
| Clítico não rouba pronome regido por preposição | `SEM · EU` → "Você **me vai**" |
| Infinitivo da oração reduzida | "para eu **comemos**" |
| Intensificador espera a cópula | "Eu **muito estou** feliz" |
| Aspecto antes da negação | `AINDA · NÃO` → "**Não ainda**" |

Depois: **196 casos** no motor, **800.160 frases · 0 violações · 0 suspeitas**.

### Segunda varredura — 30/07

Terreno novo: quantidade, lugar e direção, cortesia, dois complementos, séries,
pergunta com sujeito. Mesma lição — o defeito aparece onde nenhuma dimensão
enumerada olhava.

| conserto | o que saía antes |
|---|---|
| `tem` existencial | `TER · BOLO ?` → "Tenho o bolo?" |
| `todo`/`outro`/`mesmo`/`cada` são determinantes | "Todo **e** dia", "Outro **e** copo" |
| `ninguém`/`alguém` são pronomes | eram substantivo masculino adivinhado |
| `ir` e `vir` são direções opostas | "eu venho **pra** escola" |
| Destinatário de verbo de dar | `DAR · ÁGUA · MÃE` → "Dá água **da** mãe" |
| Sujeito posposto na interrogativa | `ONDE · ESTAR · MÃE` → "Onde **estou** a mãe?" |

Duas dessas eram **lexicais, não estruturais**: `todo` e `outro` terminam como
substantivo masculino comum, a adivinhação os classificava assim, e a regra de
"dois substantivos seguidos são lista" — que está certa — fazia o resto. Vale
registrar: nem todo defeito de gramática é da gramática.

Duas travas que a implementação exigiu, ambas para não trocar um erro por outro:
- O existencial é preso à **pergunta**. Sem sujeito o motor supõe 1ª pessoa, e
  supõe bem: `TER · FOME` é "tenho fome", metade do uso de "ter" numa prancha.
  Ninguém pergunta a si mesmo se tem fome; "tem bolo?" se pergunta o dia inteiro.
- A inversão do sujeito vale **só com verbo de ligação**. `QUERER · ÁGUA ?`
  continua "Quero água?", porque ali a suposição de 1ª pessoa acerta.

Depois: **212 casos** no motor, **800.160 frases · 0 violações · 0 suspeitas**.

### A prancha "Pensar" e a gramática que ela exigiu — 30/07

A 12ª prancha de fábrica, **24 cards**, no fim da fila — nenhuma posição já
aprendida se moveu. O levantamento (`FUNCIONALIDADES.md`) mostrou que havia 13
grupos de frases e **nenhum sobre pensar**: sem `acho que`, `porque`, `se`,
`igual`, `verdade`, não há como supor, discordar ou explicar. Uma prancha que só
sabe pedir deixa quem a usa sem como argumentar.

Pôr os cards não bastava — o motor tratava essas palavras a chute, e o chute erra
justamente aí. Cinco consertos:

| conserto | o que saía antes |
|---|---|
| Encaixe de opinião no **indicativo** (`OPINIAO`) | não existia — só havia o subjuntivo dos volitivos |
| "acho que não" | `EU · ACHAR · NÃO` → "**Não eu acho**" |
| `copulaSer` — julgar pede "ser" | "Isso **está** difícil", "Isso **está** errado" |
| `predicativo` — abstrato sem artigo | "Isso é **a** verdade" |
| `prenominal` — ordinal não predica | `PRIMEIRO · BANHO` → "**Estou** primeiro o banho" |

Duas distinções que valem mais que a implementação:

- **Subjuntivo x indicativo não é estilo.** O subjuntivo marca o que ainda não é
  fato; o indicativo, o que se toma por real. "Acho que a mãe **vem**" afirma
  algo sobre o mundo — e era exatamente essa fala que faltava.
- **"Não acho" e "acho que não" dizem coisas diferentes**: o primeiro recusa
  opinar, o segundo opina. É o segundo que a pessoa quis, e é o modo mais comum
  de discordar em português sem confrontar.

**A auditoria pegou um defeito meu.** As entradas novas declaravam
`femininoBase: false` mas não `gender: 'm'`, e é `gender` que autoriza a flexão:
"A mesa não é **errado**", 1.179 casos. Achado pelas 800 mil frases, não pelos
testes — que é para isso que ela existe.

Depois: **227 casos** no motor, **800.160 frases · 0 violações · 0 suspeitas**,
e "Eu acho que não." verificada clicando cards no app.

### A padronização do léxico — 31/07

O motor é o diferencial do app. Um diferencial que só funciona para 5% do
vocabulário não é um diferencial — e era esse o caso.

O conhecimento morava em dois lugares que não se conversavam: campos declarados
no `Lexeme`, que qualquer palavra pode ter, e **seis conjuntos fixos dentro do
`grammar.ts`** (`VOLITIVOS`, `OPINIAO`, `DITRANSITIVOS`, `ACTIVITY_VERBS`,
`LIGACAO`, `SO_TERCEIRA`), que só alcançam o que alguém digitou lá. Uma palavra
gerada **não tem como entrar num `Set` escrito no código** — não é difícil, é
impossível por construção.

E o transporte era pior: `limpar()` copiava campo a campo, e copiava 7 dos 20.
Os outros 13 caíam em silêncio — sem erro, sem aviso, sem teste falhando.

**A regra de decisão**, agora escrita em `LEXICO-PADRAO.md`: *a língua pode
ganhar mais uma palavra dessas?* Pode → classe aberta → campo no `Lexeme`. Não
pode → classe fechada (artigo, preposição, contração, paradigma) → tabela no
código, e ela fica lá por decisão, não por dívida.

| | antes | agora |
|---|---|---|
| Marcas que uma palavra gerada carrega | 7 | **22** |
| Conjuntos abertos no `grammar.ts` | 6 | **0** |

O transporte passou a ser guiado por duas listas declaradas com
`satisfies keyof Lexeme` — errar o nome de um campo virou erro de compilação.

**O que a migração expôs:** sete verbos (`contar`, `ensinar`, `entregar`,
`mandar`, `mexer`, `perceber`, `preferir`) governavam regra de gramática **sem
ter entrada no léxico**. Funcionavam pela lista e por mais nada — sem classe,
sem regência, conjugados pelo palpite da terminação.

Depois: **227 casos** do motor e **800.160 frases · 0 violações · 0 suspeitas**,
idênticos ao de antes — que é o resultado certo de um refactor. A prova de que o
teto subiu está em `lexico.test.ts`: `suspeitar`, que o `LEXICON` não conhece,
entregue só pelo léxico gerado, produz **"Eu suspeito que a mãe vem."**

### O gerador preenchendo o comportamento — 31/07

O padrão da seção anterior construiu o cano; esta rodada o encheu.
`ferramentas/lexico/inferir.mjs` agora declara as seis marcas para os verbos do
acervo. **44 dos 978 verbos** ganharam comportamento — de zero.

**Por lista, não por regra, e o motivo é linguístico:** "dar" rege dois
complementos e "danar" não, e as duas terminam igual. Nenhuma terminação separa
verbo de opinião de verbo de ação — a diferença é de significado, e significado
não está na forma. O que não está declarado não recebe marca, pela mesma política
do empate de gênero: omitir deixa a regra muda, e mudo nunca é pior que antes.

**A trava nova em `medir.mjs`** confere que o gerado não CONTRADIZ o revisado à
mão, e falha o build se contradisser. O risco aqui não é a lacuna: é o conflito.
O `LEXICON` vence no `lookup`, então uma marca gerada errada não apareceria neste
app — apareceria em qualquer consumidor do `lexico.json` sem o `LEXICON`. E
silencioso e divergente é a pior combinação possível.

**Ela pagou o próprio custo na primeira execução, com 13 conflitos:**
- **erro meu** — `tentar` e `conseguir` estavam entre os volitivos por parentesco
  com "querer", mas regem *infinitivo*: "tento ir", nunca "tento que ele vá".
  Parentesco semântico não é regência.
- **risco meu** — `andar` como cópula existe, mas numa prancha ele é movimento
  quase sempre. Saiu.
- **onze lacunas do lado oposto** — o gerador estava certo e o `LEXICON` é que
  estava incompleto (`contar`, `entender`, `ouvir`, `sentir` também são de
  opinião; `escrever` e `explicar` também são ditransitivos). Completados à mão.

**Cobertura, medida e não afirmada.** 44 de 978 parece pouco e não é: numa
amostra determinística de 45 verbos sem marca — `afundar`, `engolir`, `fritar`,
`rasgar` — todos são de ação concreta e corretamente não levam marca. Dois ou
três seriam discutíveis, nenhum é erro claro. Está escrito como estimativa por
amostra de propósito.

**Achado colateral:** o acervo traz português **europeu** em vários termos
(`actuar`, `facturar`, `mandriar`, `barbear-se`). Num app pt-BR é problema de
qualidade do léxico gerado, e ainda não está tratado.

Depois: 97 verbos conferidos · **0 conflitos** · gênero em confiança alta 100% ·
227 casos do motor · **800.160 frases · 0 violações · 0 suspeitas**.

### A documentação dos níveis — 31/07

`NIVEIS.md`. Existe porque "melhorar a gramática" não é uma direção — são oito
direções com custos diferentes, e sem escala não dá para saber se uma mudança é
um degrau ou um enfeite.

**A escala N0–N7**, de telegráfico a pragmática. O motor está em **N4** (várias
orações, com subjuntivo x indicativo) e com folga. O N5 — rever uma decisão já
tomada — está a zero.

**Os três tetos**, que não são bugs e não saem com regra nova:
1. **A passada única.** Quase todo defeito difícil desta sessão foi um caso
   disso, e a cura foi sempre a mesma gambiarra: espiar à frente antes de
   decidir. `next` ignorando negação, `modalAindaAberto`, `pendingIntensidade`,
   `infinitivoDaPreposicao`. Cada uma funciona; somadas, são a admissão de que o
   motor **está simulando uma segunda passada** — e simulação de árvore não vira
   árvore.
2. **A forma não carrega o significado.** Gênero se infere da terminação;
   "é ditransitivo" não. Sem saída automática.
3. **Nenhum contexto além da frase.** Decisão de privacidade, não acidente — mas
   vale saber que ela é mais forte do que a regra exige.

**As cinco abordagens**, com veredito. A que interessa registrar: **modelo
generativo está descartado para a composição**, e não por gosto — ele não pode
garantir as três regras duras. Pode acrescentar palavra que a pessoa não
escolheu, trocar por sinônimo, reordenar. Num app de fala isso é alguém ser
ouvido dizendo o que não disse, **sem como perceber, porque a saída é fluente**.
Fora da composição — sugerir card, ordenar busca — continua plausível.

**O limite que nenhuma camada cobre**, escrito sem rodeio: as três camadas de
revisão medem se o motor faz o que eu disse que ele deve fazer. Nenhuma mede se
o que ele deve fazer está certo. O motor pode estar num N4 sólido e ainda assim
resolver o problema errado, e as ferramentas construídas aqui são
estruturalmente incapazes de perceber isso.

**Correções no `GRAMMAR.md`.** A seção 12 afirmava coisas falsas: "~180
entradas" (são 250 + 4.905), "52 casos de teste" (são 227) e "o imperfeito só
existe no progressivo" — verificado, `EU · COMER` no imperfeito dá "Eu comia".
Documento desatualizado é pior que documento nenhum: os dois primeiros números
subestimavam o app, o terceiro mandaria alguém reimplementar o que já existe.

### Revisão completa dos tempos — 31/07

Varredura de tudo: 4 tempos × todas as pessoas × irregulares × marcadores ×
cópula × vários verbos × subordinada. **O motor passou em quase tudo** —
conjugação, concordância, perífrase, imperfeito da cópula, tempo por advérbio.

Dois defeitos, e o primeiro não era uma regra errada:

**O imperfeito existia no motor e a tela não deixava pedir.** Quatro paradigmas,
os irregulares, a cópula — tudo pronto, e **inalcançável**: `TENSES` tinha
`auto`/`past`/`present`/`future`, e o modo "Sozinho" nunca o escolhe porque
nenhum advérbio de tempo aponta para ele.

Pesa porque em português o imperfeito é como se **pede com jeito**: "eu *queria*
água" em vez de "eu *quero* água". Quem usa prancha pede o dia inteiro, e essa é
a diferença entre soar ríspido e não soar. Entrou como 5º botão, **no fim da
fila** — nenhum botão já aprendido se moveu.

**A subordinada não acompanhava o tempo da frase.** `QUANDO · PAI · VIR · EU ·
BRINCAR` no passado saía "Quando o pai **vier**, eu brinquei" — duas épocas numa
frase só. O futuro do subjuntivo só existe se a frase olhar para a frente.

O conserto exigiu separar duas coisas que eu tinha confundido num campo só:
**estrutura** (a oração é subordinada — não depende de tempo) e **forma** (o
verbo vai no futuro do subjuntivo — depende). Confundi-las quebrou
"Se você quis **que eu vá**", com o volitivo encaixando dentro de uma
condicional, onde ele não encaixa. Agora são `clauseSubordinada` e
`clauseSubjunctive`.

**Um susto que virou achado.** `Quando o pai chegar, eu chegar` parecia o mesmo
defeito e não era: **`chegar` não estava no léxico**, então ficava no infinitivo
pela política conservadora de não conjugar chute. E `chegar` é o exemplo que o
**próprio comentário do `grammar.ts`** usa para explicar o futuro do subjuntivo —
a documentação do código demonstrava uma regra com uma palavra que o motor não
conhecia. Adicionados `chegar` e `voltar`.

Depois: **237 casos** no motor (325 no total) · **800.160 frases · 0 violações ·
0 suspeitas** · e "Eu quero" → "Eu queria" verificado clicando no app.

### Busca de referências externas — 31/07

Procura por recursos de português com licença compatível, para as regras
pararem de depender só do que eu declaro à mão.

**O achado principal, e ele corrige uma afirmação minha.** `NIVEIS.md` dizia que
o Teto 2 — *a forma não carrega o significado* — **não tinha saída automática**.
Está errado, e a correção já está no documento.

`UD_Portuguese-GSD` é **brasileiro e CC BY-SA 4.0**; o Bosque tem 9.357 frases,
210.958 tokens, mesma licença. Ambos anotam `obj` (5.947 no Bosque), `iobj`
(631), `ccomp`, `xcomp`, `obl`, `cop` — e os traços `Mood` (Indicativo /
Subjuntivo) e `VerbForm`.

Cada uma das seis marcas de comportamento é um padrão de dependência:
`ccomp`+`Mood=Sub` é volitivo, `ccomp`+`Mood=Ind` é opinião, `obj`+`iobj` é
ditransitivo, `xcomp`+`Inf` é modal, `obl`+`case` consistente é regência. **A
distinção volitivo × opinião que me custou uma sessão inteira para formular está
anotada frase a frase, por linguistas.**

**As ressalvas, que valem tanto quanto o achado:**
- É evidência com contagem, não veredito — precisa de corte medido, como o de
  gênero já tem.
- Corpus é jornal: não cobre `dodói`, `xixi`, `papá`. O vocabulário de prancha
  continua vindo da mão.
- **Bosque mistura pt-PT e pt-BR**, e o léxico gerado do ARASAAC já tem
  contaminação europeia (`actuar`, `facturar`). Puxar de corpus misto agravaria
  um problema existente. GSD primeiro.

**VerbNet.Br, PropBank-Br e Verbo-Brasil** existem e são mais precisos que
derivar de dependências — mas **não verifiquei a licença de nenhum**, e recurso
acadêmico sem licença declarada não entra num app que se compromete a ser
offline e redistribuível.

**E uma ausência que é informação:** não há lista publicada de vocabulário-núcleo
de CAA para português brasileiro. A literatura é sólida, mas as listas canônicas
são de inglês; para o português há estudos de frequência em corpus jornalístico,
que não é a mesma coisa — a frequência de um jornal não descreve o que uma
criança precisa dizer em casa. Na prática, **as 12 pranchas deste app são uma
lista de vocabulário-núcleo pt-BR implícita**, construída por julgamento e não
medida. É lacuna do campo, não do projeto.

### A extração do treebank, construída — 31/07

`ferramentas/lexico/treebank.mjs`. Baixei o **UD_Portuguese-GSD** (CC BY-SA 4.0,
licença conferida no arquivo), rodei sobre 12.020 frases e 1.779 lemas verbais, e
cruzei com o léxico revisado à mão.

| marca | verbos |
|---|---|
| `completiva` (rege oração com "que") | **73** |
| `prep` | 31 · `ditransitivo` 10 · `modal` 8 |
| **com pictograma no acervo** | **42 de 118** |

Concordâncias: `dar`, `entregar`, `ensinar` (ditransitivo), `entrar` (prep).

**Duas coisas que a medição derrubou, e valem mais que o que ela confirmou:**

**`soTerceira` não é extraível deste corpus.** A ideia — verbo só atestado na 3ª
pessoa é impessoal — marcou **484 verbos**, incluindo `dizer`, `levar`,
`mostrar`. A causa é o gênero: `Person` está ausente em **91% dos tokens
verbais**, e onde aparece são 3.019 de 3ª contra 138 de 1ª e **1** de 2ª. Jornal
narra o que os outros fizeram. Removi em vez de ajustar o limiar — **quando um
sinal mede o gênero do texto, nenhum corte o conserta**; subir o limiar teria
escondido o defeito.

**A separação volitivo × opinião não veio da anotação.** O plano era ler `Mood`
do `ccomp`. Mas `Mood` está ausente em **93% dos 2.285 `ccomp`**. O sinal real é
mais simples e ainda é a parte difícil: *quais verbos regem oração com "que"* —
73, e a lista é boa. A divisão entre os dois lados fica com o revisor humano.

**Um conflito, e ele não é erro de ninguém:** `falar.prep` — corpus diz "a", mão
diz "com". Os dois certos, em registros diferentes: "falar a alguém" é o
português do jornal, "falar com alguém" é o que serve numa prancha. Resume o
valor e o limite da fonte — o corpus descreve **escrita de imprensa**, o app fala
**português de casa**.

**O que precisou ser apertado:** a primeira versão dava 79 "regências", incluindo
`levar`, `ver`, `dizer`. UD básico não distingue complemento de adjunto — "levar
o filho **para** a escola" é adjunto. Discriminador: ausência de objeto direto.
De 79 para 31.

O `.conllu` **não é versionado** — dado de terceiro, entra no `.gitignore`. O app
não o consome; ele alimenta a revisão do léxico, e só. Nada entra automaticamente.

### O que ainda erra — achado, não consertado

Sabido e escrito aqui de propósito: cada um destes precisa de decisão que a
varredura sozinha não toma.

| entrada | sai | devia sair |
|---|---|---|
| `JÁ · EU · COMER` | "Já eu comi" | "Eu já comi" — mover advérbio é mexer na ordem escolhida |
| `DEIXAR · EU · VER` | "Deixo que eu veja" | "Deixa eu ver" |
| `ISSO · GRANDE · QUE · AQUILO` | "está grande que" | "é maior que" — comparativo |
| `ESTAR · CIMA` | "Estou cima" | "Está em cima" — falta a preposição |
| `EU · QUERER · ÁGUA · FAVOR` | "água **e** favor" | "por favor" precisa ser unidade |
| `PORQUE` + pergunta | "Porque?" | "Por quê?" |
| `PÔR · AQUI` + pedido | "Pôr aqui" | "Põe aqui" — irregular fora do léxico |

Os dois primeiros exigem **reordenar cards**, o que um motor de uma passada não
faz sem quebrar invariante — é exatamente o que a árvore (seção 5) existe para
destravar. Os quatro últimos são lexicais, e cabem na fila de revisão do léxico.

---

## 3b. Navegação — revisão de 30/07

Três defeitos achados abrindo o app, não lendo o código.

**A barra voltara a quebrar em duas linhas.** O comentário no `App.tsx` dizia ter
resolvido isso movendo seis controles para o menu ⋯; mas cada módulo opcional
ligado acrescentava um botão solto no fim da fila, e com os três ligados a barra
quebrava de novo — num monitor de 1568px, não só no celular. A segunda linha
custa uma fileira de cards.

Os três módulos de criar (Padrões, Poesia, Estúdio) passaram a entrar como **um
botão só**, "Criar". As cinco posições de fala não se movem ao ligar ou desligar
módulo — é a mesma regra das células —, e o agrupamento não é de conveniência:
os três são criação livre, e nenhum é fala. Com um só ligado, o botão vira aquele
módulo, sem nível a mais. A barra voltou a uma linha e a prancha ganhou ~95px.

**Todo painel era um beco sem saída.** A única porta era ✕, e ✕ devolve à
prancha: ir de Frases a Roteiros custava três ações. Agora `Dialog` — a casca dos
doze painéis — desenha uma trilha **"Ir para"** com os irmãos do mesmo grupo
(`lib/navegacao.tsx`). Um toque. Vive num contexto e não numa prop justamente
para valer nos doze sem doze assinaturas iguais.

Dois detalhes que a implementação exigiu:
- A trilha fica **depois** do cabeçalho, para não roubar o foco inicial do
  diálogo — em Buscar, o foco tem de cair no campo, e cai.
- `.overlay` era `grid-template-rows: auto auto 1fr`; o quarto filho tomou a
  faixa `1fr` e abriu 190px de vão. Faixa declarada e `grid-row: 4` no corpo.

**🎯 servia a "Achar" e a "Objetivos".** Dois destinos com o mesmo desenho anulam
a única pista que se lê sem ler. Objetivos passou a 🧭.

**A linha quebrada ia inteira para a direita.** `justify-content: flex-end` na
fila: no celular sobravam dois botões encostados na borda e um vão do tamanho da
tela ao lado deles. O olho lê esse vão como "acabou", e o que foi empurrado para
lá deixa de ser procurado. Passou a `center` — linha incompleta fica no meio e
continua parecendo parte da mesma barra. Junto: o selo "⟳ Varredura" virou só o
símbolo abaixo de 560px (ocupava a largura de quatro botões e não é botão — o
texto continua no leitor, e quem usa varredura depende dele), e o separador
decorativo some, porque numa fila já quebrada ele não separa nada.

**O que se decidiu NÃO fazer:** encolher botão para caber mais por linha. Medido
em 333px — com 61px cabem 4 por linha, com 52px cabem os mesmos 4. A conta não
muda de linha, só o alvo fica menor. Duas linhas é o mínimo físico para sete
controles nessa largura, e alvo grande vale mais que barra curta num app cujo
usuário pode ter comprometimento motor.

---

## 4. As ferramentas

### `ferramentas/gramatica/` — auditoria do motor
`enumerar.mjs` gera casos com cobertura **100 % de pares e trios**;
`detectar.mjs` roda 14 detectores (5 invariantes duras, 9 suspeitas);
`rodada.mjs` roda **40 sementes** e agrega.

Duas lições que custaram caro e estão embutidas na ferramenta:

- **Uma semente só mente.** Semente 1 dava zero; a 77 dava 14. O padrão é 40.
- **Zero é indistinguível de detector quebrado.** A ferramenta imprime esse
  aviso ao terminar limpa, e há sondas de defeito injetado para provar que os
  detectores estão vivos.

### `ferramentas/lexico/` — o léxico gerado
`inferir.mjs` (regras), `gerar.mjs` (publica), `medir.mjs` (precisão contra o
gabarito das 250 revisadas à mão, **sai com código 1** se cair).

Medidas: classe **99,5 %** · gênero em confiança alta **100 %** · plural
irregular **15/15**.

Cinco travas no medidor: comuns de dois gêneros, invariáveis em `-a`,
exclusividade `gender`/`femininoBase`, classes do `type=4`, meta de 96 %.

---

## 5. A arquitetura de árvore — decidida, não implementada

`ARVORE.md` tem o desenho; `web/src/lib/arvore.ts` tem tipos, percursos e a
verificação estrutural (13 testes). **Não alimenta o app ainda.**

O motor atual monta a frase numa passada só e não pode rever uma decisão. A
árvore separa **decidir** de **escrever**: raiz (frase) → tronco (oração) →
galho (sintagma) → folha (palavra, com `origem`, `papel` e `opcional`).

Destrava o que hoje não tem onde existir: tirar o artigo por escolha, modo
telegráfico de verdade, explicar a frase palavra a palavra.

**A troca é por comparação diferencial** — os dois motores sobre os mesmos
20.000 casos, diferença a diferença. Nunca por substituição direta.

---

## 6. O que falta, em ordem

1. **O `tem` existencial** — "tem bolo?", "tem mais?". A pergunta mais comum que
   o motor ainda erra; ver a lista aberta na seção 3.
2. **Eixo C do `PLANO.md`** — os 229 pictogramas essenciais no precache. Custo
   2,2 MB; ganho: a prancha de fábrica funciona no primeiro uso, sem rede.
   Hoje **não funciona**.
3. **Construtor da árvore** + comparação diferencial (Fases 1 e 2 do `ARVORE.md`).
4. **Fila de revisão do léxico** — 1.249 entradas esperando olho humano.
5. **CI** — `typecheck`, `test`, `build` a cada push. `.github/` existe, o fluxo
   não.

---

## 7. Mapa dos documentos

| arquivo | o que responde |
|---|---|
| `README.md` | o que é o app |
| `GRAMMAR.md` | o que o motor faz, e o que se recusa a fazer |
| `LANGUAGE-SYSTEMS.md` | por que as decisões têm essa forma (LAMP, Bliss, Fitzgerald) |
| `SENSORY.md` | cor, tipografia, som, pattern glare |
| `LEGISLATION.md` | CDPD, ADA, EAA, arcabouço brasileiro |
| `ROADMAP.md` | o que o app ainda não é, por impacto |
| `PLANO.md` | escala: padronização, imagens, fundamentação em lote |
| `ARVORE.md` | a arquitetura do motor |
| `LEXICO-PADRAO.md` | **onde o conhecimento linguístico mora, e por quê** — a regra aberta/fechada |
| `NIVEIS.md` | **até onde o motor chega, onde para, e por quais caminhos** — a escala N0–N7, os três tetos, as cinco abordagens |
| `RECURSOS-LINGUISTICOS.md` | **corpora externos para enriquecer as regras** — UD, VerbNet.Br, licenças e caminho de extração |
| `FUNCIONALIDADES.md` | **tudo que o app faz hoje**, contado do código — e a proposta da seção de Lógica |
| `ferramentas/*/REVISAO.md`, `LEXICO.md` | método e números das ferramentas |
| **este** | onde o trabalho está agora |
