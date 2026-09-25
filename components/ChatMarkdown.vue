<script setup lang="ts">
import { parseChatMarkdown, type InlineToken } from "@/utils/chat-markdown";

const props = defineProps<{ content: string }>();

const blocks = computed(() => parseChatMarkdown(props.content));

const tokenClass = (token: InlineToken) => [
  token.bold && "font-semibold text-foreground",
  token.italic && "italic",
  token.code &&
    "rounded bg-muted px-1 py-0.5 font-mono text-[12px] text-foreground",
];
</script>

<template>
  <div class="space-y-2.5 text-sm leading-6">
    <template v-for="(block, index) in blocks" :key="index">
      <p
        v-if="block.type === 'heading'"
        class="pt-1 text-[13px] font-semibold text-foreground"
      >
        <span v-for="(token, i) in block.inline" :key="i" :class="tokenClass(token)">{{
          token.text
        }}</span>
      </p>

      <p v-else-if="block.type === 'paragraph'">
        <span v-for="(token, i) in block.inline" :key="i" :class="tokenClass(token)">{{
          token.text
        }}</span>
      </p>

      <component
        :is="block.ordered ? 'ol' : 'ul'"
        v-else
        class="space-y-1.5"
      >
        <li
          v-for="(item, itemIndex) in block.items"
          :key="itemIndex"
          class="flex gap-2.5"
        >
          <span
            v-if="block.ordered"
            class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary"
          >
            {{ itemIndex + 1 }}
          </span>
          <span
            v-else
            class="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70"
          />
          <span class="min-w-0">
            <span v-for="(token, i) in item" :key="i" :class="tokenClass(token)">{{
              token.text
            }}</span>
          </span>
        </li>
      </component>
    </template>
  </div>
</template>
