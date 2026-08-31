export interface Workspace {
  id: string
  name: string
  description: string | null
  createdBy: string
  createdAt: Date | string
  updatedAt: Date | string
  projects?: Project[]
}

export interface User {
  id: string
  clerkId: string
  email: string
  name: string | null
  activeWorkspaceId: string | null
  activeProjectId: string | null
  createdAt?: Date | string
  updatedAt?: Date | string
  clerkObject?: any
}

export interface Project {
  id: string
  name: string
  description: string | null
  workspaceId: string
  createdBy: string
  createdAt: Date | string
  updatedAt: Date | string
}

export interface Member {
  id: string
  name: string | null
  email: string
  imageUrl: string | null
  role?: string
  isOwner?: boolean
}

export type TaskAssignee = Member

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface TaskComment {
  id: string
  content: string
  createdAt: Date | string
  user: TaskAssignee
}

export interface TaskLabel {
  id: string
  name: string
  color: string
}

export type TaskActivityType =
  | 'CREATED'
  | 'TITLE_CHANGED'
  | 'DESCRIPTION_CHANGED'
  | 'MOVED'
  | 'MEMBER_ADDED'
  | 'MEMBER_REMOVED'
  | 'LABEL_ADDED'
  | 'LABEL_REMOVED'
  | 'DATES_UPDATED'
  | 'COVER_CHANGED'
  | 'PRIORITY_CHANGED'
  | 'STATUS_CHANGED'
  | 'COMPLETED'
  | 'REOPENED'
  | 'COMMENT'
  | 'LIKED'
  | 'UNLIKED'

export interface TaskActivity {
  id: string
  type: TaskActivityType
  message: string
  metadata: Record<string, unknown> | null
  createdAt: Date | string
  user: TaskAssignee
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'

export interface Task {
  id: string
  title: string
  description: string | null
  order: number
  priority: TaskPriority
  status: TaskStatus
  completedAt: Date | string | null
  dueDate: Date | string | null
  startDate: Date | string | null
  endDate: Date | string | null
  coverColor: string | null
  labels: TaskLabel[]
  columnId: string
  projectId: string
  createdBy: string
  createdAt: Date | string
  updatedAt: Date | string
  columnName?: string | null
  creator: TaskAssignee | null
  assignee: TaskAssignee | null
  members: TaskAssignee[]
  comments?: TaskComment[]
  activities?: TaskActivity[]
  commentCount: number
  attachmentCount: number
  likeCount: number
  likedByMe: boolean
}

export interface TaskColumn {
  id: string
  name: string
  order: number
  color?: string | null
  archivedAt?: string | null
  projectId: string
  tasks: Task[]
}