const ANON_ID_KEY = "elena_anon_id";

export function getOrCreateAnonId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let id = localStorage.getItem(ANON_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ANON_ID_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export function getAnonId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ANON_ID_KEY);
  } catch {
    return null;
  }
}

export function clearAnonId(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ANON_ID_KEY);
  } catch {}
}
