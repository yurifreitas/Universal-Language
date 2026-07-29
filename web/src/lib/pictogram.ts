import type { Card } from '../types'

/**
 * URL da imagem do pictograma.
 *
 * As imagens sao servidas pelo PROPRIO site (`public/pictos/{id}.webp`), nao
 * pelo CDN da ARASAAC. Isso custa ~213 MB no repositorio, e em troca:
 *   - o app funciona offline de verdade, sem primeiro toque online por card;
 *   - nenhuma requisicao sai para terceiros (nada de rastreio de quem usa a
 *     prancha — dado sensivel: revela diagnostico e rotina do usuario);
 *   - o app nao quebra se o CDN mudar de rota ou sair do ar.
 *
 * O acervo em `data/images/` (500px e 2500px, 3,2 GB) segue sendo a fonte de
 * verdade; `scripts/build_web_images.py` gera esta versao enxuta.
 */
export function pictogramUrl(card: Card): string {
  return `${import.meta.env.BASE_URL}pictos/${card.id}.webp`
}
