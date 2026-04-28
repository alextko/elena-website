import { track } from "@/lib/analytics";

function normalizeKeyPart(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function firstSeenStorageKey(profileId: string, kind: "tool" | "element", name: string): string {
  return `elena/${kind}_first_seen/${profileId}/${normalizeKeyPart(name)}`;
}

export function trackChatToolUsage(
  profileId: string | null | undefined,
  toolName: string,
  properties?: Record<string, unknown>,
): void {
  const normalized = toolName.trim();
  if (!normalized) return;

  track("chat_tool_used", {
    tool_name: normalized,
    ...properties,
  });

  if (!profileId || typeof window === "undefined") return;

  try {
    const key = firstSeenStorageKey(profileId, "tool", normalized);
    if (window.localStorage.getItem(key)) return;
    window.localStorage.setItem(key, "1");
    track("chat_tool_first_used", {
      tool_name: normalized,
      ...properties,
    });
  } catch {
    // Best effort only.
  }
}

export function trackChatElementShown(
  profileId: string | null | undefined,
  elementType: string,
  properties?: Record<string, unknown>,
): void {
  const normalized = elementType.trim();
  if (!normalized) return;

  track("chat_element_shown", {
    element_type: normalized,
    ...properties,
  });

  if (!profileId || typeof window === "undefined") return;

  try {
    const key = firstSeenStorageKey(profileId, "element", normalized);
    if (window.localStorage.getItem(key)) return;
    window.localStorage.setItem(key, "1");
    track("chat_element_first_shown", {
      element_type: normalized,
      ...properties,
    });
  } catch {
    // Best effort only.
  }
}
