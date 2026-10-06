<script setup lang="ts">
import {
  CheckCircle2Icon,
  CircleDashedIcon,
  ListFilterIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  UserIcon,
  XIcon,
} from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TASK_PRIORITIES } from "@/utils/task-priority";
import type { BoardSort, DueFilter } from "~/utils/board-query";

const DUE_OPTIONS: { id: DueFilter; label: string }[] = [
  { id: "overdue", label: "Overdue" },
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "none", label: "No date" },
];

const SORT_OPTIONS: { id: BoardSort; label: string; hint: string }[] = [
  { id: "board", label: "Board order", hint: "As lists are arranged" },
  { id: "due", label: "Due date", hint: "Soonest first" },
  { id: "priority", label: "Priority", hint: "Urgent first" },
  { id: "newest", label: "Recently updated", hint: "Latest changes" },
  { id: "title", label: "Title", hint: "A to Z" },
];

const {
  query,
  matchCount,
  totalCount,
  isFiltered,
  filterCount,
  canDrag,
  clear,
  setSearch,
  toggleDue,
  toggleAssignee,
  toggleCompletion,
  togglePriority,
  toggleLabel,
  setSort,
} = useBoardQuery();

const boardStore = useBoardStore();
const sprintStore = useSprintStore();
const searchWrap = ref<HTMLElement | null>(null);

const labels = computed(() => boardStore.projectLabels || []);

const onSort = (value: string) => {
  if (
    value === "board" ||
    value === "due" ||
    value === "priority" ||
    value === "newest" ||
    value === "title"
  ) {
    setSort(value);
  }
};

const onKey = (event: KeyboardEvent) => {
  if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }
  const target = event.target as HTMLElement | null;
  if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
    return;
  }
  event.preventDefault();
  searchWrap.value?.querySelector("input")?.focus();
};

onMounted(() => window.addEventListener("keydown", onKey));
onBeforeUnmount(() => window.removeEventListener("keydown", onKey));
</script>

<template>
  <div class="mb-3 flex min-w-0 items-start gap-1.5">
    <div class="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
      <SprintSwitcher />

      <div ref="searchWrap" class="relative min-w-[8rem] max-w-md flex-1">
        <SearchIcon
          class="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          :model-value="query.search"
          placeholder="Search cards…"
          class="h-8 pl-7 pr-8"
          @update:model-value="setSearch(String($event))"
        />
        <kbd
          class="pointer-events-none absolute right-1.5 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-muted px-1 text-[10px] font-medium text-muted-foreground sm:inline"
        >
          /
        </kbd>
      </div>

      <Popover>
        <PopoverTrigger as-child>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Filters"
          >
            <ListFilterIcon />
            <span
              v-if="filterCount"
              class="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] text-background"
            >
              {{ filterCount }}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          class="w-[min(18rem,calc(100vw-2rem))] rounded-xl p-3"
          align="end"
        >
          <div class="space-y-3">
            <div>
              <p class="mb-1.5 text-[12px] font-medium text-muted-foreground">
                Quick
              </p>
              <div class="flex flex-wrap gap-1">
                <Button
                  type="button"
                  size="xs"
                  :variant="query.assignee === 'me' ? 'secondary' : 'outline'"
                  @click="toggleAssignee('me')"
                >
                  <UserIcon />
                  Assigned to me
                </Button>
                <Button
                  type="button"
                  size="xs"
                  :variant="query.completion === 'open' ? 'secondary' : 'outline'"
                  @click="toggleCompletion('open')"
                >
                  <CircleDashedIcon />
                  Incomplete
                </Button>
                <Button
                  type="button"
                  size="xs"
                  :variant="query.completion === 'done' ? 'secondary' : 'outline'"
                  @click="toggleCompletion('done')"
                >
                  <CheckCircle2Icon />
                  Completed
                </Button>
              </div>
            </div>

            <div>
              <p class="mb-1.5 text-[12px] font-medium text-muted-foreground">
                Due date
              </p>
              <div class="flex flex-wrap gap-1">
                <Button
                  v-for="item in DUE_OPTIONS"
                  :key="item.id"
                  type="button"
                  size="xs"
                  :variant="query.due === item.id ? 'secondary' : 'outline'"
                  @click="toggleDue(item.id)"
                >
                  {{ item.label }}
                </Button>
              </div>
            </div>

            <div>
              <p class="mb-1.5 text-[12px] font-medium text-muted-foreground">
                Assignee
              </p>
              <div class="flex flex-wrap gap-1">
                <Button
                  type="button"
                  size="xs"
                  :variant="query.assignee === 'unassigned' ? 'secondary' : 'outline'"
                  @click="toggleAssignee('unassigned')"
                >
                  Unassigned
                </Button>
              </div>
            </div>

            <div>
              <p class="mb-1.5 text-[12px] font-medium text-muted-foreground">
                Priority
              </p>
              <div class="flex flex-wrap gap-1">
                <Button
                  v-for="item in TASK_PRIORITIES"
                  :key="item.id"
                  type="button"
                  size="xs"
                  :variant="
                    query.priorities.includes(item.id) ? 'secondary' : 'outline'
                  "
                  @click="togglePriority(item.id)"
                >
                  {{ item.label }}
                </Button>
              </div>
            </div>

            <div v-if="labels.length">
              <p class="mb-1.5 text-[12px] font-medium text-muted-foreground">
                Labels
              </p>
              <div class="flex flex-wrap gap-1">
                <Button
                  v-for="label in labels"
                  :key="label.id"
                  type="button"
                  size="xs"
                  :variant="
                    query.labelIds.includes(label.id) ? 'secondary' : 'outline'
                  "
                  @click="toggleLabel(label.id)"
                >
                  <span
                    class="size-2 rounded-full"
                    :style="{ backgroundColor: label.color }"
                  />
                  {{ label.name }}
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Sort cards"
          >
            <SlidersHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent class="w-56" align="end">
          <DropdownMenuLabel>Sort cards</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            :model-value="query.sort"
            @update:model-value="onSort"
          >
            <DropdownMenuRadioItem
              v-for="item in SORT_OPTIONS"
              :key="item.id"
              :value="item.id"
            >
              <span class="flex flex-col">
                <span>{{ item.label }}</span>
                <span class="text-[11px] text-muted-foreground">{{ item.hint }}</span>
              </span>
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <p
        v-if="isFiltered || sprintStore.viewingClosed || !canDrag"
        class="flex min-w-0 flex-1 basis-full items-center gap-2 text-[12px] text-muted-foreground sm:basis-auto sm:justify-end"
      >
        <span v-if="isFiltered">{{ matchCount }} of {{ totalCount }}</span>
        <span v-else-if="sprintStore.viewingClosed">Previous sprint</span>
        <span v-else>Drag is off while sorted</span>
        <Button
          v-if="isFiltered"
          type="button"
          variant="ghost"
          size="xs"
          @click="clear"
        >
          <XIcon />
          Clear
        </Button>
      </p>
    </div>

    <ProjectViewTabs />
  </div>
</template>
