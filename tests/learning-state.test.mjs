import assert from "node:assert/strict";
import test from "node:test";
import { emptyProgress, parseProgress, parseFlashcards, readStorage, writeStorage } from "../lib/learning-state.ts";

test("malformed, null, and unsupported progress cannot break the app", () => {
  for (const raw of [null, "{", "null", "[]", '{"version":2}', '{"version":1,"completedIds":null,"quizAttempts":null,"labInputs":null}']) {
    assert.deepEqual(parseProgress(raw, ["models"]), emptyProgress());
  }
});

test("restoration retains valid records while removing duplicates and unsafe inputs", () => {
  const progress = parseProgress(JSON.stringify({ version: 1, completedIds: ["models", "models", "unknown", null], labInputs: { rank: 0, micro: -2, gpus: 1.5, alpha: 8, scoreDomain: 101, mixStandard: -10, dimension: 3584, arbitrary: 3 }, quizAttempts: [{ score: 90, at: "2026-09-10T12:00:00Z", gaps: ["tokens"] }, { score: 200, at: "bad", gaps: null }] }), ["models"]);
  assert.deepEqual(progress.completedIds, ["models"]);
  assert.deepEqual(progress.labInputs, { alpha: 8, dimension: 3584 });
  assert.equal(progress.quizAttempts.length, 1);
});

test("flashcard restoration validates every stored record", () => {
  for (const raw of [null, "{", "null", "[]", '{"a":null}']) assert.deepEqual(parseFlashcards(raw, ["a"], 5), {});
  const a = { box: 4, nextReview: 1234, seenCount: 3, correctCount: 2 };
  assert.deepEqual(parseFlashcards(JSON.stringify({ a, b: { ...a, box: 8 }, c: { ...a, correctCount: 9 }, unknown: a }), ["a", "b", "c"], 5), { a });
});

test("denied browser storage degrades to a readable, in-memory session", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: { get localStorage() { throw new Error("denied"); } } });
  try { assert.equal(readStorage("key"), null); assert.equal(writeStorage("key", "value"), false); }
  finally { if (previous) Object.defineProperty(globalThis, "window", previous); else delete globalThis.window; }
});
