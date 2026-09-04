"use client";

// Görsel ve interaktif öğrenme bileşenleri.
// Her biri tek başına çalışır, dil-bağımsız sözlük kullanır.
// Tüm hesaplamalar atlas-extras.ts'ten gelir; kanıt seviyesi
// "simulation" olan öğretici araçlardır.

import { useMemo, useState } from "react";
import type { Locale } from "../atlas-data";
import {
  pseudoBpeSplit,
  tokenizerSamples,
  vramEstimate,
  simulateLoss,
  attentionDemos,
  type VramEstimate,
  type LossSimulation,
} from "../atlas-extras";

// ---------------------------------------------------------------------------
// 1) Tokenizer Playground
//    Türkçe/İngilizce metni BPE-benzeri parçalara ayırır. Görsel olarak
//    her token renkli kutu olarak gösterilir. Karşılaştırmalı sayaç.
// ---------------------------------------------------------------------------

export function TokenizerPlayground({ locale }: { locale: Locale }) {
  const tr = locale === "tr";
  const samples = tokenizerSamples[locale];
  const [activeId, setActiveId] = useState(samples[0]?.id ?? "");
  const sample = samples.find((item) => item.id === activeId) ?? samples[0];
  const otherLocale: Locale = locale === "tr" ? "en" : "tr";
  const otherSample = tokenizerSamples[otherLocale].find((item) => item.id === activeId) ?? tokenizerSamples[otherLocale][0];

  if (!sample || !otherSample) return null;

  const trTokens = pseudoBpeSplit(sample.tr.text, sample.splitRule);
  const enTokens = pseudoBpeSplit(otherSample.en.text, sample.splitRule);
  const ratio = enTokens.length > 0 ? (trTokens.length / enTokens.length) : 0;

  return (
    <article className="viz-card viz-card-wide">
      <div className="viz-head">
        <span className="lab-index">V01</span>
        <div>
          <h2>{tr ? "Tokenizer Deneme Alanı" : "Tokenizer Playground"}</h2>
          <p className="viz-subtitle">
            {tr
              ? "Türkçe ve İngilizce metni BPE-benzeri parçalara ayırır. Sonuçlar yaklaşıktır; üretim kararları için gerçek tokenizer ile ölçüm zorunludur."
              : "Splits Turkish and English text into BPE-like pieces. Results are approximate; production decisions need real-tokenizer measurement."}
          </p>
        </div>
      </div>

      <div className="tokenizer-samples">
        {samples.map((item) => (
          <button
            key={item.id}
            className={`tokenizer-sample-chip ${item.id === activeId ? "active" : ""}`}
            onClick={() => setActiveId(item.id)}
            type="button"
          >
            <span className="kicker">{{
              daily: tr ? "GÜNLÜK" : "DAILY",
              compound: tr ? "BİLEŞİK" : "COMPOUND",
              agglutination: tr ? "EKLEMELİ" : "AGGLUTINATION",
            }[item.id.replace(/^(tr|en)-/, "")]}</span>
            <span className="tokenizer-sample-note">{item[locale].note}</span>
          </button>
        ))}
      </div>

      <div className="tokenizer-compare">
        <div className="tokenizer-side">
          <div className="tokenizer-side-head">
            <span className="kicker">{tr ? "TÜRKÇE" : "TURKISH"}</span>
            <b>{trTokens.length} {tr ? "token" : "tokens"}</b>
          </div>
          <p className="tokenizer-raw">{sample[locale].text}</p>
          <div className="tokenizer-tokens">
            {trTokens.map((token, i) => (
              <span key={i} className={`tokenizer-token ${token.endsWith("##") ? "subword" : "word"}`}>
                {token.replace(/##$/, "")}
                <span className="tokenizer-token-id">#{i}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="tokenizer-side">
          <div className="tokenizer-side-head">
            <span className="kicker">{tr ? "İNGİLİZCE" : "ENGLISH"}</span>
            <b>{enTokens.length} {tr ? "token" : "tokens"}</b>
          </div>
          <p className="tokenizer-raw">{otherSample.en.text}</p>
          <div className="tokenizer-tokens">
            {enTokens.map((token, i) => (
              <span key={i} className={`tokenizer-token ${token.endsWith("##") ? "subword" : "word"}`}>
                {token.replace(/##$/, "")}
                <span className="tokenizer-token-id">#{i}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className={`tokenizer-verdict ${ratio > 1.2 ? "warn" : "good"}`}>
        <b>{tr ? "Karşılaştırma" : "Comparison"}</b>
        <span>
          {tr
            ? `Türkçe metin, İngilizce karşılığına göre yaklaşık ${ratio.toFixed(2)}× daha fazla token üretiyor. Bu, bağlam penceresini ve çıkarım maliyetini doğrudan etkiler.`
            : `Turkish produces about ${ratio.toFixed(2)}× more tokens than its English counterpart. This directly affects the context window and inference cost.`}
        </span>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// 2) VRAM Bütçesi Görselleştirici
//    Model/adapter/optimizer/gradients/activations payı. Pie chart + stacked bar.
// ---------------------------------------------------------------------------

export function VRAMVisualizer({ locale }: { locale: Locale }) {
  const tr = locale === "tr";
  const [paramsB, setParamsB] = useState(4);
  const [quantizationBits, setQuantizationBits] = useState<4 | 8 | 16>(4);
  const [adapterRank, setAdapterRank] = useState(8);
  const [contextLength, setContextLength] = useState(2048);
  const [microBatch, setMicroBatch] = useState(1);
  const [gradientCheckpointing, setGradientCheckpointing] = useState(true);
  const [budget, setBudget] = useState(16);

  const estimate: VramEstimate = useMemo(() => vramEstimate({
    paramsB,
    quantizationBits,
    adapterRank,
    adapterMatrices: 7, // LLaMA/Qwen tipik: q, k, v, o, gate, up, down
    hiddenDim: paramsB <= 4 ? 2560 : paramsB <= 9 ? 4096 : 5120,
    contextLength,
    microBatch,
    gradientCheckpointing,
    budget,
  }), [paramsB, quantizationBits, adapterRank, contextLength, microBatch, gradientCheckpointing, budget]);

  const segments = [
    { key: "weights", label: tr ? "Model ağırlıkları" : "Model weights", value: estimate.weights, color: "var(--blue)" },
    { key: "adapter", label: tr ? "Adaptör" : "Adapter", value: estimate.adapter, color: "var(--orange)" },
    { key: "optimizer", label: tr ? "İyileştirici" : "Optimizer", value: estimate.optimizer, color: "var(--yellow)" },
    { key: "gradients", label: tr ? "Gradyanlar" : "Gradients", value: estimate.gradients, color: "var(--green)" },
    { key: "activations", label: tr ? "Aktivasyonlar" : "Activations", value: estimate.activations, color: "var(--red)" },
  ];

  // Pie chart geometry
  const totalNonZero = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  let cumulative = 0;
  const cx = 100, cy = 100, r = 80;

  return (
    <article className="viz-card viz-card-wide">
      <div className="viz-head">
        <span className="lab-index">V02</span>
        <div>
          <h2>{tr ? "VRAM Bütçesi Görselleştirici" : "VRAM Budget Visualizer"}</h2>
          <p className="viz-subtitle">
            {tr
              ? "Model, adaptör, iyileştirici, gradyan ve aktivasyon paylarını görsel olarak ayırır. Rakamlar yaklaşıktır; gerçek ölçüm nvidia-smi ile yapılmalıdır."
              : "Separates model, adapter, optimizer, gradient, and activation shares visually. Numbers are approximate; real measurement should use nvidia-smi."}
          </p>
        </div>
      </div>

      <div className="vram-grid">
        <div className="vram-controls">
          <label className="field">
            <span>{tr ? "Model (B parametre)" : "Model (B params)"}</span>
            <select value={paramsB} onChange={(e) => setParamsB(Number(e.target.value))}>
              <option value={0.6}>0.6B</option>
              <option value={1.7}>1.7B</option>
              <option value={4}>4B</option>
              <option value={9}>9B</option>
              <option value={14}>14B</option>
            </select>
          </label>
          <label className="field">
            <span>{tr ? "Taban niceleme" : "Base quantization"}</span>
            <select value={quantizationBits} onChange={(e) => setQuantizationBits(Number(e.target.value) as 4 | 8 | 16)}>
              <option value={4}>NF4 (4-bit)</option>
              <option value={8}>INT8</option>
              <option value={16}>FP16</option>
            </select>
          </label>
          <label className="field">
            <span>{tr ? "LoRA rankı" : "LoRA rank"}</span>
            <input type="number" min={1} max={256} value={adapterRank} onChange={(e) => setAdapterRank(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>{tr ? "Bağlam uzunluğu" : "Context length"}</span>
            <input type="number" min={256} max={32768} step={256} value={contextLength} onChange={(e) => setContextLength(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>{tr ? "Mikro toplu iş" : "Micro batch"}</span>
            <input type="number" min={1} max={8} value={microBatch} onChange={(e) => setMicroBatch(Number(e.target.value))} />
          </label>
          <label className="field field-check">
            <input type="checkbox" checked={gradientCheckpointing} onChange={(e) => setGradientCheckpointing(e.target.checked)} />
            <span>{tr ? "Gradyan denetim noktaları" : "Gradient checkpointing"}</span>
          </label>
          <label className="field">
            <span>{tr ? "GPU bütçesi (GiB)" : "GPU budget (GiB)"}</span>
            <select value={budget} onChange={(e) => setBudget(Number(e.target.value))}>
              <option value={12}>12 GB</option>
              <option value={16}>16 GB</option>
              <option value={24}>24 GB</option>
              <option value={40}>40 GB</option>
              <option value={80}>80 GB</option>
            </select>
          </label>
        </div>

        <div className="vram-pie">
          <svg viewBox="0 0 200 200" role="img" aria-label={tr ? "VRAM pay grafiği" : "VRAM share chart"}>
            {segments.map((seg) => {
              if (seg.value <= 0) return null;
              const startAngle = (cumulative / totalNonZero) * Math.PI * 2;
              cumulative += seg.value;
              const endAngle = (cumulative / totalNonZero) * Math.PI * 2;
              const x1 = cx + r * Math.sin(startAngle);
              const y1 = cy - r * Math.cos(startAngle);
              const x2 = cx + r * Math.sin(endAngle);
              const y2 = cy - r * Math.cos(endAngle);
              const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
              return (
                <path
                  key={seg.key}
                  d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                  fill={seg.color}
                  stroke="var(--surface)"
                  strokeWidth={1.5}
                />
              );
            })}
            <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--text)" fontSize="11" fontWeight="bold">{estimate.total.toFixed(1)}</text>
            <text x={cx} y={cy + 8} textAnchor="middle" fill="var(--muted)" fontSize="9">GiB {tr ? "tahmini" : "estimate"}</text>
            <text x={cx} y={cy + 22} textAnchor="middle" fill="var(--muted)" fontSize="8">/ {budget} GiB</text>
          </svg>

          <ul className="vram-legend">
            {segments.map((seg) => (
              <li key={seg.key}>
                <span className="vram-swatch" style={{ background: seg.color }} />
                <span className="vram-label">{seg.label}</span>
                <b>{seg.value.toFixed(2)} GiB</b>
                <span className="vram-percent">{((seg.value / totalNonZero) * 100).toFixed(0)}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={`tokenizer-verdict ${estimate.fits ? "good" : "warn"}`}>
        <b>{estimate.fits ? (tr ? "Bütçeye sığıyor" : "Fits the budget") : (tr ? "Bütçeyi aşıyor" : "Exceeds the budget")}</b>
        <span>
          {tr
            ? `KV önbelleği (çıkarım) tahmini: ${estimate.kvCache.toFixed(2)} GiB. KV önbelleği çıkarım sırasında ek bellek gerektirir; eğitim sırasında sayılmaz.`
            : `KV cache (inference) estimate: ${estimate.kvCache.toFixed(2)} GiB. KV cache adds memory at inference time; it is not counted during training.`}
        </span>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// 3) Eğitim Loss Simülatörü
//    Slider'larla lr/batch/epoch/overfit riski değiştir, canlı eğri.
// ---------------------------------------------------------------------------

export function LossSimulator({ locale }: { locale: Locale }) {
  const tr = locale === "tr";
  const [lr, setLr] = useState(2e-4);
  const [batch, setBatch] = useState(32);
  const [epochs, setEpochs] = useState(3);
  const [overfitRisk, setOverfitRisk] = useState(0.5);
  const [steps, setSteps] = useState(800);

  const sim: LossSimulation = useMemo(() => simulateLoss({
    baseLoss: 2.5,
    floor: 0.7,
    steps,
    lr,
    batch,
    epochs,
    overfitRisk,
  }), [lr, batch, epochs, overfitRisk, steps]);

  // SVG path
  const w = 600, h = 200, padX = 30, padY = 20;
  const xScale = (i: number) => padX + (i / (steps - 1)) * (w - 2 * padX);
  const yMin = 0.5, yMax = 3.0;
  const yScale = (v: number) => h - padY - ((v - yMin) / (yMax - yMin)) * (h - 2 * padY);

  const trainPath = sim.train.map((v, i) => `${i === 0 ? "M" : "L"} ${xScale(i).toFixed(3)} ${yScale(v).toFixed(3)}`).join(" ");
  const valPath = sim.val.map((v, i) => `${i === 0 ? "M" : "L"} ${xScale(i).toFixed(3)} ${yScale(v).toFixed(3)}`).join(" ");

  return (
    <article className="viz-card viz-card-wide">
      <div className="viz-head">
        <span className="lab-index">V03</span>
        <div>
          <h2>{tr ? "Eğitim Kaybı Simülatörü" : "Training Loss Simulator"}</h2>
          <p className="viz-subtitle">
            {tr
              ? "Öğrenme oranını, etkin toplu işi, dönem sayısını ve aşırı öğrenme riskini değiştir; eğitim/doğrulama kaybı eğrilerini canlı izle. Bu öğretici model gerçek bir koşunun yerine geçmez."
              : "Change learning rate, batch, epoch, and overfit risk; watch train/val loss curves live. Models exponential decay + overfit rise; does not replace a real run."}
          </p>
        </div>
      </div>

      <div className="loss-controls">
        <label className="field">
          <span>{tr ? "Öğrenme oranı" : "Learning rate"}</span>
          <input type="range" min={0} max={100} value={Math.log10(lr) * 25 + 100} onChange={(e) => setLr(Math.pow(10, (Number(e.target.value) - 100) / 25))} />
          <small>{lr.toExponential(2)}</small>
        </label>
        <label className="field">
          <span>{tr ? "Etkin toplu iş" : "Effective batch"}</span>
          <input type="range" min={1} max={50} value={Math.log2(batch) * 10} onChange={(e) => setBatch(Math.round(Math.pow(2, Number(e.target.value) / 10)))} />
          <small>{batch}</small>
        </label>
        <label className="field">
          <span>{tr ? "Dönem" : "Epoch"}</span>
          <input type="range" min={1} max={8} value={epochs} onChange={(e) => setEpochs(Number(e.target.value))} />
          <small>{epochs}</small>
        </label>
        <label className="field">
          <span>{tr ? "Aşırı öğrenme riski" : "Overfit risk"}</span>
          <input type="range" min={0} max={10} value={overfitRisk * 10} onChange={(e) => setOverfitRisk(Number(e.target.value) / 10)} />
          <small>{(overfitRisk * 100).toFixed(0)}%</small>
        </label>
        <label className="field">
          <span>{tr ? "Toplam adım" : "Total steps"}</span>
          <input type="range" min={5} max={50} value={steps / 20} onChange={(e) => setSteps(Math.round(Number(e.target.value) * 20))} />
          <small>{steps}</small>
        </label>
      </div>

      <div className="loss-chart">
        <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={tr ? "Kayıp eğrileri" : "Loss curves"}>
          {/* Grid */}
          {[0.5, 1.0, 1.5, 2.0, 2.5, 3.0].map((v) => (
            <g key={v}>
              <line x1={padX} y1={yScale(v)} x2={w - padX} y2={yScale(v)} stroke="var(--line)" strokeWidth={0.5} strokeDasharray="2 3" />
              <text x={padX - 4} y={yScale(v) + 3} textAnchor="end" fontSize="8" fill="var(--muted)">{v.toFixed(1)}</text>
            </g>
          ))}
          {/* Best step marker */}
          <line x1={xScale(sim.bestStep)} y1={padY} x2={xScale(sim.bestStep)} y2={h - padY} stroke="var(--green)" strokeWidth={1} strokeDasharray="3 3" />
          <text x={xScale(sim.bestStep) + 4} y={padY + 12} fontSize="9" fill="var(--green)">{tr ? "en iyi adım" : "best step"} ({sim.bestStep})</text>
          {/* Overfit point */}
          {sim.overfitPoint < steps && (
            <g>
              <line x1={xScale(sim.overfitPoint)} y1={padY} x2={xScale(sim.overfitPoint)} y2={h - padY} stroke="var(--red)" strokeWidth={1} strokeDasharray="3 3" />
              <text x={xScale(sim.overfitPoint) + 4} y={h - padY - 4} fontSize="9" fill="var(--red)">{tr ? "aşırı öğrenme başlangıcı" : "overfit onset"} ({sim.overfitPoint})</text>
            </g>
          )}
          {/* Train */}
          <path d={trainPath} fill="none" stroke="var(--blue)" strokeWidth={2} />
          {/* Val */}
          <path d={valPath} fill="none" stroke="var(--orange)" strokeWidth={2} strokeDasharray="4 3" />
          <text x={w - padX} y={padY + 8} textAnchor="end" fontSize="9" fill="var(--blue)">{tr ? "eğitim" : "train"}</text>
          <text x={w - padX} y={padY + 20} textAnchor="end" fontSize="9" fill="var(--orange)">{tr ? "doğrulama" : "validation"}</text>
        </svg>
      </div>

      <div className="loss-metrics">
        <div><b>{sim.finalTrain.toFixed(3)}</b><span>{tr ? "Son eğitim kaybı" : "Final train loss"}</span></div>
        <div><b>{sim.finalVal.toFixed(3)}</b><span>{tr ? "Son doğrulama kaybı" : "Final validation loss"}</span></div>
        <div><b>{sim.bestStep}</b><span>{tr ? "En iyi doğrulama adımı" : "Best validation step"}</span></div>
        <div><b>{sim.overfitPoint < steps ? sim.overfitPoint : "—"}</b><span>{tr ? "Aşırı öğrenme başlangıcı" : "Overfit onset"}</span></div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// 4) Attention Heatmap
//    Basit bir cümle için Q·K heatmap. Cümle TR/EN değiştirilebilir.
// ---------------------------------------------------------------------------

export function AttentionHeatmap({ locale }: { locale: Locale }) {
  const tr = locale === "tr";
  const demo = attentionDemos[locale];
  const n = demo.tokens.length;
  const cellSize = 320 / n;

  // En yüksek değer: hangi hücre en "dikkat çekici"
  const maxIdx = (() => {
    let best = { i: 0, j: 0, v: -1 };
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (demo.matrix[i][j] > best.v) best = { i, j, v: demo.matrix[i][j] };
    }
    return best;
  })();

  return (
    <article className="viz-card viz-card-wide">
      <div className="viz-head">
        <span className="lab-index">V04</span>
        <div>
          <h2>{tr ? "Dikkat Isı Haritası" : "Attention Heatmap"}</h2>
          <p className="viz-subtitle">
            {tr
              ? "Bir cümlede her tokenın diğerlerine ne kadar dikkat ettiğini ısı haritası olarak gösterir. Renk yoğunluğu dikkat ağırlığını temsil eder. Bu görsel bir simülasyondur; gerçek modelin dikkat değerlerini yansıtmaz."
              : "Shows how much each token in a sentence 'attends' to every other as a heatmap. Color intensity = attention weight. This is a simulation; it does not reflect a real model's attention."}
          </p>
        </div>
      </div>

      <div className="attention-heatmap">
        <div className="attention-rail attention-rail-top">
          {demo.tokens.map((tok, j) => (
            <div key={j} className="attention-tok" style={{ width: cellSize }}>{tok[locale]}</div>
          ))}
        </div>
        <div className="attention-grid">
          <div className="attention-rail attention-rail-left">
            {demo.tokens.map((tok, i) => (
              <div key={i} className="attention-tok" style={{ height: cellSize }}>{tok[locale]}</div>
            ))}
          </div>
          <div className="attention-cells">
            {demo.matrix.map((row, i) => (
              <div key={i} className="attention-row">
                {row.map((v, j) => {
                  const intensity = Math.min(1, v * 1.4);
                  return (
                    <div
                      key={j}
                      className={`attention-cell ${i === j ? "self" : ""}`}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        background: `rgba(255, 152, 0, ${intensity})`,
                      }}
                      title={`${demo.tokens[i][locale]} → ${demo.tokens[j][locale]}: ${(v * 100).toFixed(0)}%`}
                    >
                      {i === j ? "·" : (v * 100).toFixed(0)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className={`tokenizer-verdict ${maxIdx.i === maxIdx.j ? "good" : "warn"}`}>
          <b>{tr ? "En yüksek dikkat" : "Highest attention"}</b>
          <span>
            {tr
              ? `“${demo.tokens[maxIdx.i][locale]}” → “${demo.tokens[maxIdx.j][locale]}” (%${(maxIdx.v * 100).toFixed(0)}). Diyagonal (kendine dikkat) genellikle baskındır.`
              : `“${demo.tokens[maxIdx.i][locale]}” → “${demo.tokens[maxIdx.j][locale]}” (${(maxIdx.v * 100).toFixed(0)}%). The diagonal (self-attention) usually dominates.`}
          </span>
        </div>
      </div>
    </article>
  );
}
