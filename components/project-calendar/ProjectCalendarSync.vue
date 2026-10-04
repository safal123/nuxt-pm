<script setup lang="ts">
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircleIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-vue-next";
import { toast } from "vue-sonner";
import type { CalendarConnection } from "~/types";
import { colorValue } from "~/utils/task-colors";
import { CALENDAR_CONNECTION_DEFAULT_COLOR } from "~/utils/calendar";
import ProjectCalendarConnectDialog from "./ProjectCalendarConnectDialog.vue";

const connectOpen = defineModel<boolean>("connectOpen", { default: false });

const calendarStore = useCalendarStore();
const userStore = useUserStore();
const workspaceStore = useWorkspaceStore();

const busyId = ref<string | null>(null);

const googleConnections = computed(() =>
  calendarStore.connections.filter((item) => item.provider === "GOOGLE"),
);

const canManage = (connection: CalendarConnection) =>
  connection.userId === userStore.user?.id ||
  workspaceStore.activeWorkspace?.createdBy === userStore.user?.id;

const syncedLabel = (connection: CalendarConnection) =>
  connection.lastSyncedAt
    ? `Synced ${formatDistanceToNow(new Date(connection.lastSyncedAt), { addSuffix: true })}`
    : "Not synced yet";

const sync = async (connection: CalendarConnection) => {
  busyId.value = connection.id;
  try {
    const updated = await calendarStore.syncConnection(connection.id);
    if (updated.lastError) toast.error(updated.lastError);
    else toast.success(`"${updated.name}" is up to date.`);
  } catch (error: any) {
    toast.error(error?.data?.message || "Could not sync this calendar.");
  } finally {
    busyId.value = null;
  }
};

const disconnect = async (connection: CalendarConnection) => {
  if (!window.confirm(`Remove "${connection.name}" and its events from this project calendar?`)) return;
  busyId.value = connection.id;
  try {
    await calendarStore.disconnect(connection.id);
    toast.success(`"${connection.name}" removed.`);
  } catch (error: any) {
    toast.error(error?.data?.message || "Could not remove this calendar.");
  } finally {
    busyId.value = null;
  }
};
</script>

<template>
  <section class="space-y-2 p-4">
    <p class="text-xs font-semibold text-muted-foreground">Sync</p>

    <div class="rounded-lg border border-border bg-background">
      <div class="flex items-center gap-3 px-3 py-2.5">
        <span
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-bold text-white"
          style="background-color: #4285f4"
        >G</span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-medium leading-tight">Google Calendar</span>
          <span class="block text-xs text-muted-foreground">
            {{ googleConnections.length ? `${googleConnections.length} connected` : "Read-only import" }}
          </span>
        </span>
        <Button
          variant="outline"
          size="sm"
          class="h-7 px-2.5 text-xs"
          @click="connectOpen = true"
        >
          <PlusIcon v-if="googleConnections.length" class="mr-1 h-3 w-3" />
          {{ googleConnections.length ? "Add" : "Connect" }}
        </Button>
      </div>

      <ul v-if="googleConnections.length" class="border-t border-border py-1">
        <li
          v-for="connection in googleConnections"
          :key="connection.id"
          class="group flex items-center gap-2 px-3 py-1.5"
        >
          <span
            class="h-2.5 w-2.5 shrink-0 rounded-full"
            :style="{ backgroundColor: colorValue(connection.color ?? CALENDAR_CONNECTION_DEFAULT_COLOR) }"
          />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-xs font-medium">{{ connection.name }}</span>
            <span
              v-if="connection.lastError"
              class="flex items-center gap-1 truncate text-[11px] text-destructive"
              :title="connection.lastError"
            >
              <AlertCircleIcon class="h-3 w-3 shrink-0" />
              Sync failed
            </span>
            <span v-else class="block truncate text-[11px] text-muted-foreground">
              {{ syncedLabel(connection) }}
            </span>
          </span>
          <Loader2Icon v-if="busyId === connection.id" class="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          <DropdownMenu v-else>
            <DropdownMenuTrigger as-child>
              <Button variant="ghost" size="icon" class="h-6 w-6" :title="`${connection.name} options`">
                <MoreHorizontalIcon class="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-44">
              <DropdownMenuItem @click="sync(connection)">
                <RefreshCwIcon class="mr-2 h-3.5 w-3.5" />
                Sync now
              </DropdownMenuItem>
              <DropdownMenuItem v-if="connection.lastError" @click="connectOpen = true">
                <AlertCircleIcon class="mr-2 h-3.5 w-3.5" />
                Reconnect Google
              </DropdownMenuItem>
              <DropdownMenuItem
                v-if="canManage(connection)"
                class="text-destructive focus:text-destructive"
                @click="disconnect(connection)"
              >
                <Trash2Icon class="mr-2 h-3.5 w-3.5" />
                Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </li>
      </ul>
    </div>

    <div class="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
      <span
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-bold text-white"
        style="background-color: #0078d4"
      >O</span>
      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-medium leading-tight">Microsoft Outlook</span>
        <span class="block text-xs text-muted-foreground">Coming soon</span>
      </span>
      <Button variant="outline" size="sm" class="h-7 px-2.5 text-xs" disabled>
        Connect
      </Button>
    </div>

    <ProjectCalendarConnectDialog v-model:open="connectOpen" />
  </section>
</template>
