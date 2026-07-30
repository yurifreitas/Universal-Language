# O léxico gerado

O motor de frases precisa saber, de cada palavra, a **classe**, o **gênero** e o
**plural**. Sem isso ele não põe artigo, não concorda adjetivo e não conjuga —
faz a coisa conservadora e devolve frase telegráfica.

O léxico revisado à mão (`web/src/lib/lexicon.ts`) cobre 250 palavras. O acervo
que a busca do app oferece tem **6.882 termos de uma palavra** em português.
Ou seja: quase todo o vocabulário que a pessoa consegue achar e pôr na frase
chegava ao motor como palavra desconhecida.

Esta ferramenta preenche esse vão. O que ela não faz é fingir que sabe.

## A fonte

`data/arasaac.sqlite`, tabela `keywords`, `lang='pt'` — 20.049 linhas do acervo
ARASAAC (arasaac.org, CC BY-NC-SA, Governo de Aragão / Sergio Palao). Um mesmo
termo aparece várias vezes, uma por pictograma, com definições diferentes.

Só entram termos de **uma palavra**, sem dígito e sem pontuação. Locução
("escovar os dentes") precisa de anotação que a inferência não sabe dar, e
entraria errada com cara de certa.

O campo `meaning` está com **mojibake** — texto UTF-8 lido como latin-1, às
vezes duas vezes. `desfazerMojibake()` desfaz antes de qualquer regra olhar o
texto.

## O método

### Classe — do campo `type`

`2 = noun`, `3 = verb`, `4 = adjective`. Os tipos `1`, `5` e `6` (`6` é
pontuação e símbolo) não têm equivalente confiável e são **descartados**.

### Gênero — votação com pesos medidos

Três sinais independentes, cada um medido isoladamente contra o gabarito:

| sinal | o que é | precisão isolada | peso |
|---|---|---|---|
| terminação | tabela de sufixos + exceções | **98,8%** (82/83) | 2 |
| definição | marca `m.` / `f.` no início do `meaning` | 91,0% (71/78) | 1 |
| artigo | artigo colado à palavra dentro da definição | 5/5 (raro) | 1 |

Os pesos saem daí, não de gosto. A terminação decide sozinha; os outros dois
precisam de companhia.

**Confiança alta** exige **2 pontos a favor e zero contra**. Qualquer ponto do
lado perdedor derruba para baixa, mesmo quando a terminação venceria: sinal
discordante quer dizer que a palavra é daquelas que enganam, e é exatamente aí
que não se deve arriscar. Empate não produz gênero nenhum.

Isto vale para **substantivo**. Verbo entra direto, sem gênero nenhum. Adjetivo
tem regra própria e não usa votação — ver a seção dele abaixo, porque ali
`gender` significa outra coisa.

### Comum de dois gêneros — a palavra que não tem gênero para inferir

*O* dentista e *a* dentista. *O* estudante e *a* estudante. A forma é uma só;
quem muda é o artigo.

A auditoria do primeiro `lexico.json` publicado achou **72 palavras em `-ista`,
todas marcadas `gender: 'f'`** — alergologista, artista, camionista, dentista,
jornalista, taxista. A terminação em `-a` estava enganando a regra, e ia enganar
a classe inteira, sempre. Junto vieram `-iatra` (pediatra, psiquiatra),
`-nauta` (astronauta), `-cida` e as soltas `colega`, `atleta`, `guia`.

Não é imprecisão que dê para apertar: são palavras que **não têm** gênero para
inferir. Então a entrada sai com **classe e sem gênero**.

**Por que omitir é mais seguro que arriscar.** Numa prancha de CAA a pessoa fala
de si ou de quem está na frente dela o tempo todo. "A dentista" para um homem
não é um errinho de concordância — é o app pondo a pessoa errada na frase, no
único canal que aquela pessoa tem para se fazer entender. Perder o gênero de uma
palavra que tinha custa uma concordância; inventar gênero numa que não tem custa
a identidade de quem está falando. Os dois custos não são da mesma ordem, e a
regra segue o mais caro.

Por isso a lista é de **sufixos com exceções tabeladas**, e não de uma regra
larga. As exceções são a mesma armadilha do *arte-são*: em `lista`, `pista`,
`vista`, `crista`, `entrevista`, `revista` e `restaurante`, aquelas letras não
são sufixo nenhum. E `guia` está na lista palavra a palavra, não como regra
`-guia$`, porque *águia*, *enguia* e *audioguia* são femininas de verdade.

**Não confundir com SOBRECOMUM.** `criança`, `pessoa`, `vítima` e `testemunha`
têm gênero **fixo**, o mesmo para homem e mulher: diz-se "a criança" de um
menino e "a testemunha" de um homem. Elas ficam com o gênero. Incluí `criança`
por engano numa versão desta regra e a medição contra o gabarito pegou no ato —
que é para isso que ela existe.

Uma entrada assim sai com **confiança alta**: a ausência de gênero ali é a
resposta, não uma lacuna, e a classe sozinha já é dado bom. `gerar.mjs` sabe
distinguir "sem gênero de propósito" de "sem gênero por ignorância" — a segunda
continua indo para revisão.

`medir.mjs` trava isto: uma lista de comuns de dois gêneros conhecidos, e a
asserção de que nenhum sai com `gender`. Não é medida, é trava — o erro volta
silencioso quando alguém mexer nas terminações.

### As regras de terminação

O que importa nelas é o que ficou **de fora**. O `-e` final é ambíguo em pt-BR
(*leite* m., *carne* f.) e não vota: erra perto de metade das vezes e
envenenaria a votação. Por isso *sorvete* e *febre* ficam sem gênero — e ficam
de fora do arquivo.

Exceções tabeladas, cada uma vinda de um erro visto na medição:

- `-or` feminino: **dor, cor, flor**;
- `ã$` é feminino (irmã, manhã, maçã) e vem antes de `ão$`;
- `-ema/-oma` de origem grega é masculino (problema, sistema, cinema). O `-ama`
  genérico ficou fora porque engolia *cama*;
- o sufixo `-ção/-são` é feminino, mas a regra é cega e casa com palavras em que
  aquelas letras não são sufixo nenhum: **arte-são**, **cora-ção**.

### O `type=4` não é "adjetivo" — é "modificador"

Dentro do `type=4` da ARASAAC vêm advérbio, numeral, possessivo e demonstrativo
misturados com adjetivo de verdade. Publicá-los como adjetivo fazia o motor pôr
cópula onde cabia adjunto:

```
["nossa","dia","não","depressa"] → "Nosso dia não vai estar depressa."
```

Isso aparecia no detector de **concordância**, mas nunca foi de concordância:
advérbio não concorda com substantivo nenhum porque não é para concordar. O
defeito era de **classe**, e o conserto é dar a classe certa.

São **classes fechadas** — dá para listá-las inteiras, e listar é mais seguro
que inferir:

| família | classe | forma |
|---|---|---|
| advérbio (agora, depressa, longe, atrás) | `adverb` | — |
| cardinal (trinta, oitenta, cem, mil) | `quantifier` | `plural: true` |
| possessivo (meu, minhas, suas) | `determiner` | `gender`, `plural` |
| demonstrativo (este, aquelas) | `article` | `gender`, `plural` |

A forma não foi escolhida por mim: `dois: { class: 'quantifier', plural: true }`
já estava no léxico revisado à mão, e lá possessivo é `determiner` (`meu`)
enquanto demonstrativo é `article` (`esse`, `aquele`). Segui o que já existia.

**Ordinais NÃO entram.** "primeira", "segunda", "terceira" são adjetivos de
verdade e flexionam como tais — só o cardinal vira quantificador.

Além das listas, uso a marca do próprio acervo: a definição de `depressa` começa
com **"adv."**. Vale como último recurso, e só para advérbio — o marcador
`pron.` também existe, mas vem contaminado (a ARASAAC o usa em numeral também),
e um sinal sujo não decide nada aqui.

**O que não deu para separar, saiu.** `como` e `onde` são interrogativos: têm
classe própria (`question`) e regem estrutura de pergunta, que a inferência não
sabe montar. Publicá-los como advérbio trocaria um erro por outro, então eles
não são publicados e voltam para `guess()` — o comportamento de antes.

Ficou de fora também o que é ambíguo de verdade: `todo/toda` e `mesmo/mesma`
funcionam como determinante **e** como adjetivo ("o dia todo", "ele mesmo"), e
`sobre`/`sob` são preposições que preferi não mexer. Continuam como estavam.

Resultado: **77 palavras saíram de `adjective`** (617 → 540), 76 publicadas na
classe certa e 2 descartadas.

### Adjetivo — `gender` ali não quer dizer gênero

Em substantivo, `gender` é o gênero da palavra. **Em adjetivo é outra coisa**, e
confundir as duas leva a decisões erradas. Leia `agree()` em `grammar.ts`:

```ts
if (gender === 'f' && lex?.gender === 'm' && out.endsWith('o'))
  out = out.slice(0, -1) + 'a'
```

`gender: 'm'` num adjetivo é a **chave que liga a flexão**. Ausência quer dizer
*invariável* — é o que o comentário do `Lexeme` em `lexicon.ts` já dizia
("Adjetivo sem genero e invariavel (feliz)"). Sem essa chave, todo adjetivo fora
das 250 revisadas ficava congelado na forma do cartão: "A casa está bonito".

A regra sai inteira da leitura de `agree()`: **só o `-o` final é acionável, então
só ele é marcado.** `-ês`, `-or`, `-eu` e `-ão` também são biformes
(português/portuguesa, trabalhador/trabalhadora), mas `agree()` não os toca —
marcá-los não mudaria uma frase hoje e traria junto os invariáveis que se parecem
com eles (*melhor*, *pior*, *anterior*, *cortês*). Ganho zero, risco real.

Os 27 adjetivos do gabarito confirmam o corte sem uma exceção: os 20 com
`gender: 'm'` terminam em `-o`; os 7 sem gênero são todos invariáveis (feliz,
triste, doente, grande, quente, legal, igual). **O `n` é pequeno** — 23 dos 27
estão no acervo — e o 100% medido ali vale como confirmação da regra, não como
estatística firme.

A armadilha simétrica à do `-ista` é dar gênero a invariável: `feliz`, `grande`,
`azul`, `fácil` e `verde` saem sem o campo, e `medir.mjs` trava isso.

#### `femininoBase` — quando o rótulo já vem no feminino

O acervo nomeia muitos pictogramas pela forma feminina: `preguiçosa`, `amarela`,
`cansada`. O cartão imprime o rótulo que tem, e por um tempo isto não teve
conserto do lado do léxico — `agree()` só sabia ir de masculino para feminino, e
nenhum campo reescreve o rótulo.

`grammar.ts` ganhou o caminho de volta e o `Lexeme` ganhou o campo:

```ts
if (gender === 'm' && lex?.femininoBase && out.endsWith('a')) out = out.slice(0, -1) + 'o'
```

`femininoBase: true` quer dizer "o rótulo está na forma feminina de um par
biforme". Ele e `gender` são **mutuamente exclusivos**: um diz "o rótulo é a
forma masculina, flexione para feminino", o outro diz o contrário. Uma entrada
com os dois é contradição, e `medir.mjs` varre o acervo inteiro para garantir
que ela não existe.

**A marca não se deduz da terminação** — é a armadilha do `-ista` de roupa nova.
Adjetivo invariável em `-a` é comum (*otimista*, *hipócrita*, *agrícola*,
*indígena*, *poliglota*), e marcá-lo faz o motor imprimir "otimisto".

O sinal usado é direto e não inferido: **o par masculino existe no acervo,
também como adjetivo**. "amarela" tem "amarelo" ao lado; "otimista" não tem
"otimisto", e nunca vai ter. São **141 marcadas**, de 187 adjetivos em `-a`.

As 46 que sobram não têm par no acervo, e a resposta ali é **não marcar**. Olhei
uma a uma: cerca de um terço nem adjetivo é — o `type=4` da ARASAAC recolhe
advérbio (*agora*, *depressa*, *nunca*), numeral (*trinta*, *oitenta*) e
determinante (*essa*, *minha*) —, e junto vêm invariáveis de verdade (*careca*,
*grávida*, *poliglota*, *rosa*). Marcar o bloco por terminação acertaria uns dois
terços, muito abaixo do corte do resto do arquivo. As biformes legítimas que se
perdem ali (*bêbada*, *medrosa*, *espanhola*) continuam saindo com a classe, que
é o comportamento de antes: nada piora, só não melhora.

### Plural — só o que o motor ainda não sabe

O campo `plural` da ARASAAC foi conferido nos 15 plurais irregulares do gabarito
e acertou **15 de 15**. É dado confiável.

Mesmo assim ele quase nunca é emitido. `pluralDoMotor()` é um porte **fiel** de
`pluralize()` em `web/src/lib/grammar.ts` — defeitos inclusive, porque a
pergunta não é "qual é o plural certo" e sim "o motor já chega nele sozinho?".
Uma versão *melhor* que a do motor faria a ferramenta calar justamente nos casos
em que o motor erra, que são os únicos que interessam. Se `grammar.ts` mudar,
esta função muda junto e `medir.mjs` avisa.

Três guardas sobre o campo do acervo, cada uma de um caso real:

- tem de terminar em `-s` — mata os erros de digitação (`cabaçaa`) e os plurais
  latinos (`curricula`);
- tem de dividir quase toda a palavra com o singular — mata a grafia de pt-PT
  ao lado do singular de pt-BR (`atividade` / `actividades`);
- tem de ser diferente do que `pluralDoMotor()` já produz.

## Os números medidos

`node ferramentas/lexico/medir.mjs`, gabarito = as 251 entradas `noun/verb/adj`
revisadas à mão:

```
  presentes no acervo            215  (85,7% de cobertura)
  destes, confiança alta         191  (88,8%)

  classe                          214/215     99,5%
  gênero (tudo que inferi)        104/106     98,1%
  gênero (só confiança alta)       82/82     100,0%
  plural irregular                 15/15     100,0%
  adjetivo: m vs invariável        23/23     100,0%   (n pequeno)

  COMUNS DE DOIS GÊNEROS — nenhum pode sair com gênero
    OK — 12 conferidos, nenhum com gênero

  ADJETIVOS INVARIÁVEIS — nenhum pode sair com gênero
    OK — 15 conferidos, nenhum com gênero

  gender + femininoBase NA MESMA ENTRADA — impossível
    OK — 6882 termos varridos, nenhuma contradição

  INVARIÁVEIS EM -a — nenhum pode sair com femininoBase
    OK — 11 conferidos, nenhum marcado

  MODIFICADORES DO type=4 — classe certa, nunca adjetivo
    OK — 18 conferidos, todos na classe certa
```

`medir.mjs` sai com código 1 se a trava falhar ou se a meta de 96% cair — dá
para pendurar em CI.

Erros restantes: `colher` classificada como verbo (é as duas coisas, e o acervo
escolheu o verbo); `sorvete` e `febre` sem gênero, pela regra do `-e`.

A meta era **≥96% de gênero em confiança alta**. Os 100% aqui são sobre 82
palavras comuns — não são uma promessa de 100% sobre as 3.244 publicadas. São a
evidência de que o corte está apertado o bastante.

## O que entra no app, e por quê

`gerar.mjs` produz duas saídas:

- **`web/public/data/lexico.json`** — 4.905 entradas, só confiança alta.
  3.299 substantivos (dos quais **132 comuns de dois gêneros, sem gênero de
  propósito**), 990 verbos, 540 adjetivos (**262 com `gender: 'm'` e 139 com
  `femininoBase: true`** — as duas chaves que ligam a flexão em `agree()`),
  e 76 modificadores resgatados do `type=4`: 31 `quantifier`, 22 `determiner`,
  16 `adverb`, 7 `article`.
- **`ferramentas/lexico/revisar.jsonl`** — 1.249 termos, uma linha por termo,
  com os sinais que cada um produziu. Fila de revisão humana.

**A confiança baixa não entra no app.** Errar o artigo é pior do que não ter
artigo: "o mão" e "a problema" fazem a frase parecer escrita por quem não sabe
falar, e quem usa a prancha já briga demais para ser levado a sério. Não pôr
artigo é o que o motor já faz hoje com palavra desconhecida — é uma frase mais
telegráfica, e nada além disso. O custo de uma palavra a menos no léxico é
pequeno e conhecido; o custo de uma palavra errada é a frase dizer outra coisa.

Uma palavra na fila de revisão não some: ela cai em `guess()`, exatamente como
antes desta ferramenta existir.

## O léxico revisado à mão sempre vence

`chavesRevisadas()` extrai por regex toda palavra que `lexicon.ts` já trata — do
`LEXICON` até o fim do arquivo, o que recolhe também `IRREGULAR_VERBS`,
`SUBJUNCTIVE`, `GERUND` e `TIME_ADVERBS`. São 378 palavras, e a varredura larga
é deliberada: toda palavra dessas tabelas já foi olhada por uma pessoa.
Preservar demais custa cobertura; preservar de menos corrompe trabalho manual.

O modo de falhar do regex é devolver **poucas** chaves, silenciosamente e na
direção ruim. Por isso `gerar.mjs` aborta se a contagem despencar abaixo de 150,
e confere no fim que nenhuma palavra publicada colide com o léxico manual.

## Como rodar

```sh
node ferramentas/lexico/medir.mjs    # a tabela de precisão — rode ANTES
node ferramentas/lexico/gerar.mjs    # regrava lexico.json e revisar.jsonl
```

Mexeu nas regras de `inferir.mjs`? Rode `medir.mjs` e compare com os números
acima. É o que impede a ferramenta de piorar sem ninguém ver.

## Onde isto é consumido

`web/src/lib/lexicoGerado.ts`. A precedência é: léxico manual → este arquivo →
`guess()`. Tudo falha para o comportamento de antes: se o JSON não carregar,
vier corrompido ou trouxer versão desconhecida, o app funciona exatamente como
funcionava. **A prancha tem de abrir sem ele.**

## Em aberto: o motor ainda não sabe ficar sem gênero

Conferido em `grammar.ts`, no ramo que escolhe artigo de substantivo:

```ts
const gender = lex.gender ?? 'm'
```

Ou seja: hoje, substantivo sem gênero **não** faz o motor omitir o artigo — ele
cai no masculino. Para os 132 comuns de dois gêneros isso ainda é a melhor das
três opções disponíveis, e por larga margem:

| o que a palavra recebe | o que sai para "dentista" |
|---|---|
| `gender: 'f'` (o bug corrigido) | "a dentista" — sempre, inclusive para homem |
| fora do léxico, cai em `guess()` | "a dentista" — `guess()` também lê o `-a` |
| classe sem gênero (**hoje**) | "o dentista" — masculino não-marcado |

O masculino não-marcado é a convenção do português para quando não se sabe, e é
o que a pessoa espera ver; o feminino automático não é. Então esta correção é um
ganho real mesmo com o motor como está.

O passo seguinte, que é mudança em `grammar.ts` e não nesta ferramenta: fazer o
ramo do artigo distinguir "gênero desconhecido" e omitir o artigo, ou usar o
gênero do alvo da fala — que o motor já conhece em outros ramos
(`target?.gender`, `speakerGender`). Aí "dentista" concordaria com quem está
sendo falado, que é a resposta certa de verdade.
