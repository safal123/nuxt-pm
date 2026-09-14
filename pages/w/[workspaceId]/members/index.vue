<script setup lang="ts">
import { UserPlusIcon, UsersIcon } from "lucide-vue-next";
import type { Member } from "@/types";
import { personInitials } from "@/utils/activity";
import { Button } from "@/components/ui/button";

definePageMeta({
  layout: "dashboard",
  name: "workspace-members",
  middleware: "workspace",
});

const route = useRoute();
const workspaceStore = useWorkspaceStore();
const userStore = useUserStore();
const modalsStore = useModalsStore();
const workspaceId = computed(() => String(route.params.workspaceId || ""));

await workspaceStore.fetchMembers(workspaceId.value);

watch(
  () => workspaceStore.activeWorkspaceId,
  (id) => {
    if (id) void workspaceStore.fetchMembers(id);
  },
);

const members = computed(() => workspaceStore.members);
const owners = computed(() => members.value.filter((person) => person.isOwner).length);

const statItems = computed(() => [
  { label: "People", value: members.value.length, icon: UsersIcon },
  { label: "Owners", value: owners.value, icon: UsersIcon },
  {
    label: "Members",
    value: members.value.length - owners.value,
    icon: UsersIcon,
  },
]);

const isYou = (person: Member) => person.id === userStore.user?.id;

const openAdd = () => modalsStore.openModal("workspaceMembers");
</script>

<template>
  <div class="h-full min-w-0 overflow-y-auto">
    <div class="mb-5 flex items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold tracking-tight text-foreground">
          People
        </h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Everyone in this workspace. Open a profile to see their projects and
          activity.
        </p>
      </div>
      <Button size="sm" @click="openAdd">
        <UserPlusIcon class="h-4 w-4" />
        Add people
      </Button>
    </div>

    <PageStats :items="statItems" />

    <div class="mt-5 overflow-hidden rounded-xl border border-border bg-card">
      <div
        v-if="!members.length"
        class="flex flex-col items-center px-4 py-16 text-center"
      >
        <div
          class="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground"
        >
          <UsersIcon class="h-5 w-5" />
        </div>
        <p class="mt-3 text-sm font-medium text-foreground">No people yet</p>
        <p class="mt-1 max-w-sm text-sm text-muted-foreground">
          Invite teammates to collaborate in this workspace.
        </p>
      </div>
      <div v-else class="divide-y divide-border">
        <NuxtLink
          v-for="person in members"
          :key="person.id"
          :to="{
            name: 'workspace-member',
            params: { workspaceId, userId: person.id },
          }"
          class="flex items-center gap-3 px-4 py-3.5 hover:bg-accent/50"
        >
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-100 text-[12px] font-semibold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
          >
            <img
              v-if="person.imageUrl"
              :src="person.imageUrl"
              alt=""
              class="h-full w-full object-cover"
            />
            <span v-else>{{ personInitials(person) }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-foreground">
              {{ person.name || person.email }}
              <span
                v-if="isYou(person)"
                class="ml-1.5 text-xs font-normal text-muted-foreground"
              >
                You
              </span>
            </p>
            <p class="truncate text-xs text-muted-foreground">
              {{ person.email }}
            </p>
          </div>
          <span
            class="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium capitalize text-muted-foreground"
          >
            {{ person.isOwner ? "Owner" : person.role?.toLowerCase() || "Member" }}
          </span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
