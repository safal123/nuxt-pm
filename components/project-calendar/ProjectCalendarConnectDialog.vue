<script setup lang="ts">
import { CheckIcon, Loader2Icon, ShieldCheckIcon } from "lucide-vue-next";
import { toast } from "vue-sonner";
import { cn } from "@/lib/utils";
import { authClient } from "~/lib/auth-client";
import type { GoogleCalendarSummary } from "~/types";
import { TASK_COLORS } from "~/utils/task-colors";
import {
  CALENDAR_CONNECTION_DEFAULT_COLOR,
  GOOGLE_CALENDAR_SCOPE,
} from "~/utils/calendar";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ "update:open": [value: boolean] }>();

type Step = "loading" | "unavailable" | "authorize" | "pick";

const calendarStore = useCalendarStore();
const route = useRoute();

const step = ref<Step>("loading");
const calendars = ref<GoogleCalendarSummary[]>([]);
const selectedId = ref<string | null>(null);
const color = ref(CALENDAR_CONNECTION_DEFAULT_COLOR);
const redirecting = ref(false);
const connecting = ref(false);

const connectedIds = computed(
  () =>
    new Set(
      calendarStore.connections
        .filter((item) => item.provider === "GOOGLE")
        .map((item) => item.externalCalendarId),
    ),
);

const isAdded = (calendar: GoogleCalendarSummary) => connectedIds.value.has(calendar.id);

const load = async () => {
  step.value = "loading";
  selectedId.value = null;
  try {
    const status = await calendarStore.fetchGoogleStatus();
    if (!status.available) {
      step.value = "unavailable";
      return;
    }
    if (!status.authorized) {
      step.value = "authorize";
      return;
    }
    calendars.value = await calendarStore.fetchGoogleCalendars();
    selectedId.value = calendars.value.find((item) => !isAdded(item))?.id ?? null;
    step.value = "pick";
  } catch (error: any) {
    // 409 means the Google grant is missing or no longer refreshes.
    if ((error?.statusCode ?? error?.status) === 409) {
      step.value = "authorize";
      return;
    }
    toast.error(error?.data?.message || "Could not reach Google Calendar.");
    emit("update:open", false);
  }
};

watch(
  () => props.open,
  (open) => {
    if (open) load();
  },
  { immediate: true },
);

const authorize = async () => {
  redirecting.value = true;
  const { error } = await authClient.linkSocial({
    provider: "google",
    scopes: [GOOGLE_CALENDAR_SCOPE],
    callbackURL: `${route.path}?calendarConnect=google`,
    errorCallbackURL: `${route.path}?calendarConnect=error`,
    // Offline access is what gives us a refresh token; consent forces Google
    // to issue one even when the account was linked before.
    additionalParams: { access_type: "offline", prompt: "consent" },
  });
  if (error) {
    redirecting.value = false;
    toast.error(error.message || "Could not start Google sign-in.");
  }
};

const connect = async () => {
  if (!selectedId.value) return;
  connecting.value = true;
  try {
    const connection = await calendarStore.connectGoogleCalendar({
      calendarId: selectedId.value,
      color: color.value,
    });
    if (connection.lastError) toast.warning(`Connected, but the first sync failed: ${connection.lastError}`);
    else toast.success(`"${connection.name}" is now on this calendar.`);
    emit("update:open", false);
  } catch (error: any) {
    toast.error(error?.data?.message || "Could not connect that calendar.");
  } finally {
    connecting.value = false;
  }
};
</script>

<template>
  <Dialog :open="open" @update:open="(value) => emit('update:open', value)">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <span
            class="flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-white"
            style="background-color: #4285f4"
          >G</span>
          Connect Google Calendar
        </DialogTitle>
        <DialogDescription>
          Events from the calendar you pick show up here, read-only, for everyone on this project.
        </DialogDescription>
      </DialogHeader>

      <div v-if="step === 'loading'" class="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2Icon class="h-5 w-5 animate-spin" />
      </div>

      <p v-else-if="step === 'unavailable'" class="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        Google sign-in is not configured on this server yet.
      </p>

      <div v-else-if="step === 'authorize'" class="space-y-4">
        <div class="flex gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
          <ShieldCheckIcon class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p class="text-muted-foreground">
            Google will ask you to allow <span class="font-medium text-foreground">read-only</span>
            access to your calendars. Nothing is written back to Google.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="emit('update:open', false)">Cancel</Button>
          <Button :disabled="redirecting" @click="authorize">
            <Loader2Icon v-if="redirecting" class="mr-2 h-4 w-4 animate-spin" />
            Continue with Google
          </Button>
        </DialogFooter>
      </div>

      <div v-else class="space-y-4">
        <div class="max-h-64 space-y-1 overflow-y-auto">
          <p v-if="!calendars.length" class="py-6 text-center text-sm text-muted-foreground">
            No calendars found on this Google account.
          </p>
          <button
            v-for="calendar in calendars"
            :key="calendar.id"
            type="button"
            :disabled="isAdded(calendar)"
            :class="cn(
              'flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors',
              selectedId === calendar.id ? 'border-primary bg-accent' : 'border-transparent hover:bg-accent',
              isAdded(calendar) && 'cursor-not-allowed opacity-60 hover:bg-transparent',
            )"
            @click="selectedId = calendar.id"
          >
            <span
              class="h-3 w-3 shrink-0 rounded-full"
              :style="{ backgroundColor: calendar.color || '#4285f4' }"
            />
            <span class="min-w-0 flex-1 truncate font-medium">{{ calendar.name }}</span>
            <Badge v-if="calendar.primary" variant="secondary" class="text-[10px]">Primary</Badge>
            <span v-if="isAdded(calendar)" class="text-xs text-muted-foreground">Added</span>
            <CheckIcon v-else-if="selectedId === calendar.id" class="h-4 w-4" />
          </button>
        </div>

        <div class="space-y-2">
          <p class="text-xs font-medium text-muted-foreground">Colour on this calendar</p>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="option in TASK_COLORS"
              :key="option.id"
              type="button"
              :title="option.name"
              :class="cn(
                'flex h-6 w-6 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition',
                color === option.id && 'ring-2 ring-foreground',
              )"
              :style="{ backgroundColor: option.value }"
              @click="color = option.id"
            >
              <CheckIcon v-if="color === option.id" class="h-3.5 w-3.5 text-white" />
            </button>
          </div>
        </div>

        <DialogFooter class="items-center sm:justify-between">
          <Button
            variant="link"
            size="sm"
            class="h-auto px-0 text-xs text-muted-foreground"
            :disabled="redirecting"
            @click="authorize"
          >
            Re-authorize Google
          </Button>
          <div class="flex gap-2">
            <Button variant="outline" @click="emit('update:open', false)">Cancel</Button>
            <Button :disabled="!selectedId || connecting" @click="connect">
            <Loader2Icon v-if="connecting" class="mr-2 h-4 w-4 animate-spin" />
              Connect calendar
            </Button>
          </div>
        </DialogFooter>
      </div>
    </DialogContent>
  </Dialog>
</template>
