<script setup lang="ts">
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  ArrowRightIcon,
  CalendarIcon,
  CheckCircle2Icon,
  Columns3Icon,
  FlagIcon,
  HeartIcon,
  HeartOffIcon,
  HistoryIcon,
  ImageIcon,
  MailIcon,
  MailXIcon,
  MessageSquareIcon,
  PaperclipIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  TagIcon,
  UserMinusIcon,
  UserPlusIcon,
  ZapIcon,
} from "lucide-vue-next";

const ICONS: Record<string, typeof HistoryIcon> = {
  CREATED: PlusIcon,
  TITLE_CHANGED: PencilIcon,
  DESCRIPTION_CHANGED: PencilIcon,
  MOVED: ArrowRightIcon,
  MEMBER_ADDED: UserPlusIcon,
  MEMBER_REMOVED: UserMinusIcon,
  LABEL_ADDED: TagIcon,
  LABEL_REMOVED: TagIcon,
  DATES_UPDATED: CalendarIcon,
  COVER_CHANGED: ImageIcon,
  PRIORITY_CHANGED: FlagIcon,
  STATUS_CHANGED: ArrowRightIcon,
  COMPLETED: CheckCircle2Icon,
  REOPENED: RotateCcwIcon,
  COMMENT: MessageSquareIcon,
  ATTACHMENT_ADDED: PaperclipIcon,
  ATTACHMENT_REMOVED: PaperclipIcon,
  LIKED: HeartIcon,
  UNLIKED: HeartOffIcon,
  ARCHIVED: ArchiveIcon,
  RESTORED: ArchiveRestoreIcon,
  COLUMN_CREATED: Columns3Icon,
  SPRINT_CREATED: ZapIcon,
  SPRINT_STARTED: ZapIcon,
  SPRINT_COMPLETED: ZapIcon,
  TASK_ADDED_TO_SPRINT: ZapIcon,
  TASK_REMOVED_FROM_SPRINT: ZapIcon,
  EMAIL_SENT: MailIcon,
  EMAIL_FAILED: MailXIcon,
};

defineProps<{
  type: string;
}>();
</script>

<template>
  <component :is="ICONS[type] || HistoryIcon" />
</template>
