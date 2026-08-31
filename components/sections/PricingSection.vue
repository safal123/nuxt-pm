<script setup lang="ts">
import { SignInButton } from "@clerk/clerk-vue";
import { SignIn, SignInWithMetamaskButton } from "@clerk/nuxt/components";

const pricingPlans = [
  {
    name: "Starter",
    price: "9",
    description: "Perfect for individuals and small teams",
    features: [
      "Up to 5 team members",
      "3 active projects",
      "Basic task management",
      "Simple analytics",
      "Email support",
    ],
  },
  {
    name: "Professional",
    price: "29",
    description: "Best for growing teams",
    features: [
      "Up to 20 team members",
      "Unlimited projects",
      "Advanced task management",
      "Full analytics suite",
      "Priority support",
      "Custom workflows",
      "Team collaboration tools",
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    price: "99",
    description: "For large organizations",
    features: [
      "Unlimited team members",
      "Unlimited projects",
      "Advanced security",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantee",
      "Advanced permissions",
      "Custom training",
    ],
  },
];
</script>

<template>
  <div
    id="pricing"
    class="relative isolate overflow-hidden bg-slate-950 py-24 sm:py-32 dark:bg-muted"
  >
    <div class="mx-auto max-w-7xl px-6 lg:px-8">
      <div class="mx-auto max-w-2xl text-center">
        <h2 class="text-base font-semibold leading-7 text-purple-400">
          Pricing
        </h2>
        <p
          class="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl"
        >
          Choose your plan
        </p>
        <p class="mt-6 text-lg leading-8 text-gray-300">
          Select the perfect plan for your team's needs. All plans include our
          core features.
        </p>
      </div>
      <div
        class="mx-auto mt-16 grid max-w-lg grid-cols-1 items-center gap-y-6 sm:mt-20 sm:gap-y-0 lg:max-w-4xl lg:grid-cols-3"
      >
        <div
          v-for="plan in pricingPlans"
          :key="plan.name"
          class="relative rounded-2xl bg-white/5 p-8 ring-1 ring-white/10 sm:p-10 dark:bg-background/40 dark:ring-border"
          :class="{ 'z-10 scale-105 shadow-2xl': plan.popular }"
        >
          <div
            v-if="plan.popular"
            class="absolute -top-4 right-8 rounded-full bg-purple-500 px-4 py-1 text-xs font-semibold text-white"
          >
            Popular
          </div>
          <h3 class="text-lg font-semibold leading-8 text-purple-400">
            {{ plan.name }}
          </h3>
          <p class="mt-4 text-sm leading-6 text-gray-300">
            {{ plan.description }}
          </p>
          <p class="mt-6 flex items-baseline gap-x-1">
            <span class="text-4xl font-bold tracking-tight text-white"
              >${{ plan.price }}</span
            >
            <span class="text-sm font-semibold leading-6 text-gray-300"
              >/month</span
            >
          </p>
          <ul
            role="list"
            class="mt-8 space-y-3 text-sm leading-6 text-gray-300"
          >
            <li
              v-for="feature in plan.features"
              :key="feature"
              class="flex gap-x-3"
            >
              <svg
                class="h-6 w-5 flex-none text-purple-400"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fill-rule="evenodd"
                  d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                  clip-rule="evenodd"
                />
              </svg>
              {{ feature }}
            </li>
          </ul>
          <!-- <SignInButtonButton
            class="mt-8 block w-full rounded-md bg-purple-500 px-3.5 py-2 text-center text-sm font-semibold leading-6 text-white shadow-sm hover:bg-purple-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500"
          >
            Get started today
          </SignIn> -->
        </div>
      </div>
    </div>
    <div
      class="absolute inset-x-0 -top-16 -z-10 flex transform-gpu justify-center overflow-hidden blur-3xl"
      aria-hidden="true"
    >
      <div
        class="aspect-[1318/752] w-[82.375rem] flex-none bg-gradient-to-r from-purple-800 to-purple-300 opacity-25"
      />
    </div>
  </div>
</template>
