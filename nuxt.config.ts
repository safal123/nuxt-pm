// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  modules: [
    '@clerk/nuxt',
    'shadcn-nuxt',
    '@nuxtjs/tailwindcss',
    '@prisma/nuxt'
  ],
  shadcn: {
    /**
     * Prefix for all the imported component
     */
    prefix: '',
    /**
     * Directory that the component lives in.
     * @default "./components/ui"
     */
    componentDir: './components/ui'
  },
  vite: {
    server: {
      allowedHosts: ['736c-2403-4800-2590-b578-1d7b-41b4-2dc7-cbe9.ngrok-free.app']
    }
  }
})