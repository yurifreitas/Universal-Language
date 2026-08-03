# Semântica, frames e pragmática — o que dessa abordagem entra, e o que não

Este documento examina uma proposta de arquitetura em três camadas — **ontologia
→ semântica → pragmática** — em que o card deixa de carregar regras de forma e
passa a evocar um *evento* com *papéis*, e o português vira um **realizador** no
fim da cadeia:

```
CONCEITO → FRAME → PAPÉIS → ESTADO/MUDANÇA → PORTUGUÊS
```

A proposta é boa e aponta para algo real. Mas boa parte dela **já está decidida
neste repositório**, e uma parte colide de frente com a regra que sustenta o
projeto inteiro. Este documento separa as três coisas: o que já existe sob outro
nome, o que vale tomar, e o que precisa ser recusado — com o motivo.

Complementa [NIVEIS.md](NIVEIS.md) (a escala N0–N7 e os três tetos),
[LEXICO-PADRAO.md](LEXICO-PADRAO.md) (onde o conhecimento mora) e
[RECURSOS-LINGUISTICOS.md](RECURSOS-LINGUISTICOS.md) (o corpus que corrige o
Teto 2).

---

## 1. Traduzindo a proposta para o vocabulário do projeto

Quase tudo nela tem nome aqui. A tabela é o documento inteiro em resumo:

| Na proposta | Aqui | Estado |
|---|---|---|
| frame semântico + papéis | valência e regência — **N2** | ✔ feito, por marca declarada |
| `TRANSFER`, `DESIRE`, `COGNITION` | `ditransitivo`, `volitivo`, `opiniao` | ✔ existem, com outro nome |
| léxico morfossintático separado do conceitual | o contrato de transporte do léxico | ✔ § 3 do LEXICO-PADRAO |
| `stateChanges`, mudança de estado | — | ✗ não existe, e ver § 4 |
| `affordances` (o que um objeto permite fazer) | — | ✗ novo, e é a melhor ideia da proposta |
| ato comunicativo, intenção | **N7 — pragmática** | ✗ e há decisão contra automatizar |
| contexto: ambiente, interlocutor, turno anterior | **Teto 3** | ✗ **recusado por privacidade** |
| português como "realizador" | a linearização da árvore | ◐ desenhada, `arvore.ts`, fora do app |

Duas conclusões saem daí antes de qualquer discussão de mérito:

1. **A camada de frames não é um salto — é a generalização de algo que já roda.**
   O que a proposta chama de `frames: ["INGESTION"]` o léxico já chama de seis
   marcas de comportamento. A diferença é de forma, não de poder.
2. **A camada pragmática é um salto — e é o único item da proposta que exige
   revogar uma decisão tomada.**

---

## 2. O que já está resolvido, e por que não parece

A proposta sugere trocar `ditransitivo: true` por um frame `TRANSFER` com
agente/tema/destinatário, porque isso "descreve o que acontece no mundo, não o
formato da frase".

O argumento é correto em teoria e **não muda uma linha da saída** aqui. O motivo
está no Teto 2 (`NIVEIS.md` § 2): o comportamento não é inferível da forma, e
por isso ele vem de **lista declarada**. Trocar o formato da lista não aumenta a
lista. Hoje são **44 dos 978 verbos** do acervo. Um frame `TRANSFER` bem
modelado sobre 44 verbos continua sendo 44 verbos.

O que de fato move esse número já está identificado e medido:
`UD_Portuguese-GSD`, onde `obj`+`iobj` é ditransitivo e `ccomp`+`Mood=Sub` é
volitivo (`RECURSOS-LINGUISTICOS.md` § 2). **A estrutura argumental anotada é o
frame** — só que extraída de corpus em vez de escrita à mão.

> Ordem certa: primeiro extrair valência do corpus e cobrir os 978 verbos;
> **depois**, se a lista ficar grande o bastante para doer, agrupá-la em frames.
> Frame é uma forma de organizar conhecimento que já se tem. Não é uma forma de
> obtê-lo.

---

## 3. O erro de altitude: o motor não precisa de ontologia para gerar frase

A proposta desenha a cadeia como `conceito → frame → papéis → português`, com o
português no fim, como um dos realizadores possíveis.

Isso é a arquitetura certa para um sistema **multilíngue** ou de tradução. Aqui
ela paga um custo sem entregar o benefício: existe **um** realizador, e ele é o
único que existirá. A camada conceitual, nesse desenho, seria um formato
intermediário que só tem um consumidor — e cada regra do português passaria a
precisar de duas manutenções, a conceitual e a morfossintática.

Há uma segunda razão, mais dura. Uma representação conceitual só é útil se for
**preenchida**: `DRINK` precisa saber que o tema aceita `liquid`, e portanto
`água` precisa estar marcada como líquida, e as outras 13.800 também. O projeto
já mediu o que custa anotar um acervo desse tamanho — foi por isso que existe um
gerador e um contrato de transporte de 22 marcas. Ontologia é a mesma conta,
multiplicada por um vocabulário de tipos que ninguém definiu ainda.

**O que fica de pé:** os papéis são úteis dentro da árvore, não acima dela. O
`GALHO` de `arvore.ts` já é o lugar natural para `papel: 'agente' | 'tema' |
'destinatário'` — informação estrutural, do tamanho da frase, que o linearizador
usa e ninguém precisa anotar em 13.801 pictogramas.

---

## 4. O que vale tomar: affordance como *sugestão*, nunca como *composição*

Esta é a parte boa da proposta, e ela sobrevive inteira — desde que entre pelo
lugar certo.

A ideia: `PORTA` evoca `abrir · fechar · trancar · passar`. `COPO` evoca
`encher · beber · derrubar`. É uma relação entre um objeto e as ações que ele
permite, e ela é **muito** mais informativa, numa prancha, do que a frequência
de bigramas que o `predict.ts` aprende hoje.

O ponto decisivo é onde ela é consumida:

| Entrada | Efeito | Veredito |
|---|---|---|
| no motor de frases | o motor completa a ação que "faz sentido" | ✗ viola `GRAMMAR.md` § 2.2 |
| na faixa de sugestão | a próxima célula fica ao alcance; a pessoa toca ou ignora | ✔ é a abordagem E do `NIVEIS.md` § 3 |

A abordagem E — árvore compõe, estatística sugere — já está declarada como
caminho aberto. Affordance é exatamente isso, com um sinal melhor: não é "o que
essa pessoa costuma dizer", é "o que este objeto permite", e funciona **no
primeiro uso**, antes de haver histórico algum. É o que o `predict.ts` não
consegue fazer.

Custo real, e é o argumento a favor: uma lista de ~40 objetos frequentes de
prancha com 4–6 ações cada é **um arquivo escrito à mão numa tarde**, não um
projeto de ontologia. Não precisa de tipos, hierarquia, nem herança — precisa de
pares.

E há uma restrição de interface que não é opcional: a faixa de sugestão **não
reorganiza a grade** (LAMP, `types.ts`). Affordance entra na faixa. Nunca move
uma célula que a mão já aprendeu.

---

## 5. O que precisa ser recusado: inferir intenção a partir do contexto

A proposta modela `CommunicationEvent` com `environment`, `addressee`,
`previousMessage`, `intent`, `urgency` — e conclui, corretamente, que o contexto
"não pode tomar a autoria da pessoa".

O problema é que a estrutura proposta não tem como cumprir essa própria regra.
Guardar ambiente, interlocutor e turno anterior é guardar **com quem a pessoa
falou, onde, e sobre o quê** — o registro mais sensível que um app de fala pode
produzir, sobre uma população que frequentemente não tem como consentir nem como
auditar. O projeto decidiu não coletar isso (Teto 3), e a decisão é mais forte
do que a regra de privacidade exige, deliberadamente.

Some-se o problema de mérito, independente da privacidade: **inferir intenção é
falar pela pessoa com um passo a mais de distância**. Trocar "eu quero água" por
"eu estou com sede" porque o ambiente é um consultório não é polir a forma — é
trocar o ato. Uma prancha que faz isso é o oposto do que ela existe para ser.

### O que fica no lugar

A distinção útil da proposta — *pedir* vs *avisar* vs *responder* — é real, e o
português a marca. A saída é a mesma que o projeto já usou para tempo, negação e
plural: **um marcador na faixa, tocado pela pessoa.**

| Marcador | `ÁGUA · QUERER` |
|---|---|
| nenhum | "Quero água." |
| ✋ (pedido, já existe) | "Me dá água." |
| ? (pergunta, já existe) | "Quero água?" |

Isso é pragmática **declarada**, não inferida: o custo é um toque, o dado não sai
do aparelho, e quem escolheu o ato foi quem estava falando. É o mesmo desenho de
Blissymbolics que o projeto já adotou — indicador separado do símbolo-base.

O ajuste de destinatário e formalidade também já existe, e já é assim: registro,
variedade regional e nível de fala são controles em Ajustes, movidos por uma
pessoa. `NIVEIS.md` § 1, N7, diz isso em uma frase — o app tem os controles, o
que ele não tem é o motor mexendo neles sozinho.

---

## 6. O que fazer, em ordem

Ordenado por retorno sobre custo, e nenhum item depende de reescrever o motor.

1. **Extrair valência do UD** e cobrir os 978 verbos. Move o Teto 2, é o único
   item que aumenta a qualidade da frase, e já tem caminho medido.
   (`RECURSOS-LINGUISTICOS.md` § 2b.)
2. **Tabela de affordance** — ~40 objetos, 4–6 ações, à mão, consumida só pela
   faixa de sugestão. Barato, testável, e vale desde o primeiro uso.
3. **Papéis nos galhos de `arvore.ts`** — agente, tema, destinatário como
   `papel`, junto com os que já existem. Serve à explicação da frase (N5), que é
   o degrau realmente bloqueado hoje.
4. Nada mais. Frames, ontologia e evento comunicativo ficam onde estão: como
   forma de **organizar** o que se souber depois, não como pré-requisito.

---

## 7. Limites deste documento

1. **Affordance não foi medida.** A afirmação de que ela prevê melhor que
   bigrama é plausível e não testada. O teste é barato: as duas fontes lado a
   lado sobre as frases já ditas.
2. **A recusa da camada pragmática é uma decisão de projeto, não um resultado.**
   É possível que observar uso real mostre que adequação por contexto é
   exatamente o que falta. Se isso acontecer, o que muda é a decisão — e ela
   muda por evidência de uso, não por elegância de arquitetura.
3. **Vale para uma língua.** Se algum dia houver uma segunda, o argumento da § 3
   se inverte: com dois realizadores, a camada conceitual passa a se pagar.
4. **Continua valendo o limite que vale para tudo aqui:** nada disto foi validado
   com quem usa uma prancha (`NIVEIS.md` § 5).

---

## Ver também

- [NIVEIS.md](NIVEIS.md) — a escala N0–N7, os três tetos e as cinco abordagens.
- [ARVORE.md](ARVORE.md) — a estrutura onde os papéis cabem.
- [LEXICO-PADRAO.md](LEXICO-PADRAO.md) — o contrato de transporte e as marcas.
- [RECURSOS-LINGUISTICOS.md](RECURSOS-LINGUISTICOS.md) — o corpus que corrige o
  Teto 2.
- [GRAMMAR.md](GRAMMAR.md) — as três regras duras, § 2.
- [LANGUAGE-SYSTEMS.md](LANGUAGE-SYSTEMS.md) — Bliss e o indicador separado.
