# Sistemas de linguagem visual — história e referências

Complemento a [REFERENCES.md](REFERENCES.md). Aquele documento cobre metodologia
de CAA (PECS, PODD, TEACCH), vocabulário-núcleo e normas de acessibilidade. Este
cobre a pergunta anterior: **de onde vêm as ideias de representar linguagem por
símbolo**, e o que cada tentativa histórica ensina para o motor de frases deste
projeto (`web/src/lib/speech.ts`, `web/src/types.ts`).

**Como ler:** cada sistema tem uma seção "o que resolve", "o que não resolve" e
"consequência aqui" — a mesma disciplina do REFERENCES.md, para não copiar ideia
sem justificar por que serve a este produto.

---

## 1. Blissymbolics — a única linguagem visual combinatória com uso real em CAA

Criada por **Charles K. Bliss** (nascido Karl Blitz, Áustria/Xangai, anos 1940),
como projeto de língua auxiliar internacional pós-guerra. Adotada para CAA em
**1971** por **Shirley McNaughton** e equipe no Ontario Crippled Children's
Centre (Toronto), com crianças com paralisia cerebral não-falantes. Organização
internacional mantenedora desde 1975: **Blissymbolics Communication
International (BCI)**.

**O que resolve:** símbolos básicos (~100–120) se combinam por indicadores
gráficos (marcador de verbo, marcador de tempo, marcador de quantidade) para
gerar milhares de conceitos, incluindo abstratos — "esperança", "porque",
"diferente" — que pictogramas figurativos não representam bem.

**O que não resolve:** exige aprendizagem tanto do usuário quanto do parceiro de
comunicação; símbolos combinados não são transparentes para quem não estudou o
sistema; adoção fora de contextos terapêuticos específicos é pequena hoje.

> [Blissymbolics.org — história](https://www.blissymbolics.org/) ·
> [BCI — vocabulário autorizado](https://www.blissymbolics.org/index.php/about-blissymbolics)

**Consequência neste projeto:** não adotar Bliss como sistema de símbolos — o
custo de aprendizagem é incompatível com um app de uso imediato. Mas a lógica de
**indicador gramatical separado do símbolo-base** é o modelo certo para o motor
de frases: um marcador de tempo/negação/plural aplicado sobre o pictograma, não
um pictograma novo por flexão.

---

## 2. Isotype — gramática visual, não linguagem completa

**Otto Neurath**, **Marie Reidemeister** e o desenhista **Gerd Arntz**, Viena e
depois Haia/Oxford, década de 1920–1930. Sistema de figuras padronizadas para
comunicar dados sociais e estatísticos a públicos sem formação técnica.

**O que resolve:** demonstra que um acervo de símbolos só funciona se obedecer
**regras de desenho consistentes** — mesmo enquadramento, mesma escala, mesma
convenção de repetição para quantidade. Um símbolo isolado bonito não basta; o
sistema como um todo precisa ser gramatical.

**O que não resolve:** não é uma língua — não tem sintaxe própria para frases
completas, só para comparação de quantidades e categorias.

> [Otto und Marie Neurath Isotype Collection — University of Reading](https://collections.reading.ac.uk/special-collections/collections/otto-and-marie-neurath-isotype-collection/)

**Consequência neste projeto:** cobrada diretamente do acervo ARASAAC, que já
segue convenção interna razoável (mesma paleta de pele, mesmo estilo de traço).
O ponto de atenção é não misturar acervos com gramáticas visuais diferentes
(ARASAAC + emoji + foto pessoal) sem uma camada de normalização visual, sob risco
de o usuário não reconhecer categoria por estilo.

---

## 3. Makaton — símbolo, sinal e fala juntos

Reino Unido, fim dos anos 1960, **Margaret Walker** e equipe, inicialmente com
adultos surdos com deficiência intelectual em hospital psiquiátrico. Hoje é
programa de linguagem licenciado com currículo próprio (Makaton Charity).

**O que resolve:** ensina que o mesmo conceito pode ter três portas de entrada —
visual (símbolo), motora (sinal, baseado em BSL/Libras conforme o país) e
auditiva (fala) — usadas **simultaneamente**, não como alternativas excludentes.

**O que não resolve:** é currículo licenciado, com material fechado; não é
diretamente portável para um app aberto sem acordo com a organização.

> [Makaton Charity — o que é o Makaton](https://makaton.org/TMC/About_Makaton/What_is_Makaton.aspx)

**Consequência neste projeto:** já documentado em SENSORY.md que "falar cada
card ao tocar" existe pelo mesmo motivo (ver REFERENCES.md §4, modelagem). O
próximo passo natural, fora de escopo imediato, é anexar vídeo curto de Libras
por conceito — sem tratar Libras como tradução literal palavra-por-palavra do
português, porque não é.

---

## 4. Minspeak — compressão semântica por sequência de ícones

**Bruce Baker**, EUA, início dos anos 1980. Base dos dispositivos de fala
comerciais Unity/Prentke Romich. Poucos ícones (~50–100), com múltiplos
significados conforme a sequência em que são tocados.

**O que resolve:** vocabulário grande sem exigir milhares de células visíveis —
resolve o problema de escala que um acervo de 13.801 pictogramas cria (ver
REFERENCES.md §2: mostrar tudo produz navegação, não comunicação).

**O que não resolve:** iconicidade inicial baixa — a sequência precisa ser
memorizada, não é autoexplicativa. Exige treino estruturado, geralmente com
fonoaudiólogo.

> [Prentke Romich Company — Minspeak](https://www.prentrom.com/minspeak)

**Consequência neste projeto:** a arquitetura atual (núcleo fixo de 32 células +
periferia por busca) já é a alternativa mais simples ao mesmo problema, sem o
custo de aprendizagem do Minspeak. Não recomendo adotar compressão por sequência
aqui — o público-alvo inclui usuários iniciantes, e transparência (ver ARASAAC,
REFERENCES.md) importa mais que densidade de vocabulário por célula.

---

## 5. LAMP — estabilidade motora acima de tudo

**Language Acquisition through Motor Planning**, Prentke Romich/AAC Language
Lab, baseada em pesquisa de aprendizagem motora aplicada à fala.

**Princípio único e não-negociável:** cada palavra deve morar sempre no **mesmo
lugar físico**, para o movimento de buscá-la se tornar automático, como decorar
o teclado de um instrumento.

> [AAC Language Lab — princípios LAMP](https://www.aaclanguagelab.com/)

**Consequência direta neste projeto:** já implementada — comentário no código
confirma que favoritos entram como **prancha adicional**, não por reordenar
células dentro de uma prancha existente, exatamente para não mover posições
memorizadas (`web/src/App.tsx`). Isso deve valer também para qualquer predição
futura: sugestão aparece em **faixa separada**, nunca reorganizando o grid.

```
EU | QUERO | IR | MAIS         ← posições fixas, nunca mudam
Sugestões: [COMER] [ÁGUA]      ← faixa à parte, pode mudar livremente
```

---

## 6. Talking Mats — quando o objetivo não é montar frase, e sim opinar

Desenvolvido de forma participativa no Reino Unido (Universidade de Stirling),
anos 1990, para dar voz a decisões e preferências, não a frases gramaticais.
Estrutura: um tema, uma escala visual (gosto / mais ou menos / não gosto), itens
posicionados por baixo.

**O que resolve:** um problema que um motor de frases não resolve — tomada de
decisão e expressão de preferência não precisam de sintaxe, precisam de espaço
visual de comparação.

> [Talking Mats — o método](https://www.talkingmats.com/about-talking-mats/)

**Consequência neste projeto:** fora do escopo do motor de frases, mas é um
**modo de interação separado e legítimo** a considerar no roadmap — não como
substituto da prancha de comunicação, como complemento para contextos de escolha
(o que você quer fazer hoje, o que gostou na escola).

---

## 7. Emoji — não é sistema de CAA, é reforço afetivo opcional

Padronizado pelo **Unicode Consortium** como caracteres gráficos, não como
língua com gramática. Forte em expressão emocional, fraco em precisão semântica
e instável entre plataformas (o mesmo emoji renderiza diferente em Android e
iOS).

> [Unicode — Emoji Overview](https://unicode.org/emoji/)

**Consequência neste projeto:** não usar emoji como substituto de pictograma
principal — falta de controle sobre a renderização entre dispositivos quebra a
consistência visual que ARASAAC garante. Pode aparecer como camada opcional de
tom emocional sobre uma frase já montada, nunca como célula da prancha.

---

## 8. Cenas visuais (Visual Scene Displays) — a alternativa à grade

Em vez de itens soltos numa grade, uma **fotografia real do ambiente da pessoa**
(cozinha, quarto, sala de aula) com pontos tocáveis embutidos na cena. Formato
com uso descrito na literatura de CAA para usuários iniciantes ou com maior
comprometimento cognitivo, por preservar relação espacial real entre objetos.

> [AssistiveWare — Visual Scene Displays](https://www.assistiveware.com/learn-aac/visual-scene-displays)

**O que resolve:** para quem tem dificuldade de abstrair um pictograma
descontextualizado, a cena mantém a relação "o copo fica em cima da mesa" que
uma grade `COPO | ÁGUA | MESA` apaga.

**O que não resolve:** não escala para vocabulário abstrato ou amplo; é
complementar à grade, não substituto.

**Consequência neste projeto:** fora do escopo atual (o app é grade + busca),
mas é a resposta correta caso o projeto atenda, no futuro, usuários em estágio
pré-simbólico — registrar como item de roadmap, não implementar agora.

---

## 9. Libras e línguas de sinais — o erro a não cometer

Línguas de sinais (Libras no Brasil, ASL/BSL alhures) são **línguas naturais
completas**, com gramática própria — configuração de mão, movimento, expressão
facial gramatical, uso do espaço para referência pronominal. **Não são** uma
tradução palavra-por-palavra da língua falada correspondente.

> [Quadros, R. M. de. Libras — Gramática (UFSC)](https://www.libras.ufsc.br/)

**Consequência neste projeto:** se algum dia o app incorporar vídeos de sinal
por conceito (ver Makaton, seção 4), o vídeo deve representar o **sinal correto
em Libras para o conceito**, não uma animação letra-por-letra do alfabeto
manual, e não deve ser apresentado como "tradução automática" — isso não existe
de forma confiável hoje.

---

## 10. Síntese: o que muda no motor de frases (`speech.ts` / `types.ts`)

A tabela abaixo resume qual sistema histórico justifica qual decisão técnica.

| Sistema | Ideia central | Onde entra no código |
|---|---|---|
| Blissymbolics | indicador gramatical separado do símbolo-base | léxico anotado (`lexicon.ts`) + faixa de marcadores de tempo/negação/plural, nunca pictograma novo por flexão |
| Isotype | consistência visual do acervo importa mais que o desenho isolado | não misturar estilos de acervo sem normalização |
| Makaton | um conceito, várias portas de entrada (ver, ouvir, sinalizar) | manter "falar ao tocar"; vídeo de Libras é melhoria futura, não tradução automática |
| Minspeak | vocabulário grande sem esgotar a tela | já resolvido por núcleo fixo + busca — não copiar compressão por sequência |
| LAMP | posição física nunca muda | favoritos como prancha extra, sugestões em faixa separada, nunca reordenar grid |
| Talking Mats | nem toda comunicação é frase | modo de escolha/opinião é feature separada, não parte do motor de frases |
| Vocabulário-núcleo (REFERENCES.md §2) | núcleo é verbo/pronome, não substantivo | já implementado — 32 células curadas |

O ponto que une tudo: **nenhum sistema histórico resolveu geração de frase
flexionada automaticamente** — todos preservam a seleção do usuário como
unidade central e, no máximo, oferecem uma camada de apoio ao redor dela. Isso
valida a decisão de projeto de que a flexão verbal e a inserção de
artigos/preposições devem ser **opcionais e reversíveis**, nunca a única saída
falada.

Essa decisão está implementada e documentada em **[GRAMMAR.md](GRAMMAR.md)** —
regras do motor, o que ele tem permissão de fazer, e os limites conhecidos.
