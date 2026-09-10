<script setup lang="ts">
import {
  DownloadIcon,
  FileIcon,
  Loader2Icon,
  PaperclipIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-vue-next";
import { toast } from "vue-sonner";
import type { Attachment } from "@/types";
import { api } from "~/lib/api";
import {
  MAX_CARD_FILES,
  MAX_CARD_FILE_BYTES,
  MAX_CARD_FILE_SIZE,
} from "@/utils/upload-limits";

const props = withDefaults(
  defineProps<{
    attachableType: string
    attachableId: string
    ownerId?: string | null
    files?: Attachment[]
    subject?: string
  }>(),
  {
    ownerId: null,
    subject: "this item",
  },
);

const emit = defineEmits<{
  changed: []
}>();

const userStore = useUserStore();
const fileInput = ref<HTMLInputElement | null>(null);
const removingAttachmentId = ref<string | null>(null);
const fetchedFiles = ref<Attachment[]>([]);

const attachments = computed(() => props.files ?? fetchedFiles.value);

const loadAttachments = async () => {
  if (props.files || !props.attachableType || !props.attachableId) return;
  const { attachments: next } = await api<{ attachments: Attachment[] }>(
    "/api/attachments",
    { query: { attachableType: props.attachableType, attachableId: props.attachableId } },
  );
  fetchedFiles.value = next ?? [];
};

watch(
  () => [props.attachableType, props.attachableId] as const,
  () => {
    void loadAttachments();
  },
  { immediate: true },
);

const { startUpload, isUploading } = useUploadThing("attachment", {
  onClientUploadComplete: async () => {
    toast.success("File uploaded");
    emit("changed");
    await loadAttachments();
  },
  onUploadError: (error) => {
    const message = error.message || "";
    if (message.includes("FileCountMismatch")) {
      toast.error("Too many files", {
        description: `You can upload up to ${MAX_CARD_FILES} files at a time.`,
      });
      return;
    }
    toast.error("Upload failed", {
      description: message || "Please try again.",
    });
  },
});

const onFilesSelected = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = "";
  if (!files.length || !props.attachableId) return;

  if (files.length > MAX_CARD_FILES) {
    toast.error(`Too many files (${files.length})`, {
      description: `You selected ${files.length} files. You can upload up to ${MAX_CARD_FILES} at a time.`,
    });
    return;
  }

  const oversized = files.filter((file) => file.size > MAX_CARD_FILE_BYTES);
  if (oversized.length) {
    const names = oversized.map((file) => file.name).slice(0, 3).join(", ");
    toast.error(
      oversized.length === 1
        ? "1 file exceeds 8 MB"
        : `${oversized.length} files exceed 8 MB`,
      {
        description: names + (oversized.length > 3 ? "…" : ""),
      },
    );
    return;
  }

  await startUpload(files, {
    attachableType: props.attachableType,
    attachableId: props.attachableId,
  });
};

const isRemoving = (attachmentId: string) =>
  removingAttachmentId.value === attachmentId;

const canRemoveAttachment = (attachment: Attachment) => {
  const userId = userStore.user?.id;
  if (!userId) return false;
  return attachment.uploadedBy === userId || props.ownerId === userId;
};

const removeAttachment = async (attachment: Attachment) => {
  if (!canRemoveAttachment(attachment)) return;
  removingAttachmentId.value = attachment.id;
  try {
    await api(`/api/attachments/${attachment.id}`, { method: "DELETE" });
    emit("changed");
    await loadAttachments();
  } catch (error: any) {
    toast.error("Could not remove file", {
      description: error?.data?.message || "Please try again.",
    });
  } finally {
    removingAttachmentId.value = null;
  }
};

const isImageAttachment = (attachment: Attachment) =>
  !!attachment.mimeType?.startsWith("image/");

const isRemoteUrl = (url: string) => /^https?:\/\//i.test(url);

const formatBytes = (size: number | null) => {
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-start justify-between gap-3">
      <p class="text-sm text-muted-foreground">
        {{ attachments.length }}
        {{ attachments.length === 1 ? "file" : "files" }} on {{ subject }}.
        Up to {{ MAX_CARD_FILES }} files at a time, {{ MAX_CARD_FILE_SIZE }} each.
      </p>
      <div>
        <input
          ref="fileInput"
          type="file"
          multiple
          class="sr-only"
          @change="onFilesSelected"
        />
        <Button
          type="button"
          size="sm"
          :disabled="isUploading || !!removingAttachmentId"
          @click="fileInput?.click()"
        >
          <PlusIcon class="h-4 w-4 mr-1" />
          {{ isUploading ? "Uploading…" : "Upload" }}
        </Button>
      </div>
    </div>

    <div v-if="attachments.length" class="space-y-2">
      <article
        v-for="file in attachments"
        :key="file.id"
        class="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 transition-opacity"
        :class="isRemoving(file.id) ? 'opacity-60 pointer-events-none' : ''"
        :aria-busy="isRemoving(file.id)"
      >
        <a
          v-if="isRemoteUrl(file.url)"
          :href="file.url"
          target="_blank"
          rel="noopener noreferrer"
          class="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted flex items-center justify-center"
        >
          <img
            v-if="isImageAttachment(file)"
            :src="file.url"
            :alt="file.name"
            class="h-full w-full object-cover"
          />
          <FileIcon v-else class="h-4 w-4 text-muted-foreground" />
        </a>
        <div
          v-else
          class="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted flex items-center justify-center"
        >
          <FileIcon class="h-4 w-4 text-muted-foreground" />
        </div>
        <div class="min-w-0 flex-1">
          <a
            v-if="isRemoteUrl(file.url)"
            :href="file.url"
            target="_blank"
            rel="noopener noreferrer"
            class="block truncate text-sm font-medium text-foreground hover:underline"
          >
            {{ file.name }}
          </a>
          <p v-else class="truncate text-sm font-medium text-foreground">
            {{ file.name }}
          </p>
          <p class="truncate text-xs text-muted-foreground">
            <template v-if="isRemoving(file.id)">Removing…</template>
            <template v-else>
              <template v-if="formatBytes(file.size)">{{ formatBytes(file.size) }} · </template>
              {{ file.uploader?.name || file.uploader?.email || "Uploaded" }}
            </template>
          </p>
        </div>
        <a
          v-if="isRemoteUrl(file.url)"
          :href="file.url"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          :title="`Open ${file.name}`"
        >
          <DownloadIcon class="h-4 w-4" />
        </a>
        <button
          v-if="canRemoveAttachment(file)"
          type="button"
          class="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-100"
          :disabled="!!removingAttachmentId"
          :title="isRemoving(file.id) ? 'Removing…' : `Remove ${file.name}`"
          :aria-label="isRemoving(file.id) ? `Removing ${file.name}` : `Remove ${file.name}`"
          @click="removeAttachment(file)"
        >
          <Loader2Icon
            v-if="isRemoving(file.id)"
            class="h-4 w-4 animate-spin text-destructive"
          />
          <Trash2Icon v-else class="h-4 w-4" />
        </button>
      </article>
    </div>
    <div
      v-else
      class="flex flex-col items-center justify-center py-10 text-center"
    >
      <div
        class="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground"
      >
        <PaperclipIcon class="h-4 w-4" />
      </div>
      <p class="mt-3 text-sm font-medium text-foreground">No files yet</p>
      <p class="mt-1 max-w-xs text-sm text-muted-foreground">
        Attach screenshots, specs, or anything the team needs on {{ subject }}.
      </p>
    </div>
  </div>
</template>
