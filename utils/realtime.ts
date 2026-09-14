import type { Task, TaskColumn, TaskLabel, WorkspaceActivity } from "~/types";

export const REALTIME_CLIENT_HEADER = "x-realtime-client-id";
export const REALTIME_CLIENT_STORAGE_KEY = "ns-realtime-client-id";

export const projectChannel = (projectId: string) => `project:${projectId}`;
export const workspaceChannel = (workspaceId: string) =>
  `workspace:${workspaceId}`;
export const userChannel = (userId: string) => `user:${userId}`;

export type RealtimeEvent = { type: string; [key: string]: unknown };

export type RealtimePublish = {
  channel: string;
  event: RealtimeEvent;
};

export type BoardRealtimeEvent =
  | { type: "task.upsert"; task: Task }
  | { type: "task.removed"; taskId: string }
  | { type: "task.like"; taskId: string; likeCount: number }
  | {
      type: "column.upsert";
      column: Pick<TaskColumn, "id" | "name" | "order" | "projectId"> & {
        color?: string | null;
        archivedAt?: string | Date | null;
        tasks?: Task[];
        completedCount?: number;
      };
    }
  | { type: "column.removed"; columnId: string }
  | { type: "column.moved"; columnIds: string[] }
  | { type: "label.created"; label: TaskLabel; task?: Task }
  | { type: "board.refresh" };

export type BoardRealtimePayload = BoardRealtimeEvent & {
  clientId?: string | null;
};

export const boardRealtime = (
  projectId: string,
  event: BoardRealtimeEvent,
): RealtimePublish => ({
  channel: projectChannel(projectId),
  event,
});

export type WorkspaceRealtimeEvent =
  | { type: "activity.created"; activity: WorkspaceActivity }
  | { type: "email.sent"; id: string | null };

export const workspaceRealtime = (
  workspaceId: string,
  event: RealtimeEvent,
): RealtimePublish => ({
  channel: workspaceChannel(workspaceId),
  event,
});

export const userRealtime = (
  userId: string,
  event: RealtimeEvent,
): RealtimePublish => ({
  channel: userChannel(userId),
  event,
});

export const realtimeClientId = () => {
  if (!import.meta.client) return "";
  let id = sessionStorage.getItem(REALTIME_CLIENT_STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(REALTIME_CLIENT_STORAGE_KEY, id);
  }
  return id;
};
