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
    <PageHeader
      title="People"
      description="Everyone in this workspace. Open a profile to see their projects and activity."
    >
      <Button @click="openAdd">
        <UserPlusIcon />
        Add people
      </Button>
    </PageHeader>

    <PageStats :items="statItems" />

    <div class="mt-4 overflow-hidden rounded-xl border border-border bg-card">
      <div
        v-if="!members.length"
        class="flex flex-col items-center px-3 py-12 text-center"
      >
        <div
          class="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground"
        >
          <UsersIcon class="size-4" />
        </div>
        <p class="mt-2.5 text-[13px] font-medium text-foreground">No people yet</p>
        <p class="mt-1 max-w-sm text-[12px] text-muted-foreground">
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
          class="flex items-center gap-2.5 px-3 py-2.5 hover:bg-accent/50"
        >
          <div
            class="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-[10px] font-medium text-foreground"
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
            <p class="truncate text-[13px] font-medium text-foreground">
              {{ person.name || person.email }}
              <span
                v-if="isYou(person)"
                class="ml-1.5 text-[11px] font-normal text-muted-foreground"
              >
                You
              </span>
            </p>
            <p class="truncate text-[12px] text-muted-foreground">
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
