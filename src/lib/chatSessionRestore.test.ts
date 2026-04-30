import test from "node:test";
import assert from "node:assert/strict";

import {
  getRestorableSessionId,
  reconcileRestoredSessionId,
} from "./chatSessionRestore.ts";

test("getRestorableSessionId only trusts cached sessions that contain the stored id", () => {
  assert.equal(
    getRestorableSessionId("session-b", [{ id: "session-a" }, { id: "session-b" }]),
    "session-b",
  );
  assert.equal(
    getRestorableSessionId("missing-session", [{ id: "session-a" }]),
    null,
  );
});

test("reconcileRestoredSessionId falls back when the restored session is missing from backend sessions", () => {
  assert.equal(
    reconcileRestoredSessionId({
      activeSessionId: "stale-session",
      restoredSessionId: "stale-session",
      sessions: [{ id: "real-session" }],
    }),
    "real-session",
  );
  assert.equal(
    reconcileRestoredSessionId({
      activeSessionId: "stale-session",
      restoredSessionId: "stale-session",
      sessions: [],
    }),
    null,
  );
});

test("reconcileRestoredSessionId leaves live session changes alone", () => {
  assert.equal(
    reconcileRestoredSessionId({
      activeSessionId: "new-live-session",
      restoredSessionId: "older-restored-session",
      sessions: [{ id: "real-session" }],
    }),
    undefined,
  );
});
