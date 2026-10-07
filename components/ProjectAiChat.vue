<script setup lang="ts">
import {
  AlertTriangleIcon,
  ArrowUpIcon,
  CalendarClockIcon,
  CheckIcon,
  CopyIcon,
  RotateCcwIcon,
  SparklesIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-vue-next";
import { format, parseISO } from "date-fns";
import { toast } from "vue-sonner";
import { toTypedSchema } from "@vee-validate/zod";
import { aiChatMessageSchema } from "~/server/utils/schemas";
import { Button } from "@/components/ui/button";

const props = defineProps<{
  projectId: string;
  projectName: string;
}>();

const SUGGESTIONS = [
  { icon: AlertTriangleIcon, label: "What is blocked?", prompt: "What is blocked right now, and who can unblock it?" },
  { icon: CalendarClockIcon, label: "What's overdue?", prompt: "Which cards are overdue or at risk this week?" },
  { icon: TrendingUpIcon, label: "Recent progress", prompt: "What changed on this board in the last week?" },
  { icon: UsersIcon, label: "Who owns what?", prompt: "Who is working on what right now?" },
];

const aiStore = useProjectAiStore();
const userStore = useUserStore();
const scroller = ref<HTMLElement | null>(null);
const composer = ref<HTMLTextAreaElement | null>(null);
const copiedIndex = ref<number | null>(null);
const formKey = ref(0);

const messages = computed(() => aiStore.chatFor(props.projectId));
const formSchema = toTypedSchema(aiChatMessageSchema);

const userInitials = computed(() => {
  const source = userStore.user?.name || userStore.user?.email || "You";
  return source
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
});

const timeLabel = (value?: string) => {
  if (!value) return "";
  const date = parseISO(value);
  return Number.isNaN(date.getTime()) ? "" : format(date, "h:mm a");
};

const scrollToBottom = async () => {
  await nextTick();
  scroller.value?.scrollTo({ top: scroller.value.scrollHeight, behavior: "smooth" });
};

watch(() => [messages.value.length, aiStore.replying], scrollToBottom);
onMounted(scrollToBottom);

const ask = async (content: string, restore?: (value: string) => void) => {
  if (aiStore.replying) return;
  try {
    await aiStore.sendMessage(props.projectId, content);
  } catch (error: any) {
    restore?.(content);
    toast.error("The assistant could not answer", {
      description: error?.data?.message || "Please try again.",
    });
  }
};

async function onSubmit(values: any, { resetForm, setFieldValue }: any) {
  resetForm({ values: { content: "" } });
  if (composer.value) composer.value.style.height = "auto";
  await ask(values.content, (value) => setFieldValue("content", value));
}

const onKeydown = (event: KeyboardEvent, submit: () => void) => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    submit();
  }
};

const autoGrow = (event: Event) => {
  const el = event.target as HTMLTextAreaElement;
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
};

const copy = async (content: string, index: number) => {
  try {
    await navigator.clipboard.writeText(content);
    copiedIndex.value = index;
    setTimeout(() => {
      if (copiedIndex.value === index) copiedIndex.value = null;
    }, 1500);
  } catch {
    toast.error("Could not copy");
  }
};

const clearing = ref(false);

const newChat = async () => {
  if (clearing.value) return;
  clearing.value = true;
  try {
    await aiStore.clearChat(props.projectId);
    formKey.value += 1;
  } catch (error: any) {
    toast.error("Could not clear the chat", {
      description: error?.data?.message || "Please try again.",
    });
  } finally {
    clearing.value = false;
  }
};
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div ref="scroller" class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
      <!-- Empty state -->
      <div
        v-if="!messages.length"
        class="flex min-h-full flex-col items-center justify-center gap-3 text-center"
      >
        <div
          class="flex size-8 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground"
        >
          <SparklesIcon class="size-3.5" />
        </div>
        <div class="space-y-0.5">
          <p class="text-[13px] font-semibold text-foreground">
            Ask anything about {{ projectName }}
          </p>
          <p class="mx-auto max-w-xs text-[12px] text-muted-foreground">
            I read the cards, comments, sprints, and activity on this board.
          </p>
        </div>
        <div class="grid w-full grid-cols-2 gap-1.5">
          <button
            v-for="item in SUGGESTIONS"
            :key="item.label"
            type="button"
            class="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2 text-left text-[12px] transition hover:bg-muted disabled:opacity-50"
            :disabled="aiStore.replying"
            @click="ask(item.prompt)"
          >
            <span
              class="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
            >
              <component :is="item.icon" class="size-3.5" />
            </span>
            <span class="font-medium text-foreground">{{ item.label }}</span>
          </button>
        </div>
      </div>

      <!-- Conversation -->
      <div v-else class="space-y-3">
        <div
          v-for="(message, index) in messages"
          :key="message.id ?? `pending-${index}`"
          class="flex gap-2"
          :class="message.role === 'user' ? 'flex-row-reverse' : ''"
        >
          <span
            v-if="message.role === 'assistant'"
            class="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground"
          >
            <SparklesIcon class="size-3.5" />
          </span>
          <span
            v-else
            class="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-[11px] font-semibold text-muted-foreground"
          >
            <img
              v-if="userStore.user?.imageUrl || userStore.user?.image"
              :src="userStore.user?.imageUrl || userStore.user?.image || ''"
              alt=""
              class="size-full object-cover"
            />
            <span v-else>{{ userInitials }}</span>
          </span>

          <div
            class="group flex min-w-0 max-w-[85%] flex-col gap-0.5"
            :class="message.role === 'user' ? 'items-end' : 'items-start'"
          >
            <div class="flex items-center gap-1.5 px-0.5 text-[11px] text-muted-foreground">
              <span class="font-medium text-foreground">
                {{ message.role === "user" ? "You" : "Northstar AI" }}
              </span>
              <span v-if="timeLabel(message.at)">{{ timeLabel(message.at) }}</span>
            </div>

            <div
              v-if="message.role === 'user'"
              class="whitespace-pre-wrap rounded-xl rounded-tr-md bg-foreground px-3 py-2 text-[13px] leading-5 text-background"
            >
              {{ message.content }}
            </div>
            <div
              v-else
              class="rounded-xl rounded-tl-md border border-border bg-card px-3 py-2 text-foreground"
            >
              <ChatMarkdown :content="message.content" />
            </div>

            <button
              v-if="message.role === 'assistant'"
              type="button"
              class="flex items-center gap-1 rounded-md px-1 py-0.5 text-[11px] text-muted-foreground opacity-0 transition hover:bg-muted hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
              @click="copy(message.content, index)"
            >
              <CheckIcon v-if="copiedIndex === index" class="size-3 text-emerald-500" />
              <CopyIcon v-else class="size-3" />
              {{ copiedIndex === index ? "Copied" : "Copy" }}
            </button>
          </div>
        </div>

        <div v-if="aiStore.replying" class="flex gap-2">
          <span
            class="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground"
          >
            <SparklesIcon class="size-3.5 animate-pulse" />
          </span>
          <div
            class="flex items-center gap-1 rounded-xl rounded-tl-md border border-border bg-card px-3 py-2"
            aria-label="Thinking"
          >
            <span class="size-1 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.3s]" />
            <span class="size-1 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.15s]" />
            <span class="size-1 animate-bounce rounded-full bg-muted-foreground/70" />
          </div>
        </div>
      </div>
    </div>

    <!-- Composer -->
    <div class="border-t border-border px-4 py-2">
      <Form
        :key="formKey"
        v-slot="{ handleSubmit, values }"
        as=""
        :validation-schema="formSchema"
        :initial-values="{ content: '' }"
      >
        <form @submit="handleSubmit($event, onSubmit)">
          <FormField v-slot="{ field }" name="content">
            <FormItem>
              <div
                class="flex items-end gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1"
              >
                <FormControl>
                  <textarea
                    ref="composer"
                    v-bind="field"
                    rows="1"
                    placeholder="Ask about progress, blockers, owners…"
                    class="max-h-32 min-h-7 flex-1 resize-none bg-transparent py-1 text-[12px] leading-5 text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
                    :disabled="aiStore.replying"
                    @input="autoGrow"
                    @keydown="onKeydown($event, () => handleSubmit(onSubmit)())"
                  />
                </FormControl>
                <Button
                  type="submit"
                  size="icon"
                  class="size-7 shrink-0"
                  :disabled="aiStore.replying || !String(values.content ?? '').trim()"
                  aria-label="Send"
                >
                  <ArrowUpIcon class="size-3.5" />
                </Button>
              </div>
              <FormMessage class="px-1" />
            </FormItem>
          </FormField>
        </form>
      </Form>
      <div class="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          <kbd class="rounded border border-border bg-muted px-1 font-sans">Enter</kbd>
          to send ·
          <kbd class="rounded border border-border bg-muted px-1 font-sans">Shift</kbd>
          +
          <kbd class="rounded border border-border bg-muted px-1 font-sans">Enter</kbd>
          new line
        </span>
        <button
          v-if="messages.length"
          type="button"
          class="flex items-center gap-1 rounded-md px-1 py-0.5 transition hover:bg-muted hover:text-foreground disabled:opacity-50"
          :disabled="aiStore.replying || clearing"
          @click="newChat"
        >
          <RotateCcwIcon class="size-3" />
          Clear chat
        </button>
      </div>
    </div>
  </div>
</template>
