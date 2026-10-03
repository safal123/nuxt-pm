<script setup lang="ts">
import { CalendarDaysIcon, Columns3Icon, Table2Icon } from "lucide-vue-next";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const { view, setView } = useProjectView();

const VIEWS = [
  { id: "board", label: "Board", icon: Columns3Icon },
  { id: "table", label: "Table", icon: Table2Icon },
  { id: "calendar", label: "Calendar", icon: CalendarDaysIcon },
] as const;
</script>

<template>
  <Tabs :model-value="view" class="shrink-0" @update:model-value="setView">
    <TooltipProvider :delay-duration="300">
      <TabsList class="h-8 p-0.5">
        <Tooltip v-for="item in VIEWS" :key="item.id">
          <TooltipTrigger as-child>
            <TabsTrigger :value="item.id" class="h-7 px-2" :aria-label="item.label">
              <component :is="item.icon" class="h-3.5 w-3.5" />
            </TabsTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">{{ item.label }}</TooltipContent>
        </Tooltip>
      </TabsList>
    </TooltipProvider>
  </Tabs>
</template>
