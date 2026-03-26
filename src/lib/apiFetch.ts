import { supabase } from "@/lib/supabase";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://elena-backend-production-production.up.railway.app";

export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(options.headers);
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  headers.set(
    "X-Timezone",
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );

  headers.set("X-Client-Type", "web");

  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  return fetch(url, { ...options, headers });
}
