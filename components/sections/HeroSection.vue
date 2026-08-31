<script setup lang="ts">
import { ArrowRight } from "lucide-vue-next";

const { isSignedIn } = useAuth();
</script>

<template>
  <div class="relative isolate md:pt-20 pt-8">
    <div
      class="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
      aria-hidden="true"
    >
      <div
        class="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-purple-600 to-purple-400 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
      ></div>
    </div>

    <!-- Dotted pattern -->
    <div class="absolute inset-0 -z-10 opacity-10">
      <div
        class="absolute inset-0"
        style="
          background-image: radial-gradient(
            circle at 1px 1px,
            purple 1px,
            transparent 0
          );
          background-size: 40px 40px;
        "
      ></div>
    </div>

    <div
      class="mx-auto max-w-7xl px-6 py-24 sm:py-12 lg:flex lg:items-center lg:gap-x-10 lg:px-8 lg:py-20"
    >
      <div class="mx-auto max-w-2xl lg:mx-0 lg:flex-auto">
        <div class="flex">
          <div
            class="relative flex items-center gap-x-4 rounded-full px-4 py-1 text-sm leading-6 text-muted-foreground ring-1 ring-border hover:ring-foreground/20"
          >
            <span class="font-semibold text-purple-600">What's new</span>
            <span
              class="h-4 w-px bg-border"
              aria-hidden="true"
            />
            <a href="#" class="flex items-center gap-x-1">
              Just shipped v1.0
              <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </div>
        <h1
          class="mt-10 max-w-lg text-4xl font-bold tracking-tight text-foreground sm:text-6xl"
        >
          Project management made simple
        </h1>
        <p class="mt-6 text-lg leading-8 text-muted-foreground">
          Streamline your workflow, boost productivity, and deliver projects on
          time with our intuitive project management solution.
        </p>
        <div class="mt-10 flex items-center gap-x-6">
          <SignInButton
            v-if="!isSignedIn"
            class="rounded-md bg-purple-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
          >
            Get started
          </SignInButton>
          <NuxtLink
            v-else
            href="/dashboard"
            class="flex items-center gap-x-2 rounded-md bg-purple-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
          >
            Dashboard
            <span aria-hidden="true">
              <ArrowRight class="w-4 h-4" />
            </span>
          </NuxtLink>
          <NuxtLink
            href="#features"
            class="text-sm font-semibold leading-6 text-foreground"
          >
            Learn more <span aria-hidden="true">→</span>
          </NuxtLink>
        </div>
      </div>
      <div class="mt-16 sm:mt-24 lg:mt-0 lg:flex-shrink-0 lg:flex-grow">
        <div class="relative mx-auto max-w-2xl">
          <div class="relative">
            <img
              src="/public/images/dashboard.png"
              alt="Project management dashboard"
              class="w-full h-[500px] object-cover rounded-xl shadow-xl ring-1 ring-border sm:w-[35rem] md:w-[38rem] lg:w-[40rem]"
              width="2000"
              height="800"
            />
          </div>
        </div>
      </div>
    </div>
    <div
      class="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
      aria-hidden="true"
    >
      <div
        class="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-purple-600 to-purple-400 opacity-20 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
      />
    </div>
  </div>
</template>
