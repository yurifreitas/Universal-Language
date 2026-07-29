# Motor de frases — do telegrama ao português

Como o app transforma `EU · QUERER · ÁGUA` em **"Eu quero água."**, o que ele
tem permissão de fazer, e o que ele deliberadamente se recusa a fazer.

Complementa [LANGUAGE-SYSTEMS.md](LANGUAGE-SYSTEMS.md), que levantou o histórico
dos sistemas de linguagem visual, e [REFERENCES.md](REFERENCES.md), que cobre a
metodologia de CAA. Este documento é a consequência técnica daquele levantamento:
a seção 10 do LANGUAGE-SYSTEMS.md concluiu que **nenhum sistema histórico
resolveu geração de frase flexionada automaticamente**, e que todos preservam a
seleção do usuário como unidade central. É essa conclusão que define as regras
abaixo.

Código: [`web/src/lib/grammar.ts`](web/src/lib/grammar.ts) (motor) e
[`web/src/lib/lexicon.ts`](web/src/lib/lexicon.ts) (léxico anotado).

---

## 1. O problema

Uma prancha de CAA produz fala telegráfica. Isso não é defeito — é a natureza da
seleção por símbolo, e é comunicação legítima. Mas cria três custos reais:

1. **Custo de interpretação para o parceiro.** "eu ir escola ontem" exige que
   quem ouve reconstrua a frase. Em contextos formais — escola, consultório,
   atendimento — essa reconstrução nem sempre acontece a favor da pessoa.
2. **Custo de modelagem.** Se o dispositivo sempre fala telegráfico, o modelo de
   língua que a pessoa recebe de volta é telegráfico.
3. **Ambiguidade real.** "eu ir escola" não distingue passado de futuro, e a
   diferença entre "eu fui" e "eu vou" pode ser a diferença entre relatar e
   pedir.

O que o motor **não** resolve: nada disso é motivo para substituir a seleção da
pessoa. Uma frase telegráfica dita é melhor que uma frase bonita que ela não
escolheu.

---

## 2. As três regras duras

Estão escritas no topo de `grammar.ts` porque são a fronteira do que o motor
pode fazer:

### 2.1 Não reordena

A ordem das células tocadas é a ordem da frase. A **única** exceção é a
partícula de negação, que o português obriga a ficar antes do verbo: tocar
`ÁGUA · NÃO · QUERER` produz "Não quero água", porque não existe posição
alternativa gramatical para o "não".

Reordenar seria dizer pela pessoa algo que ela não montou.

### 2.2 Não acrescenta conteúdo

O motor insere apenas palavra **funcional** — artigo, preposição, cópula
(ser/estar/ter), partícula. Nunca substantivo, verbo ou adjetivo novo. Ele muda
a *forma* das palavras escolhidas; não muda *quais* palavras foram escolhidas.

### 2.3 É reversível e auditável

Cada palavra da saída sai etiquetada com sua origem:

| Etiqueta | Significado | Como aparece |
|---|---|---|
| `card` | veio de um card, intacta | normal |
| `inflected` | veio de um card, com a forma mudada | sublinhado sólido |
| `inserted` | não veio de card nenhum | apagada, sublinhado pontilhado |

A barra da frase mostra isso o tempo todo. Quem acompanha a terapia precisa
saber o que a máquina pôs na boca da pessoa — e desligar o ajuste devolve a fala
literal imediatamente. **A saída flexionada é uma camada de apoio, nunca a única
fala possível.** É por isso que o motor vem desligado por padrão.

---

## 3. O que o motor faz

### Conjugação

Pessoa vinda do pronome escolhido (`EU` → 1ª, `VOCÊ` → 3ª morfológica, `NÓS` →
1ª plural). **Sem pronome, assume 1ª pessoa** — numa prancha de comunicação o
enunciado padrão é sobre o próprio falante — mas o pronome implícito não é
escrito: só a flexão do verbo o indica. `QUERER · ÁGUA` vira "Quero água", não
"Eu quero água".

Tempo: presente, pretérito perfeito e **futuro perifrástico** ("vou comer", não
"comerei"). O perifrástico é a forma corrente do português brasileiro falado e,
de quebra, dispensa toda a irregularidade do futuro — basta `ir` no presente.

Irregulares numa tabela explícita; o resto por terminação `-ar` / `-er` / `-ir`.
Locuções ("escovar os dentes", "tomar banho") flexionam só o verbo-cabeça.

### Tempo por adverbio

`ONTEM` e `ANTES` põem a frase no passado; `AMANHÃ` e `DEPOIS`, no futuro. É o
mesmo mecanismo de um marcador de tempo Blissymbolics, só que disparado pelo
próprio vocabulário: quem escolheu ONTEM já disse que a frase é passada. Os
marcadores manuais existem para as frases sem palavra de tempo.

### Artigo e preposição

Gênero e número vêm do léxico, não de heurística. Contrações completas
(`em`+`a` = "na", `de`+`o` = "do", `a`+`a` = "à").

Artigo é **omitido** para incontáveis ("quero água", não "quero a água"), depois
de determinante ("minha mão"), depois de quantificador ("mais suco") e em
idiomatismos ("vou para casa").

Regência por verbo: `GOSTAR` pede "de" ("gosto de chocolate"), `BRINCAR` pede
"com", `OLHAR` pede "para". Verbo de movimento seguido de lugar recebe "para" —
mas só se o próximo card for mesmo um lugar: "vou dormir" não leva preposição
alguma.

### Cópula

`EU · TRISTE` não é frase em português; "Eu estou triste" é. O motor insere o
verbo que falta, escolhendo qual:

- `ESTAR` para estado ("estou triste", "a água está quente")
- `TER` para fome, sede e medo ("tenho fome" — não "estou fome")
- `ESTAR COM` para dor ("estou com dor")
- `ESTAR` também depois de palavra de pergunta ("Onde **está** a mãe?")

### Concordância

Adjetivo concorda com o último substantivo nomeado ("a casa está bonit**a**").
Sem substantivo, concorda com o falante — e aí entra a decisão abaixo.

### Casos idiomáticos de prancha

Duas construções frequentes o bastante para merecerem regra própria:

| Seleção | Saída | Por quê |
|---|---|---|
| `DOR · BARRIGA` | "estou com dor na barriga" | dois substantivos pedem ligação |
| `MÃO · DOR` | "minha mão dói" | a tradução natural usa o **verbo**, não o substantivo |

### Marcadores gramaticais

Tempo, negação, pergunta e plural ficam numa **faixa própria**, fora da grade.
Isso vem de duas fontes: do Blissymbolics, onde o indicador gramatical é
separado do símbolo-base (nunca um pictograma novo por flexão), e do LAMP, que
proíbe mover célula aprendida. O plural aplica-se ao último substantivo da
frase.

---

## 4. A decisão sobre gênero do falante

O português **não tem forma neutra de adjetivo**. Quem diz "estou cansad__"
precisa escolher, e um app não pode escolher pela pessoa.

A solução: um ajuste explícito de concordância na 1ª pessoa, com três valores —
*não flexionar* (padrão), *feminino*, *masculino*. No padrão, o motor mantém a
forma não marcada do léxico em vez de presumir. Não é uma solução elegante; é a
honesta. Presumir masculino por ser a forma não marcada da gramática seria
tratar uma limitação da língua como se fosse escolha do usuário.

---

## 5. Palavras que o léxico não conhece

O usuário pode trazer para a frase qualquer um dos **13.801** pictogramas da
ARASAAC pela busca, e nenhum deles está anotado. Para essas, `guess()` adivinha
o mínimo pela terminação — e o motor então age de forma deliberadamente
conservadora:

- **Não conjuga** o que só foi *adivinhado* como verbo. Conjugar um chute produz
  forma inexistente ("ver" → "*vo*"); manter o infinitivo produz frase
  telegráfica, que é apenas menos polida. Na dúvida, a saída menos errada.
- **Não insere artigo** quando o gênero é chute. Errar o artigo ("*o* mão") é
  pior que não ter artigo.

O léxico cobre os ~150 rótulos das pranchas fixas mais as palavras que chegam
com mais frequência pela busca. Ampliá-lo é trabalho incremental e barato.

---

## 6. O que o motor não faz, e não deve fazer

- **Não prediz.** Nada de sugerir a próxima palavra. Se algum dia houver
  predição, ela aparece em faixa separada e nunca reorganiza o grid (LAMP).
- **Não corrige a intenção.** Se a seleção resulta em frase estranha, a frase
  sai estranha. O motor não é um revisor.
- **Não gera concordância de número entre sujeito e verbo a partir de
  substantivo plural escolhido pelo usuário** — só o marcador de plural e os
  pronomes movem número.
- **Não trata subordinação, relativas ou orações encaixadas.** Verbo em cadeia
  fica no infinitivo ("quero comer"), e isso resolve a maioria dos casos de uma
  prancha; sintaxe complexa está fora de escopo.

---

## 7. Cor por classe gramatical

Ligada ao mesmo léxico, mas é decisão visual e não de motor: a célula pode ser
colorida pela **classe** da palavra, seguindo a **chave de Fitzgerald
modificada** — a convenção de codificação cromática mais difundida em CAA.

| Classe | Cor | Pergunta que responde |
|---|---|---|
| pronome, determinante | amarelo | quem |
| verbo | verde | o que faz |
| adjetivo, advérbio | azul | como é |
| substantivo | laranja | a coisa |
| pergunta | roxo | — |
| negação, afirmação | vermelho | — |
| social | rosa | — |
| quantificador, conector | cinza | — |

Duas restrições que o modo respeita:

- **WCAG 1.4.1 (uso da cor).** A cor nunca é a única pista: o rótulo escrito e o
  pictograma continuam lá. Ela reforça, não informa sozinha.
- **Estímulo.** Cor a mais também sobrecarrega (ver [SENSORY.md](SENSORY.md)).
  Por isso vem desligada, existe um modo só-borda, as cores passam pela escala
  de conforto sensorial, e o alto contraste as reduz a uma faixa de borda —
  preencher o card baixaria o contraste do próprio pictograma.

---

## 8. Frases prontas — quando a frase não precisa ser montada

Código: [`web/src/lib/phrases.ts`](web/src/lib/phrases.ts).

O motor acima resolve o *como dizer*. Não resolve o *quanto tempo leva*. A taxa
de comunicação por seleção de símbolo fica muito abaixo da fala, e a diferença
importa mais justamente quando a mensagem não pode esperar. Montar
`EU · DOR · BARRIGA` são três toques; "Estou com dor" é um.

Sete grupos, **ordenados por urgência e não por tema** — o que não pode esperar
fica no caminho mais curto:

| Grupo | Por que existe |
|---|---|
| Urgente | dor, mal-estar, banheiro, remédio, chamar alguém |
| Preciso de calma | regulação sensorial — barulho, luz, multidão, toque, pausa |
| Sim e não | confirmação, recusa e "eu não sei" |
| Eu quero | pedido e recusa de coisa |
| Conversa | abertura, agradecimento, despedida, afeto |
| Escola | pedir repetição, tempo, ajuda, autonomia |
| Me entenderam errado | **comunicação de reparo** |

Duas escolhas merecem justificativa:

**Regulação sensorial.** Pedir para baixar o som, sair do ambiente ou não ser
tocado são mensagens que a pessoa muitas vezes só consegue emitir quando **já
está sobrecarregada** — ou seja, exatamente quando montar frase fica mais
difícil. É o caso mais forte a favor de um toque só.

**Comunicação de reparo.** "Não é isso que eu quis dizer", "espera, deixa eu
terminar", "fala comigo, não com quem está do meu lado". São as frases que o
usuário de CAA menos costuma ter à mão e mais precisa: sem elas, um
mal-entendido só termina quando o **interlocutor** decide que terminou.

O que elas não são:

- **Não substituem a prancha.** Frase pronta é atalho para o que se repete; a
  prancha é onde a pessoa diz o que ninguém previu por ela. Um app que só tem
  frases prontas não é CAA, é um controle remoto.
- **Não passam pelo motor.** Já estão em português correto; flexionar de novo só
  poderia estragar.

Somam-se dois grupos gerados em uso — **Minhas frases** (a frase montada,
salva) e **Disse agora há pouco** (as 16 últimas ditas, para repetir sem
remontar). Ambos entram **no fim** da lista de grupos, nunca deslocando os
fixos, e a faixa de abas rola em vez de quebrar em duas linhas: uma segunda
linha empurraria a grade para baixo e o toque seguinte cairia na frase errada. É
a mesma regra de estabilidade posicional que vale na prancha (LAMP).

---

## 9. Limites conhecidos

1. **Nada disso foi validado com o público-alvo.** É aplicação de gramática
   descritiva e de convenção de CAA, não resultado de teste com usuários.
2. **O léxico é pequeno.** ~180 entradas. Fora delas, o comportamento degrada
   para telegráfico — por escolha, mas degrada.
3. **A 1ª pessoa implícita é uma aposta.** "querer água" vira "Quero água". Se o
   usuário falava de terceiro, sai errado. O pronome explícito resolve.
4. **Sem pretérito imperfeito.** "eu comia" não é gerável; só "eu comi". Para o
   vocabulário de uma prancha isso raramente aparece, mas é uma lacuna real.
5. **A regra de dois substantivos é uma generalização.** "suco fruta" → "suco de
   fruta" funciona; combinações mais raras podem produzir ligação estranha.
6. **Não há teste automatizado.** O motor foi verificado por uma bateria manual
   de ~30 frases durante a implementação. Uma suíte de regressão é a próxima
   dívida técnica a pagar.
7. **As frases prontas são um chute informado.** Foram escritas a partir dos
   contextos que a literatura de CAA descreve como recorrentes, não de registro
   de uso real. Quais faltam só se descobre observando alguém usar.
8. **Não há frase pronta em primeira pessoa do plural nem no feminino.** "Estou
   cansado" está no masculino não marcado, e o ajuste de concordância da seção 4
   não alcança as frases prontas, porque elas não passam pelo motor.

---

## Ver também

- [LANGUAGE-SYSTEMS.md](LANGUAGE-SYSTEMS.md) — Bliss, Minspeak, LAMP e por que
  cada decisão acima tem a forma que tem.
- [REFERENCES.md](REFERENCES.md) — metodologias de CAA e vocabulário-núcleo.
- [SENSORY.md](SENSORY.md) — cor, tipografia, padrão e som.
- [LEGISLATION.md](LEGISLATION.md) — marco legal.
