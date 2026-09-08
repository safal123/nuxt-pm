import { defineVitestConfig } from "@nuxt/test-utils/config";

export default defineVitestConfig({
  test: {
    include: ["tests/**/*.spec.ts"],
    // Tests get the real Nuxt runtime by default: auto-imports, plugins and a
    // DOM. Pure-logic specs under tests/unit opt out with a
    // `// @vitest-environment node` docblock so they skip building a Nuxt app
    // and a DOM per file.
    environment: "nuxt",
    environmentOptions: {
      nuxt: {
        domEnvironment: "happy-dom",
        overrides: {
          runtimeConfig: {
            public: {
              clerk: {
                // The Clerk plugin throws on boot without a key. This is a
                // well-formed dev key for a domain that does not exist, so no
                // test can reach a real Clerk instance.
                publishableKey: "pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk",
              },
            },
          },
        },
      },
    },
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["components/**", "composables/**", "stores/**", "utils/**"],
    },
  },
});
