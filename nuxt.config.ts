// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  // The Tailwind v7 module auto-detects `app/assets/css/main.css`
  // (it contains `@import "tailwindcss"`) — no explicit `css:` entry needed.
  app: {
    head: {
      title: 'Team-Meisterschaft Iseltwald',
      htmlAttrs: { lang: 'de' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
  },
})
