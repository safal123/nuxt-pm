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

const selectView = async (next: SprintView) => {
  if (sprintStore.view === next) return;
  sprintStore.setView(next);
  if (boardStore.projectId) await boardStore.fetchBoard(boardStore.projectId);
};
</script>

<template>
  <div class="flex flex-wrap items-center gap-1.5">
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button type="button" size="sm" variant="outline" class="max-w-full">
          <TimerIcon class="h-3.5 w-3.5" />
          <span class="truncate">{{ currentLabel }}</span>
          <span
            v-if="currentHint"
            class="hidden text-xs font-normal text-muted-foreground sm:inline"
          >
            · {{ currentHint }}
          </span>
          <ChevronDownIcon class="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" class="w-64">
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

    <Button
      v-if="sprintStore.editableSprint"
      type="button"
      size="sm"
      variant="outline"
      @click="sprintStore.editOpen = true"
    >
      <CalendarIcon class="h-3.5 w-3.5" />
      Dates
    </Button>
    <Button
      v-if="sprintStore.current"
      type="button"
      size="sm"
      variant="outline"
      @click="sprintStore.completeOpen = true"
    >
      Complete
    </Button>
    <Button
      v-else
      type="button"
      size="sm"
      @click="sprintStore.startOpen = true"
    >
      <PlayIcon class="h-3.5 w-3.5" />
      Start sprint
    </Button>
  </div>
</template>
