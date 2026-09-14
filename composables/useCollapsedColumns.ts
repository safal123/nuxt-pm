import { useLocalStorage } from "@vueuse/core";

export const useCollapsedColumns = (projectId: MaybeRefOrGetter<string>) => {
  const collapsedByProject = useLocalStorage<Record<string, string[]>>(
    "kanban-collapsed-columns",
    {},
  );

  const collapsedIds = computed(() => {
    const id = toValue(projectId);
    return id ? collapsedByProject.value[id] ?? [] : [];
  });

  const isCollapsed = (columnId: string) => collapsedIds.value.includes(columnId);

  const setCollapsed = (columnId: string, collapsed: boolean) => {
    const id = toValue(projectId);
    if (!id) return;
    const current = new Set(collapsedByProject.value[id] ?? []);
    if (collapsed) current.add(columnId);
    else current.delete(columnId);
    collapsedByProject.value = {
      ...collapsedByProject.value,
      [id]: [...current],
    };
  };

  const toggle = (columnId: string) => setCollapsed(columnId, !isCollapsed(columnId));

  return { collapsedIds, isCollapsed, setCollapsed, toggle };
};
