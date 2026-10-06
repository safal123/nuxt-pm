export interface WorkspaceSetting {
  emailOnInvite: boolean
  emailOnProjectAdd: boolean
  weekStartsOnMonday: boolean
  emailReminders: boolean
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
  subdomain?: string | null
  /** Paid plan only; set by GET /api/users. */
  canChangeSubdomain?: boolean
  activeWorkspaceId: string | null
  activeProjectId: string | null
  timezone?: string | null
  reminderEmails?: boolean
  status?: {
    availability: 'online' | 'offline'
    emoji: string
    text: string
    clearAfter: 'never' | '30m' | '1h' | '4h' | 'today' | 'week'
    expiresAt: string | null
  }
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
  eventsTotal: number
  eventsHasMore: boolean
  canManage: boolean
  totalPaid: number
  remainingValue: number
  amountDue: number
  daysRemaining: number
  currency: string
}

export type ProjectView = 'board' | 'table' | 'calendar'

export interface ProjectSetting {
  defaultView: ProjectView
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
  settings?: ProjectSetting | null
}

export type SprintStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'

export type SprintView = 'current' | 'backlog' | string

export type SprintFilter =
  | { type: 'all' }
  | { type: 'backlog' }
  | { type: 'sprint'; sprintId: string }

export type UnfinishedDestination = 'backlog' | 'next'

export interface Sprint {
  id: string
  name: string
  number: number
  goal: string | null
  status: SprintStatus
  plannedStartAt: Date | string | null
  plannedEndAt: Date | string | null
  startedAt: Date | string | null
  completedAt: Date | string | null
  projectId: string
  createdBy: string
  createdAt: Date | string
  updatedAt: Date | string
  taskCount: number
  doneCount: number
}

export interface Member {
  id: string
  name: string | null
  email: string
  imageUrl: string | null
  role?: string
  isOwner?: boolean
  joinedAt?: Date | string | null
  createdAt?: Date | string | null
}

export type TaskAssignee = Member

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

/** A drafted card from POST /api/projects/:id/ai-plan, not yet saved. */
export interface AiPlanTask {
  title: string
  description: string | null
  priority: TaskPriority
}

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
  | 'SPRINT_CREATED'
  | 'SPRINT_STARTED'
  | 'SPRINT_COMPLETED'
  | 'TASK_ADDED_TO_SPRINT'
  | 'TASK_REMOVED_FROM_SPRINT'
  | 'EMAIL_SENT'
  | 'EMAIL_FAILED'
  | 'SUMMARY_GENERATED'

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

export type ActivitySummary = {
  total: number
  today: number
  thisWeek: number
  comments: number
  emails: number
  people: number
}

export type ActivityTimelineKind = 'project' | 'task'

export type ActivityTimelineTarget = {
  kind: ActivityTimelineKind
  id: string
  name: string
}

export type WorkspaceActivitiesResponse = {
  activities: WorkspaceActivity[]
  projects: ActivityProjectOption[]
  tasks: ActivityTaskOption[]
  total: number
  page: number
  limit: number
  summary: ActivitySummary
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'

export type MemberProfileTask = {
  id: string
  title: string
  status: TaskStatus
  projectId: string
  projectName: string
}

export type MemberProfile = {
  member: Member
  stats: {
    projects: number
    assigned: number
    open: number
    done: number
  }
  projects: { id: string; name: string }[]
  tasks: MemberProfileTask[]
  activities: WorkspaceActivity[]
  /** Pass to the member activities endpoint for the next page; null when done. */
  activitiesCursor: string | null
}

export type TaskSummary = {
  id: string
  progress: string
  furtherAction: string
  generatedAt: Date | string | null
}

export type AiChatMessage = {
  id?: string
  role: 'user' | 'assistant'
  content: string
  at?: string
}

export interface Task {
  id: string
  title: string
  description: string | null
  /** Goal typed into "Plan with AI" when the card came from an AI plan. */
  aiPlanGoal?: string | null
  order: number
  priority: TaskPriority
  status: TaskStatus
  completedAt: Date | string | null
  dueDate: Date | string | null
  coverColor: string | null
  coverImage: string | null
  coverThumb: string | null
  coverCredit: string | null
  coverCreditUrl: string | null
  archivedAt?: Date | string | null
  labels: TaskLabel[]
  columnId: string
  projectId: string
  sprintId: string | null
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
  summary?: TaskSummary | null
  summaries?: TaskSummary[]
}

export type CalendarProvider = 'LOCAL' | 'GOOGLE' | 'MICROSOFT'

export type CalendarViewMode = 'month' | 'week' | 'agenda'

export interface CalendarEvent {
  id: string
  title: string
  description: string | null
  location: string | null
  startAt: string
  endAt: string
  /** All-day events hold UTC midnight of the first and last day (inclusive). */
  allDay: boolean
  color: string | null
  projectId: string
  workspaceId: string
  provider: CalendarProvider
  /** Set on events imported from a connected calendar. */
  connectionId: string | null
  externalUrl: string | null
  createdBy: string
  creator: Member | null
  createdAt: string
  updatedAt: string
}

/** An external calendar shown read-only inside a project calendar. */
export interface CalendarConnection {
  id: string
  provider: CalendarProvider
  externalCalendarId: string
  name: string
  color: string | null
  projectId: string
  userId: string
  owner: Member | null
  lastSyncedAt: string | null
  lastError: string | null
  createdAt: string
}

export interface GoogleCalendarStatus {
  /** Google OAuth is configured on this server. */
  available: boolean
  linked: boolean
  /** The linked account granted calendar read access. */
  authorized: boolean
}

export interface GoogleCalendarSummary {
  id: string
  name: string
  primary: boolean
  color: string | null
  accessRole: string
}

export type CalendarEventInput = {
  title: string
  description?: string | null
  location?: string | null
  startAt: string
  endAt: string
  allDay: boolean
  color?: string | null
}

/** Where a new event starts when created from a calendar click. */
export type CalendarEventDraft = {
  day: string
  startMinutes?: number
  allDay?: boolean
}

/** One thing drawn on the project calendar: an event or a card's due date. */
export type CalendarEntry = {
  key: string
  kind: 'event' | 'task'
  id: string
  title: string
  startAt: string
  endAt: string
  allDay: boolean
  /** Hex colour for the chip accent. */
  color: string
  done: boolean
  /** Open card whose due date has passed. */
  overdue: boolean
  editable: boolean
  /** Local day keys ("yyyy-MM-dd") the entry is drawn on. */
  days: string[]
  event?: CalendarEvent
  task?: Task
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