export const ATTACHABLE_TYPES = ['Task', 'Project', 'Workspace', 'Comment'] as const
export type AttachableType = (typeof ATTACHABLE_TYPES)[number]
