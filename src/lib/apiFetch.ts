import { supabase } from "@/lib/supabase";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://elena-backend-production-production.up.railway.app";

const RETRYABLE_STATUS = new Set([502, 503, 504]);
const MAX_RETRIES = 2;
const RETRY_DELAYS = [800, 1600]; // ms

async function buildHeaders(
  options: RequestInit,
): Promise<{ headers: Headers; token: string | null }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(options.headers);
  const token = session?.access_token ?? null;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
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

  return { headers, token };
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const { headers, token } = await buildHeaders(options);

  let lastResponse: Response | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, { ...options, headers });

      // On 401, try refreshing the Supabase token once and retry
      if (res.status === 401 && token && attempt === 0) {
        const { data, error } = await supabase.auth.refreshSession();
        if (!error && data.session?.access_token) {
          headers.set(
            "Authorization",
            `Bearer ${data.session.access_token}`,
          );
          const retryRes = await fetch(url, { ...options, headers });
          return retryRes;
        }
      }

      // Retry on transient server errors (502/503/504)
      if (RETRYABLE_STATUS.has(res.status) && attempt < MAX_RETRIES) {
        lastResponse = res;
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
        continue;
      }

      return res;
    } catch (err: unknown) {
      // Network error — retry if we have attempts left
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
        continue;
      }
      throw err;
    }
  }

  // Should not reach here, but return last response as fallback
  return lastResponse!;
}
