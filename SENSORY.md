# Cor, padrão, tipografia e som

Base sensorial do Universal-Language. Os usuários deste app não são um grupo
homogêneo: quem tem TEA com hipersensibilidade precisa de estímulo **reduzido**;
quem tem baixa visão precisa de contraste **máximo**; quem tem dislexia precisa
de contraste **moderado** com fundo creme; quem tem epilepsia fotossensível
precisa que certos padrões simplesmente **não existam**.

Essas necessidades se contradizem. A resposta deste projeto não é uma média —
médias servem mal a todos — mas **modos explícitos** que o usuário escolhe.

> **Regra de precedência implementada:** alto contraste vence a paleta sensorial
> e desliga o fundo generativo. Quem liga alto contraste precisa de separação
> figura-fundo, não de conforto sensorial.

---

## 1. Cor e hipersensibilidade sensorial

### O que a pesquisa aponta

Pessoas no espectro autista são mais sensíveis a estimulação sensorial em geral
e tendem a se sobrecarregar com **cores muito brilhantes**. Cores não totalmente
saturadas são menos estimulantes. Indivíduos com alta sensibilidade sensorial
preferem predominantemente **cores suaves e texturas lisas**, associando-as a
conforto, calma e redução de sobrecarga.

**Preferidas:** neutros e tons de natureza — cinza, verde, azul, marrom, branco
quebrado. Frias e dessaturadas.

**Evitar:** vermelhos, laranjas e amarelos; **branco puro**; iluminação e cores
fluorescentes, cujo efeito de cintilação provoca ansiedade e dor de cabeça.

> [Analysing the impact of sensory processing differences on colour and texture preferences in ASD — *Humanities and Social Sciences Communications* (Nature, 2025)](https://www.nature.com/articles/s41599-025-05753-4) ·
> [Neurodiversity Design System — Colour](https://www.neurodiversity.design/principles/colour/) ·
> [Neurokind Design — hipersensibilidade a cor](https://www.neurokinddesign.com.au/knowledge-base/colour-blog)

### A ressalva que a própria literatura faz

Cada indivíduo responde de forma diferente conforme preferência pessoal. Não
existe "a cor certa para autismo" — o que existe é **poder escolher**. A
recomendação recorrente é oferecer ajuste contínuo de matiz e saturação, ou ao
menos um controle de conforto sensorial, em vez de um modo binário.

### O que este projeto faz

Um **controle contínuo de conforto sensorial**, de 0 a 100%, em Ajustes →
Leitura e cor. Cada passo interpola as cores entre a versão viva e a calma:

| | 0% | 100% |
|---|---|---|
| Acento | verde vivo `#38dfa0` | sage dessaturado `#7fb3a0` |
| Fundo do card | branco `#fbfcfd` | creme `#f3efe6` |
| Alerta | vermelho `#ff7a7a` | terracota suave `#c98b8b` |
| Cores de classe gramatical | plenas | 45% em direção ao cinza |

A interpolação é feita em CSS com `color-mix(in oklab, …)` sobre uma variável
`--sensory`, o que mantém a percepção de luminosidade estável ao longo da
escala — mistura em sRGB escureceria o meio do caminho.

**Por que contínuo e não um interruptor:** era um par liga/desliga, e a própria
literatura desta seção diz que a resposta é individual e recomenda ajuste
contínuo. Quem precisava de um meio-termo era mal atendido pelos dois extremos.
Perfis salvos com a paleta antiga ligada migram automaticamente para 100%.

---

## 2. Tipografia e dislexia

Base: **Dyslexia Style Guide** da British Dyslexia Association.

| Recomendação | Aplicado |
|---|---|
| Fonte **sem serifa** (Arial, Verdana, Tahoma, Trebuchet, Century Gothic, Calibri, Open Sans) — as letras parecem menos apinhadas | Verdana / Tahoma / Trebuchet |
| Corpo de **12–14 pt** (≈ 16–19 px); títulos ao menos 20% maiores | 17 px |
| **Entreletras (tracking) maior** melhora a legibilidade | `letter-spacing: 0.035em` |
| **Alinhar à esquerda, sem justificar** | sim |
| **Sem itálico e sem sublinhado** — apinham as palavras | itálico vira negrito; links com sublinhado espesso e afastado |
| Linhas curtas | `max-width: 62ch` |
| **Branco ofusca** — usar creme ou pastel suave | paleta sensorial troca o card por creme |
| **Evitar verde e vermelho/rosa** — difíceis para deficiência de visão de cores | o acento sensorial é sage, não verde saturado |

> [BDA Dyslexia Style Guide 2023 (PDF)](https://cdn.bdadyslexia.org.uk/uploads/documents/Advice/style-guide/BDA-Style-Guide-2023.pdf) ·
> [Dyslexia-Friendly Style Guide (Ako Aotearoa, PDF)](https://ako.ac.nz/assets/Knowledge-centre/ALNACC-Resources/Dyslexia-resources/230907-Dyslexia-Friendly-Style-Guide.pdf) ·
> [A Comparative Study of Dyslexia Style Guides in Improving Readability](https://www.researchgate.net/publication/347481260_A_Comparative_Study_of_Dyslexia_Style_Guides_in_Improving_Readability_for_People_With_Dyslexia)

### Os controles finos

O quadro acima é um **preset**. Como o próprio guia da BDA insiste que a medida
certa varia por pessoa, três ajustes independentes ficam disponíveis, ligados ou
não o modo dislexia:

| Ajuste | Faixa | Zero significa |
|---|---|---|
| Fonte | Verdana, Tahoma, Century Gothic, Comic Sans | automática (segue o preset) |
| Tamanho do texto | 90% – 150% | — |
| Entreletras | 0 – 0,12 em | o que o tema já usava |
| Entrelinhas | 1,3 – 2,2 | automática |

Entrelinhas abaixo de 1,3 não são oferecidas: linha apertada é justamente o que
a leitura com dislexia perde de vista. Todas as fontes são **do sistema** —
nenhuma webfont é baixada, porque uma prancha de comunicação precisa abrir
offline.

### Um ponto honesto sobre fontes "para dislexia"

O guia da BDA lista **Comic Sans** entre as fontes recomendadas, o que costuma
causar estranheza. A justificativa é geométrica: formas de letra menos
ambíguas. Já as fontes vendidas especificamente como "para dislexia"
(OpenDyslexic e similares) têm evidência **fraca e contestada** de superioridade
sobre uma sans-serif comum bem espaçada. Por isso este projeto usa Verdana com
espaçamento aumentado, e não uma fonte especializada: o ganho documentado está
no **espaçamento**, não no desenho da letra.

---

## 3. Padrões — por que não são cíclicos aqui

Este é o ponto onde a intuição de design colide com a segurança.

### Pattern glare / estresse visual

**Pattern glare** é o desconforto e a distorção perceptual ao olhar **padrões
listrados repetitivos** — o efeito da op art. Os padrões parecem se mover,
cintilar ou mudar de forma. A causa é a sobre-reação de neurônios do córtex
visual a determinadas frequências espaciais.

**A estatística que decide o projeto:** cerca de **5%** das pessoas com epilepsia
têm crises desencadeadas por luz piscante — e cerca de **um terço dessas**
também têm crises desencadeadas por **padrões estáticos, continuamente
iluminados, particularmente de listras**.

Não é só epilepsia: estresse visual por padrão atinge também quem tem
**enxaqueca** e **dislexia** — exatamente parte do público deste app.

> [Pattern glare — Wikipedia](https://en.wikipedia.org/wiki/Pattern_glare) ·
> [Sensitization and Habituation of Hyper-Excitation to Pattern-Glare Stimuli (PMC, 2024)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11587462/) ·
> [A neurological basis for visual stress and its treatment with coloured filters (Vision Research)](https://www.sciencedirect.com/science/article/abs/pii/S0042698925000768) ·
> [Pattern Glare, Visual Stress e Dislexia — Crossbow Education](https://www.crossboweducation.com/Pattern-Glare-Visual-Stress-and-Dyslexia)

### WCAG sobre o assunto

- **2.3.1 Three Flashes or Below Threshold** (Nível A) — nada pode piscar mais de
  três vezes por segundo, ou deve ficar abaixo dos limiares de flash geral e de
  flash vermelho.
- **2.3.2 Three Flashes** (Nível AAA) — sem exceção de limiar.

Vale lembrar que quem tem enxaqueca ou transtorno vestibular também sente
tontura, náusea e desorientação com movimento rápido.

> [W3C — WCAG 2.2](https://www.w3.org/TR/WCAG22/) ·
> [Understanding SC 2.3.1](https://www.includia.com/guides/posts/sc-231/)

### A decisão de projeto

Você pediu "padrões cíclicos generativos". A evidência diz que **ciclicidade é
justamente a propriedade perigosa** — periodicidade em frequência espacial média
é o gatilho. Então o fundo generativo do app é construído para gerar variação
**sem periodicidade**:

- **Três gradientes radiais grandes**, em posições irregulares (12%/22%,
  88%/68%, 50%/−10%) — nunca formam repetição.
- **Baixíssima frequência espacial** — as transições ocorrem ao longo de
  centenas de pixels, não de poucos. Listras finas são o caso perigoso.
- **Contraste de 4–5%** sobre o fundo, via `color-mix`.
- **Estático.** Sem animação, sem cintilação, sem ciclo temporal.
- **Desligado em alto contraste** — variação atrás do conteúdo reduz a separação
  figura-fundo de que baixa visão depende.

O que **não** foi feito, e não será: listras, xadrez, moiré, ruído de alta
frequência, gradiente animado em loop, qualquer coisa que pisque.

Se você quiser generatividade mais visível, o caminho seguro é **variação por
sessão, não por frame**: gerar posições diferentes a cada carregamento e deixar
estáticas. Movimento é o que precisa ficar de fora.

---

## 4. Som

### Earcons vs. auditory icons

Distinção fundamental do campo:

- **Auditory icon** (Gaver, *SonicFinder*, Apple) — som com semelhança ecológica
  ao que representa: um "amassar papel" ao deletar.
- **Earcon** (Blattner, Sumikawa & Greenberg, 1989) — som **abstrato**,
  estruturável hierarquicamente: um motivo acústico comum identifica uma família
  de mensagens relacionadas.

**O achado que guiou a implementação:** o **ritmo** é a característica mais
proeminente de um earcon — ouvintes respondem mais prontamente a variação
rítmica do que a variação de altura.

> [Blattner, Sumikawa & Greenberg — *Earcons and Icons: Their Structure and Common Design Principles*, HCI 4(1)](https://dl.acm.org/doi/abs/10.1207/s15327051hci0401_1) ·
> [Auditory Icons, Earcons, Spearcons, and Speech: revisão sistemática e meta-análise](https://www.researchgate.net/publication/371527094_Auditory_Icons_Earcons_Spearcons_and_Speech_A_Systematic_Review_and_Meta-Analysis_of_Brief_Audio_Alerts_in_Human-Machine_Interfaces) ·
> [An evaluation of earcons for use in auditory human-computer interfaces](https://www.researchgate.net/publication/221515744_An_evaluation_of_earcons_for_use_in_auditory_human-computer_interfaces)

### A família implementada

Motivos distinguidos **primeiro pelo ritmo**, depois pela direção melódica:

| Evento | Ritmo | Altura |
|---|---|---|
| Passo entre **linhas** | 1 nota curta | 340 Hz (grave) |
| Passo entre **células** | 1 nota curta | 560 Hz (agudo) |
| **Seleção** | 2 notas ligadas | 620 → 880 Hz (ascendente) |
| **Remoção** | 2 notas ligadas | 620 → 420 Hz (descendente) |
| **Troca de prancha** | 2 notas separadas, mesma altura | 700 Hz |

Sintetizados por Web Audio API — nenhum arquivo, nada a baixar, funciona
offline. Ondas senoidais com ataque de 12 ms e queda exponencial: **sem ataque
abrupto**, que é desconfortável na hipersensibilidade auditiva. Ganho baixo
(0,045–0,07): acompanham a fala, não competem com ela.

**Desligados por padrão.** Som adicional é sobrecarga para parte do público.

### Varredura auditiva

Método de acesso, não enfeite. É o **único caminho** para quem usa switch e não
enxerga a grade.

A prática estabelecida em CAA é anunciar a opção percorrida numa **voz
secundária**, distinta da voz da mensagem, para que o usuário diferencie "o que
está sendo oferecido" de "o que eu disse". Dispositivos comerciais resolvem isso
com **alto-falante privado** — fone de ouvido ou *pillow speaker*: o usuário
ouve as opções em privado, e só a mensagem selecionada sai no alto-falante que o
parceiro escuta.

> [Auditory Scanning and AAC (CSUN)](https://www.dinf.ne.jp/doc/english/Us_Eu/conf/csun_98/csun98_031.html) ·
> [AssistiveWare — Get auditory cues (Proloquo2Go)](https://www.assistiveware.com/support/proloquo2go/alternative-access/get-auditory-cues) ·
> [Zyteq — Auditory Scanning](https://www.zyteq.com.au/selection-guide/auditory_scanning) ·
> [AbleNet — What is scanning](https://support.ablenetinc.com/aac-education-and-resources/what-is-scanning/)

**Implementação:** o navegador não expõe saída de áudio separada, então a voz
secundária é diferenciada por **tom mais agudo** (`pitch + 0,45`) e **fala mais
rápida** (`rate × 1,35` — a pista precisa caber dentro do passo da varredura).
Com fone de ouvido, a separação privado/público funciona na prática.

Na fase de **linhas**, anuncia `"linha, <primeira palavra>"` — é a técnica de
**cue** documentada: em vez de ler a linha inteira, dá uma ou duas palavras como
pista, o que economiza tempo de escuta.

---

## 5. Como os modos interagem

```
alto contraste   → vence tudo: paleta pura, fundo generativo desligado,
                   cor de classe reduzida a borda espessa
conforto sensorial → escala contínua: dessatura acento, card, alerta e as
                   cores de classe gramatical
cor por classe   → off / só borda / borda e fundo; passa pelo conforto sensorial
modo dislexia    → só tipografia; combina com qualquer paleta
fonte, corpo, entreletras, entrelinhas → sobrepõem o preset de dislexia
tema claro/escuro→ ortogonal a todos
```

Todos são independentes e persistem em `localStorage`. Nenhum é padrão: o app
abre no tema escuro, sem conforto sensorial, sem cor de classe, sem sons, sem
varredura e sem o motor de frases.

---

## 6. Pendências

1. ~~**Paleta sensorial é binária.**~~ Resolvido: virou escala contínua de 0 a
   100% (seção 1). O que fica em aberto é o ajuste **de matiz**, separado da
   saturação — a literatura menciona os dois, e só um foi implementado.
2. **Earcons não foram testados com usuários.** A estrutura segue os princípios
   de Blattner, mas a discriminabilidade real dos cinco motivos precisa de
   verificação.
3. **A voz secundária depende do TTS do sistema.** Se houver só uma voz pt-BR
   instalada, a distinção fica apenas em tom e velocidade — mais fraca que a
   separação por voz de dispositivos comerciais.
4. **Sem suporte a saída de áudio separada.** A Web Audio API tem
   `setSinkId`, com suporte irregular; permitiria roteamento real
   privado/público. Não avaliado.
5. **Nenhum dos modos foi validado com o público-alvo.** São aplicações fiéis da
   literatura, não resultados de teste.

---

## Ver também

- [GRAMMAR.md](GRAMMAR.md) — motor de frases e a codificação de cor por classe
  gramatical (chave de Fitzgerald), que usa a escala de conforto desta página.
- [REFERENCES.md](REFERENCES.md) — metodologias de CAA, evidência científica,
  métodos de acesso e normas técnicas.
- [LEGISLATION.md](LEGISLATION.md) — marco legal.
