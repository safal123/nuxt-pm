<script setup lang="ts">
</script>

<template>
  <header>
    <div class="border-b mx-auto h-16 box-shadow bg-white dark:bg-gray-800">
      <div class="container flex justify-between items-center h-full">
        <div class="flex items-center">
          <nuxt-link to="/" class="text-xl font-bold">Nuxt Auth</nuxt-link>
        </div>
        <ClerkLoaded>
          <SignedOut>
            <Button>
              <SignInButton/>
            </Button>
          </SignedOut>

          <SignedIn>
            <Button variant="link">
              <UserButton
                sign-in-url="/sign-in"
              />
            </Button>
          </SignedIn>
        </ClerkLoaded>
      </div>
    </div>
  </header>
</template>
