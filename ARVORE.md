# A árvore — a arquitetura que o motor de frases precisa

Este documento é o desenho de uma mudança estrutural em `web/src/lib/grammar.ts`.
Não é refatoração por gosto: é a resposta a uma classe inteira de defeitos que o
motor atual **não consegue** consertar sem ela, e que já custaram uma reversão.

Complementa [GRAMMAR.md](GRAMMAR.md), que descreve o que o motor faz, e
[PLANO.md](PLANO.md), onde isto entra como parte do Eixo D.

---

## 1. O problema, em uma frase

O motor monta a frase **numa passada só**, da esquerda para a direita,
escrevendo direto num vetor de tokens. Cada decisão é tomada no momento em que
a palavra é alcançada, com o que se sabe até ali — e **nunca mais pode ser
revista**.

Isso funciona para o caso simples e falha exatamente onde a língua exige olhar
para trás ou para a frente.

### Os defeitos que vieram daí

Todos reais, todos achados nas últimas sessões:

| entrada | saía | causa estrutural |
|---|---|---|
| `EU·QUERER·ÁGUA·NÃO·QUERER·PÃO` | Eu **não** quero água e quero o pão | a negação foi escrita no primeiro verbo antes de o motor saber que havia um segundo |
| `EU·CANSADO·NÃO·ESPERAR` | Eu não estou cansado **esperar** | a preposição olhava uma posição à frente e via a negação, não o verbo |
| `CRIANÇA` + plural, sul | **Os crianças** | o plural foi formado antes de a variante regional entrar |
| `UM·TITIA` + artigo indef | **Umas umas** titias | o artigo do bloco foi escrito sem saber que já havia determinante |
| `EU·FELIZ·MEDO` | Eu estou feliz **medo** | a cópula já tinha sido escrita e não podia ser duplicada |
| `FELIZ·EU·GOSTAR·IRMÃO` | Vou estar feliz **eu gostar** do irmão | a cópula inserida não conta como verbo, então o sujeito novo não abriu oração |

Consertei os quatro primeiros com remendos locais. Os dois últimos **não têm
remendo local** — e o primeiro só ficou de pé na segunda tentativa, depois de eu
quebrar a frase de quem estava usando o app.

O padrão é sempre o mesmo: **uma decisão precisa de informação que só existe
depois dela.**

---

## 2. A árvore

Em vez de escrever tokens direto, o motor passa a construir uma **árvore** e só
depois a percorre para gerar texto. São duas fases, e a separação é o ponto
inteiro.

```
                        RAIZ  (a frase)
                          │
              ┌───────────┴───────────┐
           TRONCO                  TRONCO          ← orações
        (oração 1)               (oração 2)
             │                        │
      ┌──────┴──────┐          ┌──────┴──────┐
    GALHO         GALHO      GALHO         GALHO   ← sintagmas
   (sujeito)   (predicado)  (sujeito)   (predicado)
      │             │
   ┌──┴──┐      ┌───┴────┬─────────┐
 FOLHA  FOLHA  FOLHA   FOLHA     GALHO            ← palavras e sintagmas
  "o"   "bolo" "não"  "quero"  (objeto)
   ▲                    ▲          │
   │                    │       ┌──┴───┐
opcional            flexionável FOLHA FOLHA
inserida              do card    "a"  "água"
```

### O que cada nível guarda

**RAIZ — a frase.** Traços que valem para tudo: tempo, registro, região, gênero
do falante, e os marcadores da faixa. É o único lugar onde eles existem; hoje
estão espalhados em variáveis soltas dentro da função.

**TRONCO — a oração.** Uma por predicado. Guarda: o sujeito, o predicado, a
relação com a oração anterior (coordenada, subordinada, encaixada, justaposta) e
**a negação, se for dela**. Uma oração sabe se está negada — não há mais um
`negationDone` global brigando com a ordem de emissão.

**GALHO — o sintagma.** Nominal (`SN`) ou preposicionado (`SP`). Um SN sabe seu
núcleo, seu determinante, seus modificadores, e — o que importa — **seu gênero e
número**, que percolam para os filhos na hora de concordar. Um SP sabe qual
preposição rege.

**FOLHA — a palavra.** Toda folha carrega:

```ts
{
  texto: string          // a forma final
  origem: 'card' | 'inserida' | 'flexionada'
  cardIndex?: number     // qual card a produziu
  papel: 'nucleo' | 'determinante' | 'preposicao' | 'negacao' | 'conector' | ...
  opcional: boolean      // pode sumir sem quebrar a frase
}
```

---

## 3. Por que isto resolve — caso a caso

### "O artigo pode ser removido"

Hoje o artigo é decidido e escrito no meio da passada, e o que a pessoa escolhe
no bloco (`articles[]`) briga com regras estruturais — foi o "Umas umas titias".

Na árvore, o determinante é uma **folha opcional dentro do SN**. A decisão vira
três perguntas independentes, na ordem certa:

1. o SN **comporta** determinante? (não comporta depois de quantificador)
2. o motor **acha que deve** pôr um? (`decideArticle`)
3. a pessoa **disse** alguma coisa? (o modo do bloco)

Nenhuma sobrescreve a outra por acidente de ordem de escrita, porque nenhuma
escreve nada: elas só marcam o nó. E como toda folha inserida é `opcional: true`,
**qualquer uma delas pode ser removida** — pela pessoa, por um ajuste de
"telegráfico", ou por um modo de registro — sem tocar em regra nenhuma.

Isso é o que hoje não existe: o app pode oferecer "tirar o artigo" e o motor
simplesmente não tem onde receber esse pedido.

### A negação em qualquer lugar

A negação passa a ser um **traço do tronco**, posto no momento em que o card é
lido. A linearização é que decide onde imprimi-la — e ela vê a oração inteira
antes de imprimir qualquer coisa.

O bug de ordem que me custou a reversão (`"não e"` em vez de `"e não"`)
simplesmente não pode acontecer: não há mais "escrever antes" e "escrever
depois", há um nó que sabe que está negado e um percurso que emite na ordem
certa por construção.

### A cópula que abre oração

`FELIZ · EU · GOSTAR` falha hoje porque a cópula inserida não é um item da lista
— e a regra que abre oração nova exige um verbo **escolhido**. Na árvore a
cópula é um nó de predicado como qualquer outro, com `origem: 'inserida'`. A
pergunta "já houve predicado nesta oração?" passa a ter uma resposta única e
correta.

### `EU · FELIZ · MEDO`

Duas predicações sobre o mesmo sujeito, com cópulas diferentes (`estar feliz`,
`ter medo`). Na passada linear isso é impossível: a cópula já foi escrita. Na
árvore são dois galhos de predicado sob o mesmo tronco, e a linearização junta
com "e" — como já faz com dois verbos.

### Concordância

Hoje o gênero viaja em `lastNoun`, uma variável que guarda **o último
substantivo visto** — e que já causou "O beijo está preguiçosa" quando o dado
faltava. No SN, gênero e número são propriedade do nó: o adjetivo pergunta ao
pai, não a uma variável global que pode ter mudado.

---

## 4. Como fazer isso sem quebrar o app

A regra é uma só: **o motor atual não sai do ar enquanto o novo não provar que é
igual.**

### Fase 1 — a árvore ao lado
`lib/arvore.ts`, novo, sem tocar em `grammar.ts`. Tipos, construtor
(cards → árvore) e linearizador (árvore → tokens). Testado sozinho.

### Fase 2 — comparação diferencial
A ferramenta de auditoria já existe e já gera 20.000 casos com **100 % de
cobertura de pares e trios**. Ela passa a rodar os dois motores no mesmo caso e
comparar a saída, caso a caso.

Isso é o que torna a troca segura: não é "achei que ficou igual", é **20.000
frases idênticas ou uma lista exata das que diferem**. Cada diferença é revisada
à mão e vira uma de duas coisas: um bug do novo motor, ou um caso em que o novo
está certo e o antigo estava errado — e aí o teste de regressão é atualizado com
a frase melhor.

### Fase 3 — a troca
Quando as diferenças forem só melhorias conhecidas, `compose` passa a chamar o
caminho novo. `grammar.ts` fica como fachada — a assinatura pública não muda, e
nenhum componente do app sabe que algo mudou.

### Fase 4 — o que a árvore destrava
Só depois, e são coisas que hoje não têm onde existir:

- **tirar o artigo** (e qualquer palavra inserida) por escolha;
- **modo telegráfico** de verdade: a linearização pula toda folha `opcional`;
- **explicar a frase**: cada folha sabe seu papel, então dá para dizer "isto é o
  sujeito, isto o motor pôs" — hoje o app mostra só *que* inseriu, não *o quê*;
- **desfazer uma inserção específica** sem desmontar a frase.

---

## 5. O que NÃO muda

As garantias do [GRAMMAR.md](GRAMMAR.md) continuam sendo a lei, e a auditoria as
verifica a cada rodada — **zero violações em 20.000 casos** é o número de hoje e
é o piso, não a meta:

1. o motor nunca acrescenta palavra de **conteúdo** que a pessoa não escolheu;
2. nunca reordena o que ela escolheu;
3. nunca perde uma palavra escolhida;
4. desligar a gramática volta à fala literal, sempre.

A árvore não afrouxa nada disso. Ao contrário: com `origem` e `papel` em cada
folha, as três primeiras passam a ser **verificáveis por construção** — hoje a
auditoria as confere comparando strings, o que é mais frágil do que perguntar à
própria árvore.
