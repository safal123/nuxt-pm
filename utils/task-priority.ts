import type { TaskPriority } from '@/types'

export const TASK_PRIORITIES: {
  id: TaskPriority
  label: string
  hint: string
  chip: string
}[] = [
  {
    id: 'LOW',
    label: 'Low',
    hint: 'Can wait',
    chip: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
  },
  {
    id: 'MEDIUM',
    label: 'Medium',
    hint: 'Normal pace',
    chip: 'bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-800',
  },
  {
    id: 'HIGH',
    label: 'High',
    hint: 'Needs attention',
    chip: 'bg-amber-50 text-amber-800 ring-amber-100 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800',
  },
  {
    id: 'URGENT',
    label: 'Urgent',
    hint: 'Do this first',
    chip: 'bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-800',
  },
]

export const priorityLabel = (id: TaskPriority | string) =>
  TASK_PRIORITIES.find((item) => item.id === id)?.label ?? id

export const priorityChip = (id: TaskPriority | string) =>
  TASK_PRIORITIES.find((item) => item.id === id)?.chip ?? TASK_PRIORITIES[1].chip
