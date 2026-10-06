<script setup lang="ts">
const { isSignedIn } = useAuth();
</script>

<template>
  <section class="border-b border-border pt-24 sm:pt-28">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="grid items-center gap-10 pb-16 lg:grid-cols-[minmax(0,28rem)_1fr] lg:gap-14 lg:pb-20">
        <div>
          <h1 class="text-4xl font-semibold tracking-tight text-foreground sm:text-[2.75rem] sm:leading-[1.15]">
            Project work, kept in one place.
          </h1>
          <p class="mt-5 text-base leading-7 text-muted-foreground sm:text-[17px] sm:leading-8">
            Northstar is a workspace for boards, due dates, activity, and
            email. Create a project, invite the people on it, and keep the
            record next to the work.
          </p>
          <div class="mt-8 flex flex-wrap items-center gap-3">
            <Button v-if="isSignedIn" as-child>
              <NuxtLink to="/w">Open dashboard</NuxtLink>
            </Button>
            <Button v-else as-child>
              <NuxtLink to="/sign-up">Create a workspace</NuxtLink>
            </Button>
            <Button as-child variant="outline">
              <a href="#product">See how it is structured</a>
            </Button>
          </div>
          <p class="mt-6 text-sm text-muted-foreground">
            Free for one workspace. No card required.
          </p>
        </div>

        <div class="min-w-0 overflow-hidden rounded-lg border border-border bg-card">
          <img
            src="/images/dashboard.png"
            alt="Northstar workspace dashboard with project counts, charts, and recent activity"
            width="3456"
            height="1982"
            class="w-full dark:hidden"
          />
          <img
            src="/images/dashboard-dark.png"
            alt="Northstar workspace dashboard in dark mode"
            width="3456"
            height="1982"
            class="hidden w-full dark:block"
          />
        </div>
      </div>
    </div>
  </section>
</template>
