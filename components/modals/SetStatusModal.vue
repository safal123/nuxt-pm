<script setup lang="ts">
import { ClockIcon, SmileIcon } from "lucide-vue-next";
import { toast } from "vue-sonner";
import {
  STATUS_PRESETS,
  type StatusAvailability,
  type StatusClearAfter,
} from "~/composables/useUserStatus";

const store = useModalsStore();
const { status, saveStatus } = useUserStatus();

const open = computed(() => store.isOpen && store.modalName === "setStatus");

const availability = ref<StatusAvailability>("online");
const emoji = ref("");
const text = ref("");
const clearAfter = ref<StatusClearAfter>("never");
const saving = ref(false);

const close = (force = false) => {
  if (saving.value && !force) return;
  store.closeModal();
};

watch(open, (value) => {
  if (!value) return;
  availability.value = status.value.availability;
  emoji.value = status.value.emoji;
  text.value = status.value.text;
  clearAfter.value = status.value.clearAfter;
});

const applyPreset = (preset: (typeof STATUS_PRESETS)[number]) => {
  emoji.value = preset.emoji;
  text.value = preset.label;
};

const isPreset = (preset: (typeof STATUS_PRESETS)[number]) =>
  text.value.trim().toLowerCase() === preset.label.toLowerCase();

const onSave = async () => {
  if (saving.value) return;
  saving.value = true;
  try {
    await saveStatus({
      availability: availability.value,
      emoji: emoji.value,
      text: text.value,
      clearAfter: clearAfter.value,
    });
    close(true);
  } catch (error: any) {
    toast.error(error?.data?.message || "Could not save your status.");
  } finally {
    saving.value = false;
  }
};

const setOnline = () => {
  availability.value = "online";
  emoji.value = "";
  text.value = "";
  clearAfter.value = "never";
};

const fieldLabel = "mb-1.5 text-[12px] font-normal text-muted-foreground";
const chip =
  "flex h-8 w-full items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-left text-[12px] font-normal leading-4 text-[#1C2526] transition-colors duration-150 hover:bg-muted dark:text-foreground";
const duration =
  "h-7 rounded-md border px-2 text-[12px] font-normal text-[#1C2526] transition-colors duration-150 dark:text-foreground";
const availabilityBtn =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border px-2 text-[12px] font-normal transition-colors duration-150";
</script>

<template>
  <Dialog
    :open="open"
    @update:open="
      (value) => {
        if (!value) close();
      }
    "
  >
    <DialogContent class="max-w-[500px]">
      <DialogHeader>
        <DialogTitle>
          Set your status
        </DialogTitle>
        <DialogDescription>
          Visible to other workspace members
        </DialogDescription>
      </DialogHeader>

      <div class="mt-4">
        <p :class="fieldLabel">Availability</p>
        <div class="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            :class="[
              availabilityBtn,
              availability === 'online'
                ? 'bg-muted text-[#1C2526] dark:text-foreground'
                : 'bg-background text-muted-foreground hover:bg-muted/60',
            ]"
            @click="setOnline"
          >
            <span class="size-2 rounded-full bg-emerald-500" />
            Online
          </button>
          <button
            type="button"
            :class="[
              availabilityBtn,
              availability === 'offline'
                ? 'bg-muted text-[#1C2526] dark:text-foreground'
                : 'bg-background text-muted-foreground hover:bg-muted/60',
            ]"
            @click="availability = 'offline'"
          >
            <span class="size-2 rounded-full bg-muted-foreground/50" />
            Appear offline
          </button>
        </div>
      </div>

      <div class="mt-4">
        <p :class="fieldLabel">Status</p>
        <label
          class="flex h-8 items-center gap-2 rounded-lg border border-border bg-background px-2.5 text-[12px] text-[#1C2526] dark:text-foreground"
        >
          <span
            class="flex size-4 shrink-0 items-center justify-center text-[13px]"
          >
            {{ emoji || "" }}
            <SmileIcon v-if="!emoji" class="size-3.5 text-muted-foreground" />
          </span>
          <span class="h-3.5 w-px bg-border" />
          <Input
            v-model="text"
            maxlength="80"
            placeholder="What's your status?"
            class="h-auto border-0 bg-transparent p-0 text-[12px] font-normal shadow-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </label>
      </div>

      <div class="mt-2.5 grid grid-cols-2 gap-1.5">
        <button
          v-for="preset in STATUS_PRESETS"
          :key="preset.label"
          type="button"
          :class="[chip, isPreset(preset) ? 'bg-muted' : '']"
          @click="applyPreset(preset)"
        >
          <span class="text-[13px]">{{ preset.emoji }}</span>
          {{ preset.label }}
        </button>
      </div>

      <div class="mt-4">
        <p :class="`${fieldLabel} flex items-center gap-1.5`">
          <ClockIcon class="size-3.5" />
          Clear after
        </p>
        <div
          class="flex flex-wrap items-center gap-0.5 rounded-lg border border-border bg-muted p-1"
        >
          <button
            type="button"
            :class="[
              duration,
              clearAfter === 'never'
                ? 'border-border bg-background text-[#1C2526] shadow-sm dark:text-foreground'
                : 'border-transparent hover:bg-background/70',
            ]"
            @click="clearAfter = 'never'"
          >
            Never
          </button>
          <button
            v-for="option in [
              { id: '30m', label: '30m' },
              { id: '1h', label: '1h' },
              { id: '4h', label: '4h' },
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'Week' },
            ] as const"
            :key="option.id"
            type="button"
            :class="[
              duration,
              clearAfter === option.id
                ? 'border-border bg-background text-[#1C2526] shadow-sm dark:text-foreground'
                : 'border-transparent hover:bg-background/70',
            ]"
            @click="clearAfter = option.id"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <DialogFooter class="mt-4 sm:justify-end">
        <Button
          class="h-8 rounded-lg bg-[#1C2526] px-3 text-[12px] font-medium text-white hover:bg-[#1C2526]/90 dark:bg-foreground dark:text-background dark:hover:bg-foreground/90"
          :disabled="saving"
          @click="onSave"
        >
          {{ saving ? "Saving…" : "Save status" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
