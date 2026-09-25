# Northstar — Laravel Livewire build spec

Copy this file into the Laravel repo as `AGENTS.md`. It is the full product spec. Build from it without extra prompts. Do not port Nuxt, Vue, Pinia, Prisma, or Zod literally. Recreate the same product with Laravel 11+ and Livewire 3.

**Product name:** Northstar  
**Tagline:** Boards, activity, and email in one workspace.

This document describes a working Nuxt 3 app. Match its behavior, data, access rules, billing limits, copy, and screens. Improve structure for Laravel; do not drop features.

---

## 1. How to work

1. Build in the order in **§16**. Finish a phase before starting the next.
2. One source of validation per field. Form Request / Livewire `rules()` in the component. Domain services do not re-trim or re-validate HTTP input.
3. Mutations go: Livewire action → authorize → validate → service/action → Eloquent. Blade does not call Eloquent writes. Controllers stay thin (webhooks, OAuth callbacks, file download, Stripe return).
4. After a write, update the Livewire state you already have. Do not leave the board/list stale and hope the user refreshes.
5. Open create/edit UI through existing modals (`<x-modal>` / Livewire modal components), not one-off page-local dialogs, when a modal already exists.
6. Use catalog UI (Flux UI, or Livewire-compatible shadcn/maryUI). Do not hand-roll buttons, dialogs, selects, dropdowns, tabs, or toasts.
7. Semantic Tailwind tokens: `bg-background`, `text-foreground`, `border-border`, `bg-muted`, `bg-card`. Light and dark must both work.
8. Icons: Lucide (or Flux icons). Toasts for success/error. Disable submit with the in-flight flag only — not with duplicated field rules.
9. Never commit secrets. Env names are listed in **§15**; copy values from the operator, not from this file.
10. PostgreSQL. ULIDs or UUIDs for public ids. snake_case columns.

---

## 2. Stack mapping

| Nuxt app | Laravel Livewire app |
|---|---|
| Nuxt 3 pages + Pinia | Livewire 3 full-page components + nested components |
| Prisma + PostgreSQL | Eloquent + PostgreSQL migrations |
| Better Auth (email/password + Google) | Laravel Fortify or Breeze: email/password + Socialite Google |
| Zod in `server/utils/schemas.ts` | Form Requests + Livewire validation with the same messages |
| `defineApi` JSON `{ data, message }` | Livewire methods returning flashes; JSON only for webhooks / Echo / uploads |
| Pinia stores (workspace, board, sprint, user, notifications) | Livewire parent state + computed properties. Share via nested components, not a JS store |
| shadcn-vue + radix-vue | Flux UI (preferred) or equivalent Tailwind component kit |
| Ably channels | Laravel Reverb + Echo (or Ably if Reverb is unavailable). Same event names |
| UploadThing | Laravel filesystem (S3 or local) + signed upload. Same limits |
| Resend SDK | Resend via Laravel mail / HTTP, same HTML templates |
| Stripe SDK | Laravel Cashier + webhook. Same plans and lookup keys |
| vue-sonner | Toast component |
| `@nuxtjs/color-mode` | `dark` class on `<html>`, cookie `color-mode` = `light` \| `dark` \| `auto` |

Do **not** build a REST API that mirrors `/api/*` unless a Livewire round-trip cannot do the job (Stripe webhook, Resend, Echo auth, file upload). The product is a server-rendered Livewire app.

---

## 3. Architecture (data flow)

```
Blade form  →  Livewire component  →  Form Request / rules()  →  App\Actions\*  →  Eloquent
```

| Layer | Does | Does not |
|---|---|---|
| Blade | Render, bind `wire:model`, show `error` bags, toast, navigate | Extra trim/length checks, Eloquent writes |
| Livewire | Authorize, call action, patch local state, emit Echo-friendly events | Duplicate validation the Form Request already did |
| Action / service | Billing checks + Eloquent | Parse HTTP again |
| Policy | Workspace membership / owner-only | |

**Shared state** (user, workspaces, current board, sprints, notifications): load in the layout or page Livewire component; children receive props or use the parent.

**Page-only reads** (dashboard summary, activity feed, emails list): load in that page component. Do not dump into a global store.

**Exceptions (do not invent new ones)**

- Auth (Fortify / Socialite) — not a custom JSON client.
- File attachments may own their upload list.
- Invite accept is a one-shot flow.

### Access

Access is **workspace-scoped**: user is the workspace `created_by` **or** a `workspace_members` row. Project/task membership alone is not enough to see a workspace.

- `validateWorkspaceAccess` → `WorkspacePolicy` / `Workspace::visibleTo($user)`
- `validateProjectAccess` → project whose workspace the user can reach
- `validateTaskAccess` / `validateColumnAccess` → via project → workspace
- Archive/restore of a **project** or **task**: only the **creator** (`403`: `Only the creator can archive or restore this {noun}.`)
- Billing page: **workspace owner** (`created_by`) only. Other members hitting `/w/{id}/billing` redirect to dashboard.

Missing resource: `404` with `Project not found or you do not have access.` (same pattern for workspace, task, column, sprint).

Plan limit exceeded: **402** with the exact messages in **§8**.

Duplicate project name: **409** `A project with that name already exists in this workspace.`

Duplicate label name: **409** `A label with that name already exists in this project.`

---

## 4. Product surface

### Public

| Path | Page |
|---|---|
| `/` | Marketing: Header, Hero, Features, Product, Workflow, Pricing, CTA, Footer. Title: `Northstar — Boards, activity, and email in one workspace`. |
| `/sign-in` | Email + password. Google if credentials exist. `redirect_url` query after success. |
| `/sign-up` | Same. |
| `/invite/{token}` | Public invite preview. Sign-in/up with redirect back. Signed-in users can Accept. |

### Authenticated

If the user has no workspace, create `My Workspace` (or `{name}'s Workspace`) as owner with default settings, set `active_workspace_id`, then enter the app.

`/w` and `/w/{workspace}` with no extra segment redirect to **dashboard**.

Unknown workspace id → fall back to `active_workspace_id` or first membership.

| Path | Name | Notes |
|---|---|---|
| `/w/{workspace}` | layout | Dashboard layout: sidebar + header. Sync `active_workspace_id`. |
| `/w/{workspace}/dashboard` | Dashboard | Stats, analytics, recent activity, New project. |
| `/w/{workspace}/projects` | Projects | Grid of live (non-archived) projects. |
| `/w/{workspace}/projects/{project}` | Board | Kanban + table. Sprint switcher. Inline rename. |
| `/w/{workspace}/members` | People | Stats + list. Add people. |
| `/w/{workspace}/members/{user}` | Member profile | Projects, open tasks, activity. `/profile` redirects here for the current user. |
| `/w/{workspace}/activities` | Activity | Filters: project, task, kind. Pagination. Timeline modal. |
| `/w/{workspace}/emails` | Emails | Inbox / sent / templates. Compose. |
| `/w/{workspace}/archived` | Archive | Lists, cards, projects. Restore / delete. |
| `/w/{workspace}/settings` | Settings | Owner vs member. Theme, board view, notifications, workspace color. |
| `/w/{workspace}/billing` | Billing | Owner only. Plans, checkout, portal, invoices, events. |

Guest hitting app routes → `/sign-in`. Signed-in hitting marketing may stay on `/` (header shows account).

---

## 5. Layout and navigation

### Dashboard shell

- **Sidebar** (`SidebarProvider` pattern): workspace selector (top), project list (middle), user button (footer).
- **Header:** sidebar trigger, breadcrumbs (`Workspace` › current page title), notification bell, user avatar (compact).
- Loading bar on navigation (Livewire `wire:navigate` progress or equivalent).
- Workspace background color tints CSS variables (see **§12**). Tinted header uses more transparency.

### Sidebar projects

- List live projects for the active workspace.
- Create project (modal).
- Archive project (confirm modal) — creator only.
- Clicking a project goes to the board and sets `active_project_id`.

### User menu (header + sidebar)

- View profile
- Manage account (name, email, password, avatar — modal)
- Members (workspace)
- Invite (modal)
- Appearance: Light / Dark / System
- Sign out

**Do not** put Create Project in the top header. Notifications stay in the header; everything else lives in the user dropdown.

### Workspace selector

Switch workspace; persist `active_workspace_id`. Create workspace (modal, name max 50). Respect plan limits.

---

## 6. Data model

PostgreSQL. Match this schema. Use Eloquent enums or string columns with PHP enums.

**Do not** put `workspace_id` on User, Session, Account, Verification, Subscription, or BillingEvent.

**Do** denormalize required `workspace_id` on board data. Composite FKs where a child already has `project_id` or `task_id`, so a row cannot point at a parent in another workspace.

### Enums

```
SprintStatus:  PLANNED | ACTIVE | COMPLETED | CANCELLED
TaskStatus:    TODO | IN_PROGRESS | IN_REVIEW | DONE | BLOCKED
TaskPriority:  LOW | MEDIUM | HIGH | URGENT
WorkspaceRole: OWNER | ADMIN | MEMBER
ProjectRole:   OWNER | ADMIN | MEMBER
```

### Users

`id`, `email` unique, `email_verified` bool default false, `name` nullable, `image` nullable, `active_workspace_id` nullable FK, `active_project_id` nullable FK, timestamps.

Laravel auth tables as usual (`password`, `remember_token`, `sessions`). Google via `social_accounts` or Socialite default. Do not copy Better Auth's `accounts` / `verifications` models unless you keep that stack.

### Subscriptions (user-owned, not workspace-owned)

`user_id` unique, `stripe_customer_id` unique, `stripe_subscription_id` unique nullable, `stripe_price_id`, `plan` default `free`, `status` default `inactive`, `interval` nullable, `seats` default 1, `current_period_end`, `cancel_at_period_end` default false.

### Billing events

`user_id`, `type`, `message` text, `amount` int nullable, `currency`, `stripe_event_id` unique nullable, `metadata` json, `created_at`. Index `(user_id, created_at)`.

### Workspaces

`name`, `description`, `created_by` FK users, timestamps.

### Workspace settings (1:1)

`workspace_id` unique.  
`email_on_invite` default true, `email_on_project_add` default true, `week_starts_on_monday` default true, `background_color` nullable (palette id, not hex).

### Workspace members

Composite PK `(user_id, workspace_id)`, `role` default MEMBER, `joined_at`.

### Workspace invites

`workspace_id`, `email` nullable, `role` default MEMBER, `token_hash` unique (SHA-256 of raw token — **never store the raw token**), `expires_at`, `used_at` nullable, `created_by`, `created_at`. Index `workspace_id`. TTL **72 hours**.

### Projects

`name`, `description`, `archived_at` nullable, `workspace_id`, `created_by`, timestamps.  
**Unique** `(id, workspace_id)` for composite children.  
**Unique** `(workspace_id, name)` — names unique per workspace, including archived.

Creating a project: creator as `project_members` OWNER with same `workspace_id`; create four default columns: **To Do, In Progress, Review, Done** (`order` 0–3).

### Project members

Composite PK `(user_id, project_id)`, `workspace_id` required, `role`, `added_at`.  
Composite FK `(project_id, workspace_id)` → `projects(id, workspace_id)` ON DELETE CASCADE.

### Sprints

`name`, `number` int, `goal`, `status` default PLANNED, `planned_start_at`, `planned_end_at`, `started_at`, `completed_at`, `workspace_id`, `project_id`, `created_by`, timestamps.  
Unique `(project_id, number)`. Index `(project_id, status)`, `workspace_id`.  
Composite FK to project.

### Task columns (lists)

`name`, `order` default 0, `color` nullable (palette id), `archived_at`, `workspace_id`, `project_id`, timestamps.  
Composite FK to project.

### Tasks

`title`, `description` text, `order` int, `priority` default MEDIUM, `status` default TODO, `completed_at`, `due_date`, `start_date`, `end_date`, cover fields (`cover_color`, `cover_image`, `cover_thumb`, `cover_credit`, `cover_credit_url`), `archived_at`, `workspace_id`, `column_id` FK, `project_id`, `sprint_id` nullable FK SET NULL, `created_by`, `assignee_id` nullable.  
Composite unique `(id, workspace_id)`. Composite FK to project. Simple FKs to column and sprint (one scalar cannot join two composite relations).  
Indexes: `(column_id, archived_at, order)`, `(column_id, archived_at, status, completed_at)`, `(project_id, archived_at, created_at)`, `(sprint_id, archived_at)`, `workspace_id`.

`order` is shared for backlog and sprint views.

### Task comments / likes / members

Each has required `workspace_id` and composite FK `(task_id, workspace_id)` → `tasks(id, workspace_id)`.

- Comments: `content` text, `user_id`, `created_at`
- Likes: PK `(user_id, task_id)`
- Members: PK `(task_id, user_id)`, `added_at`. First member is treated as assignee.

### Labels

`name`, `color` hex (`#rgb` or `#rrggbb`), `workspace_id`, `project_id`, `created_by`. Unique `(project_id, name)`. Composite FK to project.

### Task labels

Junction PK `(task_id, label_id)`. **No** `workspace_id`.

### Attachments (polymorphic)

`name`, `url` text, `file_key` nullable, `size`, `mime_type`, `attachable_type` (`Task` \| `Project` \| `Workspace` \| `Comment`), `attachable_id`, `uploaded_by`, **required `workspace_id` FK to workspaces** (simple, not composite). Index `(attachable_type, attachable_id)`.

### Activities (workspace event log)

`type` string, `message` text, `metadata` json, `workspace_id` required, `project_id` nullable, `task_id` nullable, `user_id`. Indexes on `(workspace_id, created_at)`, `(project_id, created_at)`, `(task_id, created_at)`.

### Email logs

`workspace_id`, `project_id` nullable, `template`, `subject`, `to_email`, `from_email`, `html` text, `text` nullable, `status`, `error` nullable, `resend_id` nullable, `created_by` nullable. Index `(workspace_id, created_at)`.

---

## 7. Nested writes — always set `workspace_id`

Every create of column, sprint, task, label, project_member, task_comment, task_like, task_member, attachment **must** set `workspace_id`. Nested creates (task.members, project.members, likes) too.

Default columns helper: `createDefaultColumns($projectId, $workspaceId)`.

---

## 8. Billing

Plan is owned by the **workspace creator's** subscription. Members inherit that plan.

### Plans

| Plan | Workspaces | Live projects / workspace | Members / workspace | Price |
|---|---|---|---|---|
| free | 1 | 3 | 5 | $0 |
| team | 1 | unlimited | unlimited | $16/mo seat, $12/mo billed yearly |
| business | unlimited | unlimited | unlimited | $32/mo seat, $24/mo billed yearly |

Stripe lookup keys:

```
northstar_team_monthly / northstar_team_yearly
northstar_business_monthly / northstar_business_yearly
```

Paid access if `plan` is team|business **and** status is `active` | `trialing` | `past_due`. Otherwise effective plan is **free**.

Seat count: unique `user_id`s across memberships of workspaces the billing user **owns**, plus the owner.

### Limit errors (HTTP 402)

- Create workspace (free/team): `Free includes one workspace. Upgrade to Business for more.` / `Team includes one workspace. Upgrade to Business for more.`
- Create live project: `Free includes 3 projects. Archive one or upgrade to Team for unlimited projects.`
- Add member / create invite: `Free includes 5 members. Upgrade to Team to invite more people.`

Archived projects do not count toward the project limit.

### Checkout / portal

- Owner only (`canManage`).
- Checkout: plan `team|business`, interval `month|year` default month.
- If already on that paid plan: `{ alreadyActive: true }` / toast.
- If existing Stripe subscription: update items; else Checkout Session, return to `/w/{id}/billing`.
- Billing portal for invoices/cancel.
- Webhook updates subscription + billing_events (`subscribed`, `canceled`, `plan_changed`). Dedupe on `stripe_event_id`.
- Sync endpoint after Checkout `session_id`.

Billing page shows plan, renewal/cancel date, usage vs limits, invoices, upcoming invoice, event feed, checkout CTAs.

---

## 9. Auth

- Email + password. Google OAuth optional (skip provider if client id/secret missing). Account linking: Google may attach to existing email.
- Fields on user: `active_workspace_id`, `active_project_id` (app-owned, not mass-assignable from the client except via dedicated update).
- After first login: `ensureDefaultWorkspace`.
- Sign-in error: `Those credentials did not match our records`.
- Redirect: `redirect_url` if same-origin, else `/w`.

---

## 10. Feature specs

### 10.1 Workspaces

Create: name required, trim, max 50 (`Workspace name must be 50 characters or less.`), description optional. Creator is OWNER member. Create empty settings row.

Settings patch (at least one field): `emailOnInvite`, `emailOnProjectAdd`, `weekStartsOnMonday`, `backgroundColor` (palette id or null). `Nothing to update.` if empty.

First authenticated visit with zero workspaces: auto-create `My Workspace`.

### 10.2 Members and invites

**Add by email:** if a user exists, add `workspace_members`. If not, create an email invite.

**Invite link:** one active link invite per workspace (expire previous unused link invites). Raw token in URL `/invite/{token}`; store SHA-256. Optional email.

Invite page (public GET): `{ workspaceName, email, expiresAt, valid, expired, used }`.

Accept (auth required): mark `used_at`, add member, set active workspace, send welcome email to joiner and notice to inviter when settings allow.

Cannot remove the workspace owner. Project add: person must already be a workspace member (`That person must be a workspace member first.`). Already a project member: 409 `That person is already a project member.`

Adding to a project can email them if `email_on_project_add`.

### 10.3 Projects

Create: `workspace_id` + name required + description optional. Unique name per workspace. Owner member + default columns.

Update: `archived` bool, `name`, `description` — at least one. Inline title edit on the board page.

Delete: only archived projects (or match current app: archive then delete from archive page).

### 10.4 Columns (lists)

Create: name required. `order` = last + 1.

Patch one of: rename, `direction` left|right (swap order among non-archived siblings), `color` (palette id or null; invalid → `Invalid column color.`), `archived`.

Archive column: set `archived_at` on column **and** its tasks.

Restore: unarchive, move to end, unarchive its tasks. `This list is not archived.` if not archived.

Delete: **only archived** lists (`Only archived lists can be deleted.`).

If a board loads with **zero** columns, create the four defaults.

Column colors: `green yellow orange red purple blue sky lime pink black`.

### 10.5 Board

Query: `sprint` = `current` | `backlog` | sprint id.

**Kanban:** columns left-to-right by `order`. Incomplete tasks in the column (not DONE), filtered by sprint. Drag cards between columns and reorder (`order` + `column_id`). Drag disabled while filters are on.

**Completed:** per column, show up to **20** DONE tasks (`BOARD_COMPLETED_LIMIT`). Mark complete shows a spinner on the card until the write finishes.

**Table view:** same data, tabular. Persist view preference (`board` | `table`) client-side like settings.

**Toolbar**

- Search (keyboard `/` focuses search)
- Due: overdue, today, this week, no date
- Assignee, completion, priority, label toggles
- Sort: board order, due, priority, newest, title
- Clear filters
- Kanban / table toggle
- Sprint switcher

Filters are client-side on the loaded board unless the dataset is huge; keep server sprint filter.

Realtime: `project:{projectId}` events in **§13**. Ignore events from the same `clientId` that originated the write.

### 10.6 Tasks

Create: `columnId`, `title` required, `description` optional, `sprintId` optional. Creator is assignee and first task member. `order` = next in that column+sprint. Cannot add to COMPLETED/CANCELLED sprint (`Cards cannot be added to a completed sprint.`). Column and sprint must belong to the same project.

Update (partial): `archived`, `order`, `columnId`, `title`, `description`, `priority`, `completed` (bool — sets status DONE + `completed_at`, or reopens), `status`, `dueDate`, cover fields, `memberIds[]` (sync members; first is assignee), `labelIds[]`, `sprintId`.

Delete: archive (or hard-delete if already archived — match archive page). Creator-only for archive/restore.

**Task detail modal**

- Cover (color or stock photo from `/images/covers/*` with Unsplash credit)
- Title, description (rich or textarea)
- Status, priority, due date, members, labels
- Sprint
- File attachments (max **8** files, **8MB** each)
- Likes (toggle)
- **Comment composer above** the comment list
- Activity on the card
- Complete / archive

Card on the board: cover thumb, labels, due, members, like count, comment count. Completing from the card uses a spinner.

### 10.7 Labels

Create: name + hex color. Unique per project. Optional `taskId` to attach immediately (task must be in the same project).

### 10.8 Sprints

Create: name (default `Sprint {n}`), goal, planned start/end, `start` default true (ACTIVE + `started_at` now), `pullBacklog` moves undated incomplete cards into the sprint.

One ACTIVE sprint per project when starting another — complete/cancel the current one first, or follow existing patch rules.

Patch: name, goal, dates, status ACTIVE|COMPLETED|CANCELLED, `unfinishedDestination` `backlog` | `next` when closing.

Closing:

- COMPLETED/CANCELLED
- Unfinished cards → backlog (`sprint_id` null) or next sprint
- `findOrCreateNextSprint`: next PLANNED with greater number, else create `Sprint {n}` with `workspace_id`
- Optional `pullBacklog` when starting

Default planned range: today → +13 days.

Historic sprints (COMPLETED/CANCELLED) are read-only for adding cards.

Switcher: Current, Backlog, specific sprints. If no active sprint and sprints exist, default view is backlog; if none, show all.

### 10.9 Activity

Log on: create/move/rename/description/dates/cover/priority/members/labels/like/comment/attachment/archive/restore/column create/sprint create-start-complete/email.

Types used in the app:

`CREATED`, `MOVED`, `TITLE_CHANGED`, `DESCRIPTION_CHANGED`, `DATES_UPDATED`, `COVER_CHANGED`, `PRIORITY_CHANGED`, `STATUS_CHANGED`, `COMPLETED`, `MEMBER_ADDED`, `MEMBER_REMOVED`, `LABEL_ADDED`, `LABEL_REMOVED`, `LIKED`, `UNLIKED`, `COMMENT`, `ATTACHMENT_ADDED`, `ATTACHMENT_REMOVED`, `ARCHIVED`, `RESTORED`, `COLUMN_CREATED`, `SPRINT_CREATED`, `SPRINT_STARTED`, `SPRINT_COMPLETED`, `TASK_ADDED_TO_SPRINT`.

List: filter `projectId`, `taskId`, `kind` (all or a type), `page` default 1, `limit` default 12 max 200.

Dashboard: last 8 + summary stats (cards, completed, members, activity counts / simple analytics).

Notifications: last 20 workspace activities, unread via `localStorage` (or session) last-seen timestamp, **exclude events the current user authored**. Bell in header. Realtime `activity.created`.

### 10.10 Emails

Resend. Log every attempt on `email_logs` (`sent` or `failed`).

Templates:

| id | When |
|---|---|
| `workspace-invite` | Invite by email |
| `invite-accepted` | Welcome to the new member |
| `invite-accepted-notice` | To the inviter |
| `project-member` | Added to a project |
| `custom` | Manual compose |

HTML: card layout, violet kicker, #7c3aed button. Escape user text. From: `RESEND_FROM` (dev fallback `Northstar <onboarding@resend.dev>`). Production requires a verified from.

Compose fields: to, subject, kicker default `Update`, title, body, optional action label **and** URL together, optional `projectId`. URL must be `http://` or `https://`. `Button label and URL are both required if you add a button.`

Emails page: inbox / sent / templates, filter by project and template, pagination 12, detail modal, realtime `email.sent`.

Honor `email_on_invite` / `email_on_project_add`.

### 10.11 Attachments

Types: Task, Project, Workspace, Comment. Authorize via parent workspace. Set `workspace_id` from the parent. Activity `ATTACHMENT_ADDED` / `ATTACHMENT_REMOVED`. Delete removes DB row and storage object.

### 10.12 Archive page

Tabs: all / list / card / project. Restore (creator rules). Delete archived lists and projects. Group by date.

### 10.13 Settings page

- Theme light/dark/system
- Default project view kanban/table
- Show emails in activity (client pref)
- Workspace color palette (owner)
- Email notification toggles (owner)
- Week starts Monday (owner)
- Read-only created date, owner name, member/project counts

### 10.14 Marketing / pricing

Pricing section matches plan table. CTA to sign up. Do not invent extra plans.

---

## 11. Validation messages (copy exactly)

| Field | Message |
|---|---|
| Workspace name empty | `Workspace name is required` |
| Workspace name > 50 | `Workspace name must be 50 characters or less.` |
| Project name empty | `Project name is required` / `Project name is required.` |
| Column name empty | `Column name is required.` |
| Label name empty | `Label name is required` |
| Title empty | `Title is required` |
| Comment empty | `Comment is required` |
| Subject/title/body empty | `{Label} is required` |
| Invalid email | `Enter a valid email address.` |
| Invalid hex | `A valid color is required.` |
| Empty patch | `Nothing to update.` |
| Button URL | `Button URL must start with http:// or https://.` |
| Sprint name | `Sprint name is required.` |

Trim on the server. Empty description becomes null. Emails lowercased.

---

## 12. UI / design

- Product: shadcn-like: rounded-xl cards, muted borders, compact density, tracking-tight titles.
- Dark mode via `class` on `<html>`.
- Workspace tint: palette ids `white` + task colors (`green yellow orange red purple blue sky lime pink black`) with hex:

```
#61bd4f #f2d600 #ff9f1a #eb5a46 #c377e0 #0079bf #00c2e0 #51e898 #ff78cb #344563
```

When not white, set CSS variables for primary / sidebar-primary / ring / dropzone from that hex. Dark mode can ramp surfaces from the hue; light mode mainly tints actions.

- Status / priority chips: match the existing color language (slate / sky / violet / rose / emerald / amber).
- Empty states with icon, title, one-line help, primary action.
- Modals: create project, create workspace, archive project, workspace members, invite, task detail, start/edit/complete sprint, send email, email detail, activity detail, activity timeline, manage account, delete confirmations.
- Task detail overlay when cover image or color is set.
- Cover photos: ship the same static files under `public/images/covers/` (mountains, forest, beach, lake, etc.) with photographer credit + Unsplash URL.

---

## 13. Realtime

Channels:

- `project:{projectId}`
- `workspace:{workspaceId}`
- `user:{userId}` (optional)

Board events:

```
task.upsert { task }
task.removed { taskId }
task.like { taskId, likeCount }
column.upsert { column }
column.removed { columnId }
column.moved { columnIds }
label.created { label, task? }
board.refresh
```

Workspace:

```
activity.created { activity }
email.sent { id }
```

Each client has a uuid in session storage (`ns-realtime-client-id`). Echo payloads may include `clientId` so the originator does not double-apply.

If Reverb/Ably is unset, the app must still work; skip subscribe.

---

## 14. Activity + notification behavior

- `logActivity({ workspaceId, projectId?, taskId?, userId, type, message, metadata? })` on every meaningful write.
- Notification bell uses the workspace activity feed, 20 items, unread = after last-seen and `user_id != current user`.
- Mark seen when the dropdown opens.

---

## 15. Environment (names only)

```
APP_URL
DB_*
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET          # optional
RESEND_API_KEY
RESEND_FROM
RESEND_TEST_TO                                   # optional sandbox override
STRIPE_KEY / STRIPE_SECRET / STRIPE_WEBHOOK_SECRET
AWS_* or FILESYSTEM_DISK                         # uploads
REVERB_* or ABLY_API_KEY                         # realtime optional
```

Do not commit real keys. Google callback: `{APP_URL}/auth/google/callback`.

---

## 16. Build order

Do not skip ahead. Each phase should be demoable.

### Phase 0 — Skeleton

Laravel 11+, Livewire 3, Tailwind, Flux (or chosen kit), Fortify/Breeze, dark mode, layouts (`guest`, `dashboard`), flash toasts, `wire:navigate`.

### Phase 1 — Auth + first workspace

Sign in / sign up / Google. User `active_*` columns. Ensure default workspace. Middleware: auth, workspace exists, billing owner-only.

### Phase 2 — Workspaces, members, invites

CRUD workspace (create + settings). Member list + profile. Invite hash + accept page. Resend invite emails. Plan limits on workspace create and member add.

### Phase 3 — Projects + columns + board

Projects unique name. Default columns. Kanban drag. Table view. Task create/update/complete/archive. Task modal (no files yet). Labels. Likes. Comments (composer on top). Archive page for lists/cards/projects.

### Phase 4 — Sprints

Sprint model, switcher, start/complete/cancel, pull backlog, next sprint, board filter.

### Phase 5 — Activity + notifications + dashboard

Activity log, dashboard stats, bell, timeline modal.

### Phase 6 — Emails + attachments + covers

Email logs page, custom send, templates. Uploads. Cover picker.

### Phase 7 — Billing + marketing

Cashier, webhook, billing page, marketing + pricing, seed data for a demo workspace.

### Phase 8 — Realtime + polish

Echo events, workspace tint, loading indicator, empty/error states, tests.

---

## 17. Tests to write (minimum)

- Workspace create: required name, max 50, plan 402, owner member + settings created.
- Project create: owner member with `workspace_id`, default columns called with `(projectId, workspaceId)`, P2002/unique → 409.
- Access: non-member cannot load project/task.
- Invite: hash lookup, expire, accept adds member.
- Billing: free cannot create 4th live project or 6th member.
- Sprint close: unfinished → backlog or next.
- Task complete sets `completed_at` and DONE.
- Feature tests for sign-in, create project, drag is optional; Livewire `Livewire::test` for forms.

---

## 18. Seed (demo)

A seed should create a few users, one or two workspaces, projects with columns, labels, tasks (covers, members, likes, comments, files), activities, and a mix of sprint states — enough to click through the app without an empty board.

---

## 19. Explicit non-goals

- Do not clone Nuxt file structure, Pinia, or `/api/*` JSON as the primary UI transport.
- Do not put `workspace_id` on users or billing.
- Do not unique `(workspace_id, project_id)` on children (that would mean one row per project).
- Do not add Filament as the product UI.
- Do not add Clerk. This app is not Clerk-auth anymore.
- Do not weaken access to “project member only”.
- Do not skip composite FKs on project/task children.
- Do not store raw invite tokens.
- Do not re-validate length/trim in Blade after the Form Request ran.

---

## 20. Definition of done

A new user can: sign up → land in a workspace → create a project → use kanban and table → complete and comment on a card → invite a teammate → start/complete a sprint → see activity and notifications → send a branded email → upload a file → archive/restore → hit free-plan limits → (if Stripe keys exist) upgrade.

Match Northstar’s copy, limits, and information architecture. Laravel idioms are welcome; missing product behavior is not.
