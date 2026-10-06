<script setup lang="ts">
import { PlusIcon } from "lucide-vue-next";

const emit = defineEmits<{
  (e: "add", name: string): void;
}>();

const isAdding = ref(false);
const name = ref("");
const inputRef = ref<HTMLInputElement | null>(null);

const startAdding = async () => {
  isAdding.value = true;
  await nextTick();
  inputRef.value?.focus();
};

const submit = () => {
  const next = name.value.trim();
  if (next) emit("add", next);
  name.value = "";
  isAdding.value = false;
};

const cancel = () => {
  name.value = "";
  isAdding.value = false;
};
</script>

<template>
  <div class="w-72 shrink-0">
    <div v-if="isAdding" class="rounded-xl border border-border bg-card p-2 shadow-sm">
      <input
        ref="inputRef"
        v-model="name"
        placeholder="Column name"
        class="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-[12px] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        @keyup.enter="submit"
        @keyup.esc="cancel"
        @blur="submit"
      />
    </div>
    <button
      v-else
      type="button"
      class="flex min-h-8 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-muted/80 px-3 py-2 text-[12px] font-medium text-muted-foreground transition hover:border-foreground/20 hover:bg-accent hover:text-accent-foreground"
      @click="startAdding"
    >
      <PlusIcon class="size-3.5" />
      Add column
    </button>
  </div>
</template>
