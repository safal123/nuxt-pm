<script setup lang="ts">
import { User2Icon, UserPlusIcon, XIcon } from "lucide-vue-next";
import { toast } from "vue-sonner";
import type { Member } from "@/types";
import { api } from "~/lib/api";

const props = defineProps<{
  workspaceId: string;
  projectId: string;
}>();

const workspaceStore = useWorkspaceStore();
const boardStore = useBoardStore();

const members = ref<Member[]>([]);
const loading = ref(false);
const addingId = ref<string | null>(null);
const removingId = ref<string | null>(null);

const initials = (person: Member) => {
  const name = person.name || person.email || "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
};

const load = async () => {
  loading.value = true;
  try {
    if (props.workspaceId) await workspaceStore.fetchMembers(props.workspaceId);
    const { members: next } = await api<{ members: Member[] }>(
      `/api/projects/${props.projectId}/members`,
    );
    members.value = next ?? [];
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const available = computed(() =>
  workspaceStore.members.filter(
    (person) => !members.value.some((member) => member.id === person.id),
  ),
);

const addMember = async (person: Member) => {
  addingId.value = person.id;
  try {
    const { member } = await api<{ member: Member }>(
      `/api/projects/${props.projectId}/members`,
      { method: "POST", body: { userId: person.id } },
    );
    if (member) members.value.push(member);
    if (boardStore.projectId === props.projectId) {
      await boardStore.fetchProjectMembers(props.projectId, { force: true });
    }
    toast.success("Member added to the project.");
  } catch (error: any) {
    toast.error(error?.data?.message || "Could not add that member.");
  } finally {
    addingId.value = null;
  }
};

const removeMember = async (person: Member) => {
  if (person.isOwner) return;
  removingId.value = person.id;
  try {
    await api(`/api/projects/${props.projectId}/members/${person.id}`, {
      method: "DELETE",
    });
    members.value = members.value.filter((member) => member.id !== person.id);
    if (boardStore.projectId === props.projectId) {
      await boardStore.fetchProjectMembers(props.projectId, { force: true });
    }
    toast.success("Member removed from the project.");
  } catch (error: any) {
    toast.error(error?.data?.message || "Could not remove that member.");
  } finally {
    removingId.value = null;
  }
};
</script>

<template>
  <BaseDialog size="lg" title="Project members">
    <template #trigger>
      <div class="flex items-center gap-2 cursor-pointer w-full" @click="load">
        <User2Icon class="w-4 h-4" />
        Members
      </div>
    </template>
    <template #body>
      <p class="text-sm text-muted-foreground mb-4">
        Project members can be assigned to tasks. Add people from this workspace, or remove them from the project.
      </p>

      <div v-if="loading" class="text-sm text-muted-foreground py-6 text-center">Loading…</div>

      <div v-else class="space-y-4">
        <div class="max-h-[240px] overflow-y-auto space-y-1">
          <div
            v-for="person in members"
            :key="person.id"
            class="flex items-center gap-3 rounded-lg px-2 py-2"
          >
            <div
              class="h-8 w-8 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 text-[11px] font-semibold overflow-hidden flex items-center justify-center"
            >
              <img v-if="person.imageUrl" :src="person.imageUrl" class="h-full w-full object-cover" />
              <span v-else>{{ initials(person) }}</span>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-foreground truncate">
                {{ person.name || person.email }}
              </p>
              <p class="text-xs text-muted-foreground truncate">{{ person.email }}</p>
            </div>
            <span
              v-if="person.isOwner"
              class="text-[11px] font-semibold uppercase tracking-wide text-violet-700 bg-violet-50 dark:text-violet-300 dark:bg-violet-500/20 px-2 py-0.5 rounded"
            >
              Owner
            </span>
            <button
              v-else
              type="button"
              class="text-muted-foreground hover:text-red-600 p-1"
              :disabled="removingId === person.id"
              @click="removeMember(person)"
            >
              <XIcon class="h-4 w-4" />
            </button>
          </div>
          <p v-if="!members.length" class="text-sm text-muted-foreground py-4 text-center">
            No project members yet.
          </p>
        </div>

        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Add from workspace
          </p>
          <div class="max-h-[180px] overflow-y-auto space-y-1">
            <button
              v-for="person in available"
              :key="person.id"
              type="button"
              class="w-full flex items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-accent"
              :disabled="addingId === person.id"
              @click="addMember(person)"
            >
              <div
                class="h-8 w-8 rounded-full bg-muted text-muted-foreground text-[11px] font-semibold overflow-hidden flex items-center justify-center"
              >
                <img v-if="person.imageUrl" :src="person.imageUrl" class="h-full w-full object-cover" />
                <span v-else>{{ initials(person) }}</span>
              </div>
              <span class="flex-1 truncate text-sm text-foreground">
                {{ person.name || person.email }}
              </span>
              <UserPlusIcon class="h-4 w-4 text-muted-foreground" />
            </button>
            <p v-if="!available.length" class="text-sm text-muted-foreground px-2 py-2">
              Everyone in the workspace is already on this project.
            </p>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <DialogClose as-child>
        <Button size="sm" variant="outline">Close</Button>
      </DialogClose>
    </template>
  </BaseDialog>
</template>
