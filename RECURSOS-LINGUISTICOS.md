# Recursos linguísticos externos

Onde buscar conhecimento de português que o projeto ainda declara à mão, com
licença compatível e caminho de extração concreto.

Existe porque `NIVEIS.md` § 2 identificou um teto — *a forma não carrega o
significado* — e afirmou que ele **não tinha saída automática**. Essa afirmação
estava errada, e este documento é a correção.

Levantado em **31/07/2026**. Complementa `REFERENCES.md`, que cobre metodologia
de CAA, não linguística computacional.

---

## 1. A correção

`NIVEIS.md` dizia, sobre o Teto 2:

> **Saída:** nenhuma automática. Ou alguém revisa, ou fica assim.

Isso valia para o método que eu estava usando — inferir da forma da palavra. Não
vale para o problema: **existe corpus anotado de português com estrutura
argumental**, e estrutura argumental é exatamente o que as seis marcas de
comportamento descrevem.

O que muda na prática: as marcas deixam de sair da minha lista e passam a sair de
**evidência de uso atestado**, com contagem.

---

## 2. Universal Dependencies — o recurso que serve

O achado principal. Dois treebanks de português, ambos **CC BY-SA 4.0**.

| | UD_Portuguese-Bosque | UD_Portuguese-GSD |
|---|---|---|
| Origem | Floresta Sintá(c)tica | Google UD Treebanks 2.0 |
| Variante | europeia **e** brasileira | **brasileira** |
| Tamanho | 9.357 frases · 210.958 tokens | — |
| Licença | CC BY-SA 4.0 | CC BY-SA 4.0 |

Confirmado no Bosque: `obj` (5.947 ocorrências), `iobj` (631), `ccomp`, `xcomp`,
`obl`, `cop`, e os traços **`Mood`** (Indicativo / Subjuntivo / Imperativo /
Condicional) e **`VerbForm`** (Fin / Inf / Ger / Part).

### Por que isto resolve o Teto 2

As seis marcas de comportamento são, uma a uma, padrões de dependência:

| marca | como sai do treebank |
|---|---|
| `ditransitivo` | verbo com `obj` **e** `iobj` — ou `obj` + `obl` cujo `case` é `a`/`para` |
| `volitivo` | verbo com `ccomp` cujo núcleo tem **`Mood=Sub`** |
| `opiniao` | verbo com `ccomp` cujo núcleo tem **`Mood=Ind`** |
| `modal` | verbo com `xcomp` de **`VerbForm=Inf`** |
| `prep` (regência) | verbo com `obl` e um `case` consistente entre ocorrências |
| `soTerceira` | verbo atestado **só** com `Person=3` |

A distinção volitivo × opinião — que custou uma sessão inteira para eu formular
como "o subjuntivo marca o que ainda não é fato" — está anotada no corpus como
`Mood`, frase a frase, por linguistas.

### O que ele **não** dá

- **Não é um veredito, é evidência com contagem.** Um verbo atestado três vezes
  com `iobj` é candidato forte; uma vez, é ruído. O corte precisa ser escolhido e
  medido, como o de gênero já é.
- **Não cobre o vocabulário de prancha.** Corpus é jornal e texto escrito.
  `dodói`, `xixi`, `papá` não aparecem. As marcas úteis para o dia a dia
  continuam vindo da mão.
- **Bosque mistura variantes.** Metade é português europeu — e o léxico gerado do
  ARASAAC **já tem contaminação de pt-PT** (`actuar`, `facturar`, `mandriar`).
  Puxar de um corpus misto sem separar agravaria um problema existente. O GSD é
  brasileiro e deve vir primeiro.

### Como usaria, sem quebrar o padrão

Sem mudar nada do que `LEXICO-PADRAO.md` estabelece. O treebank vira **mais uma
fonte de inferência** dentro de `ferramentas/lexico/`, com as travas que já
existem:

1. Extrair frames por lema, com contagem.
2. Publicar só acima de um corte, e com `confianca`.
3. **A trava de conflito de `medir.mjs` continua valendo** — e agora vale nos dois
   sentidos: divergência entre corpus e revisão humana é sinal de que um dos dois
   está errado, e vale olhar.
4. O que ficar abaixo do corte vai para `revisar.jsonl`.

---

## 2b. A extração, construída e medida

`ferramentas/lexico/treebank.mjs`. Roda sobre os `.conllu` do GSD (12.020 frases,
1.779 lemas verbais) e cruza com o léxico revisado à mão.

```
node ferramentas/lexico/treebank.mjs <pasta-com-os-.conllu>
```

O corpus **não é versionado** aqui: é dado de terceiro com licença própria, e o
app não o consome em execução — ele alimenta a revisão do léxico, e só.

### O que saiu

| marca | verbos |
|---|---|
| `completiva` (rege oração com "que") | **73** |
| `prep` (regência) | 31 |
| `ditransitivo` | 10 |
| `modal` | 8 |
| **com pictograma no acervo** | **42 de 118** |

Concordâncias com a revisão à mão: `dar`, `entregar`, `ensinar` (ditransitivo),
`entrar` (prep). **Um conflito**, e ele é instrutivo — ver abaixo.

### Duas coisas que a medição derrubou

Registradas porque um relatório que só conta acertos não serve para decidir nada.

**`soTerceira` não é extraível deste corpus, e a tentativa foi removida em vez de
ajustada.** A ideia era: verbo atestado só na 3ª pessoa é impessoal (`doer`,
`chover`). Medida, ela marcou **484 verbos**, entre eles `dizer`, `levar` e
`mostrar`.

A causa é o gênero do texto, não o limiar: `Person` está ausente em **91% dos
tokens verbais** (31.751 de 34.909), e onde aparece são 3.019 de 3ª contra 138 de
1ª e **1** de 2ª. Jornal narra o que os outros fizeram. "Só atestado na 3ª pessoa"
descreve o corpus, não o verbo.

A lição que fica: **quando um sinal está medindo o gênero do texto, nenhum
limiar o conserta** — subir o corte teria escondido o defeito em vez de removê-lo.

**A separação volitivo × opinião não veio da anotação.** O plano era ler `Mood`
do `ccomp`: `Sub` é volitivo, `Ind` é opinião. Mas **`Mood` está ausente em 93%
dos 2.285 `ccomp`** — só 160 o trazem.

O sinal que o corpus dá de verdade é mais simples e ainda assim é a parte
difícil: **quais verbos regem oração com "que"**. Saem 73, e a lista é boa —
`dizer`, `afirmar`, `saber`, `contar`, `explicar`, `achar`, `acreditar`,
`descobrir`, `pensar`, `entender`, `negar`, `perceber`, `avisar`, `imaginar`,
`temer`, `sugerir`, `admitir`. A divisão entre os dois lados fica para o revisor
humano, que é onde ela cabe.

### O conflito, e por que ele não é erro de ninguém

    falar.prep: corpus="a"  mão="com"

Os dois estão certos, em registros diferentes. "Falar **a** alguém" é escrito e
formal — é o português do jornal. "Falar **com** alguém" é como se fala, e é o
que serve numa prancha.

É o resumo do valor e do limite desta fonte: o corpus descreve **português
escrito de imprensa**, e o app fala **português falado de casa**. Onde os dois
coincidem, a evidência vale; onde divergem, a revisão humana decide — e aqui ela
já tinha decidido certo.

### Por que o cruzamento com o acervo importa

Dos 118 verbos marcados, só **42 têm pictograma**. Os outros são vocabulário de
reportagem: `ressaltar`, `frisar`, `reiterar`, `salientar`, `enfatizar`,
`ponderar`. Marcá-los não muda nada no app, porque não há card para tocar.

A fila (`treebank.jsonl`) sai ordenada por isso: primeiro o que existe como card.

### O que precisou ser apertado

A primeira versão dava 79 verbos com "regência", incluindo `levar`, `ver` e
`dizer`. Nenhum rege preposição: "levar o filho **para** a escola" tem objeto
direto e um **adjunto** de lugar — e o UD básico não distingue complemento de
adjunto, os dois são `obl`.

O discriminador usado é a **ausência de objeto direto**: verbo de objeto
preposicionado ("gostar de", "precisar de", "brincar com") não tem objeto direto
justamente porque o complemento vem pela preposição. Não é perfeito — perde
"avisar alguém **de** algo" —, mas erra para o lado de omitir, que é a política
do projeto. De 79 caiu para 31.

---

## 2c. O rendimento real, medido contra a prancha — **e ele é pequeno**

Medido em **02/08/2026**, e o resultado corrige tanto esta página quanto o
ranking de abordagens do `NIVEIS.md` § 3b.

A § 2b comemorava **42 verbos com pictograma**. Mas "tem pictograma" quer dizer
"existe no acervo de 13.801", não "está numa prancha". Cruzando a extração com
os **211 cards das 12 pranchas de fábrica**:

| medida | verbos |
|---|---|
| extraídos do GSD | 118 |
| com pictograma no acervo | 42 |
| **em card de prancha de fábrica** | **9** |
| desses, **já anotados à mão** | **8** |
| **ganho líquido** | **1** (`pensar`) + 1 correção (`parar`) |

Os 8 já anotados são `dar`, `saber`, `falar`, `achar`, `lembrar`, `esperar`,
`brincar` e `parar` — e a concordância entre corpus e mão é boa notícia sobre a
qualidade das duas fontes. Não é rendimento.

### O que isso diz sobre o Teto 2

**A métrica "44 de 978 verbos" tem o denominador errado.** 978 é o acervo; o que
a pessoa toca são os 39 verbos que estão em card. Desses, **18 têm marca de
comportamento e 21 não** — e os 21 são `comer`, `beber`, `dormir`, `abrir`,
`fechar`, `correr`, `pular`, `andar`, `cantar`, `dançar`, `lavar`, `vestir`…
verbos de ação concreta, que **corretamente não levam marca**.

A cobertura do vocabulário que se usa está praticamente completa. O que a
extração de corpus alcança é a cauda do acervo — `ressaltar`, `frisar`,
`reiterar`, `conquistar`, `promover` —, palavra de reportagem que ninguém vai
tocar numa prancha.

O `NIVEIS.md` § 2 estimava isso por amostra ("quase todos os 934 restantes são
verbos de ação concreta que corretamente não levam marca"). A estimativa estava
certa. O que estava errado era tratar a diferença como um **teto**: ela é a
distância entre o acervo e o uso, e fechá-la não melhora nenhuma frase.

### O que foi aplicado

Só o que a medição sustenta, com caso fixado em `npm run test:grammar`:

| verbo | marca | frase |
|---|---|---|
| `pensar` | `prep: 'em'`, `opiniao` | "Eu penso na mãe." |
| `parar` | `prepInf: 'de'`, `modal` | "Eu paro de comer." |

A regência `em` de `pensar` **não** veio do corpus — veio da revisão à mão, pelo
mesmo motivo do conflito `falar a/com`: o corpus dá a preposição do português
escrito.

### O falso positivo que a mudança expôs — e valeu mais que ela

Marcar `parar` fez a auditoria saltar de 0 para **1.561 suspeitas** numa rodada,
todas do mesmo detector e todas falsas:

    "Eles não para de levar."   →  preposicao-dupla: "para de"

**"Para" é preposição e é verbo.** O detector lia a frase como string, e string
não distingue as duas. Consertado em `detectar.mjs`: a checagem passou a ser por
**token** — só conta como preposição o que o motor inseriu (`kind: 'inserted'`)
ou o que veio de card de classe `preposition`. Uma forma verbal flexionada de
card não entra.

Depois do conserto: **40 sementes · 800.160 casos · 0 invariantes · 0
suspeitas**, com sonda de defeito injetado confirmando que o detector continua
pegando preposição dupla de verdade ("Eu gosto **de de** bolo").

Vale registrar por que isso importa mais que os dois verbos: um detector que
grita 1.561 vezes à toa é um detector que ninguém lê, e ele estava a **uma marca
de léxico** de virar isso. É a mesma lição do `soTerceira` acima — sinal que mede
a grafia em vez da função não se conserta com limiar.

---

## 3. Os recursos de valência específicos

Existem, e são mais precisos que UD — mas menos acessíveis.

**VerbNet.Br** — léxico computacional de verbos do português brasileiro, nos
moldes do VerbNet inglês, seguindo as classes de Levin. Construído
semiautomaticamente a partir de recursos do inglês e do português mais extração
de corpus.

**PropBank-Br** — anotação manual de papéis semânticos, com diretrizes adaptadas
ao português.

**Verbo-Brasil** — repositório de verbos e sentidos usado na anotação do
PropBank-Br.

**Avaliação honesta:** são exatamente o dado que o projeto quer, e mais preciso
que derivar de dependências. Mas a licença e a forma de distribuição de cada um
precisam ser verificadas caso a caso antes de qualquer uso — **não verifiquei**,
e um recurso acadêmico sem licença declarada não entra num app que se
compromete a funcionar offline e a ser redistribuível. UD vem primeiro porque a
licença é explícita e o download é direto.

---

## 4. O que procurei e **não** existe

Registro porque a ausência é informação.

**Não há lista publicada de vocabulário-núcleo de CAA para português
brasileiro.** A literatura de vocabulário-núcleo é sólida — poucas palavras de
alta frequência sustentam a maior parte do que se diz —, mas as listas
canônicas são de inglês. Para o português há estudos de vocabulário fundamental
e de frequência em corpus jornalístico, que **não é a mesma coisa**: a frequência
de um jornal não descreve o que uma criança precisa dizer em casa.

Consequência: as 12 pranchas de fábrica deste app são, na prática, **uma lista de
vocabulário-núcleo pt-BR implícita** — construída por julgamento, não medida. É
uma lacuna do campo, não deste projeto, e explica por que ela não foi preenchida
com uma referência.

---

## 5. Ordem sugerida

1. **UD_Portuguese-GSD primeiro** — brasileiro, licença limpa, download direto.
   Extrair frames e comparar com as 44 marcas atuais: onde o corpus concorda,
   ganha confiança; onde discorda, achou defeito num dos dois lados.
2. **Bosque depois**, só se a extração do GSD render pouco, e separando a parte
   brasileira (CETENFolha) da europeia.
3. **VerbNet.Br / PropBank-Br** só depois de verificar licença.
4. **Vocabulário-núcleo pt-BR** não tem fonte; se virar prioridade, o caminho é
   medir o uso real no próprio app — o que esbarra na decisão de não registrar
   fala, e portanto é decisão de produto, não tarefa técnica.

---

## Fontes

- [UD_Portuguese-Bosque](https://universaldependencies.org/treebanks/pt_bosque/index.html)
  · [repositório](https://github.com/UniversalDependencies/UD_Portuguese-Bosque)
- [UD_Portuguese-GSD](https://universaldependencies.org/treebanks/pt_gsd/index.html)
  · [repositório](https://github.com/UniversalDependencies/UD_Portuguese-GSD)
- [Using Cross-Linguistic Knowledge to Build VerbNet-Style Lexicons: Results for a (Brazilian) Portuguese VerbNet](https://link.springer.com/chapter/10.1007/978-3-319-09761-9_15)
- [Automatic extraction of subcategorization frames from corpora: an approach to Portuguese](https://www.researchgate.net/publication/228520342_Automatic_extraction_of_subcategorization_frames_from_corpora_an_approach_to_Portuguese)
- [Core Vocabulary: Vocabulario Núcleo o Palabras Esenciales](https://comunicacionaumentativa.com/core-vocabulary-vocabulario-nucleo-o-palabras-esenciales/)
- [Léxico e vocabulário fundamental — Biderman](https://periodicos.fclar.unesp.br/alfa/article/download/3994/3664/9739)

## Ver também

- [LEXICO-PADRAO.md](LEXICO-PADRAO.md) — onde o conhecimento mora e como entra.
- [NIVEIS.md](NIVEIS.md) — os tetos, incluindo o que este documento corrige.
- [REFERENCES.md](REFERENCES.md) — metodologia de CAA, normas e acervos.
