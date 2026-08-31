<script setup lang="ts">
import { Search } from 'lucide-vue-next'
const search = ref('')
</script>

<template>
  <form @submit.prevent>
    <SidebarGroup class="py-0">
      <SidebarGroupContent class="relative">
        <Label for="search" class="sr-only">Search</Label>
        <SidebarInput
          id="search"
          v-model="search"
          placeholder="Search the docs..."
          class="pl-8"
        />
        <Search
          class="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 select-none opacity-50"/>
      </SidebarGroupContent>
    </SidebarGroup>
  </form>
</template>

