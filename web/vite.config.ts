import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serve o site em /<repo>/, entao o base precisa casar com o nome
// do repositorio. Sobrescreva com BASE_PATH=/ para dominio proprio ou local.
const base = process.env.BASE_PATH ?? '/Universal-Language/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Fala — Comunicação Alternativa',
        short_name: 'Fala',
        description:
          'Prancha de comunicação alternativa e aumentativa com pictogramas ARASAAC e voz em português.',
        theme_color: '#0f1720',
        background_color: '#0f1720',
        display: 'standalone',
        orientation: 'any',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Os 13.801 .webp NAO entram no precache: seriam ~213 MB baixados na
        // primeira visita e um manifesto gigantesco. Ficam em runtime cache,
        // permanente apos o primeiro uso de cada card.
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        globIgnores: ['pictos/**', 'data/search.json'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/pictos/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'pictos',
              // Imutaveis: o nome do arquivo e o id do pictograma. Sem expiracao
              // por tempo; so o teto de entradas, para nao estourar a cota.
              expiration: { maxEntries: 5000 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.endsWith('/data/search.json'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'search-index' },
          },
          {
            /*
             * boards.json NAO estava em cache nenhum — nem no precache (que so
             * pega js/css/html/svg/woff2) nem em runtime. O app inteiro depende
             * dele: sem boards.json a tela e "Não foi possível carregar as
             * pranchas".
             *
             * Ou seja: o app que se anuncia offline nao abria offline. Passa a
             * ser StaleWhileRevalidate — serve do cache na hora, e atualiza em
             * segundo plano quando ha rede, para uma prancha nova aparecer sem
             * precisar reinstalar.
             */
            urlPattern: ({ url }) => url.pathname.endsWith('/data/boards.json'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'boards',
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: { react: ['react', 'react-dom'] },
      },
    },
  },
})
