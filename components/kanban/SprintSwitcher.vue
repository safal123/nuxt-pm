<script setup lang="ts">
import {
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  HistoryIcon,
  PlayIcon,
  TimerIcon,
} from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { sprintRangeLabel, sprintStatusLabel } from "~/utils/sprints";
import type { SprintView } from "~/types";

const sprintStore = useSprintStore();
const boardStore = useBoardStore();

const currentLabel = computed(() => {
  if (sprintStore.view === "backlog") return "Backlog";
  if (sprintStore.selectedSprint) return sprintStore.selectedSprint.name;
  if (sprintStore.sprints.length) return "Backlog";
  return "All cards";
});

const currentHint = computed(() => {
  if (sprintStore.view === "backlog" || !sprintStore.selectedSprint) {
    return sprintStore.sprints.length
      ? "Unassigned cards"
      : "No sprint yet";
  }
  return (
    sprintRangeLabel(sprintStore.selectedSprint) ||
    sprintStatusLabel(sprintStore.selectedSprint.status)
  );
});

const statusMeta = computed(() => {
  if (sprintStore.view === "backlog") {
    return { label: "Backlog", live: false };
  }
  const sprint = sprintStore.selectedSprint;
  if (!sprint) {
    return {
      label: sprintStore.sprints.length ? "Backlog" : "All",
      live: false,
    };
  }
  return {
    label: sprintStatusLabel(sprint.status),
    live: sprint.status === "ACTIVE",
  };
});

const selectView = async (next: SprintView) => {
  if (sprintStore.view === next) return;
  sprintStore.setView(next);
  if (boardStore.projectId) await boardStore.fetchBoard(boardStore.projectId);
};
</script>

<template>
  <div class="flex min-w-0 items-center gap-2">
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button
          type="button"
          variant="outline"
          class="h-9 min-w-0 flex-1 justify-start gap-2 px-2 sm:max-w-sm sm:flex-none"
        >
          <span
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
          >
            <TimerIcon class="h-3.5 w-3.5" />
          </span>
          <span class="min-w-0 flex-1 text-left">
            <span class="block truncate text-sm font-medium leading-4">
              {{ currentLabel }}
            </span>
            <span
              class="mt-0.5 hidden truncate text-[11px] font-normal leading-none text-muted-foreground sm:block"
            >
              {{ currentHint }}
            </span>
          </span>
          <span
            class="hidden shrink-0 items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground sm:inline-flex"
          >
            <span
              class="h-1.5 w-1.5 rounded-full"
              :class="statusMeta.live ? 'bg-primary' : 'bg-muted-foreground/40'"
            />
            {{ statusMeta.label }}
          </span>
          <ChevronDownIcon class="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        class="w-[min(18rem,calc(100vw-2rem))] max-h-[min(22rem,70vh)] overflow-y-auto"
      >
        <DropdownMenuLabel>Sprint</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem @select="selectView('current')">
          <CheckIcon
            class="h-3.5 w-3.5"
            :class="sprintStore.view === 'current' ? 'opacity-100' : 'opacity-0'"
          />
          <span class="flex min-w-0 flex-col">
            <span>{{ sprintStore.current?.name || "Current sprint" }}</span>
            <span class="text-xs text-muted-foreground">
              {{
                sprintStore.current
                  ? sprintRangeLabel(sprintStore.current) || "In progress"
                  : sprintStore.sprints.length
                    ? "No active sprint — showing backlog"
                    : "All cards until you start one"
              }}
            </span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          v-if="sprintStore.sprints.length"
          @select="selectView('backlog')"
        >
          <CheckIcon
            class="h-3.5 w-3.5"
            :class="sprintStore.view === 'backlog' ? 'opacity-100' : 'opacity-0'"
          />
          <span class="flex min-w-0 flex-col">
            <span>Backlog</span>
            <span class="text-xs text-muted-foreground">
              Cards not in a sprint
            </span>
          </span>
        </DropdownMenuItem>

        <template v-if="sprintStore.plannedSprints.length">
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Upcoming</DropdownMenuLabel>
          <DropdownMenuItem
            v-for="sprint in sprintStore.plannedSprints"
            :key="sprint.id"
            @select="selectView(sprint.id)"
          >
            <CheckIcon
              class="h-3.5 w-3.5"
              :class="sprintStore.view === sprint.id ? 'opacity-100' : 'opacity-0'"
            />
            <span class="flex min-w-0 flex-col">
              <span class="truncate">{{ sprint.name }}</span>
              <span class="text-xs text-muted-foreground">Planned</span>
            </span>
          </DropdownMenuItem>
        </template>

        <template v-if="sprintStore.closedSprints.length">
          <DropdownMenuSeparator />
          <DropdownMenuLabel class="flex items-center gap-1.5">
            <HistoryIcon class="h-3 w-3" />
            Previous sprints
          </DropdownMenuLabel>
          <DropdownMenuItem
            v-for="sprint in sprintStore.closedSprints"
            :key="sprint.id"
            @select="selectView(sprint.id)"
          >
            <CheckIcon
              class="h-3.5 w-3.5"
              :class="sprintStore.view === sprint.id ? 'opacity-100' : 'opacity-0'"
            />
            <span class="flex min-w-0 flex-col">
              <span class="truncate">{{ sprint.name }}</span>
              <span class="text-xs text-muted-foreground">
                {{ sprintRangeLabel(sprint) || "Completed" }}
                · {{ sprint.doneCount }}/{{ sprint.taskCount }} done
              </span>
            </span>
          </DropdownMenuItem>
        </template>
      </DropdownMenuContent>
    </DropdownMenu>

    <div class="flex shrink-0 items-center gap-1">
      <Tooltip v-if="sprintStore.editableSprint">
        <TooltipTrigger as-child>
          <Button
            type="button"
            size="sm"
            variant="outline"
            class="h-9"
            aria-label="Edit sprint dates"
            @click="sprintStore.editOpen = true"
          >
            <CalendarIcon class="h-3.5 w-3.5" />
            <span class="hidden sm:inline">Dates</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Edit dates</TooltipContent>
      </Tooltip>
      <Tooltip v-if="sprintStore.current">
        <TooltipTrigger as-child>
          <Button
            type="button"
            size="sm"
            variant="outline"
            class="h-9"
            aria-label="Complete sprint"
            @click="sprintStore.completeOpen = true"
          >
            Complete
          </Button>
        </TooltipTrigger>
        <TooltipContent>Complete sprint</TooltipContent>
      </Tooltip>
      <Button
        v-else
        type="button"
        size="sm"
        class="h-9"
        aria-label="Start sprint"
        @click="sprintStore.startOpen = true"
      >
        <PlayIcon class="h-3.5 w-3.5" />
        <span class="hidden sm:inline">Start sprint</span>
        <span class="sm:hidden">Start</span>
      </Button>
    </div>
  </div>
</template>
