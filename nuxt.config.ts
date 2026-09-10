// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  experimental: {
    // Pinia actions call `api()` after `await`; without this the Nuxt
    // instance is gone and cookie forwarding / composables fail.
    asyncContext: true,
  },
  css: ['~/assets/css/main.css'],
  modules: [
    'shadcn-nuxt',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/color-mode',
    '@pinia/nuxt',
    '@uploadthing/nuxt',
  ],
  colorMode: {
    classSuffix: '',
    preference: 'system',
    fallback: 'light',
    storageKey: 'nuxt-color-mode',
    storage: 'cookie',
    disableTransition: true,
  },
  uploadthing: {
    routerPath: '~/server/uploadthing.ts',
  },
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/png', href: '/images/logo.png' },
        { rel: 'apple-touch-icon', href: '/images/logo.png' },
      ],
    },
  },
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
    resendApiKey: process.env.RESEND_API_KEY,
    resendFrom: process.env.RESEND_FROM,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    public: {
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    },
  },
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
  components: [
    {
      path: '~/components',
      pathPrefix: false,
    }
  ],
  vite: {
    resolve: {
      alias: {
        // Prisma emits a bare `.prisma/client/index-browser` import that the
        // browser cannot resolve. Point Vite at the generated file instead.
        '.prisma/client/index-browser': './node_modules/.prisma/client/index-browser.js',
      },
    },
    server: {
      allowedHosts: ['https://82ec-2403-4800-2590-b591-c14a-3d28-b356-27b6.ngrok-free.app']
    }
  },
})
