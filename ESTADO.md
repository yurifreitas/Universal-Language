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
| Testes | **280** em 6 suítes (`npm test`) |
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

### O que ainda erra — achado, não consertado

Sabido e escrito aqui de propósito: cada um destes precisa de decisão que a
varredura sozinha não toma.

| entrada | sai | devia sair |
|---|---|---|
| `TER · BOLO` + pergunta | "Tenho o bolo?" | "Tem bolo?" — o `tem` existencial |
| `JÁ · EU · COMER` | "Já eu comi" | "Eu já comi" — mover advérbio é mexer na ordem escolhida |
| `DEIXAR · EU · VER` | "Deixo que eu veja" | "Deixa eu ver" |
| `ISSO · GRANDE · QUE · AQUILO` | "está grande que" | "é maior que" — comparativo |
| `PORQUE` + pergunta | "Porque?" | "Por quê?" |
| `BONECA · IRMÃ` | "Boneca da irmã" | artigo inconsistente com "O carro do pai" |

O existencial é o de maior peso — "tem bolo?" é das perguntas mais frequentes
numa prancha. Os dois seguintes exigem reordenar cards, o que o motor de uma
passada não pode fazer sem quebrar invariante; é exatamente o que a árvore
(seção 5) existe para destravar.

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
| `ferramentas/*/REVISAO.md`, `LEXICO.md` | método e números das ferramentas |
| **este** | onde o trabalho está agora |
