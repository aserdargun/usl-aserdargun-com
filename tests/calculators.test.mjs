import assert from "node:assert/strict";
import test from "node:test";
import { batchMetrics, contextBudget, datasetMix, loraParameterCount, loraScale, weightedBenchmark } from "../lib/calculators.mjs";

test("effective batch and optimizer steps match the vault example", () => {
  assert.deepEqual(batchMetrics({ datasetSize: 2048, microBatch: 2, accumulation: 8, gpus: 1, epochs: 3 }), {
    effectiveBatch: 16,
    optimizerStepsPerEpoch: 128,
    totalOptimizerSteps: 384,
    microStepsPerEpoch: 1024,
  });
});

test("context budget includes all rendered components", () => {
  assert.deepEqual(contextBudget({ maximum: 4096, system: 200, template: 80, input: 900, rag: 1000, response: 600 }), { used: 2780, remaining: 1316, fits: true });
});

test("LoRA formulas separate scale and parameter capacity", () => {
  assert.equal(loraScale(8, 8), 1);
  assert.equal(loraScale(16, 16), 1);
  assert.ok(Math.abs(loraScale(16, 16, true) - 4) < 1e-10);
  assert.equal(loraParameterCount(8, 4096, 4096, 32), 2_097_152);
});

test("weighted benchmark applies 35/15/20/15/15 weights", () => {
  assert.equal(weightedBenchmark({ domain: 80, format: 90, safety: 100, uncertainty: 70, retention: 90 }), 85.5);
});

test("dataset mix reports invalid totals and rounded counts", () => {
  const valid = datasetMix(2000, { standard: 55, paraphrase: 10, missing: 15, negative: 10, escalation: 10 });
  assert.equal(valid.valid, true);
  assert.equal(valid.counts.missing, 300);
  assert.equal(datasetMix(100, { a: 60, b: 30 }).valid, false);
});

test("calculator boundaries reject zero divisors, negatives, fractions, and non-finite inputs", () => {
  for (const rank of [0, -1, NaN, Infinity, 1.5]) assert.throws(() => loraScale(rank, 8), RangeError);
  for (const microBatch of [0, -1, NaN, Infinity, 1.5]) assert.throws(() => batchMetrics({ datasetSize: 10, microBatch, accumulation: 1 }), RangeError);
  assert.throws(() => contextBudget({ maximum: 100, input: -1 }), RangeError);
  assert.throws(() => weightedBenchmark({ domain: 101, format: 0, safety: 0, uncertainty: 0, retention: 0 }), RangeError);
  assert.throws(() => datasetMix(10, { a: -20, b: 120 }), RangeError);
});

test("valid dataset allocations conserve the total, including small and uneven datasets", () => {
  assert.deepEqual(datasetMix(1, { a: 50, b: 50 }).counts, { a: 1, b: 0 });
  for (const total of [0, 1, 3, 7, 11, 101, 2000]) {
    const { counts } = datasetMix(total, { a: 55, b: 10, c: 15, d: 10, e: 10 });
    assert.equal(Object.values(counts).reduce((a, b) => a + b, 0), total);
    assert.ok(Object.values(counts).every((count) => Number.isInteger(count) && count >= 0));
  }
});
