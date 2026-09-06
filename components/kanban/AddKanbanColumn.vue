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
        class="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        @keyup.enter="submit"
        @keyup.esc="cancel"
        @blur="submit"
      />
    </div>
    <button
      v-else
      type="button"
      class="w-full min-h-[2.75rem] flex items-center justify-center gap-1.5 rounded-xl bg-muted/80 border border-dashed border-border text-[13px] font-medium text-muted-foreground hover:border-foreground/20 hover:bg-accent hover:text-accent-foreground px-3 py-2 transition"
      @click="startAdding"
    >
      <PlusIcon class="h-4 w-4" />
      Add column
    </button>
  </div>
</template>
