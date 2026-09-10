import type { TaskColumn, TaskPriority } from "~/types";
import {
  boardFilterCount,
  defaultBoardQuery,
  filterBoardColumns,
  flattenBoardTasks,
  isBoardQueryActive,
  sortTasks,
  type AssigneeFilter,
  type BoardQuery,
  type BoardSort,
  type CompletionFilter,
  type DueFilter,
} from "~/utils/board-query";

export const useBoardQuery = () => {
  const boardStore = useBoardStore();
  const userStore = useUserStore();
  const workspaceStore = useWorkspaceStore();
  const query = useState<BoardQuery>("board-query", defaultBoardQuery);

  watch(
    () => boardStore.projectId,
    (id, previous) => {
      if (id !== previous) query.value = defaultBoardQuery();
    },
  );

  const options = computed(() => ({
    userId: userStore.user?.id ?? null,
    weekStartsOn: (workspaceStore.activeWorkspace?.settings
      ?.weekStartsOnMonday === false
      ? 0
      : 1) as 0 | 1,
  }));

  const extraIds = computed(() => {
    const id = boardStore.draggingTask?.id;
    return id ? [id] : [];
  });

  const matchedColumns = computed(() =>
    filterBoardColumns(boardStore.columns, query.value, options.value),
  );

  const filteredColumns = computed(() =>
    filterBoardColumns(
      boardStore.columns,
      query.value,
      options.value,
      extraIds.value,
    ),
  );

  const filteredTasks = computed(() =>
    sortTasks(flattenBoardTasks(matchedColumns.value), query.value.sort),
  );

  const totalCount = computed(() =>
    boardStore.columns.reduce((sum, column) => sum + column.tasks.length, 0),
  );

  const matchCount = computed(() => filteredTasks.value.length);
  const isFiltered = computed(() => isBoardQueryActive(query.value));
  const filterCount = computed(() => boardFilterCount(query.value));
  const canDrag = computed(() => query.value.sort === "board");

  const visibleTasksFor = (column: TaskColumn) =>
    filteredColumns.value.find((item) => item.id === column.id)?.tasks ??
    column.tasks;

  const clear = () => {
    query.value = defaultBoardQuery();
  };

  const setSearch = (value: string) => {
    query.value = { ...query.value, search: value };
  };

  const toggleDue = (value: DueFilter) => {
    query.value = {
      ...query.value,
      due: query.value.due === value ? "any" : value,
    };
  };

  const toggleAssignee = (value: AssigneeFilter) => {
    query.value = {
      ...query.value,
      assignee: query.value.assignee === value ? "any" : value,
    };
  };

  const toggleCompletion = (value: CompletionFilter) => {
    query.value = {
      ...query.value,
      completion: query.value.completion === value ? "all" : value,
    };
  };

  const togglePriority = (value: TaskPriority) => {
    const priorities = query.value.priorities.includes(value)
      ? query.value.priorities.filter((item) => item !== value)
      : [...query.value.priorities, value];
    query.value = { ...query.value, priorities };
  };

  const toggleLabel = (id: string) => {
    const labelIds = query.value.labelIds.includes(id)
      ? query.value.labelIds.filter((item) => item !== id)
      : [...query.value.labelIds, id];
    query.value = { ...query.value, labelIds };
  };

  const setSort = (value: BoardSort) => {
    query.value = { ...query.value, sort: value };
  };

  return {
    query,
    filteredColumns,
    filteredTasks,
    totalCount,
    matchCount,
    isFiltered,
    filterCount,
    canDrag,
    visibleTasksFor,
    clear,
    setSearch,
    toggleDue,
    toggleAssignee,
    toggleCompletion,
    togglePriority,
    toggleLabel,
    setSort,
  };
};
