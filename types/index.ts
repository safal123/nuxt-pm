export interface WorkspaceSetting {
  emailOnInvite: boolean
  emailOnProjectAdd: boolean
  weekStartsOnMonday: boolean
  backgroundColor: string | null
}

export interface Workspace {
  id: string
  name: string
  description: string | null
  createdBy: string
  createdAt: Date | string
  updatedAt: Date | string
  projects?: Project[]
  settings?: WorkspaceSetting | null
  creator?: {
    id: string
    name: string | null
    email: string
  }
}

export interface User {
  id: string
  email: string
  emailVerified: boolean
  name: string | null
  image: string | null
  imageUrl?: string | null
  activeWorkspaceId: string | null
  activeProjectId: string | null
  createdAt?: Date | string
  updatedAt?: Date | string
}

export type BillingPlan = "free" | "team" | "business"
export type BillingInterval = "month" | "year"

export type BillingSubscription = {
  plan: BillingPlan
  status: string
  interval: BillingInterval | null
  seats: number
  currentPeriodEnd: Date | string | null
  cancelAtPeriodEnd: boolean
  limits: {
    workspaces: number | null
    projects: number | null
    members: number | null
  }
  usage: {
    workspaces: number
    projects: number
    members: number
  }
}

export type BillingCheckoutResponse = {
  url: string | null
  alreadyActive?: boolean
  updated?: boolean
}

export type BillingInvoice = {
  id: string
  number: string | null
  status: string
  description: string | null
  amountDue: number
  amountPaid: number
  currency: string
  createdAt: Date | string
  periodEnd: Date | string | null
  hostedInvoiceUrl: string | null
  invoicePdf: string | null
  upcoming?: boolean
}

export type BillingEventItem = {
  id: string
  type: string
  message: string
  amount: number | null
  currency: string | null
  createdAt: Date | string
  metadata: Record<string, unknown> | null
}

export type BillingOverview = BillingSubscription & {
  invoices: BillingInvoice[]
  upcoming: BillingInvoice | null
  events: BillingEventItem[]
  canManage: boolean
  totalPaid: number
  remainingValue: number
  amountDue: number
  daysRemaining: number
  currency: string
}

export interface Project {
  id: string
  name: string
  description: string | null
  workspaceId: string
  createdBy: string
  archivedAt?: Date | string | null
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

export interface Attachment {
  id: string
  name: string
  url: string
  size: number | null
  mimeType: string | null
  attachableType: string
  attachableId: string
  createdAt: Date | string
  uploadedBy: string
  uploader: TaskAssignee | null
}

export type TaskAttachment = Attachment

export interface TaskLabel {
  id: string
  name: string
  color: string
}

export type ActivityType =
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
  | 'ATTACHMENT_ADDED'
  | 'ATTACHMENT_REMOVED'
  | 'LIKED'
  | 'UNLIKED'
  | 'ARCHIVED'
  | 'RESTORED'
  | 'COLUMN_CREATED'
  | 'EMAIL_SENT'
  | 'EMAIL_FAILED'

export interface Activity {
  id: string
  type: ActivityType
  message: string
  metadata: Record<string, unknown> | null
  createdAt: Date | string
  user: TaskAssignee
}

export interface WorkspaceActivity extends Activity {
  task: { id: string; title: string } | null
  project: { id: string; name: string } | null
  email?: {
    toEmail: string
    subject: string
    template: string
    templateLabel: string
    status: string
    html: string | null
    error: string | null
  } | null
}

export type ActivityKindFilter = 'all' | 'task' | 'email'

export type ActivityFilters = {
  projectId: string
  taskId: string
  kind: ActivityKindFilter
}

export type ActivityProjectOption = {
  id: string
  name: string
}

export type ActivityTaskOption = {
  id: string
  title: string
  projectId: string
}

export type WorkspaceActivitiesResponse = {
  activities: WorkspaceActivity[]
  projects: ActivityProjectOption[]
  tasks: ActivityTaskOption[]
  total: number
  page: number
  limit: number
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
  coverColor: string | null
  archivedAt?: Date | string | null
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
  attachments?: Attachment[]
  activities?: Activity[]
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
  completedCount: number
}

export interface ArchivedList {
  id: string
  name: string
  projectId: string
  projectName: string
  projectCreatedBy: string
  archivedAt: Date | string | null
  taskCount: number
}

export interface EmailLogItem {
  id: string
  template: string
  templateLabel: string
  subject: string
  toEmail: string
  fromEmail: string
  fromName?: string | null
  html: string
  text: string | null
  status: 'sent' | 'failed' | string
  error: string | null
  projectId: string | null
  projectName: string | null
  createdAt: Date | string
}