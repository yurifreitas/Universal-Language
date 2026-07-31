# O padrão do léxico

Como o conhecimento linguístico é declarado neste projeto, e por quê.

Existe porque o motor de frases é o diferencial do app — nenhum outro app de CAA
tem morfologia de português nesta profundidade — e porque um diferencial que só
funciona para 5% do vocabulário não é um diferencial.

Escrito em **31/07/2026**.

---

## 1. O teto que este padrão derruba

O motor tinha duas fontes de conhecimento que não se conversavam.

**Campos declarados no `Lexeme`** — `gender`, `mass`, `prep`, `modal`… Estes
qualquer palavra pode ter, inclusive as vindas do acervo.

**Conjuntos fixos dentro do `grammar.ts`** — `VOLITIVOS`, `OPINIAO`,
`DITRANSITIVOS`, `ACTIVITY_VERBS`, `LIGACAO`, `SO_TERCEIRA`. Estes só alcançam
as palavras que alguém digitou lá.

O segundo grupo tinha um teto que nenhuma regra nova conseguia furar: **uma
palavra gerada não tem como entrar num `Set` escrito no código.** Não é difícil
— é impossível por construção.

E o transporte era pior. `lexicoGerado.ts` copiava campo a campo, uma linha por
campo, e copiava **7** dos 20. Os outros 13 eram descartados em silêncio: sem
erro, sem aviso, sem teste falhando.

Somando: das 26 marcas que o motor sabia consumir, uma palavra do acervo podia
carregar **7**. As 250 revisadas à mão tinham gramática completa; as 4.905
geradas tinham um quarto dela.

---

## 2. A regra de decisão

Antes de escrever conhecimento novo, uma pergunta só:

> **A língua pode ganhar mais uma palavra dessas?**

**Pode** → é classe **aberta**: vira **campo no `Lexeme`**.
Verbos, substantivos, adjetivos. Palavra nova entra no português toda semana, e
o acervo tem 13.801 pictogramas que ninguém vai anotar à mão.

**Não pode** → é classe **fechada**: fica em **tabela no `grammar.ts`**.
Artigos, preposições, pronomes oblíquos, contrações, conjunções, paradigmas de
conjugação. O português não vai ganhar uma preposição nova. Tabela no código é o
lugar certo, e mantê-las lá é decisão, não dívida.

A pergunta é o padrão. O resto é consequência dela.

---

## 3. O contrato de transporte

`lexicoGerado.ts` declara **uma vez** quais marcas atravessam do arquivo para o
motor: `CAMPOS_BOOLEANOS` e `CAMPOS_TEXTO`, ambos com
`satisfies readonly (keyof Lexeme)[]` — errar o nome de um campo é erro de
compilação, não bug silencioso.

O validador percorre as listas. **Não há mais uma linha por campo**, que era a
forma exata do defeito: um campo novo no tipo simplesmente não atravessava, e a
regra que dependia dele ficava muda para 95% do vocabulário.

Três coisas ficam **de fora** do contrato, de propósito:

| campo | por quê |
|---|---|
| `class`, `gender` | domínio fechado — validados à parte, não são booleano nem texto |
| `person`, `postposed`, `fixed` | descrevem classe fechada; deixar inferência automática marcar `person: '1s'` num substantivo qualquer seria pior que não marcar |

---

## 4. As marcas de comportamento

As seis que saíram de conjuntos fixos e viraram campo:

| campo | o que governa | exemplo |
|---|---|---|
| `volitivo` | oração encaixada com "que" + **subjuntivo** | "quero que você **venha**" |
| `opiniao` | oração encaixada com "que" + **indicativo** | "acho que ela **vem**" |
| `ligacao` | admite sujeito posposto na interrogativa | "onde **está** a mãe?" |
| `ditransitivo` | a pessoa depois do objeto **recebe** | "dá água **pra** mãe" |
| `atividade` | aparelho depois dele pede locativo | "jogar **no** celular" |
| `soTerceira` | só existe na 3ª pessoa | "**dói** a barriga" |

E as que já eram campo e continuam: `modal`, `prep`, `prepInf`, `nounPrepInf`,
`mass`, `place`, `animate`, `bodyPart`, `bareAfterPrep`, `device`, `plural`,
`pluralForm`, `femininoBase`, `copulaSer`, `prenominal`, `predicativo`.

---

## 5. O que a migração expôs

Sete verbos — `contar`, `ensinar`, `entregar`, `mandar`, `mexer`, `perceber`,
`preferir` — **governavam regra de gramática sem ter entrada no léxico**.
Funcionavam pela lista e por mais nada: sem classe, sem regência, conjugados
pelo palpite da terminação.

É o sintoma exato do problema, e nenhum teste o pegaria: o comportamento
governado pela lista funcionava, e o resto do que faltava só apareceria numa
frase que ninguém tinha montado ainda.

---

## 6. Como adicionar conhecimento agora

1. Responda a pergunta da seção 2.
2. Classe aberta: declare o campo no `Lexeme` **com o comentário do porquê** —
   este projeto documenta a razão, não o mecanismo.
3. Acrescente o campo a `CAMPOS_BOOLEANOS` ou `CAMPOS_TEXTO`. Sem isso ele não
   chega às palavras geradas, e o app funciona errado só para elas.
4. Marque as palavras no `LEXICON`.
5. Ensine o gerador a inferir o campo, se der — `ferramentas/lexico/inferir.mjs`.
6. Fixe a regressão em `web/tests/grammar.test.ts` **e** um caso em
   `web/tests/lexico.test.ts` provando que uma palavra *gerada* dispara a regra.
7. Rode `node ferramentas/gramatica/rodada.mjs`. Comportamento igual ao de antes
   é o resultado esperado de uma migração; regra nova muda a conta.

O passo 6 é o que impede a regressão de arquitetura: se alguém voltar a escrever
comportamento em `Set` no código, os casos de `lexico.test.ts` quebram.

---

## 7. O gerador preenche o comportamento

O cano do padrão foi construído vazio: os campos existiam e atravessavam, mas
ninguém os preenchia. `ferramentas/lexico/inferir.mjs` agora preenche.

### Por lista declarada, não por regra

Todo o resto daquele arquivo infere por **forma** — terminação, artigo na
definição, presença do par masculino no acervo. Gênero e plural são propriedades
morfológicas: a palavra carrega o sinal.

Estas seis não. **"Dar" rege dois complementos e "danar" não, e as duas terminam
igual.** Nenhuma terminação, nenhum prefixo e nenhuma contagem de letras separa
um verbo de opinião de um verbo de ação — a diferença é de significado, e
significado não está na forma.

Então declara-se o que se sabe, e o que não está declarado **não recebe marca**.
É a mesma política do empate de gênero: omitir é melhor que chutar, porque o
motor tem caminho telegráfico para a omissão e não tem conserto para a marca
errada. Um verbo marcado ditransitivo por engano troca "o carro **do** pai" por
"o carro **pro** pai" em toda frase que o use.

### A trava de conflito

`medir.mjs` confere que o gerado **não contradiz** o revisado à mão, e falha o
build se contradisser.

O risco destas marcas não é a lacuna — lacuna deixa a regra muda, e mudo é o
estado de antes, nunca pior. O risco é o **conflito**: o `LEXICON` vence no
`lookup`, então uma marca gerada errada não apareceria *neste* app, mas
apareceria em qualquer consumidor do `lexico.json` que não tenha o `LEXICON` — a
ferramenta de auditoria, um export, uma prancha de terceiro. Silencioso e
divergente é a pior combinação possível, então a divergência falha no build.

**A trava pagou o próprio custo na primeira execução:** 13 conflitos.

- **Um erro meu**: `tentar` e `conseguir` estavam entre os volitivos por
  parentesco semântico com "querer". Mas eles regem **infinitivo** — "tento ir",
  nunca "tento que ele vá". Parentesco semântico não é regência.
- **Um risco meu**: `andar` como cópula existe ("ando cansado"), mas numa prancha
  ele é movimento quase sempre. Baixo ganho, risco real: saiu.
- **Onze lacunas do lado oposto**: o gerador estava certo e o `LEXICON` é que
  estava incompleto. `contar`, `entender`, `ouvir` e `sentir` também são verbos
  de opinião; `escrever` e `explicar` também são ditransitivos. Foram completados
  à mão, e o app melhorou junto.

### Cobertura, medida e não afirmada

| | |
|---|---|
| Verbos no léxico gerado | 978 |
| Com pelo menos uma marca | **44** |
| Verbos do gabarito conferidos pela trava | 97 · **0 conflitos** |

44 de 978 parece pouco, e não é. Numa amostra determinística de 45 verbos **sem
marca** — `abandonar`, `afundar`, `engolir`, `fritar`, `rasgar`, `tosquiar`… — os
verbos são de ação concreta e corretamente não levam marca nenhuma. Dois ou três
seriam discutíveis (`suportar`, `rever`), nenhum é erro claro.

O acervo é dominado por verbos de ação. **44 é o tamanho certo da lista, não o
tamanho do que faltou** — mas isto é uma estimativa por amostra, e está escrito
como estimativa de propósito.

### Achado colateral

A amostra expôs que o acervo traz português **europeu** em vários termos:
`actuar`, `facturar`, `mandriar`, `tosquiar`, `barbear-se`. Num app pt-BR isso é
problema de qualidade do léxico gerado, independente destas marcas, e ainda não
está tratado.

---

## 8. Estado

| | |
|---|---|
| Marcas que o motor consome | 26 |
| Marcas que uma palavra gerada pode carregar | **22** (era 7) |
| Conjuntos abertos no `grammar.ts` | **0** (eram 6) |
| Tabelas de classe fechada no `grammar.ts` | 13 — e ficam |
| Verbos do acervo com comportamento declarado | **44** (era 0) |
| Travas no medidor | **7** (era 6) |

Verificado: 227 casos do motor, 25 do léxico gerado, **800.160 frases · 0
violações · 0 suspeitas** — comportamento idêntico ao de antes da migração, que é
o resultado certo de um refactor. Precisão da inferência: classe 99,5%, gênero em
confiança alta **100%**, conflitos de comportamento **0/97**.

Prova de que o teto subiu, em `lexico.test.ts`: `suspeitar`, palavra que o
`LEXICON` não conhece, entregue só pelo léxico gerado, produz
**"Eu suspeito que a mãe vem."**
