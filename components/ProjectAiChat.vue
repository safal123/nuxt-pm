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
  <div class="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-primary/[0.04] via-background to-background">
    <div ref="scroller" class="min-h-0 flex-1 overflow-y-auto px-5 py-6">
      <!-- Empty state -->
      <div
        v-if="!messages.length"
        class="flex min-h-full flex-col items-center justify-center gap-6 text-center"
      >
        <div class="relative">
          <div class="absolute inset-0 rounded-2xl bg-primary/30 blur-xl" aria-hidden="true" />
          <div
            class="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25"
          >
            <SparklesIcon class="h-6 w-6" />
          </div>
        </div>
        <div class="space-y-1.5">
          <p class="text-base font-semibold text-foreground">
            Ask anything about {{ projectName }}
          </p>
          <p class="mx-auto max-w-xs text-sm text-muted-foreground">
            I read the cards, comments, sprints, and activity on this board.
          </p>
        </div>
        <div class="grid w-full max-w-md grid-cols-2 gap-2">
          <button
            v-for="item in SUGGESTIONS"
            :key="item.label"
            type="button"
            class="group flex items-center gap-2.5 rounded-xl border border-border bg-card/80 px-3 py-2.5 text-left text-sm shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md disabled:opacity-50 "
            :disabled="aiStore.replying"
            @click="ask(item.prompt)"
          >
            <span
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground"
            >
              <component :is="item.icon" class="h-3.5 w-3.5" />
            </span>
            <span class="font-medium text-foreground">{{ item.label }}</span>
          </button>
        </div>
      </div>

      <!-- Conversation -->
      <div v-else class="space-y-6">
        <div
          v-for="(message, index) in messages"
          :key="message.id ?? `pending-${index}`"
          class="flex gap-3"
          :class="message.role === 'user' ? 'flex-row-reverse' : ''"
        >
          <span
            v-if="message.role === 'assistant'"
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/30"
          >
            <SparklesIcon class="h-4 w-4" />
          </span>
          <span
            v-else
            class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-[11px] font-semibold text-muted-foreground"
          >
            <img
              v-if="userStore.user?.imageUrl || userStore.user?.image"
              :src="userStore.user?.imageUrl || userStore.user?.image || ''"
              alt=""
              class="h-full w-full object-cover"
            />
            <span v-else>{{ userInitials }}</span>
          </span>

          <div
            class="group flex min-w-0 max-w-[85%] flex-col gap-1"
            :class="message.role === 'user' ? 'items-end' : 'items-start'"
          >
            <div class="flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
              <span class="font-medium text-foreground/80">
                {{ message.role === "user" ? "You" : "Northstar AI" }}
              </span>
              <span v-if="timeLabel(message.at)">{{ timeLabel(message.at) }}</span>
            </div>

            <div
              v-if="message.role === 'user'"
              class="whitespace-pre-wrap rounded-2xl rounded-tr-md bg-primary px-4 py-2.5 text-sm leading-6 text-primary-foreground shadow-sm shadow-primary/20"
            >
              {{ message.content }}
            </div>
            <div
              v-else
              class="rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3 text-foreground/90 shadow-sm"
            >
              <ChatMarkdown :content="message.content" />
            </div>

            <button
              v-if="message.role === 'assistant'"
              type="button"
              class="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground opacity-0 transition hover:bg-accent hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
              @click="copy(message.content, index)"
            >
              <CheckIcon v-if="copiedIndex === index" class="h-3 w-3 text-emerald-500" />
              <CopyIcon v-else class="h-3 w-3" />
              {{ copiedIndex === index ? "Copied" : "Copy" }}
            </button>
          </div>
        </div>

        <div v-if="aiStore.replying" class="flex gap-3">
          <span
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/30"
          >
            <SparklesIcon class="h-4 w-4 animate-pulse" />
          </span>
          <div
            class="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3.5 shadow-sm"
            aria-label="Thinking"
          >
            <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:-0.3s]" />
            <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:-0.15s]" />
            <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70" />
          </div>
        </div>
      </div>
    </div>

    <!-- Composer -->
    <div class="border-t border-border/60 bg-background/80 px-4 pb-4 pt-3 backdrop-blur">
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
                class="flex items-end gap-2 rounded-2xl border border-border bg-card p-1.5 pl-3.5 shadow-sm transition focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/10"
              >
                <FormControl>
                  <textarea
                    ref="composer"
                    v-bind="field"
                    rows="1"
                    placeholder="Ask about progress, blockers, owners…"
                    class="max-h-40 min-h-[36px] flex-1 resize-none bg-transparent py-2 text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
                    :disabled="aiStore.replying"
                    @input="autoGrow"
                    @keydown="onKeydown($event, () => handleSubmit(onSubmit)())"
                  />
                </FormControl>
                <Button
                  type="submit"
                  size="icon"
                  class="h-9 w-9 shrink-0 rounded-xl bg-primary text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-40"
                  :disabled="aiStore.replying || !String(values.content ?? '').trim()"
                  aria-label="Send"
                >
                  <ArrowUpIcon class="h-4 w-4" />
                </Button>
              </div>
              <FormMessage class="px-1" />
            </FormItem>
          </FormField>
        </form>
      </Form>
      <div class="mt-2 flex items-center justify-between px-1 text-[11px] text-muted-foreground">
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
          class="flex items-center gap-1 rounded-md px-1.5 py-0.5 transition hover:bg-accent hover:text-foreground disabled:opacity-50"
          :disabled="aiStore.replying || clearing"
          @click="newChat"
        >
          <RotateCcwIcon class="h-3 w-3" />
          Clear chat
        </button>
      </div>
    </div>
  </div>
</template>
