# Revisão em massa do motor de frases

Como percorrer o espaço de combinações do motor (`web/src/lib/grammar.ts`),
separar o que merece um par de olhos, e ler o relatório sem tirar conclusão
errada dele.

É o Eixo D do [PLANO.md](../../PLANO.md), passos D1 e D2. O contrato do motor
está no [GRAMMAR.md](../../GRAMMAR.md) — nada aqui inventa regra: os detectores
só verificam o que aquele documento já promete.

> **Isto não é um servidor.** É ferramenta de construção: roda na máquina de
> quem desenvolve e cospe um arquivo. O app publicado continua estático,
> offline e sem back-end.

---

## Por que a ferramenta existe

O motor tem 145 casos de regressão em `web/tests/grammar.test.ts`. O espaço
real — sujeito × verbo × complemento × tempo × negação × pergunta ×
progressivo × pedido × plural × artigo × gênero do falante × região ×
registro, multiplicado pelo léxico — é de centenas de milhares antes de contar
palavra, e de bilhões contando.

Os defeitos sérios achados até hoje foram achados **por alguém usando o app à
mão**. Isso é caro, lento, e depende de a pessoa certa tocar a combinação
certa. A ferramenta existe para que a máquina toque as combinações e a pessoa
gaste o tempo dela no que sobrou.

---

## O método

### 1. Enumerar — `enumerar.mjs`

```
node ferramentas/gramatica/enumerar.mjs --casos=20000 --semente=1
```

Grava `casos.jsonl`, uma linha por caso, com entrada, marcadores, opções e a
saída completa do motor — inclusive os **tokens**, que são o que permite
verificar as invariantes com precisão em vez de comparar strings.

| Parâmetro | O que faz |
|---|---|
| `--casos=N` | teto de casos (padrão 20000) |
| `--semente=N` | semente do sorteador (padrão 1) |
| `--familias=N` | 1 caso em cada N vira família: o mesmo conteúdo nas 6 regiões × 2 registros |
| `--saida=CAM` | arquivo de saída |

Três decisões merecem justificativa:

**O vocabulário sai do léxico real, não de uma lista inventada.** As 250
palavras revisadas à mão (`lexicon.ts`) dão os traços finos — `mass`,
`animate`, `place`, `device`, `bodyPart`, `prep`, `modal` —, e as ~4.900 do
léxico gerado (`web/public/data/lexico.json`) dão a cauda, que é a condição da
maioria das palavras que a pessoa traz pela busca. Uma lista escrita dentro da
ferramenta testaria o que quem escreveu a ferramenta imaginou, e os defeitos
aparecem justamente fora disso.

**Cobertura por pares e trios, não força bruta.** Cobrir todo par de valores de
dimensões diferentes cabe em milhares de casos; o produto cartesiano não cabe
em nenhum número de horas. O argumento é empírico: a esmagadora maioria dos
defeitos de interação envolve duas variáveis — "passado + negação", "modal +
incontável" —, não treze. Trios ficam só entre as dimensões pequenas
(marcadores, forma da frase, região, registro), onde cabem inteiros. O
relatório imprime a cobertura atingida; com 20.000 casos ela fecha em 100%.

**Famílias.** Comparar regiões e registros exige o par, não o caso solto. Por
isso 1 em cada 12 combinações é rodada nas 12 variedades com o mesmo
identificador de família — é a única forma de o detector saber que trocar a
região mudou algo que não devia.

### 2. Detectar — `detectar.mjs`

```
node ferramentas/gramatica/detectar.mjs --exemplos=3
```

Lê o JSONL, classifica, imprime o relatório e grava `suspeitas.jsonl`.

---

## Suspeita não é erro

**A maioria das suspeitas vai ser comportamento correto que o detector não
sabe reconhecer.** Isso não é defeito da ferramenta: é o preço de detectores
que ainda pegam o que ninguém previu. Um detector afinado até nunca errar
deixaria de achar exatamente aquilo para que foi feito.

O valor não está em acertar — está em **reduzir centenas de milhares de
combinações a uma fila que uma pessoa consegue revisar**. Uma fila de 600 casos
agrupados por forma é meia hora de trabalho; o espaço inteiro é infinito.

A exceção são as **invariantes**. Ali o número certo é zero, e qualquer linha
diferente de zero é defeito, não suspeita.

---

## O que cada detector procura

### Invariantes duras — violação é defeito certo

| Detector | O que verifica | Onde está escrito |
|---|---|---|
| `invariante:conteudo-inserido` | nenhum token `inserted` é substantivo, verbo, adjetivo ou advérbio fora das palavras funcionais (artigo, preposição, contração, partícula, possessivo e as formas de *ser/estar/ter/ir*) | GRAMMAR.md 2.2 |
| `invariante:card-perdido` | todo card escolhido produziu ao menos um token | GRAMMAR.md 2.2 |
| `invariante:reordenacao` | os `cardIndex` saem em ordem crescente, salvo as duas exceções: partícula de negação e pronome átono | GRAMMAR.md 2.1 |
| `invariante:palavra-do-card-sumiu` | card de várias palavras ("escovar os dentes") chega inteiro, a menos que tenha sido flexionado | GRAMMAR.md 2.2 |
| `invariante:excecao` | o motor não lança. Uma prancha que quebra é uma prancha muda | — |

As formas de *ser*, *estar*, *ter* e *ir* não são uma lista copiada: saem do
próprio motor (`conjugate`, `gerund`, `imperative`). Uma lista copiada
envelheceria em silêncio, e bastaria alguém corrigir um irregular para o
detector passar a acusar o motor de inventar verbo.

### Suspeitas — vão para revisão humana

| Detector | Gravidade | O que procura |
|---|---|---|
| `concordancia` | alta | artigo/contração com gênero ou número diferente do núcleo que ele introduz; adjetivo terminado em -o/-a discordando do substantivo **imediatamente anterior**, dentro da mesma oração |
| `regionalismo-pela-metade` | alta | a região tem variante para a palavra e a saída trouxe a forma canônica mesmo assim |
| `repeticao` | alta | palavra repetida em sequência em que **ao menos uma** das duas é `inserted` ("a a água", "de de") |
| `preposicao-dupla` | alta | preposição seguida de preposição |
| `diferenca-regiao` | alta | trocar a região mudou a frase sem que houvesse variante lexical nem tratamento de 2ª pessoa envolvido |
| `infinitivo-solto` | média | verbo do léxico revisado ficou no infinitivo sem modal, preposição ou conectivo antes |
| `diferenca-registro` | média | coloquial e normativo produziram **esqueletos de card diferentes** |
| `pontuacao` | média | pontuação dupla, espaço duplo, vírgula antes de "e", espaço antes de pontuação |
| `forma-da-frase` | baixa | frase que começa em minúscula ou não termina em pontuação |

Duas decisões de calibragem que já custaram fila cheia de nada:

- **`a` sozinho não conta como preposição.** É preposição e artigo com a mesma
  forma, e incluí-lo fazia "com a dor" e "para a batata" — português perfeito —
  encherem a fila.
- **A concordância consulta a palavra regional, não a canônica.** "A criança"
  vira "o guri" no Sul, e é o gênero da variante que manda no artigo
  (GRAMMAR.md 5). Consultar a canônica acusava "o guri" de erro.
- **Repetição só conta se o motor tiver participado dela.** A pessoa escolher
  o card BEIJO duas vezes produz "beijo, beijo e silhueta" — e apagar uma
  seria o motor removendo palavra escolhida, exatamente o que a invariante
  deste mesmo arquivo proíbe. A origem do token (`card` / `inserted`) resolve:
  duas de card, legítimo; ao menos uma inserida, suspeita.
- **O adjetivo concorda com o substantivo imediatamente anterior, e fronteira
  de oração corta o escopo.** Guardar "o último substantivo da frase inteira"
  acusava frase perfeita: em "…amar a titia então o guri chato?", `chato`
  concorda com `guri`, e `titia` está do outro lado de um conectivo. Encerram o
  escopo: outro substantivo (que vira o alvo — ou nenhum, se o gênero dele for
  desconhecido), conectivo (`então`, `aí`, `mas`, `porque`, `e`…), vírgula e
  ponto.

O detector de registro merece nota à parte: o que o registro **pode** mudar é
"pra"/"para" (e o artigo que vem junto), o imperativo e a conjugação de "tu" —
tudo isso é palavra inserida ou outra forma do **mesmo** card. Por isso a
comparação ignora o que foi inserido, que legitimamente muda de número, e olha
só a sequência de cards. Se ela diverge, o registro mexeu na estrutura, e isso
não está previsto em lugar nenhum do GRAMMAR.md.

---

## Como ler o relatório

```
casos lidos: 20004   famílias: 870
VIOLAÇÕES DE INVARIANTE: 0   suspeitas: 574
variedades: 416/8700 comparações de região mudaram a frase, 1614/5220 de registro
```

1. **A primeira linha que importa é a das invariantes.** Zero é o valor
   esperado. Qualquer outro número é trabalho imediato, e o `suspeitas.jsonl`
   traz entrada, marcadores e opções suficientes para reproduzir o caso.

2. **A linha de variedades existe para desambiguar o zero.** "0 suspeitas de
   região" pode querer dizer que o motor está certo ou que o detector nunca
   comparou nada. O número de comparações separa as duas leituras — sem ele, um
   detector quebrado se parece com um motor perfeito.

3. **Contagem alta quase nunca significa muitos defeitos.** Significa um
   defeito, ou um traço de léxico faltando, multiplicado pelas combinações que
   passam por ele. Antes de contar 300 problemas, agrupe por `motivo` no
   `suspeitas.jsonl`: costumam ser meia dúzia de causas.

4. **Reproduzir um caso** é copiar `entrada`, `marcadores` e `opcoes` da linha
   e chamar `compose` — ou rodar o enumerador com a mesma semente, que devolve
   byte a byte o mesmo arquivo.

---

### 3. Rodada longa — `rodada.mjs`

```
node ferramentas/gramatica/rodada.mjs --sementes=40 --casos=20000
```

**Uma semente não é uma rodada.** A cobertura de pares e trios fecha em 100%
com 20.000 casos, e isso engana: o que fecha é a cobertura das *dimensões*. O
**conteúdo** de cada caso — qual verbo, qual substantivo, qual card repetido —
muda com a semente, e é aí que aparecem tanto o detector mal calibrado quanto o
defeito que mora numa célula específica da tabela.

O histórico desta ferramenta é a prova:

| Rodada | Resultado |
|---|---|
| semente 1 | 0 suspeitas |
| semente 77 | 14 suspeitas — todas falso positivo de `repeticao` |
| 10 sementes (200 mil casos, 1,5 min) | 0 |
| 40 sementes (800 mil casos, 5,7 min) | 903 — uma vírgula indevida, real |

Por isso o padrão é 40, e não 10: enquanto acrescentar semente ainda acha
coisa, o padrão está baixo demais. Cada semente roda em processo próprio, para
que a segunda não herde estado da primeira, e as sementes andam de 7919 em
7919 — sementes vizinhas dão primeiros sorteios vizinhos, e quarenta rodadas
quase iguais dariam a mesma falsa sensação de cobertura que uma só.

A fila agregada (`suspeitas-longa.jsonl`) guarda a **semente** em cada linha:
sem ela a suspeita não se reproduz, e suspeita que não se reproduz não se
revisa.

## Quando o relatório zera

Zero suspeitas é o objetivo — e é também exatamente o que um detector quebrado
imprime. **Um relatório limpo não vale nada sozinho.**

Antes de anunciar que o motor está sem defeito conhecido, injete defeito e
veja se ele é pego: monte à mão um JSONL de sonda com saídas erradas — artigo
de gênero trocado, palavra repetida, palavra de conteúdo inserida, card
faltando, dois cards fora de ordem — e rode `detectar.mjs --casos=` sobre ele.
Se as contagens não subirem, o problema é o detector, não a boa notícia.

O JSONL de sonda é descartável e mora fora do repositório: a sonda comprova o
detector do dia, e um arquivo versionado só criaria a ilusão de que ela cobre
o que passou a existir depois.

## Determinismo

Mesma semente, mesma saída — verificado por hash. Nada de `Math.random` solto
nem de `Date.now()` dentro da geração: o sorteador é passado por parâmetro
(`motor.mjs`), como já é regra em `game.ts`, `padroes.ts` e `diario.ts`.

Não é preciosismo. Uma suspeita que não se reproduz não é revisável: quem for
conferir precisa poder gerar de novo o caso exato, e quem for corrigir precisa
poder provar que sumiu.

---

## O que ainda não existe

D3 (fila de revisão como página local), D4 (corpus revisado virando teste) e D5
(cobertura como número) continuam por fazer. O `suspeitas.jsonl` já está no
formato que a fila vai consumir: uma linha por caso, com entrada, marcadores,
opções e o detector que disparou.
