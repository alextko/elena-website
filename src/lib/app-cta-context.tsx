"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as analytics from "@/lib/analytics";

// Permanent suppression once the user has engaged with (or explicitly dismissed)
// the CTA. We don't re-show regardless of how many more data items they add.
const DONE_KEY = "elena_app_cta_done";

type TriggerMetadata = Record<string, unknown>;

interface AppCtaContextValue {
  open: boolean;
  /** Why the CTA is currently open — drives subtitle copy in the modal. */
  reason: string | null;
  /** Open the CTA if the user hasn't already engaged with it. No-op otherwise. */
  showAppCta: (reason: string, metadata?: TriggerMetadata) => void;
  /** Mark done and close. Called by the Not-Now button / close X / escape. */
  dismiss: () => void;
  /** Mark done and close. Called when the user taps the App Store badge. */
  onDownloadClick: () => void;
}

const AppCtaContext = createContext<AppCtaContextValue | null>(null);

export function useAppCta(): AppCtaContextValue {
  const ctx = useContext(AppCtaContext);
  if (!ctx) throw new Error("useAppCta must be used within <AppCtaProvider>");
  return ctx;
}

export function AppCtaProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const metadataRef = useRef<TriggerMetadata>({});

  const showAppCta = useCallback(
    (reason: string, metadata?: TriggerMetadata) => {
      if (typeof window === "undefined") return;
      if (localStorage.getItem(DONE_KEY)) return;
      metadataRef.current = { trigger: reason, ...(metadata || {}) };
      setReason(reason);
      setOpen(true);
      analytics.track("App CTA: Shown", metadataRef.current);
    },
    [],
  );

  const markDone = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(DONE_KEY, "1");
      } catch {}
    }
  }, []);

  const dismiss = useCallback(() => {
    markDone();
    analytics.track("App CTA: Dismissed", metadataRef.current);
    setOpen(false);
  }, [markDone]);

  const onDownloadClick = useCallback(() => {
    markDone();
    analytics.track("App CTA: Download Clicked", metadataRef.current);
    setOpen(false);
  }, [markDone]);

  return (
    <AppCtaContext.Provider value={{ open, reason, showAppCta, dismiss, onDownloadClick }}>
      {children}
    </AppCtaContext.Provider>
  );
}
