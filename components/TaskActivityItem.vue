<script setup lang="ts">
import { formatDistanceToNow } from "date-fns";
import type { Activity, TaskAssignee } from "@/types";

const props = defineProps<{
  activity: Activity;
}>();

const initials = (person: TaskAssignee) => {
  const name = person.name || person.email || "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
};

const fieldLabel = (field: string) => {
  if (field.includes("start")) return "Start";
  if (field.includes("due")) return "Due";
  if (field.includes("end")) return "End";
  return field;
};

const dateChanges = computed(() => {
  const raw = props.activity.metadata?.changes;
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const row = item as { field?: string; from?: string | null; to?: string | null };
        if (!row.field) return null;
        return {
          field: fieldLabel(row.field),
          from: row.from || null,
          to: row.to || null,
        };
      })
      .filter(Boolean) as { field: string; from: string | null; to: string | null }[];
  }

  if (props.activity.type !== "DATES_UPDATED") return [];
  return props.activity.message
    .split(", ")
    .filter(Boolean)
    .map((line) => ({ field: "Date", from: null, to: line }));
});

const commentText = computed(() => {
  if (props.activity.type !== "COMMENT") return null;
  const content = props.activity.metadata?.content;
  return typeof content === "string" ? content : null;
});

const headline = computed(() => {
  if (props.activity.type === "DATES_UPDATED") {
    return props.activity.message || "updated the due date";
  }
  if (props.activity.type === "COMMENT") return "commented";
  return props.activity.message;
});
</script>

<template>
  <div class="flex gap-3">
    <div
      class="h-8 w-8 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 text-[11px] font-semibold shrink-0 flex items-center justify-center overflow-hidden"
    >
      <img
        v-if="activity.user.imageUrl"
        :src="activity.user.imageUrl"
        class="h-full w-full object-cover"
      />
      <span v-else>{{ initials(activity.user) }}</span>
    </div>
    <div class="min-w-0 flex-1">
      <div class="flex items-start justify-between gap-3">
        <p class="text-sm leading-5">
          <span class="font-semibold text-foreground">{{
            activity.user.name || activity.user.email
          }}</span>{{ " " }}<span class="text-muted-foreground">{{
            headline
          }}</span>
        </p>
        <span class="shrink-0 text-xs text-muted-foreground whitespace-nowrap pt-0.5">
          {{
            formatDistanceToNow(new Date(activity.createdAt), {
              addSuffix: true,
            })
          }}
        </span>
      </div>

      <div
        v-if="dateChanges.length"
        class="mt-2 rounded-md border border-border bg-muted/40 overflow-hidden"
      >
        <div
          v-for="(change, index) in dateChanges"
          :key="`${change.field}-${index}`"
          class="flex items-center gap-3 px-3 py-2 text-xs"
          :class="index ? 'border-t border-border' : ''"
        >
          <span class="w-12 shrink-0 font-medium text-muted-foreground">{{
            change.field
          }}</span>
          <span class="min-w-0 flex-1 text-foreground">
            <template v-if="change.from && change.to && change.field !== 'Date'">
              <span class="text-muted-foreground line-through">{{ change.from }}</span>
              <span class="mx-1.5 text-muted-foreground">→</span>
              <span>{{ change.to }}</span>
            </template>
            <template v-else-if="change.to && change.field !== 'Date'">
              {{ change.to }}
            </template>
            <template v-else-if="change.from && !change.to">
              <span class="text-muted-foreground line-through">{{ change.from }}</span>
              <span class="ml-1.5 text-muted-foreground">cleared</span>
            </template>
            <template v-else>
              {{ change.to }}
            </template>
          </span>
        </div>
      </div>

      <p
        v-if="commentText"
        class="mt-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground whitespace-pre-wrap"
      >
        {{ commentText }}
      </p>
    </div>
  </div>
</template>
