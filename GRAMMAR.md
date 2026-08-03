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

A ordem das células tocadas é a ordem da frase. Há **exatamente duas exceções**,
e nas duas a posição não é escolha de estilo — é exigida pela língua:

| Exceção | Exemplo | Por quê |
|---|---|---|
| partícula de negação | `ÁGUA · NÃO · QUERER` → "Não quero água" | não existe posição alternativa gramatical para o "não" |
| pronome átono (clítico) | `AJUDAR · EU` → "Me ajuda" | "ajuda eu" não é a forma que o português usa; o pronome objeto vem colado antes do verbo |

Fora disso, reordenar seria dizer pela pessoa algo que ela não montou.

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

### Progressivo e imperfeito

O marcador **…ndo** produz a perífrase progressiva: `EU · COMER` → "Eu estou
comendo". Combinado com o passado, dá **"eu estava comendo"** — a única forma de
imperfeito que o motor gera, e ela vem de graça: a perífrase resolve com um
verbo só (`estar`) o que exigiria conjugar o imperfeito de todos os outros.

### Pedido (imperativo)

O marcador **✋** põe o verbo no imperativo. Qual imperativo depende do registro:

| Registro | `ABRIR · PORTA` |
|---|---|
| coloquial | "Abre a porta." |
| normativo | "Abra a porta." |

As duas circulam no Brasil e nenhuma é erro. O marcador **não** se aplica quando
há sujeito de 2ª pessoa explícito: "você abra a porta" não existe, e "você abre
a porta" já é um pedido em português falado.

### Sujeito composto

`MAMÃE · EU · VOCÊ · BRINCAR` não são três sujeitos concorrendo: é um só,
coordenado, e o português manda o verbo para a 1ª do plural.

> Amanhã a mamãe, eu e você **vamos** brincar o dia todo, pintar e desenhar.

Antes o motor olhava só o primeiro pronome e produzia "a mamãe, eu e você
brinca" — o tipo de erro que faz a frase inteira soar como de máquina. A regra
de concordância não tem exceção útil aqui:

| Sujeito | Verbo |
|---|---|
| qualquer elemento de 1ª pessoa na lista | 1ª do plural — "eu e você **vamos**" |
| mais de um elemento, sem 1ª pessoa | 3ª do plural — "a mamãe e o papai **vão**" |
| um só elemento | o que ele for |

### Coordenação de verbos

Dois fenômenos diferentes moram no mesmo lugar, e tratá-los igual produzia
frase errada:

| | Exemplo | Saída |
|---|---|---|
| **complemento** de verbo modal | `QUERER · COMER` | "quero comer" — colado |
| **coordenação** de verbos | `PINTAR · DESENHAR` | "pintar e desenhar" — vírgula e "e" |

Sem a distinção saía *"quero e comer"*. O léxico marca `modal` em querer, poder,
ir, vir, saber, precisar e gostar; o que vier depois de um deles é complemento,
o resto é lista.

Isso compõe com tudo o mais: `EU · NÃO · IR · PULAR · CORRER` →
**"Eu não vou pular e correr."** — a negação cola no verbo conjugado e vale para
a lista inteira.

### Locativo de aparelho

`JOGAR · CELULAR` não é "jogar o celular": é **"jogar no celular"**. Verbo de
atividade seguido de aparelho pede locativo; verbo de posse não —
`QUERER · CELULAR` continua "quero o celular".

### Listas de pessoas

`MÃE · PAI · AVÓ` são três pessoas, não uma genealogia. Ligar substantivos
sempre com "de" produzia **"a mãe do pai da avó"** — algo que ninguém quis
dizer. Quando os dois substantivos são animados, a ligação é de lista:

> "A mãe, o pai e a avó."

E a regência do verbo se repete em cada item: "Eu gosto **da** mãe, **do** pai e
**da** irmã" — não "gosto da mãe, o pai e a irmã".

Quando só um deles é animado, "de" é mesmo o que a língua usa: `CASA · MÃE` →
"a casa da mãe".

### Ligação com o verbo seguinte

Adjetivo ou substantivo de estado seguido de verbo pede preposição, senão sai
"estou feliz ir comer", que não é português:

| Seleção | Saída |
|---|---|
| `EU · FELIZ · IR · COMER` | "Eu estou feliz **de** ir comer." |
| `EU · CANSADO · ESPERAR` | "Eu estou cansado **de** esperar." |
| `EU · MEDO · IR · MÉDICO` | "Eu tenho medo **de** ir **ao** médico." |

Verbo de movimento com pessoa leva "a" ("vou ao médico"); com lugar, leva
"para/pra" ("vou pra escola"). Com outro verbo, não leva nada ("vou dormir").

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

## 5. Regionalismos

Código: [`web/src/lib/regional.ts`](web/src/lib/regional.ts).

O rótulo de um card não é legenda: é a palavra que a pessoa vai dizer, e que ela
ouve os outros dizerem em casa. Uma criança do Recife que aponta a mandioca e
ouve o aparelho falar "mandioca" recebe um modelo de língua que não é o da
família dela — e aprende, de quebra, que o jeito dela de falar não está no
aparelho. **Nenhuma variedade é mais correta que outra**; o padrão de um app
nacional acaba sendo o Sudeste por inércia, e isso é uma escolha, não um fato.

Duas camadas independentes:

**Lexical** — a palavra muda.

| Padrão | Sul | Nordeste / Norte |
|---|---|---|
| mandioca | aipim | macaxeira |
| biscoito | bolacha | biscoito |
| mexerica | bergamota | tangerina |
| abóbora | abóbora | jerimum |
| menino / menina | guri / guria | menino / menina |
| mãe / pai | mãe / pai | mainha / painho |
| pão francês | cacetinho | pão de sal |

**Pronominal e verbal** — o card VOCÊ passa a mostrar e falar "tu" nas
variedades que o usam, e a conjugação segue o **registro**:

| Região | Registro | `VOCÊ · IR · ESCOLA` |
|---|---|---|
| Nordeste | coloquial | "Tu vai pra escola." |
| Nordeste | normativo | "Tu vais para a escola." |
| Padrão | coloquial | "Você vai pra escola." |
| Padrão | normativo | "Você vai para a escola." |

O registro também decide "pra" vs "para" e o imperativo ("abre" vs "abra"). O
coloquial é o padrão porque uma prancha serve primeiro à conversa; o normativo
existe para contexto escolar, onde a pessoa pode precisar da forma que a
professora espera. **O app nunca corrige ninguém** — segue o que foi escolhido.

Detalhe de implementação que importa: internamente a frase é **sempre** montada
com o rótulo canônico, e o regionalismo entra só na saída. Assim a gramática
funciona igual em qualquer variedade, e um favorito salvo no Sul não quebra
quando o perfil vai para a Bahia. A única coisa relida da variante é o
**gênero** — "o biscoito" vira "a bolacha", e o artigo tem de acompanhar.

O que **não** é feito: sotaque, prosódia e fonologia. Isso é da voz do sistema,
e o navegador expõe pouquíssimo controle.

---

## 6. Palavras que o léxico não conhece

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

## 7. O que o motor não faz, e não deve fazer

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

## 8. Cor por classe gramatical

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

## 9. Frases prontas — quando a frase não precisa ser montada

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

## 10. Roteiros — quando o que falta é a ordem

Código: [`web/src/lib/scripts.ts`](web/src/lib/scripts.ts).

Um roteiro é uma **sequência** de frases para uma situação que se repete: ir ao
médico, comprar pão, se apresentar, chegar na escola, aguentar uma sobrecarga.
Não é frase nova — é a ordem, que é justamente o que uma prancha não guarda.

Roteiro social é recurso corrente no trabalho com autismo: saber de antemão a
sequência do que vai acontecer e do que se pode dizer reduz a carga de uma
situação imprevisível. Numa prancha de CAA soma-se um segundo ganho — a pessoa
não precisa remontar cada frase no meio de uma interação com um estranho, que é
quando a pressa alheia mais atrapalha.

O passo atual fica marcado e avança quando um passo é falado, mas **nada
trava**: qualquer passo pode ser tocado a qualquer momento, e sair do roteiro
não exige nada. Conversa real não segue roteiro, e um app que obrigasse a seguir
seria pior que nenhum.

Os roteiros de fábrica não são editáveis — fazem-se cópias. Roteiros próprios
montam-se **a partir do histórico e das frases salvas**: o que a pessoa já disse
vira o passo do que ela vai dizer de novo.

Um roteiro **não** é treino de fala nem script a decorar. É lembrete.

---

## 11. Editar as pranchas

Código: [`web/src/lib/boardEdits.ts`](web/src/lib/boardEdits.ts).

O vocabulário de fábrica é um chute razoável sobre uma pessoa que não existe. O
nome do irmão, a comida daquela casa, o apelido do cachorro e o jeito que a
família chama o banheiro não estão lá — e são justamente as palavras que a
pessoa mais precisa dizer. **Uma prancha que não se edita é a prancha de outra
pessoa.**

Quatro operações: renomear, esconder, acrescentar e mover. Mais criar prancha
própria e restaurar a de fábrica.

**As pranchas de fábrica nunca são alteradas.** O que o usuário faz vira uma
camada de sobreposição guardada à parte e aplicada na leitura. Assim uma
atualização do app pode corrigir um pictograma errado ou acrescentar
vocabulário sem apagar a personalização — e "restaurar" é sempre um botão,
nunca uma reinstalação.

Três dessas operações são baratas. **Mover é cara**, e tem aviso próprio no
editor: mover uma célula apaga memória motora (LAMP). Quem edita raramente é
quem usa, e o custo recai sobre quem usa. Por isso card acrescentado entra
sempre **no fim**, onde não desloca nada já aprendido, e pranchas próprias
entram **depois** das de fábrica.

---

## 12. Limites conhecidos

1. **Nada disso foi validado com o público-alvo.** É aplicação de gramática
   descritiva e de convenção de CAA, não resultado de teste com usuários.
2. **O léxico tem duas velocidades.** 250 entradas revisadas à mão, com
   comportamento completo, e 4.905 geradas do acervo, que carregam 22 das 26
   marcas que o motor consome. Fora das duas, o comportamento degrada para
   telegráfico — por escolha, mas degrada. Ver [LEXICO-PADRAO.md](LEXICO-PADRAO.md).
3. **A 1ª pessoa implícita é uma aposta.** "querer água" vira "Quero água". Se o
   usuário falava de terceiro, sai errado. O pronome explícito resolve. A aposta
   acerta quase sempre — e onde ela erra sempre, como em `TER · BOLO ?`, há
   exceção declarada.
4. **O comportamento semântico não é inferível da forma.** Gênero e plural o
   gerador acerta porque a terminação carrega o sinal; "é ditransitivo" não —
   *"dar" e "danar" terminam igual*. As seis marcas de comportamento vêm de lista
   declarada. Cobrem 52 dos 978 verbos do acervo — mas o número que importa e
   outro: **18 dos 39 verbos que estao em card**, e os 21 restantes sao acao
   concreta que corretamente nao leva marca. Ver RECURSOS-LINGUISTICOS.md 2c.
5. **A regra de dois substantivos é uma generalização.** "suco fruta" → "suco de
   fruta" e "mãe pai" → "a mãe e o pai" funcionam porque o léxico marca quem é
   animado. Um par em que essa marcação falta cai no "de" e pode soar estranho.
6. **A cobertura de teste é uma tabela mais uma varredura.** `npm run
   test:grammar` fixa **239** casos (`web/tests/grammar.test.ts`), e
   `node ferramentas/gramatica/rodada.mjs` roda 40 sementes e **800.160** frases
   contra 14 detectores. A tabela impede regressão no que já foi consertado; a
   varredura acha o que ninguém escreveu — mas **só o que os detectores sabem
   procurar**. Ver [NIVEIS.md](NIVEIS.md) § 4.
7. **As frases prontas são um chute informado.** Foram escritas a partir dos
   contextos que a literatura de CAA descreve como recorrentes, não de registro
   de uso real. Quais faltam só se descobre observando alguém usar.
8. **A tabela de regionalismos é pequena e discutível.** São ~20 palavras, e
   fronteira dialetal não coincide com fronteira de estado: há quem diga
   "bolacha" no Nordeste e "biscoito" em São Paulo. A tabela reflete o uso mais
   frequente de cada região, não uma regra — e o ajuste certo continua sendo o
   editor de cards, onde a família escreve a palavra que usa de verdade.
9. **Regionalismo não alcança as frases prontas nem os roteiros.** Eles têm
   texto fixo em português geral; só os rótulos de card passam pela tabela.
10. **A concordância das frases prontas é por tabela, não por regra.** Como elas
   não passam pelo motor, as poucas com adjetivo referente a quem fala têm uma
   versão feminina escrita à mão, trocada conforme o ajuste da seção 4. Frase
   nova com adjetivo exige entrada nova na tabela — e não há nada que avise
   quando alguém esquece.

---

11. **O motor não revê uma decisão já tomada.** Ele percorre os cards uma vez e
   escreve conforme decide. É o teto estrutural do desenho atual, e é o que
   impede tirar o artigo por escolha, o modo telegráfico de verdade e explicar a
   frase palavra por palavra. Ver [NIVEIS.md](NIVEIS.md) § 2 e
   [ARVORE.md](ARVORE.md).
12. **Não há contexto além da frase.** O motor não sabe o que foi dito antes,
   com quem se fala, nem onde. Isso é decisão de privacidade, não acidente — mas
   é o que impede referência entre frases ("ele" = o pai da frase anterior) e
   adequação automática de registro.

---

## Ver também

- [NIVEIS.md](NIVEIS.md) — até onde o motor chega, onde para, e quais abordagens
  existem para ir além.
- [LANGUAGE-SYSTEMS.md](LANGUAGE-SYSTEMS.md) — Bliss, Minspeak, LAMP e por que
  cada decisão acima tem a forma que tem.
- [REFERENCES.md](REFERENCES.md) — metodologias de CAA e vocabulário-núcleo.
- [SENSORY.md](SENSORY.md) — cor, tipografia, padrão e som.
- [LEGISLATION.md](LEGISLATION.md) — marco legal.
