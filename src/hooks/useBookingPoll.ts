import { useRef, useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import type { BookingStatusResponse } from "@/lib/types";

const POLL_INTERVAL_MS = 2000;
const MAX_FAILURES = 10;

const TERMINAL_PHASES = new Set([
  "completed",
  "failed",
  "cancelled",
  "user_cancelled",
]);

export function useBookingPoll() {
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [status, setStatus] = useState<BookingStatusResponse | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const failuresRef = useRef(0);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(
    (id: string) => {
      stop();
      setBookingId(id);
      setStatus(null);
      failuresRef.current = 0;
    },
    [stop],
  );

  const respond = useCallback(
    async (answer: string) => {
      if (!bookingId) return;
      try {
        await apiFetch(`/booking/${bookingId}/respond`, {
          method: "POST",
          body: JSON.stringify({ answer }),
        });
      } catch {
        // Best effort
      }
    },
    [bookingId],
  );

  const cancel = useCallback(async () => {
    if (!bookingId) return;
    try {
      await apiFetch(`/booking/${bookingId}/cancel`, {
        method: "POST",
        body: JSON.stringify({ confirm: true }),
      });
    } catch {
      // Best effort
    }
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId) return;

    const poll = async () => {
      try {
        const res = await apiFetch(`/booking/${bookingId}/status`);
        if (!res.ok) {
          failuresRef.current++;
          if (failuresRef.current >= MAX_FAILURES) stop();
          return;
        }
        failuresRef.current = 0;
        const data: BookingStatusResponse = await res.json();
        setStatus(data);

        if (TERMINAL_PHASES.has(data.phase)) {
          stop();
        }
      } catch {
        failuresRef.current++;
        if (failuresRef.current >= MAX_FAILURES) stop();
      }
    };

    // Poll immediately, then on interval
    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => stop();
  }, [bookingId, stop]);

  return { bookingId, status, start, stop, respond, cancel };
}
