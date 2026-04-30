import type { ChatSessionItem } from "./types";

type SessionRef = Pick<ChatSessionItem, "id">;

export function getRestorableSessionId(
  storedSessionId: string | null,
  sessions: readonly SessionRef[],
): string | null {
  if (!storedSessionId) return null;
  return sessions.some((session) => session.id === storedSessionId) ? storedSessionId : null;
}

export function reconcileRestoredSessionId(params: {
  activeSessionId: string | null;
  restoredSessionId: string | null;
  sessions: readonly SessionRef[];
}): string | null | undefined {
  const { activeSessionId, restoredSessionId, sessions } = params;

  if (!activeSessionId || !restoredSessionId) return undefined;
  if (activeSessionId !== restoredSessionId) return undefined;
  if (sessions.some((session) => session.id === activeSessionId)) return undefined;

  return sessions[0]?.id ?? null;
}
