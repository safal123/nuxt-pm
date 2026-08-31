// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  modules: [
    '@clerk/nuxt',
    'shadcn-nuxt',
    '@nuxtjs/tailwindcss',
    '@prisma/nuxt',
    '@pinia/nuxt',
  ],
  app: {
    head: {
      script: [
        {
          innerHTML: `(function(){try{var r=localStorage.getItem('nuxt-color-mode');var s='auto';if(r){try{s=JSON.parse(r)}catch(e){s=r}}var d=s==='dark'||((!s||s==='auto')&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',!!d);}catch(e){}})();`,
        },
      ],
    },
  },
  runtimeConfig: {
    resendApiKey: process.env.RESEND_API_KEY,
    resendFrom: process.env.RESEND_FROM,
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
    server: {
      allowedHosts: ['736c-2403-4800-2590-b578-1d7b-41b4-2dc7-cbe9.ngrok-free.app']
    }
  }
})