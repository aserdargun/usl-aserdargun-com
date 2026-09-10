export type ProgressState = {
  version: 1;
  completedIds: string[];
  quizAttempts: Array<{ score: number; at: string; gaps: string[] }>;
  labInputs: Record<string, number>;
};
export type FlashcardState = { box: number; nextReview: number; seenCount: number; correctCount: number };
export type FlashcardProgress = Record<string, FlashcardState>;

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const integer = (value: unknown, min = 0): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= min;

export function emptyProgress(): ProgressState {
  return { version: 1, completedIds: [], quizAttempts: [], labInputs: {} };
}

export function parseProgress(raw: string | null, validIds: string[]): ProgressState {
  const result = emptyProgress();
  try {
    const saved: unknown = JSON.parse(raw ?? "null");
    if (!record(saved) || saved.version !== 1) return result;
    if (Array.isArray(saved.completedIds)) result.completedIds = [...new Set(saved.completedIds.filter((id): id is string => typeof id === "string" && validIds.includes(id)))];
    if (Array.isArray(saved.quizAttempts)) {
      result.quizAttempts = saved.quizAttempts.filter((attempt): attempt is ProgressState["quizAttempts"][number] =>
        record(attempt) && integer(attempt.score) && attempt.score <= 100 && typeof attempt.at === "string" && Number.isFinite(Date.parse(attempt.at)) && Array.isArray(attempt.gaps) && attempt.gaps.every((gap) => typeof gap === "string")
      );
    }
    if (record(saved.labInputs)) {
      const positive = ["micro", "accum", "gpus", "epochs", "rank", "matrices", "dimension"];
      const keys = ["dataset", ...positive, "contextMax", "systemTokens", "templateTokens", "inputTokens", "ragTokens", "responseTokens", "alpha", "mixTotal", "mixStandard", "mixParaphrase", "mixMissing", "mixNegative", "mixEscalation", "scoreDomain", "scoreFormat", "scoreSafety", "scoreUncertainty", "scoreRetention", "baseTokens", "candidateTokens"];
      for (const key of keys) {
        const value = saved.labInputs[key];
        const max = key.startsWith("score") || (key.startsWith("mix") && key !== "mixTotal") ? 100 : 1_000_000_000;
        if (integer(value, positive.includes(key) ? 1 : 0) && value <= max) result.labInputs[key] = value;
      }
    }
  } catch { /* Invalid or outdated storage must never prevent learning. */ }
  return result;
}

export function parseFlashcards(raw: string | null, validIds: string[], boxCount: number): FlashcardProgress {
  const result: FlashcardProgress = {};
  try {
    const saved: unknown = JSON.parse(raw ?? "null");
    if (!record(saved)) return result;
    for (const id of validIds) {
      const p = saved[id];
      if (record(p) && integer(p.box) && p.box < boxCount && integer(p.nextReview) && integer(p.seenCount) && integer(p.correctCount) && p.correctCount <= p.seenCount) {
        result[id] = { box: p.box, nextReview: p.nextReview, seenCount: p.seenCount, correctCount: p.correctCount };
      }
    }
  } catch { /* Recover from invalid local records. */ }
  return result;
}

export function readStorage(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
export function writeStorage(key: string, value: string): boolean {
  try { window.localStorage.setItem(key, value); return true; } catch { return false; }
}
