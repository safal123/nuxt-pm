import {
  BaseRealtime,
  FetchRequest,
  WebSocketTransport,
} from "ably/modular";
import { api } from "~/lib/api";
import { realtimeClientId } from "~/utils/realtime";

type RealtimeScope = {
  projectId?: string;
  workspaceId?: string;
};

type Subscriber = {
  channel: string;
  onEvent: (payload: unknown) => void;
  scope: RealtimeScope;
  listener?: (message: { data?: unknown }) => void;
};

let client: BaseRealtime | null = null;
let connectedKey = "";
const subscribers = new Set<Subscriber>();

const scopeKey = (scope: RealtimeScope) =>
  `${scope.workspaceId || ""}:${scope.projectId || ""}`;

const aggregateScope = (): RealtimeScope => {
  const scope: RealtimeScope = {};
  for (const subscriber of subscribers) {
    if (subscriber.scope.workspaceId) {
      scope.workspaceId = subscriber.scope.workspaceId;
    }
    if (subscriber.scope.projectId) {
      scope.projectId = subscriber.scope.projectId;
    }
  }
  return scope;
};

const teardownClient = () => {
  if (!client) return;
  client.close();
  client = null;
  connectedKey = "";
};

const attach = (subscriber: Subscriber) => {
  if (!client || !subscriber.channel) return;
  const channel = client.channels.get(subscriber.channel);
  const listener = (message: { data?: unknown }) => {
    if (message.data) subscriber.onEvent(message.data);
  };
  channel.subscribe(listener);
  subscriber.listener = listener;
};

const detach = (subscriber: Subscriber) => {
  if (!client || !subscriber.listener || !subscriber.channel) return;
  client.channels.get(subscriber.channel).unsubscribe(subscriber.listener);
  subscriber.listener = undefined;
};

const syncClient = () => {
  const config = useRuntimeConfig();
  if (!import.meta.client || !config.public.ablyEnabled || !subscribers.size) {
    teardownClient();
    return;
  }

  const scope = aggregateScope();
  const key = scopeKey(scope);
  if (client && connectedKey === key) return;

  teardownClient();
  const clientId = realtimeClientId();
  client = new BaseRealtime({
    clientId,
    plugins: { WebSocketTransport, FetchRequest },
    authCallback: (_tokenParams, callback) => {
      const current = aggregateScope();
      api("/api/ably/token", {
        method: "POST",
        body: {
          clientId,
          projectId: current.projectId || undefined,
          workspaceId: current.workspaceId || undefined,
        },
      })
        .then((tokenRequest) => callback(null, tokenRequest))
        .catch((error) =>
          callback(
            error instanceof Error ? error.message : "Token request failed",
            null,
          ),
        );
    },
  });
  connectedKey = key;
  for (const subscriber of subscribers) attach(subscriber);
};

export const useRealtimeChannel = (
  channelName: MaybeRefOrGetter<string>,
  onEvent: (payload: unknown) => void,
  scope: MaybeRefOrGetter<RealtimeScope>,
) => {
  const subscriber: Subscriber = {
    channel: "",
    onEvent,
    scope: {},
  };

  const stop = () => {
    detach(subscriber);
    subscribers.delete(subscriber);
    if (!subscribers.size) teardownClient();
  };

  const start = () => {
    const nextChannel = toValue(channelName);
    const nextScope = toValue(scope);
    const alreadyActive = subscribers.has(subscriber);
    const sameChannel = subscriber.channel === nextChannel;
    const sameScope = scopeKey(subscriber.scope) === scopeKey(nextScope);

    if (alreadyActive && sameChannel && sameScope) return;

    if (alreadyActive) {
      detach(subscriber);
      subscribers.delete(subscriber);
    }

    subscriber.channel = nextChannel;
    subscriber.scope = nextScope;
    if (!nextChannel) {
      if (!subscribers.size) teardownClient();
      return;
    }

    subscribers.add(subscriber);
    const key = scopeKey(aggregateScope());
    if (client && connectedKey === key) {
      attach(subscriber);
      return;
    }
    syncClient();
  };

  watch(
    () => [toValue(channelName), scopeKey(toValue(scope))] as const,
    start,
    { immediate: true },
  );

  onUnmounted(stop);
};
