import type { ActivityTimelineTarget } from "~/types";

export const useActivityTimeline = () => {
  const modals = useModalsStore();

  const openTimeline = (target: ActivityTimelineTarget) => {
    if (!target.id) return;
    modals.openModal("activityTimeline", {
      kind: target.kind,
      id: target.id,
      name: target.name,
    });
  };

  return { openTimeline };
};
