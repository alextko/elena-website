import { apiFetch } from "@/lib/apiFetch";
import { getOrCreateAnonId, getAnonId } from "@/lib/anonId";

export type PendingSource = "landing_hero" | "risk_assessment" | "invite" | "madlib" | "demo";

export interface PostPendingArgs {
  content: string;
  source: PendingSource;
  landing_variant?: string | null;
  pending_doc_name?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ClaimedPendingMessage {
  id: string;
  content: string;
  source: string;
  created_at: string;
}

export interface ClaimResult {
  session_id: string | null;
  claimed_count: number;
  messages: ClaimedPendingMessage[];
  // Set when the claim path also generated an onboarding welcome (currently
  // only the quiz-funnel sources). When present, the welcome is already
  // persisted to chat_messages on the server; the frontend should NOT
  // auto-resend the synthetic localStorage query.
  welcome_message?: string | null;
  welcome_suggestions?: string[];
  quiz_results_persisted?: boolean;
}

export async function postPendingMessage(args: PostPendingArgs): Promise<void> {
  const anon_id = getOrCreateAnonId();
  if (!anon_id) return;
  const body = {
    anon_id,
    content: args.content,
    source: args.source,
    landing_variant: args.landing_variant ?? null,
    pending_doc_name: args.pending_doc_name ?? null,
    metadata: args.metadata ?? null,
  };
  try {
    const res = await apiFetch("/chat/pending", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.warn("[pendingMessage] POST failed", res.status);
    }
  } catch (err) {
    console.warn("[pendingMessage] POST threw", err);
  }
}

export async function claimPendingMessages(): Promise<ClaimResult | null> {
  const anon_id = getAnonId();
  if (!anon_id) return null;
  try {
    const res = await apiFetch("/chat/pending/claim", {
      method: "POST",
      body: JSON.stringify({ anon_id }),
    });
    if (!res.ok) {
      console.warn("[pendingMessage] claim failed", res.status);
      return null;
    }
    return (await res.json()) as ClaimResult;
  } catch (err) {
    console.warn("[pendingMessage] claim threw", err);
    return null;
  }
}
