<script setup lang="ts">
import { Menu, X } from "lucide-vue-next";

const isOpen = ref(false);
const navigation = [
  { name: "Features", href: "#features" },
  { name: "Pricing", href: "#pricing" },
  { name: "About", href: "#about" },
  { name: "Contact", href: "#contact" },
];
const { isSignedIn } = useAuth();
const clerkAppearance = useClerkAppearance();

// Close mobile menu when clicking outside
const closeMenu = () => {
  isOpen.value = false;
};

// Close menu when route changes
watch(
  () => useRoute().fullPath,
  () => {
    closeMenu();
  },
);
</script>

<template>
  <header
    class="fixed border-b border-border inset-x-0 top-0 z-50 bg-background/80 backdrop-blur-sm"
  >
    <nav
      class="flex items-center justify-between p-6 lg:px-8"
      aria-label="Global"
    >
      <div class="flex lg:flex-1">
        <NuxtLink to="/" class="-m-1.5 p-1.5">
          <span class="sr-only">Your Company</span>
          <img class="h-8 w-auto" src="/images/logo.png" alt="" />
        </NuxtLink>
      </div>
      <div class="flex lg:hidden items-center gap-2">
        <ThemeToggle />
        <button
          type="button"
          class="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-foreground"
          @click="isOpen = true"
        >
          <span class="sr-only">Open main menu</span>
          <Menu class="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
      <div class="hidden lg:flex lg:gap-x-12">
        <a
          v-for="item in navigation"
          :key="item.name"
          :href="item.href"
          class="text-sm font-semibold leading-6 text-foreground hover:text-violet-600"
        >
          {{ item.name }}
        </a>
      </div>
      <div class="hidden lg:flex lg:flex-1 lg:justify-end lg:items-center lg:gap-x-4">
        <ThemeToggle />
        <SignedOut>
          <SignInButton class="text-sm font-semibold leading-6" />
        </SignedOut>
        <SignedIn>
          <UserButton :appearance="clerkAppearance" />
        </SignedIn>
      </div>
    </nav>

    <!-- Mobile menu -->
    <div v-show="isOpen" class="lg:hidden">
      <div
        class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        @click="closeMenu"
      />
      <div
        class="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-background px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-border"
      >
        <div class="flex items-center justify-between">
          <NuxtLink to="/" class="-m-1.5 p-1.5" @click="closeMenu">
            <span class="sr-only">Your Company</span>
            <img
              class="h-8 w-auto"
              src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600"
              alt="Company Logo"
            />
          </NuxtLink>
          <button
            type="button"
            class="-m-2.5 rounded-md p-2.5 text-foreground"
            @click="closeMenu"
          >
            <span class="sr-only">Close menu</span>
            <X class="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <div class="mt-6 flow-root">
          <div class="-my-6 divide-y divide-gray-500/10">
            <div class="space-y-2 py-6">
              <a
                v-for="item in navigation"
                :key="item.name"
                :href="item.href"
                class="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-foreground hover:bg-accent"
                @click="closeMenu"
              >
                {{ item.name }}
              </a>
            </div>
            <div class="py-6 space-y-3">
              <SignedOut>
                <SignInButton class="w-full"> Log in </SignInButton>
                <SignUpButton
                  class="w-full rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
                >
                  Get started
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <div class="flex justify-center">
                  <UserButton :appearance="clerkAppearance" />
                </div>
              </SignedIn>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
