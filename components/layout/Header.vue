<script setup lang="ts">
import { MenuIcon } from "lucide-vue-next";

const { isSignedIn } = useAuth();
const clerkAppearance = useClerkAppearance();
const menuOpen = ref(false);

const navigation = [
  { name: "Product", href: "#product" },
  { name: "Features", href: "#features" },
  { name: "How it works", href: "#how-it-works" },
  { name: "Pricing", href: "#pricing" },
];

const closeMenu = () => {
  menuOpen.value = false;
};
</script>

<template>
  <header
    class="fixed inset-x-0 top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-md"
  >
    <nav
      class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
      aria-label="Primary"
    >
      <NuxtLink to="/" class="flex items-center gap-2.5">
        <img
          src="/images/logo.png"
          alt=""
          class="h-7 w-7 dark:brightness-0 dark:invert"
        />
        <span class="text-[15px] font-semibold tracking-tight text-foreground">
          Northstar
        </span>
      </NuxtLink>

      <div class="hidden items-center gap-8 lg:flex">
        <a
          v-for="item in navigation"
          :key="item.name"
          :href="item.href"
          class="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {{ item.name }}
        </a>
      </div>

      <div class="hidden items-center gap-2 lg:flex">
        <ThemeToggle />
        <template v-if="isSignedIn">
          <Button as-child>
            <NuxtLink to="/w">Open dashboard</NuxtLink>
          </Button>
          <UserButton :appearance="clerkAppearance" />
        </template>
        <template v-else>
          <Button as-child variant="ghost">
            <NuxtLink to="/sign-in">Sign in</NuxtLink>
          </Button>
          <Button as-child>
            <NuxtLink to="/sign-up">Get started</NuxtLink>
          </Button>
        </template>
      </div>

      <div class="flex items-center gap-2 lg:hidden">
        <ThemeToggle />
        <Sheet :open="menuOpen" @update:open="menuOpen = $event">
          <SheetTrigger as-child>
            <Button variant="outline" size="icon" aria-label="Open menu">
              <MenuIcon class="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" class="flex flex-col gap-6">
            <SheetHeader>
              <SheetTitle class="flex items-center gap-2 text-left">
                <img
                  src="/images/logo.png"
                  alt=""
                  class="h-6 w-6 dark:brightness-0 dark:invert"
                />
                Northstar
              </SheetTitle>
              <SheetDescription class="sr-only">
                Landing page navigation
              </SheetDescription>
            </SheetHeader>
            <nav class="flex flex-col gap-1">
              <a
                v-for="item in navigation"
                :key="item.name"
                :href="item.href"
                class="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
                @click="closeMenu"
              >
                {{ item.name }}
              </a>
            </nav>
            <div class="mt-auto flex flex-col gap-2">
              <template v-if="isSignedIn">
                <Button as-child class="w-full">
                  <NuxtLink to="/w" @click="closeMenu">Open dashboard</NuxtLink>
                </Button>
              </template>
              <template v-else>
                <Button as-child variant="outline" class="w-full">
                  <NuxtLink to="/sign-in" @click="closeMenu">Sign in</NuxtLink>
                </Button>
                <Button as-child class="w-full">
                  <NuxtLink to="/sign-up" @click="closeMenu">Get started</NuxtLink>
                </Button>
              </template>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  </header>
</template>
