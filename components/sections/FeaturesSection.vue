<script setup lang="ts">
const features = [
  {
    title: "Task Management",
    description:
      "Organize and track tasks with ease. Set priorities, deadlines, and assign team members.",
    icon: "📋",
  },
  {
    title: "Team Collaboration",
    description:
      "Work together seamlessly with real-time updates and communication tools.",
    icon: "👥",
  },
  {
    title: "Project Timeline",
    description:
      "Visualize project progress with interactive Gantt charts and timelines.",
    icon: "📅",
  },
  {
    title: "Resource Planning",
    description: "Allocate resources efficiently and track team availability.",
    icon: "📊",
  },
  {
    title: "Custom Workflows",
    description:
      "Create and customize workflows that match your team's processes.",
    icon: "⚡",
  },
  {
    title: "Analytics & Reports",
    description:
      "Get insights with detailed project analytics and custom reports.",
    icon: "📈",
  },
];
</script>

<template>
  <div id="features" class="py-24 sm:py-32">
    <div class="mx-auto max-w-7xl px-6 lg:px-8">
      <div class="mx-auto max-w-2xl text-center">
        <h2 class="text-base font-semibold leading-7 text-purple-600">
          Everything you need
        </h2>
        <p
          class="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
        >
          Powerful features for powerful teams
        </p>
        <p class="mt-6 text-lg leading-8 text-muted-foreground">
          All the tools you need to manage projects effectively, collaborate
          with your team, and deliver results.
        </p>
      </div>
      <div class="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
        <dl
          class="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3"
        >
          <div
            v-for="feature in features"
            :key="feature.title"
            class="relative pl-16"
          >
            <dt
              class="text-base font-semibold leading-7 text-foreground"
            >
              <div
                class="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600"
              >
                <span class="text-2xl">{{ feature.icon }}</span>
              </div>
              {{ feature.title }}
            </dt>
            <dd
              class="mt-2 text-base leading-7 text-muted-foreground"
            >
              {{ feature.description }}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  </div>
</template>
