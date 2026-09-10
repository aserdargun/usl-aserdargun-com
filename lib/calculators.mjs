function finite(value, name, min = 0, max = Number.MAX_SAFE_INTEGER, whole = true) {
  if (!Number.isFinite(value) || value < min || value > max || (whole && !Number.isSafeInteger(value))) {
    throw new RangeError(`${name} is outside its valid range`);
  }
}

export function batchMetrics({ datasetSize, microBatch, accumulation, gpus = 1, epochs = 1 }) {
  finite(datasetSize, "datasetSize");
  for (const [key, value] of Object.entries({ microBatch, accumulation, gpus, epochs })) finite(value, key, 1);
  const effectiveBatch = microBatch * accumulation * gpus;
  const optimizerStepsPerEpoch = Math.ceil(datasetSize / effectiveBatch);
  return {
    effectiveBatch,
    optimizerStepsPerEpoch,
    totalOptimizerSteps: optimizerStepsPerEpoch * epochs,
    microStepsPerEpoch: Math.ceil(datasetSize / (microBatch * gpus)),
  };
}

export function contextBudget({ maximum, system = 0, template = 0, input = 0, rag = 0, response = 0 }) {
  for (const [key, value] of Object.entries({ maximum, system, template, input, rag, response })) finite(value, key);
  const used = system + template + input + rag + response;
  return { used, remaining: maximum - used, fits: used <= maximum };
}

export function loraScale(rank, alpha, useRslora = false) {
  finite(rank, "rank", 1);
  finite(alpha, "alpha", 0, Number.MAX_SAFE_INTEGER, false);
  return alpha / (useRslora ? Math.sqrt(rank) : rank);
}

export function loraParameterCount(rank, inputDimension, outputDimension, targetMatrices = 1) {
  for (const [key, value] of Object.entries({ rank, inputDimension, outputDimension, targetMatrices })) finite(value, key, 1);
  return rank * (inputDimension + outputDimension) * targetMatrices;
}

export function weightedBenchmark({ domain, format, safety, uncertainty, retention }) {
  for (const [key, value] of Object.entries({ domain, format, safety, uncertainty, retention })) finite(value, key, 0, 100, false);
  return domain * 0.35 + format * 0.15 + safety * 0.2 + uncertainty * 0.15 + retention * 0.15;
}

export function datasetMix(total, percentages) {
  finite(total, "total");
  for (const [key, value] of Object.entries(percentages)) finite(value, key, 0, 100, false);
  const sum = Object.values(percentages).reduce((acc, value) => acc + value, 0);
  const valid = Math.abs(sum - 100) < 0.001;
  const entries = Object.entries(percentages).map(([key, value]) => ({ key, exact: total * value / (valid ? sum : 100) }));
  const counts = Object.fromEntries(entries.map(({ key, exact }) => [key, valid ? Math.floor(exact) : Math.round(exact)]));
  if (valid) {
    // Largest remainders keep integer category counts equal to the requested total.
    const remainder = total - Object.values(counts).reduce((acc, value) => acc + value, 0);
    const ranked = [...entries].sort((a, b) => (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact)));
    for (let i = 0; i < remainder; i++) counts[ranked[i % ranked.length].key]++;
  }
  return { valid, sum, counts };
}
