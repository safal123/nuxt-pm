<script setup lang="ts">
useHead({
  title: "Northstar — Boards, activity, and email in one workspace",
  htmlAttrs: { class: "scroll-smooth" },
  meta: [
    {
      name: "description",
      content:
        "Northstar is a workspace for kanban and table views, archive and restore, activity history, and branded email you can track.",
    },
  ],
});
</script>

<template>
  <div class="min-h-screen bg-background">
    <Header />
    <main>
      <HeroSection />
      <FeaturesSection />
      <ProductSection />
      <WorkflowSection />
      <PricingSection />
      <CTASection />
    </main>
    <Footer />
  </div>
</template>
