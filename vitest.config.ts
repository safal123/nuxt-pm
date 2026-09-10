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
