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
    return sprintStore.sprints.length ? "Unassigned" : null;
  }
  return sprintRangeLabel(sprintStore.selectedSprint);
});

const selectView = async (next: SprintView) => {
  if (sprintStore.view === next) return;
  sprintStore.setView(next);
  if (boardStore.projectId) await boardStore.fetchBoard(boardStore.projectId);
};
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        type="button"
        variant="outline"
        size="sm"
        class="h-8 max-w-[15rem] gap-1.5 px-2"
      >
        <TimerIcon class="h-3.5 w-3.5 text-muted-foreground" />
        <span class="min-w-0 truncate">{{ currentLabel }}</span>
        <span
          v-if="currentHint"
          class="hidden min-w-0 truncate font-normal text-muted-foreground md:inline"
        >
          · {{ currentHint }}
        </span>
        <ChevronDownIcon class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      align="start"
      class="w-[min(17rem,calc(100vw-2rem))] max-h-[min(22rem,70vh)] overflow-y-auto"
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
                ? sprintRangeLabel(sprintStore.current) ||
                  sprintStatusLabel(sprintStore.current.status)
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

      <DropdownMenuSeparator />
      <DropdownMenuItem
        v-if="sprintStore.editableSprint"
        @select="sprintStore.editOpen = true"
      >
        <CalendarIcon class="h-3.5 w-3.5" />
        Edit dates
      </DropdownMenuItem>
      <DropdownMenuItem
        v-if="sprintStore.current"
        @select="sprintStore.completeOpen = true"
      >
        Complete sprint
      </DropdownMenuItem>
      <DropdownMenuItem v-else @select="sprintStore.startOpen = true">
        <PlayIcon class="h-3.5 w-3.5" />
        Start sprint
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
