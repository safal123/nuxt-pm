<script setup lang="ts">
const { isSignedIn } = useAuth();
</script>

<template>
  <section class="border-t border-border py-16 sm:py-20">
    <div class="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
      <div class="max-w-lg">
        <h2 class="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Open a workspace when you are ready
        </h2>
        <p class="mt-2 text-sm leading-6 text-muted-foreground">
          You get a board, an archive, an activity feed, and an email log on
          the first project.
        </p>
      </div>
      <div class="flex shrink-0 flex-wrap items-center gap-3">
        <Button v-if="isSignedIn" as-child>
          <NuxtLink to="/w">Open dashboard</NuxtLink>
        </Button>
        <template v-else>
          <Button as-child>
            <NuxtLink to="/sign-up">Create a workspace</NuxtLink>
          </Button>
          <Button as-child variant="outline">
            <NuxtLink to="/sign-in">Sign in</NuxtLink>
          </Button>
        </template>
      </div>
    </div>
  </section>
</template>
