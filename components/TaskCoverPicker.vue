<script setup lang="ts">
import { ImageIcon } from "lucide-vue-next";
import { toast } from "vue-sonner";
import type { Task } from "@/types";
import { COVER_PHOTOS } from "@/utils/covers";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const props = defineProps<{
  task: Task;
  overlay?: boolean;
}>();

const boardStore = useBoardStore();
const applying = ref<string | null>(null);

const hasCover = computed(
  () => Boolean(props.task.coverImage || props.task.coverColor),
);

const clearCover = async () => {
  await boardStore.patchTask(props.task.id, {
    coverColor: null,
    coverImage: null,
    coverThumb: null,
    coverCredit: null,
    coverCreditUrl: null,
  });
};

const setColor = async (colorId: string) => {
  if (props.task.coverColor === colorId && !props.task.coverImage) {
    await clearCover();
    return;
  }
  await boardStore.patchTask(props.task.id, {
    coverColor: colorId,
    coverImage: null,
    coverThumb: null,
    coverCredit: null,
    coverCreditUrl: null,
  });
};

const setPhoto = async (photo: (typeof COVER_PHOTOS)[number]) => {
  if (props.task.coverImage === photo.src) {
    await clearCover();
    return;
  }
  applying.value = photo.id;
  try {
    await boardStore.patchTask(props.task.id, {
      coverColor: null,
      coverImage: photo.src,
      coverThumb: photo.src,
      coverCredit: photo.credit,
      coverCreditUrl: photo.creditUrl,
    });
  } catch (error: any) {
    toast.error("Could not set cover", {
      description: error?.data?.message || "Please try again.",
    });
  } finally {
    applying.value = null;
  }
};
</script>

<template>
  <Popover :modal="false">
    <PopoverTrigger as-child>
      <button
        type="button"
        class="inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors"
        :class="
          overlay
            ? 'bg-black/40 text-white hover:bg-black/55'
            : 'text-muted-foreground opacity-70 hover:bg-accent hover:text-foreground hover:opacity-100'
        "
        aria-label="Cover"
        title="Cover"
      >
        <ImageIcon class="h-4 w-4" />
      </button>
    </PopoverTrigger>
    <PopoverContent
      align="end"
      :side-offset="8"
      class="z-[100] w-72 p-3"
    >
      <div class="space-y-3">
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm font-semibold text-foreground">Cover</p>
          <button
            v-if="hasCover"
            type="button"
            class="text-xs font-medium text-muted-foreground hover:text-foreground"
            @click="clearCover"
          >
            Remove
          </button>
        </div>

        <div>
          <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Colors
          </p>
          <div class="grid grid-cols-5 gap-1.5">
            <button
              v-for="color in TASK_COLORS"
              :key="color.id"
              type="button"
              class="h-7 rounded-md ring-offset-2"
              :class="
                !task.coverImage && task.coverColor === color.id
                  ? 'ring-2 ring-foreground'
                  : 'hover:opacity-90'
              "
              :style="{ backgroundColor: color.value }"
              :title="color.name"
              @click="setColor(color.id)"
            />
          </div>
        </div>

        <div>
          <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Photos
          </p>
          <div class="grid grid-cols-3 gap-1.5">
            <button
              v-for="photo in COVER_PHOTOS"
              :key="photo.id"
              type="button"
              class="group relative aspect-[4/3] overflow-hidden rounded-md ring-offset-2"
              :class="
                task.coverImage === photo.src
                  ? 'ring-2 ring-foreground'
                  : 'hover:opacity-95'
              "
              :disabled="applying === photo.id"
              @click="setPhoto(photo)"
            >
              <img
                :src="photo.src"
                :alt="photo.alt"
                class="h-full w-full object-cover"
              />
              <span
                class="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                {{ photo.credit }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
