import {
  projectChannel,
  type BoardRealtimePayload,
} from "~/utils/realtime";

export const useBoardRealtime = (projectId: MaybeRefOrGetter<string>) => {
  const { workspaceId } = useWorkspaceLayout();
  const boardStore = useBoardStore();

  useRealtimeChannel(
    () => projectChannel(toValue(projectId)),
    (payload) => {
      boardStore.applyRealtimeEvent(payload as BoardRealtimePayload);
    },
    () => ({
      projectId: toValue(projectId) || undefined,
      workspaceId: workspaceId.value || undefined,
    }),
  );
};
