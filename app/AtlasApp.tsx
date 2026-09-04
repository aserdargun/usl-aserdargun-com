"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { batchMetrics, contextBudget, datasetMix, loraParameterCount, loraScale, weightedBenchmark } from "@/lib/calculators.mjs";
import { conceptMap, evidenceLabels, glossary, lessons, quiz, ui, weeks, type ConceptMapNode, type DiagramKey, type Locale, type Surface } from "./atlas-data";
import { VisualizePage } from "./components/visualize-page";
import { FlashcardsPage } from "./components/flashcards-page";
import { ConceptDepth, PrerequisiteList } from "./components/learning-extras";
import { PaperReadingHub, CitationKitPanel } from "./components/papers-citations";

const LANGUAGE_KEY = "unsloth-atlas-language";
const PROGRESS_KEY = "unsloth-atlas-progress:v1";
const THEME_KEY = "unsloth-atlas-theme";

type ProgressState = {
  version: 1;
  completedIds: string[];
  quizAttempts: Array<{ score: number; at: string; gaps: string[] }>;
  labInputs: Record<string, number>;
};

const emptyProgress: ProgressState = { version: 1, completedIds: [], quizAttempts: [], labInputs: {} };

function number(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function EvidencePill({ locale, level }: { locale: Locale; level: keyof typeof evidenceLabels.tr }) {
  return <span className={`evidence-pill evidence-${level}`}>{evidenceLabels[locale][level]}</span>;
}

// ---------------------------------------------------------------------------
// Öğrenci destek bileşenleri
// ---------------------------------------------------------------------------

// Bir terimin üstüne gelince kısa açıklamasını, tıklayınca uzun açıklamayı
// gösteren tooltip. Sözlük içeriği atlas-data.ts içinde tanımlıdır.
function GlossaryTooltip({ locale, termKey, children }: { locale: Locale; termKey: string; children: React.ReactNode }) {
  const entry = glossary[locale]?.[termKey];
  const tr = locale === "tr";
  const [open, setOpen] = useState(false);
  if (!entry) return <>{children}</>;
  const e = entry[locale];
  return (
    <span className="glossary-wrap">
      <button
        type="button"
        className="glossary-term"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((value) => !value)}
        aria-describedby={`glossary-${termKey}`}
      >
        {children}
        <span className="glossary-mark" aria-hidden>?</span>
      </button>
      {open && (
        <span id={`glossary-${termKey}`} className="glossary-pop" role="tooltip">
          <strong>{e.term}</strong>
          <span className="glossary-short">{e.short}</span>
          <span className="glossary-long">{e.long}</span>
          <span className="glossary-hint">{tr ? "Diğer diller: " : "Also: "}{entry.tr.term} · {entry.en.term}</span>
        </span>
      )}
    </span>
  );
}

// "Bunu günlük hayatta şuna benzet" kartı. Üniversite öğrencisinin kavramı
// zihninde bir yere oturtmasını kolaylaştırır.
function AnalogyCard({ locale, text }: { locale: Locale; text: { tr: string; en: string } }) {
  const tr = locale === "tr";
  return (
    <aside className="analogy-card" aria-label={tr ? "Günlük hayat analojisi" : "Everyday analogy"}>
      <div className="analogy-head">
        <span className="kicker">{tr ? "GÜNLÜK HAYAT ANALOJİSİ" : "EVERYDAY ANALOGY"}</span>
      </div>
      <p>{text[locale]}</p>
    </aside>
  );
}

// "Bu konu neden önemli?" kutusu. Üniversite öğrencisinin motivasyonunu ve
// bağlamını güçlendirir.
function WhyMatters({ locale, text }: { locale: Locale; text: { tr: string; en: string } }) {
  const tr = locale === "tr";
  return (
    <aside className="why-matters" aria-label={tr ? "Neden önemli" : "Why it matters"}>
      <div className="why-head">
        <span className="kicker">{tr ? "NEDEN ÖNEMLİ?" : "WHY IT MATTERS"}</span>
      </div>
      <p>{text[locale]}</p>
    </aside>
  );
}

// Dersin özünü 4 kısa maddeyle özetleyen görsel kart.
function QuickLook({ locale, items }: { locale: Locale; items: { tr: string[]; en: string[] } }) {
  const tr = locale === "tr";
  return (
    <div className="quick-look" role="group" aria-label={tr ? "Hızlı bakış" : "Quick look"}>
      <span className="kicker">{tr ? "HIZLI BAKIŞ" : "QUICK LOOK"}</span>
      <ul>
        {items[locale].map((item) => (
          <li key={item}>
            <span className="quick-bullet" aria-hidden>●</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// 8 derse özel SVG diyagramları. Hepsinde ortak görsel dil (renk, çerçeve)
// kullanılır; mevcut tema değişkenlerine uyum sağlar.
function ConceptDiagram({ kind, locale }: { kind: DiagramKey; locale: Locale }) {
  const tr = locale === "tr";
  // Tema rengini CSS'ten okuyabilmek için inline style kullanıyoruz.
  const accent = "var(--orange)";
  const ink = "var(--text)";
  const muted = "var(--muted)";
  const line = "var(--line)";
  const surface = "var(--surface-2)";
  const blue = "var(--blue)";
  const green = "var(--green)";
  const yellow = "var(--yellow)";
  const red = "var(--red)";

  if (kind === "models") {
    return (
      <svg viewBox="0 0 320 200" role="img" aria-label={tr ? "Model türleri şeması" : "Model types diagram"} className="concept-svg">
        <rect x="0" y="0" width="320" height="200" fill="var(--surface)" stroke={line} rx="10" />
        <g fontFamily="monospace" fontSize="11" fill={ink}>
          <rect x="20" y="30" width="120" height="50" fill={surface} stroke={accent} rx="6" />
          <text x="80" y="55" textAnchor="middle" fill={ink}>Base</text>
          <text x="80" y="70" textAnchor="middle" fill={muted}>{tr ? "ham ön-eğitim" : "raw pretrained"}</text>

          <rect x="170" y="30" width="130" height="50" fill={surface} stroke={accent} rx="6" />
          <text x="235" y="55" textAnchor="middle" fill={ink}>Instruct</text>
          <text x="235" y="70" textAnchor="middle" fill={muted}>{tr ? "talimatlara hizalı" : "instruction aligned"}</text>

          <rect x="95" y="120" width="130" height="50" fill={surface} stroke={blue} rx="6" />
          <text x="160" y="145" textAnchor="middle" fill={ink}>Reasoning</text>
          <text x="160" y="160" textAnchor="middle" fill={muted}>{tr ? "adım adım düşünür" : "stepwise reasoning"}</text>

          <line x1="140" y1="55" x2="170" y2="55" stroke={line} />
          <line x1="235" y1="80" x2="195" y2="120" stroke={line} strokeDasharray="3 3" />
          <line x1="80" y1="80" x2="125" y2="120" stroke={line} strokeDasharray="3 3" />
        </g>
      </svg>
    );
  }

  if (kind === "tokens") {
    return (
      <svg viewBox="0 0 320 200" role="img" aria-label={tr ? "Token ve dikkat şeması" : "Token and attention diagram"} className="concept-svg">
        <rect x="0" y="0" width="320" height="200" fill="var(--surface)" stroke={line} rx="10" />
        <g fontFamily="monospace" fontSize="11">
          {["Tür", "kçe", "tok", "en", "say", "ısı"].map((t, i) => (
            <g key={t}>
              <rect x={20 + i * 45} y="30" width="42" height="32" fill={surface} stroke={accent} rx="4" />
              <text x={41 + i * 45} y="50" textAnchor="middle" fill={ink}>{t}</text>
            </g>
          ))}
          <line x1="20" y1="80" x2="290" y2="80" stroke={line} />
          <text x="20" y="100" fill={muted}>attention(Q, K, V)</text>
          {[
            { x1: 41, x2: 86 }, { x1: 41, x2: 131 }, { x1: 86, x2: 176 }, { x1: 131, x2: 221 }, { x1: 176, x2: 266 },
          ].map((seg, i) => (
            <line key={i} x1={seg.x1} y1="120" x2={seg.x2} y2="150" stroke={blue} strokeWidth="1.4" opacity={0.5 + i * 0.1} />
          ))}
          <text x="20" y="175" fill={ink} fontSize="11">{tr ? "KV önbelleği: önceki K/V belleği" : "KV cache: previous K/V memory"}</text>
        </g>
      </svg>
    );
  }

  if (kind === "lora") {
    return (
      <svg viewBox="0 0 320 200" role="img" aria-label={tr ? "LoRA ve QLoRA şeması" : "LoRA and QLoRA diagram"} className="concept-svg">
        <rect x="0" y="0" width="320" height="200" fill="var(--surface)" stroke={line} rx="10" />
        <g fontFamily="monospace" fontSize="11">
          <rect x="20" y="60" width="70" height="60" fill={surface} stroke={muted} strokeDasharray="4 3" rx="4" />
          <text x="55" y="90" textAnchor="middle" fill={ink}>W</text>
          <text x="55" y="105" textAnchor="middle" fill={muted}>{tr ? "donuk" : "frozen"}</text>

          <text x="100" y="95" fill={ink} fontSize="18">+</text>

          <rect x="115" y="60" width="35" height="60" fill={surface} stroke={accent} rx="4" />
          <text x="132" y="95" textAnchor="middle" fill={ink}>A</text>

          <text x="153" y="95" fill={ink} fontSize="14">×</text>

          <rect x="167" y="60" width="35" height="60" fill={surface} stroke={accent} rx="4" />
          <text x="184" y="95" textAnchor="middle" fill={ink}>B</text>

          <text x="210" y="95" fill={ink} fontSize="14">×</text>

          <text x="225" y="95" fill={ink} fontSize="14">α/r</text>

          <text x="100" y="155" textAnchor="middle" fill={muted} fontSize="10">{tr ? "LoRA: yalnız A ve B eğitilir" : "LoRA: only A and B train"}</text>
          <text x="100" y="170" textAnchor="middle" fill={muted} fontSize="10">QLoRA: W → 4-bit (NF4)</text>
        </g>
      </svg>
    );
  }

  if (kind === "rank") {
    return (
      <svg viewBox="0 0 320 200" role="img" aria-label={tr ? "Rank ve alpha şeması" : "Rank and alpha diagram"} className="concept-svg">
        <rect x="0" y="0" width="320" height="200" fill="var(--surface)" stroke={line} rx="10" />
        <g fontFamily="monospace" fontSize="11">
          <text x="20" y="30" fill={muted}>B (d_out × r)</text>
          <rect x="20" y="40" width="120" height="100" fill={surface} stroke={accent} rx="3" />
          {Array.from({ length: 16 }).map((_, i) => (
            <line key={i} x1="20" y1={45 + i * 6} x2="140" y2={45 + i * 6} stroke={line} strokeWidth="0.5" />
          ))}

          <text x="180" y="30" fill={muted}>A (r × d_in)</text>
          <rect x="180" y="40" width="120" height="20" fill={surface} stroke={accent} rx="3" />
          {Array.from({ length: 3 }).map((_, i) => (
            <line key={i} x1="180" y1={45 + i * 6} x2="300" y2={45 + i * 6} stroke={line} strokeWidth="0.5" />
          ))}

          <text x="20" y="170" fill={ink} fontSize="10">{tr ? "r = rank | α = ölçek (α/r LoRA, α/√r rsLoRA)" : "r = rank | α = scale (α/r LoRA, α/√r rsLoRA)"}</text>
        </g>
      </svg>
    );
  }

  if (kind === "steps") {
    return (
      <svg viewBox="0 0 320 200" role="img" aria-label={tr ? "Eğitim döngüsü" : "Training loop"} className="concept-svg">
        <rect x="0" y="0" width="320" height="200" fill="var(--surface)" stroke={line} rx="10" />
        <g fontFamily="monospace" fontSize="10">
          {["fwd", "loss", "bwd", "accum?"].map((step, i) => (
            <g key={step}>
              <rect x={20 + i * 70} y="40" width="60" height="36" fill={surface} stroke={accent} rx="4" />
              <text x={50 + i * 70} y="62" textAnchor="middle" fill={ink}>{step}</text>
            </g>
          ))}
          <line x1="80" y1="58" x2="90" y2="58" stroke={ink} />
          <line x1="150" y1="58" x2="160" y2="58" stroke={ink} />
          <line x1="220" y1="58" x2="230" y2="58" stroke={ink} />

          <path d="M 250 76 Q 285 100 250 124" fill="none" stroke={muted} strokeDasharray="3 3" />
          <text x="265" y="103" fill={muted}>{tr ? "tekrar" : "repeat"}</text>

          <rect x="100" y="130" width="120" height="36" fill={surface} stroke={green} strokeWidth="2" rx="4" />
          <text x="160" y="152" textAnchor="middle" fill={ink} fontWeight="bold">optimizer step</text>
          <text x="160" y="180" textAnchor="middle" fill={muted}>{tr ? "ağırlıkları 1 kez günceller" : "updates weights once"}</text>
        </g>
      </svg>
    );
  }

  if (kind === "loss") {
    // Train ve validation loss eğrileri: train düşer, val önce iner sonra yükselir.
    return (
      <svg viewBox="0 0 320 200" role="img" aria-label={tr ? "Kayıp eğrileri" : "Loss curves"} className="concept-svg">
        <rect x="0" y="0" width="320" height="200" fill="var(--surface)" stroke={line} rx="10" />
        <g fontFamily="monospace" fontSize="10">
          <line x1="20" y1="170" x2="300" y2="170" stroke={muted} />
          <line x1="20" y1="170" x2="20" y2="30" stroke={muted} />
          <text x="22" y="35" fill={muted}>loss</text>
          <text x="280" y="185" fill={muted}>{tr ? "adım" : "step"}</text>

          {/* train loss: monoton düşüş */}
          <path d="M 20 50 Q 80 100 140 130 T 290 155" fill="none" stroke={accent} strokeWidth="2" />
          <text x="210" y="148" fill={accent} fontSize="10">{tr ? "eğitim" : "train"}</text>

          {/* val loss: önce düşer, sonra yükselir (overfitting) */}
          <path d="M 20 60 Q 80 110 140 130 Q 220 140 290 90" fill="none" stroke={red} strokeWidth="2" strokeDasharray="4 3" />
          <text x="240" y="85" fill={red} fontSize="10">{tr ? "doğrulama" : "validation"}</text>

          <circle cx="220" cy="135" r="4" fill={yellow} />
          <text x="120" y="195" textAnchor="middle" fill={yellow} fontSize="10">{tr ? "aşırı öğrenme başlangıcı" : "overfit onset"}</text>
        </g>
      </svg>
    );
  }

  if (kind === "templates") {
    // role/content → render → token dizisi → loss masking
    return (
      <svg viewBox="0 0 320 200" role="img" aria-label={tr ? "Sohbet şablonu işlem hattı" : "Chat template pipeline"} className="concept-svg">
        <rect x="0" y="0" width="320" height="200" fill="var(--surface)" stroke={line} rx="10" />
        <g fontFamily="monospace" fontSize="10">
          {[
            { y: 30, color: muted, text: "role: system" },
            { y: 50, color: muted, text: "role: user" },
            { y: 70, color: accent, text: "role: assistant" },
          ].map((row) => (
            <g key={row.text}>
              <rect x="20" y={row.y} width="80" height="16" fill={surface} stroke={row.color} rx="3" />
              <text x="60" y={row.y + 12} textAnchor="middle" fill={ink}>{row.text}</text>
            </g>
          ))}

          <path d="M 105 50 L 145 50" stroke={ink} markerEnd="url(#arrow)" />
          <rect x="150" y="30" width="60" height="60" fill={surface} stroke={accent} rx="4" />
          <text x="180" y="55" textAnchor="middle" fill={ink} fontSize="9">{tr ? "şablon" : "template"}</text>
          <text x="180" y="70" textAnchor="middle" fill={muted} fontSize="9">{tr ? "işleme" : "render"}</text>

          <path d="M 215 60 L 240 60" stroke={ink} />

          {["<|im_", "start|>", "...", "<|im_", "end|>"].map((tok, i) => (
            <g key={i}>
              <rect x={245 + i * 15} y="35" width="13" height="50" fill={i < 2 || i > 2 ? surface : surface} stroke={i === 3 ? green : i === 1 || i === 4 ? accent : line} rx="2" />
              <text x={251 + i * 15} y="65" textAnchor="middle" fill={i === 3 ? green : i === 1 || i === 4 ? accent : muted} fontSize="6" transform={`rotate(-90 251 ${65})`}>{tok}</text>
            </g>
          ))}

          <text x="20" y="120" fill={ink} fontSize="10">{tr ? "Maske: -100 (istem) | gerçek kimlik (asistan)" : "Mask: -100 (prompt) | real id (assistant)"}</text>
          <text x="20" y="140" fill={green} fontSize="10">{tr ? "Doğru maske: yalnız yanıt kayba katkı sağlar" : "Correct mask: only the answer affects loss"}</text>
          <text x="20" y="158" fill={red} fontSize="10">{tr ? "Yanlış maske: yanıt kayıp dışında kalabilir" : "Wrong mask: the answer may be excluded"}</text>
        </g>
      </svg>
    );
  }

  // evaluation: radar/5 metrik + bağımsız test vurgusu
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label={tr ? "Değerlendirme metrikleri" : "Evaluation metrics"} className="concept-svg">
      <rect x="0" y="0" width="320" height="200" fill="var(--surface)" stroke={line} rx="10" />
      <g fontFamily="monospace" fontSize="10">
        {/* Radar polygon - dış çerçeve */}
        <polygon points="160,40 230,80 210,160 110,160 90,80" fill="none" stroke={line} />
        <polygon points="160,55 215,87 200,150 120,150 105,87" fill="none" stroke={line} opacity="0.6" />
        <polygon points="160,70 200,95 190,140 130,140 120,95" fill="none" stroke={line} opacity="0.4" />

        {/* Skor polygonu (simüle) */}
        <polygon points="160,55 215,87 200,150 120,150 105,87" fill={accent} fillOpacity="0.18" stroke={accent} strokeWidth="2" />

        {/* Etiketler */}
        <text x="160" y="32" textAnchor="middle" fill={ink}>{tr ? "Alan" : "Domain"}</text>
        <text x="240" y="84" textAnchor="middle" fill={ink}>{tr ? "Biçim" : "Format"}</text>
        <text x="215" y="175" textAnchor="middle" fill={ink}>{tr ? "Güvenlik" : "Safety"}</text>
        <text x="105" y="175" textAnchor="middle" fill={ink}>{tr ? "Korunum" : "Retention"}</text>
        <text x="80" y="84" textAnchor="middle" fill={ink}>{tr ? "Belirsizlik" : "Uncertainty"}</text>

        <text x="160" y="195" textAnchor="middle" fill={muted}>D·.35 + F·.15 + S·.20 + U·.15 + R·.15</text>
      </g>
    </svg>
  );
}

// Dashboard için kavram haritası: 3 grup (ground / core / guard) halinde
// ders düğümlerini gösterir. Tıklanınca ilgili derse gider.
function ConceptMapNav({ locale }: { locale: Locale }) {
  const tr = locale === "tr";
  const data = conceptMap[locale];
  const order: ConceptMapNode["group"][] = ["ground", "core", "guard"];
  return (
    <section className="concept-map" aria-label={tr ? "Kavram haritası" : "Concept map"}>
      <div className="page-intro">
        <p className="eyebrow">{tr ? "ÖĞRENME YOLU" : "LEARNING PATH"}</p>
        <h2>{tr ? "Kavram haritası" : "Concept map"}</h2>
        <p>{tr ? "Her kavram, bir sonrakini anlamak için gereken zemini kurar. Tıkla ve o derse git." : "Each concept lays the groundwork for the next. Click to open that lesson."}</p>
      </div>
      <div className="concept-map-grid">
        {order.map((groupId) => {
          const group = data.groups.find((item) => item.id === groupId);
          const nodes = data.nodes.filter((item) => item.group === groupId);
          if (!group) return null;
          return (
            <div key={groupId} className={`concept-group concept-group-${groupId}`}>
              <span className="kicker">{group[locale]}</span>
              <ul>
                {nodes.map((node) => (
                  <li key={node.id}>
                    <Link href={`/${locale}/learn/${node.id}/`}>
                      <span className="node-dot" aria-hidden>●</span>
                      <span>{node[locale]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Meter({ value, label }: { value: number; label: string }) {
  return (
    <div className="meter" aria-label={`${label}: ${value}%`}>
      <div className="meter-label"><span>{label}</span><b>{value}%</b></div>
      <div className="meter-track"><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
    </div>
  );
}

function LabInput({ label, value, onChange, min = 0, max, step = 1 }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number }) {
  return <label className="field"><span>{label}</span><input type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(number(event.target.value))} /></label>;
}

function Labs({ locale, progress, setLab }: { locale: Locale; progress: ProgressState; setLab: (key: string, value: number) => void }) {
  const tr = locale === "tr";
  const get = (key: string, fallback: number) => progress.labInputs[key] ?? fallback;
  const batch = batchMetrics({ datasetSize: get("dataset", 2000), microBatch: get("micro", 1), accumulation: get("accum", 16), gpus: get("gpus", 1), epochs: get("epochs", 3) });
  const context = contextBudget({ maximum: get("contextMax", 4096), system: get("systemTokens", 200), template: get("templateTokens", 80), input: get("inputTokens", 900), rag: get("ragTokens", 1000), response: get("responseTokens", 600) });
  const rank = get("rank", 8), alpha = get("alpha", 8), matrices = get("matrices", 32), dimension = get("dimension", 3584);
  const mixPercentages = { standard: get("mixStandard", 55), paraphrase: get("mixParaphrase", 10), missing: get("mixMissing", 15), negative: get("mixNegative", 10), escalation: get("mixEscalation", 10) };
  const mix = datasetMix(get("mixTotal", 2000), mixPercentages);
  const mixLabels = tr
    ? { standard: "standart", paraphrase: "farklı ifade", missing: "eksik bilgi", negative: "negatif", escalation: "eskalasyon" }
    : { standard: "standard", paraphrase: "paraphrase", missing: "missing", negative: "negative", escalation: "escalation" };
  const benchmark = weightedBenchmark({ domain: get("scoreDomain", 70), format: get("scoreFormat", 80), safety: get("scoreSafety", 90), uncertainty: get("scoreUncertainty", 70), retention: get("scoreRetention", 85) });
  const baseTokens = get("baseTokens", 0), candidateTokens = get("candidateTokens", 0);

  return (
    <section className="surface-stack">
      <div className="page-intro"><p className="eyebrow">{tr ? "KONTROLLÜ ARAÇLAR" : "CONTROLLED TOOLS"}</p><h1>{tr ? "Laboratuvar" : "Labs"}</h1><p>{tr ? "Bu araçlar planlama ve kavram doğrulama içindir. Gerçek GPU çalıştırmazlar; ölçüm alanları yalnızca senin girdiğin değerleri saklar." : "These tools support planning and concept checks. They do not run a real GPU; measurement fields store only the values you enter."}</p><EvidencePill locale={locale} level="simulation" /></div>

      <div className="lab-grid">
        <article className="lab-card wide"><div><span className="lab-index">01</span><h2>{tr ? "Bağlam bütçesi" : "Context budget"}</h2></div><div className="input-grid"><LabInput label={tr ? "Üst sınır" : "Maximum"} value={get("contextMax", 4096)} onChange={(v) => setLab("contextMax", v)} /><LabInput label={tr ? "Sistem" : "System"} value={get("systemTokens", 200)} onChange={(v) => setLab("systemTokens", v)} /><LabInput label={tr ? "Şablon" : "Template"} value={get("templateTokens", 80)} onChange={(v) => setLab("templateTokens", v)} /><LabInput label={tr ? "Girdi" : "Input"} value={get("inputTokens", 900)} onChange={(v) => setLab("inputTokens", v)} /><LabInput label="RAG" value={get("ragTokens", 1000)} onChange={(v) => setLab("ragTokens", v)} /><LabInput label={tr ? "Yanıt" : "Response"} value={get("responseTokens", 600)} onChange={(v) => setLab("responseTokens", v)} /></div><div className={`result ${context.fits ? "good" : "bad"}`}><strong>{context.used.toLocaleString(locale)} {tr ? "token" : "tokens"}</strong><span>{context.fits ? `${context.remaining.toLocaleString(locale)} ${tr ? "token boş" : "tokens free"}` : `${Math.abs(context.remaining).toLocaleString(locale)} ${tr ? "token taşma" : "tokens over"}`}</span></div></article>

        <article className="lab-card"><div><span className="lab-index">02</span><h2>{tr ? "Toplu iş ve adımlar" : "Batch and steps"}</h2></div><div className="input-grid"><LabInput label={tr ? "Örnek" : "Examples"} value={get("dataset", 2000)} onChange={(v) => setLab("dataset", v)} /><LabInput label={tr ? "Mikro toplu iş" : "Micro batch"} value={get("micro", 1)} onChange={(v) => setLab("micro", v)} min={1} /><LabInput label={tr ? "Birikim" : "Accumulation"} value={get("accum", 16)} onChange={(v) => setLab("accum", v)} min={1} /><LabInput label="GPU" value={get("gpus", 1)} onChange={(v) => setLab("gpus", v)} min={1} /><LabInput label={tr ? "Dönem" : "Epoch"} value={get("epochs", 3)} onChange={(v) => setLab("epochs", v)} min={1} /></div><dl className="metrics"><div><dt>{tr ? "Etkin toplu iş" : "Effective batch"}</dt><dd>{batch.effectiveBatch}</dd></div><div><dt>{tr ? "Toplam optimizasyon adımı" : "Total optimizer steps"}</dt><dd>{batch.totalOptimizerSteps}</dd></div></dl></article>

        <article className="lab-card"><div><span className="lab-index">03</span><h2>{tr ? "LoRA ölçeği" : "LoRA scale"}</h2></div><div className="input-grid"><LabInput label="Rank" value={rank} onChange={(v) => setLab("rank", v)} min={1} /><LabInput label="Alpha" value={alpha} onChange={(v) => setLab("alpha", v)} /><LabInput label={tr ? "Matris sayısı" : "Matrices"} value={matrices} onChange={(v) => setLab("matrices", v)} min={1} /><LabInput label={tr ? "Boyut" : "Dimension"} value={dimension} onChange={(v) => setLab("dimension", v)} min={1} /></div><dl className="metrics"><div><dt>LoRA α/r</dt><dd>{loraScale(rank, alpha).toFixed(3)}</dd></div><div><dt>rsLoRA α/√r</dt><dd>{loraScale(rank, alpha, true).toFixed(3)}</dd></div><div><dt>{tr ? "Adaptör parametresi" : "Adapter parameters"}</dt><dd>{loraParameterCount(rank, dimension, dimension, matrices).toLocaleString(locale)}</dd></div></dl></article>

        <article className="lab-card"><div><span className="lab-index">04</span><h2>{tr ? "Türkçe token ölçümü" : "Turkish token measurement"}</h2></div><p>{tr ? "Sonuç uydurulmaz. Aynı metni iki gerçek tokenizer ile ölçüp değerleri gir." : "No result is invented. Measure the same text with two real tokenizers and enter the values."}</p><div className="input-grid"><LabInput label={tr ? "Taban tokenizer" : "Base tokenizer"} value={baseTokens} onChange={(v) => setLab("baseTokens", v)} /><LabInput label={tr ? "Aday tokenizer" : "Candidate tokenizer"} value={candidateTokens} onChange={(v) => setLab("candidateTokens", v)} /></div><div className="result"><strong>{baseTokens > 0 && candidateTokens > 0 ? `${((candidateTokens / baseTokens - 1) * 100).toFixed(1)}%` : "—"}</strong><span>{tr ? "Adayın tabana göre token farkı" : "Candidate token delta vs base"}</span></div></article>

        <article className="lab-card wide"><div><span className="lab-index">05</span><h2>{tr ? "Veri kümesi karışımı" : "Dataset mix"}</h2></div><div className="input-grid"><LabInput label={tr ? "Toplam örnek" : "Total examples"} value={get("mixTotal", 2000)} onChange={(v) => setLab("mixTotal", v)} /><LabInput label={tr ? "Standart %" : "Standard %"} value={mixPercentages.standard} onChange={(v) => setLab("mixStandard", v)} /><LabInput label={tr ? "Farklı ifade %" : "Paraphrase %"} value={mixPercentages.paraphrase} onChange={(v) => setLab("mixParaphrase", v)} /><LabInput label={tr ? "Eksik bilgi %" : "Missing info %"} value={mixPercentages.missing} onChange={(v) => setLab("mixMissing", v)} /><LabInput label={tr ? "Negatif %" : "Negative %"} value={mixPercentages.negative} onChange={(v) => setLab("mixNegative", v)} /><LabInput label={tr ? "Eskalasyon %" : "Escalation %"} value={mixPercentages.escalation} onChange={(v) => setLab("mixEscalation", v)} /></div><div className={`result ${mix.valid ? "good" : "bad"}`}><strong>{mix.sum}%</strong><span>{Object.entries(mix.counts).map(([key, value]) => `${mixLabels[key as keyof typeof mixLabels]} ${value}`).join(" · ")}</span></div></article>

        <article className="lab-card wide"><div><span className="lab-index">06</span><h2>{tr ? "Ağırlıklı değerlendirme" : "Weighted benchmark"}</h2></div><div className="input-grid"><LabInput label={tr ? "Alan 35%" : "Domain 35%"} value={get("scoreDomain", 70)} onChange={(v) => setLab("scoreDomain", v)} max={100} /><LabInput label={tr ? "Biçim 15%" : "Format 15%"} value={get("scoreFormat", 80)} onChange={(v) => setLab("scoreFormat", v)} max={100} /><LabInput label={tr ? "Güvenlik 20%" : "Safety 20%"} value={get("scoreSafety", 90)} onChange={(v) => setLab("scoreSafety", v)} max={100} /><LabInput label={tr ? "Belirsizlik 15%" : "Uncertainty 15%"} value={get("scoreUncertainty", 70)} onChange={(v) => setLab("scoreUncertainty", v)} max={100} /><LabInput label={tr ? "Korunum 15%" : "Retention 15%"} value={get("scoreRetention", 85)} onChange={(v) => setLab("scoreRetention", v)} max={100} /></div><div className="score-orb"><strong>{benchmark.toFixed(1)}</strong><span>/ 100</span></div></article>

        <article className="lab-card wide"><div><span className="lab-index">07</span><h2>{tr ? "Şablon ve maskeleme kontrolü" : "Template and masking check"}</h2></div><ol className="checklist"><li>{tr ? "Tek bir örneği gerçek tokenizer ile işle." : "Render one example with the real tokenizer."}</li><li>{tr ? "BOS, rol sınırları, asistan başlangıcı ve EOS'u görünür kıl." : "Expose BOS, role boundaries, assistant start, and EOS."}</li><li>{tr ? "Etiketlerde istem tokenlarının -100, yanıt tokenlarının etkin olduğunu doğrula." : "Verify prompt labels are -100 while response labels remain active."}</li><li>{tr ? "Çıkarımda aynı şablon ve durdurma davranışını kullan." : "Use the same template and stop behavior at inference."}</li></ol></article>

        <article className="lab-card wide"><div><span className="lab-index">08</span><h2>{tr ? "4070 Ti Super planlama rehberi" : "4070 Ti Super planning guide"}</h2></div><div className="warning"><EvidencePill locale={locale} level="simulation" /><p>{tr ? "16 GB için güvenli başlangıç: 4-bit taban, mikro toplu iş 1, bağlam 1024–2048 ve gradyan kontrol noktası. OOM sırası: toplu iş → bağlam → daha küçük model → aktarma. Bu kart gerçek bir koşunun kanıtı değildir." : "Safe 16 GB starting point: 4-bit base, micro batch 1, context 1024–2048, gradient checkpointing. OOM order: batch → context → smaller model → offload. This card is not evidence of a real run."}</p></div></article>
      </div>
    </section>
  );
}

function MixedQuiz({ locale, progress, onFinish }: { locale: Locale; progress: ProgressState; onFinish: (score: number, gaps: string[]) => void }) {
  const tr = locale === "tr";
  const questions = quiz[locale];
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [missed, setMissed] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const question = questions[index];

  function check() {
    if (selected === null) return;
    setRevealed(true);
    if (selected === question.answer) setCorrect((value) => value + 1);
    else setMissed((value) => [...value, question.topic]);
  }

  function next() {
    if (index === questions.length - 1) {
      const finalCorrect = correct + (selected === question.answer && !revealed ? 1 : 0);
      const score = Math.round((finalCorrect / questions.length) * 100);
      const gaps = [...new Set(missed.concat(selected === question.answer ? [] : [question.topic]))];
      onFinish(score, gaps);
      setDone(true);
      return;
    }
    setIndex((value) => value + 1); setSelected(null); setRevealed(false);
  }

  if (done) {
    const attempt = progress.quizAttempts.at(-1);
    return <article className="quiz-card"><p className="eyebrow">{tr ? "SONUÇ" : "RESULT"}</p><div className="score-orb"><strong>{attempt?.score ?? 0}%</strong><span>{(attempt?.score ?? 0) >= 80 ? (tr ? "Geçti" : "Passed") : (tr ? "%80 hedefi" : "80% target")}</span></div><p>{tr ? "Konu eksikleri" : "Topic gaps"}: {attempt?.gaps.length ? attempt.gaps.join(", ") : (tr ? "yok" : "none")}</p><button onClick={() => { setIndex(0); setSelected(null); setRevealed(false); setCorrect(0); setMissed([]); setDone(false); }}>{tr ? "Tekrar dene" : "Try again"}</button></article>;
  }

  return <article className="quiz-card"><div className="quiz-head"><span>{index + 1} / {questions.length}</span><Meter label={tr ? "Test ilerlemesi" : "Quiz progress"} value={Math.round(((index + 1) / questions.length) * 100)} /></div><h2>{question.prompt}</h2><div className="answers">{question.options.map((option, optionIndex) => <label className={revealed ? optionIndex === question.answer ? "answer correct" : optionIndex === selected ? "answer wrong" : "answer" : "answer"} key={option}><input type="radio" name="answer" checked={selected === optionIndex} disabled={revealed} onChange={() => setSelected(optionIndex)} /><span>{option}</span></label>)}</div>{revealed && <div className="explanation" role="status"><strong>{selected === question.answer ? (tr ? "Doğru" : "Correct") : (tr ? "Tekrar düşün" : "Revisit")}</strong><p>{question.explanation}</p></div>}<button disabled={selected === null} onClick={revealed ? next : check}>{revealed ? (tr ? "Sonraki soru" : "Next question") : (tr ? "Cevabı kontrol et" : "Check answer")}</button></article>;
}

function Dashboard({ locale, progress }: { locale: Locale; progress: ProgressState }) {
  const tr = locale === "tr";
  const sourceAverage = Math.round(weeks[locale].reduce((sum, week) => sum + week.sourceProgress, 0) / weeks[locale].length);
  const visitor = Math.round(progress.completedIds.length / (lessons[locale].length + weeks[locale].length) * 100);
  return <section className="surface-stack"><div className="hero"><div><p className="eyebrow">UNSLOTH STUDIO · LORA · QLORA</p><h1>{tr ? <>Fine-tuning öğren.<br/><em>Kanıtını ayır.</em></> : <>Learn fine-tuning.<br/><em>Separate the evidence.</em></>}</h1><p>{tr ? "50 kaynak dosyadan arındırılmış, 12 haftalık ve iki dilli öğrenme yolu. Simülasyon, gözlem ve doğrulanmış sonuçlar aynı şeymiş gibi gösterilmez." : "A sanitized, bilingual 12-week path distilled from 50 source files. Simulations, observations, and verified outcomes are never presented as the same thing."}</p><div className="hero-actions"><Link className="primary" href={`/${locale}/learn/models/`}>{tr ? "Öğrenmeye başla" : "Start learning"}</Link><Link href={`/${locale}/evidence/`}>{tr ? "Kanıt kaydını gör" : "View evidence"}</Link></div></div><div className="hero-rail" aria-label={tr ? "Atlas istatistikleri" : "Atlas statistics"}><div><b>50/50</b><span>{tr ? "kaynak kapsaması" : "source coverage"}</span></div><div><b>12</b><span>{tr ? "haftalık yol" : "week path"}</span></div><div><b>20</b><span>{tr ? "karma soru" : "mixed questions"}</span></div><div><b>2</b><span>{tr ? "tam dil" : "full languages"}</span></div></div></div><div className="progress-duo"><article><span className="kicker">{tr ? "YAZARIN VAULT DURUMU" : "AUTHOR VAULT STATE"}</span><h2>{tr ? "Kaynak ilerlemesi" : "Source progress"}</h2><Meter value={sourceAverage} label={tr ? "12 hafta ortalaması" : "12-week average"} /><p>{tr ? "Salt okunur; canonical vault'tan gelir." : "Read-only; derived from the canonical vault."}</p></article><article><span className="kicker">{tr ? "BU TARAYICI" : "THIS BROWSER"}</span><h2>{tr ? "Benim ilerlemem" : "My progress"}</h2><Meter value={visitor} label={tr ? "Tamamlanan kayıtlar" : "Completed records"} /><p>{tr ? "Hesap yok. Bu cihazda saklanır." : "No account. Stored on this device."}</p></article></div><ConceptMapNav locale={locale} /><section><div className="section-heading"><div><p className="eyebrow">{tr ? "ŞİMDİKİ ODAK" : "CURRENT FOCUS"}</p><h2>{weeks[locale][1].title}</h2></div><Link href={`/${locale}/roadmap/`}>{tr ? "Tüm yol haritası" : "Full roadmap"} →</Link></div><article className="focus-card"><div className="week-number">02</div><div><p>{weeks[locale][1].purpose}</p><ul>{weeks[locale][1].tasks.map((task) => <li key={task}>{task}</li>)}</ul></div><Meter value={45} label={tr ? "Kaynak durumu" : "Source state"} /></article></section><section><div className="section-heading"><div><p className="eyebrow">{tr ? "TEMEL DERSLER" : "CORE LESSONS"}</p><h2>{tr ? "Kavramdan karar kuralına" : "From concept to decision rule"}</h2></div></div><div className="lesson-grid">{lessons[locale].map((lesson, index) => <Link className="lesson-tile" href={`/${locale}/learn/${lesson.slug}/`} key={lesson.id}><span>{String(index + 1).padStart(2, "0")}</span><EvidencePill locale={locale} level={lesson.evidence} /><h3>{lesson.title}</h3><p>{lesson.summary}</p><b>↗</b></Link>)}</div></section></section>;
}

function Roadmap({ locale, progress, toggle }: { locale: Locale; progress: ProgressState; toggle: (id: string) => void }) {
  const tr = locale === "tr";
  const statusLabels = tr
    ? { completed: "TAMAMLANDI", active: "AKTİF", todo: "PLANLANDI" }
    : { completed: "COMPLETED", active: "ACTIVE", todo: "PLANNED" };
  return <section className="surface-stack"><div className="page-intro"><p className="eyebrow">12 {tr ? "HAFTA" : "WEEKS"}</p><h1>{tr ? "Yol haritası" : "Roadmap"}</h1><p>{tr ? "Her hafta bir çıktı ve geçiş kriteriyle biter. Kaynak durumu ile kişisel işaretlerin birbirine karışmaz." : "Every week ends with a deliverable and gate. Source state and your personal marks stay separate."}</p></div><div className="timeline">{weeks[locale].map((week) => { const done = progress.completedIds.includes(week.id); return <article className="week-card" key={week.id}><div className="week-marker"><span>{String(week.week).padStart(2, "0")}</span><i /></div><div className="week-content"><div className="week-title"><div><span className="kicker">{week.hours} {tr ? "SAAT" : "HOURS"} · {statusLabels[week.status]}</span><h2>{week.title}</h2></div><Meter label={tr ? "Kaynak" : "Source"} value={week.sourceProgress} /></div><p>{week.purpose}</p><div className="week-details"><div><b>{tr ? "Görevler" : "Tasks"}</b><ul>{week.tasks.map((task) => <li key={task}>{task}</li>)}</ul></div><div><b>{tr ? "Çıktı / geçiş kriteri" : "Deliverable / gate"}</b><p>{week.deliverable}</p></div></div><button className={done ? "completed-button" : ""} onClick={() => toggle(week.id)}>{done ? (tr ? "Benim ilerlemem: tamam" : "My progress: complete") : (tr ? "Benim ilerlememe ekle" : "Add to my progress")}</button></div></article>; })}</div></section>;
}

function Evidence({ locale }: { locale: Locale }) {
  const tr = locale === "tr";
  const comparisons = tr ? [["Türkçe açıklama", "Base daha düzenli", "Fine-tuned tekrar/İngilizce karışımı"], ["Koşullu JSON", "Base daha geçerli", "Fine-tuned eksik/gevşek"], ["Eksik bilgi", "Base daha temkinli", "Fine-tuned daha çok varsayım"]] : [["Turkish explanation", "Base more coherent", "Fine-tuned repetition/language mixing"], ["Conditional JSON", "Base more valid", "Fine-tuned incomplete/loose"], ["Missing information", "Base more cautious", "Fine-tuned made more assumptions"]];
  return <section className="surface-stack"><div className="page-intro"><p className="eyebrow">QWEN3 4B · FINE-TUNING</p><h1>{tr ? "Kanıt kaydı" : "Evidence record"}</h1><p>{tr ? "Başarılı bir işlem hattı ile başarılı model kalitesini ayıran deney günlüğü." : "An experiment record that separates a working pipeline from improved model quality."}</p></div><div className="evidence-summary"><article><EvidencePill locale={locale} level="verified" /><b>30 / 30</b><span>{tr ? "eğitim adımı tamamlandı" : "training steps completed"}</span></article><article><EvidencePill locale={locale} level="verified" /><b>0.8245</b><span>{tr ? "son eğitim kaybı" : "final training loss"}</span></article><article><EvidencePill locale={locale} level="verified" /><b>✓</b><span>{tr ? "adaptörü kaydetme ve yeniden yükleme" : "adapter save and reload"}</span></article><article><EvidencePill locale={locale} level="observed" /><b>9.62 / 15.99 GiB</b><span>{tr ? "gözlenen anlık kullanım; en iyi değer değil" : "observed snapshot; not peak"}</span></article></div><article className="verdict"><div><p className="eyebrow">{tr ? "KARAR" : "VERDICT"}</p><h2>{tr ? "İşlem hattı geçti. Kalite kazanımı kanıtlanmadı." : "Pipeline passed. Quality gain was not proven."}</h2></div><p>{tr ? "Değerlendirme ayrımı yoktu ve üç sabit kalite karşılaştırmasının tamamında temel model daha güçlüydü. Bu koşu bir hızlı sınama kanıtıdır; model iyileşmesi kanıtı değildir." : "There was no evaluation split, and the base model was stronger in all three fixed quality comparisons. This run proves a smoke-test pipeline, not a model improvement."}</p></article><div className="comparison-table" role="table" aria-label={tr ? "Temel ve ince ayarlı model karşılaştırması" : "Base and fine-tuned comparison"}>{comparisons.map((row) => <div role="row" key={row[0]}><b role="cell">{row[0]}</b><span role="cell">{row[1]}</span><span role="cell">{row[2]}</span></div>)}</div><div className="unknowns"><h2>{tr ? "Bilinmeyenler" : "Unknowns"}</h2><ul><li>{tr ? "Gerçek en yüksek VRAM kullanımı ölçülmedi." : "Real peak VRAM was not measured."}</li><li>{tr ? "Bağımsız doğrulama/test ayrımı yoktu." : "There was no independent validation/test split."}</li><li>{tr ? "Sabit rastgelelik tohumu ve tekrar koşusu yoktu." : "There was no fixed seed or repeated run."}</li><li>{tr ? "Kalite farkının istatistiksel güveni bilinmiyor." : "Statistical confidence of the quality delta is unknown."}</li></ul></div><PaperReadingHub locale={locale} /><CitationKitPanel locale={locale} /></section>;
}

function DataEvaluation({ locale, progress, onFinish }: { locale: Locale; progress: ProgressState; onFinish: (score: number, gaps: string[]) => void }) {
  const tr = locale === "tr";
  return <section className="surface-stack"><div className="page-intro"><p className="eyebrow">{tr ? "VERİ → DEĞERLENDİRME → KARAR" : "DATA → BENCHMARK → DECISION"}</p><h1>{tr ? "Veri ve değerlendirme" : "Data and evaluation"}</h1><p>{tr ? "Veri sızıntısı, biçim ve güvenlik kontrolleri eğitim kaybına bakılmadan önce tasarlanır." : "Leakage, formatting, and safety checks are designed before looking at loss."}</p></div><div className="recipe-grid">{(tr ? [["55%", "Standart", "Temel görev dağılımı"], ["10%", "Farklı ifade", "Yüzey çeşitliliği"], ["15%", "Eksik bilgi", "Belirsizlik davranışı"], ["10%", "Negatif", "Yanlış varsayıma direnç"], ["10%", "Eskalasyon", "Güvenli yönlendirme"]] : [["55%", "Standard", "Core task distribution"], ["10%", "Paraphrase", "Surface variation"], ["15%", "Missing info", "Uncertainty behavior"], ["10%", "Negative", "Resistance to false premises"], ["10%", "Escalation", "Safe redirection"]]).map(([amount, title, description]) => <article key={title}><b>{amount}</b><h3>{title}</h3><p>{description}</p></article>)}</div><div className="gate-grid"><article><h2>{tr ? "Veri kümesi kapısı" : "Dataset gate"}</h2><ul className="checklist"><li>{tr ? "Eğitim, doğrulama ve test kaynakları ayrık" : "Train/validation/test sources are disjoint"}</li><li>{tr ? "Aynı ve neredeyse aynı kayıtlar tarandı" : "Duplicate and near-duplicate scan"}</li><li>{tr ? "Kişisel veriler ve özel operasyon ayrıntıları temiz" : "PII and private operational details removed"}</li><li>{tr ? "Sohbet şablonu gerçek tokenizer ile incelendi" : "Chat template inspected with the real tokenizer"}</li></ul></article><article><h2>{tr ? "Model kabul kapısı" : "Model acceptance gate"}</h2><ul className="checklist"><li>{tr ? "Alan skoru ≥ temel model" : "Domain ≥ baseline"}</li><li>{tr ? "Biçim ≥ 95" : "Format ≥ 95"}</li><li>{tr ? "Güvenlik ≥ temel model" : "Safety ≥ baseline"}</li><li>{tr ? "Korunum düşüşü ≤ 3" : "Retention drop ≤ 3"}</li><li>{tr ? "Aynı rastgelelik tohumu ve üretim ayarları" : "Same seed and generation settings"}</li></ul></article></div><MixedQuiz locale={locale} progress={progress} onFinish={onFinish} /></section>;
}

function Journey({ locale }: { locale: Locale }) {
  const tr = locale === "tr";
  const cards = tr ? [["İlk düşünce", "Model seçimi dataset satır sayısına bağlıdır."], ["Düzeltme", "Model türü başlangıç davranışı ve hedef yetenek farkıyla seçilir."], ["Karar kuralı", "Dar ve yapılandırılmış görevde önce Instruct; taze bilgi için RAG."]] : [["First thought", "Model choice depends on dataset row count."], ["Correction", "Model type follows starting behavior and target capability gap."], ["Decision rule", "Start narrow structured tasks from Instruct; use RAG for fresh knowledge."]];
  return <section className="surface-stack"><div className="page-intro"><p className="eyebrow">{tr ? "ARINDIRILMIŞ GÜNLÜK" : "SANITIZED JOURNEY"}</p><h1>{tr ? "Öğrenme yolculuğu" : "Learning journey"}</h1><p>{tr ? "Günlüklerdeki ilk yanılgılar ham biçimde yayımlanmaz; tekrar kullanılabilir karar kartlarına dönüşür." : "Early journal misconceptions are not published verbatim; they become reusable decision cards."}</p></div><div className="journey-flow">{cards.map(([label, text], index) => <article key={label}><span>{String(index + 1).padStart(2, "0")}</span><p className="kicker">{label}</p><h2>{text}</h2></article>)}</div><div className="review-plan"><h2>{tr ? "Aralıklı tekrar" : "Spaced review"}</h2><div>{[1, 3, 7, 14, 30].map((day) => <span key={day}>{tr ? `Gün ${day}` : `Day ${day}`}</span>)}</div><p>{tr ? "Her tekrarda bir tanım değil, karar kuralı ve karşı örnek çağrılır." : "Each review recalls a decision rule and counterexample, not only a definition."}</p></div></section>;
}

function Lesson({ locale, slug, progress, toggle }: { locale: Locale; slug: string; progress: ProgressState; toggle: (id: string) => void }) {
  const tr = locale === "tr";
  const lesson = lessons[locale].find((item) => item.slug === slug);
  if (!lesson) return <section className="page-intro"><h1>{tr ? "Ders bulunamadı" : "Lesson not found"}</h1></section>;
  const done = progress.completedIds.includes(lesson.id);
  return (
    <article className="lesson-page">
      <div className="lesson-hero">
        <p className="eyebrow">{lesson.eyebrow}</p>
        <EvidencePill locale={locale} level={lesson.evidence} />
        <h1>{lesson.title}</h1>
        <p>{lesson.summary}</p>
      </div>

      {lesson.quickLook && <QuickLook locale={locale} items={lesson.quickLook} />}

      <PrerequisiteList locale={locale} lessonId={lesson.id} />

      <div className="lesson-body">
        <main>
          {/* Kavram diyagramı - üniversite öğrencisinin hızlıca ne öğreneceğini görselleştirmesi için */}
          {lesson.diagram && (
            <div className="concept-diagram-wrap" aria-label={tr ? "Kavram şeması" : "Concept diagram"}>
              <ConceptDiagram kind={lesson.diagram} locale={locale} />
              <span className="kicker">{tr ? "KAVRAM ŞEMASI" : "CONCEPT DIAGRAM"}</span>
            </div>
          )}

          {lesson.body.map((paragraph, index) => (
            <p key={paragraph}>
              {index === 0 && tr ? (
                <>
                  <GlossaryTooltip locale={locale} termKey="token">Token</GlossaryTooltip> bütçesi,{" "}
                  <GlossaryTooltip locale={locale} termKey="context">context</GlossaryTooltip> penceresi ve{" "}
                  <GlossaryTooltip locale={locale} termKey="attention">attention</GlossaryTooltip> mekanizması…
                </>
              ) : null}
              {index === 0 && !tr ? (
                <>
                  The <GlossaryTooltip locale={locale} termKey="token">token</GlossaryTooltip> budget,{" "}
                  <GlossaryTooltip locale={locale} termKey="context">context</GlossaryTooltip> window, and{" "}
                  <GlossaryTooltip locale={locale} termKey="attention">attention</GlossaryTooltip>…
                </>
              ) : null}
              {paragraph}
            </p>
          ))}

          {lesson.analogy && <AnalogyCard locale={locale} text={lesson.analogy} />}

          {lesson.whyItMatters && <WhyMatters locale={locale} text={lesson.whyItMatters} />}

          <section className="learning-transform">
            <div>
              <span>01</span>
              <p className="kicker">{tr ? "İlk düşünce" : "First thought"}</p>
              <p>{lesson.misconception}</p>
            </div>
            <div>
              <span>02</span>
              <p className="kicker">{tr ? "Düzeltme" : "Correction"}</p>
              <p>{lesson.correction}</p>
            </div>
            <div>
              <span>03</span>
              <p className="kicker">{tr ? "Karar kuralı" : "Decision rule"}</p>
              <p>{lesson.decision}</p>
            </div>
          </section>

          <ConceptDepth locale={locale} lessonId={lesson.id} />

          <button className={done ? "completed-button" : ""} onClick={() => toggle(lesson.id)}>
            {done ? (tr ? "Tamamlandı olarak işaretlendi" : "Marked complete") : (tr ? "Bu dersi tamamla" : "Complete this lesson")}
          </button>
        </main>

        <aside>
          <h2>{tr ? "Kendini kontrol et" : "Check yourself"}</h2>
          <ul>{lesson.checks.map((check) => <li key={check}>{check}</li>)}</ul>
          <p className="verified-at">{tr ? "Doğrulama tarihi" : "Verified"}: {lesson.verifiedAt}</p>
        </aside>
      </div>

      <nav className="lesson-nav">
        {lessons[locale].filter((item) => item.id !== lesson.id).slice(0, 3).map((item) => (
          <Link key={item.id} href={`/${locale}/learn/${item.slug}/`}>{item.title} →</Link>
        ))}
      </nav>
    </article>
  );
}

export default function AtlasApp({ locale, surface = "dashboard", slug }: { locale: Locale; surface?: Surface; slug?: string }) {
  const t = ui[locale];
  const [progress, setProgress] = useState<ProgressState>(emptyProgress);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const alternate = locale === "tr" ? "en" : "tr";
  const alternatePath = useMemo(() => { if (slug) return `/${alternate}/learn/${slug}/`; if (surface !== "dashboard") return `/${alternate}/${surface}/`; return `/${alternate}/`; }, [alternate, slug, surface]);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_KEY) as "dark" | "light" | null;
    const nextTheme = savedTheme ?? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    document.documentElement.dataset.theme = nextTheme; document.documentElement.lang = locale; window.localStorage.setItem(LANGUAGE_KEY, locale);
    const hydrationTimer = window.setTimeout(() => {
      try { const saved = window.localStorage.getItem(PROGRESS_KEY); if (saved) setProgress({ ...emptyProgress, ...JSON.parse(saved) }); } catch { setProgress(emptyProgress); }
      setTheme(nextTheme);
    }, 0);
    return () => window.clearTimeout(hydrationTimer);
  }, [locale]);

  function save(next: ProgressState) { setProgress(next); window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(next)); }
  function toggle(id: string) { save({ ...progress, completedIds: progress.completedIds.includes(id) ? progress.completedIds.filter((item) => item !== id) : [...progress.completedIds, id] }); }
  function setLab(key: string, value: number) { save({ ...progress, labInputs: { ...progress.labInputs, [key]: value } }); }
  function finishQuiz(score: number, gaps: string[]) { save({ ...progress, quizAttempts: [...progress.quizAttempts, { score, gaps, at: new Date().toISOString() }] }); }
  function toggleTheme() { const next = theme === "dark" ? "light" : "dark"; setTheme(next); document.documentElement.dataset.theme = next; window.localStorage.setItem(THEME_KEY, next); }

  const commitSha = process.env.NEXT_PUBLIC_COMMIT_SHA?.slice(0, 7) ?? "local";
  return <div className="site-shell"><a className="skip-link" href="#main">{t.skip}</a><header className="site-header"><Link className="brand" href={`/${locale}/`} aria-label={t.brand}><span className="brand-mark">U</span><span><b>{t.brand}</b><small>{t.brandTag}</small></span></Link><nav aria-label={locale === "tr" ? "Ana navigasyon" : "Main navigation"}><Link className={surface === "dashboard" ? "active" : ""} href={`/${locale}/`}>{t.nav.dashboard}</Link><Link className={surface === "roadmap" ? "active" : ""} href={`/${locale}/roadmap/`}>{t.nav.roadmap}</Link><Link className={slug ? "active" : ""} href={`/${locale}/learn/models/`}>{t.nav.learn}</Link><Link className={surface === "labs" ? "active" : ""} href={`/${locale}/labs/`}>{t.nav.labs}</Link><Link className={surface === "evidence" ? "active" : ""} href={`/${locale}/evidence/`}>{t.nav.evidence}</Link><Link className={surface === "data-evaluation" ? "active" : ""} href={`/${locale}/data-evaluation/`}>{t.nav.data}</Link><Link className={surface === "journey" ? "active" : ""} href={`/${locale}/journey/`}>{t.nav.journey}</Link><Link className={surface === "visualize" ? "active" : ""} href={`/${locale}/visualize/`}>{t.nav.visualize}</Link><Link className={surface === "flashcards" ? "active" : ""} href={`/${locale}/flashcards/`}>{t.nav.flashcards}</Link></nav><div className="header-actions"><Link href={alternatePath} hrefLang={alternate} onClick={() => window.localStorage.setItem(LANGUAGE_KEY, alternate)}>{t.language}</Link><button aria-label={t.theme} title={t.theme} onClick={toggleTheme}>{theme === "dark" ? "☼" : "◐"}</button></div></header><main id="main">{slug ? <Lesson locale={locale} slug={slug} progress={progress} toggle={toggle} /> : surface === "dashboard" ? <Dashboard locale={locale} progress={progress} /> : surface === "roadmap" ? <Roadmap locale={locale} progress={progress} toggle={toggle} /> : surface === "labs" ? <Labs locale={locale} progress={progress} setLab={setLab} /> : surface === "evidence" ? <Evidence locale={locale} /> : surface === "data-evaluation" ? <DataEvaluation locale={locale} progress={progress} onFinish={finishQuiz} /> : surface === "visualize" ? <VisualizePage locale={locale} /> : surface === "flashcards" ? <FlashcardsPage locale={locale} /> : <Journey locale={locale} />}</main><footer><div><span className="brand-mark">U</span><p><b>Unsloth Studio Learning Atlas</b><br/><small>{t.localOnly}</small></p></div><div><a href="https://github.com/aserdargun/usl-aserdargun-com">GitHub</a><a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a><code title="Git commit SHA">{commitSha}</code></div></footer></div>;
}
