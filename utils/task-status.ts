export const TASK_STATUSES = [
  {
    id: 'TODO',
    label: 'To do',
    hint: 'Not started',
    chip: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
  },
  {
    id: 'IN_PROGRESS',
    label: 'In progress',
    hint: 'Currently working',
    chip: 'bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-800',
  },
  {
    id: 'IN_REVIEW',
    label: 'In review',
    hint: 'Waiting on review',
    chip: 'bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-800',
  },
  {
    id: 'BLOCKED',
    label: 'Blocked',
    hint: 'Cannot continue',
    chip: 'bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-800',
  },
  {
    id: 'DONE',
    label: 'Done',
    hint: 'Marked complete',
    chip: 'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800',
  },
] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]['id']

export const TASK_STATUS_IDS = TASK_STATUSES.map((status) => status.id)

export const statusLabel = (id: string) =>
  TASK_STATUSES.find((status) => status.id === id)?.label ?? id

export const statusChip = (id: string) =>
  TASK_STATUSES.find((status) => status.id === id)?.chip ?? TASK_STATUSES[0].chip
