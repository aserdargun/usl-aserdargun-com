"use client";

// Visualize sayfası: 4 interaktif görselleştirici bir arada.

import type { Locale } from "../atlas-data";
import { TokenizerPlayground, VRAMVisualizer, LossSimulator, AttentionHeatmap } from "./visualizers";

export function VisualizePage({ locale }: { locale: Locale }) {
  const tr = locale === "tr";
  return (
    <section className="surface-stack">
      <div className="page-intro">
        <p className="eyebrow">{tr ? "GÖRSEL VE ETKİLEŞİMLİ" : "VISUAL & INTERACTIVE"}</p>
        <h1>{tr ? "Görselleştir" : "Visualize"}</h1>
        <p>
          {tr
            ? "Soyut kavramları somutlaştıran dört etkileşimli laboratuvar. Her biri öğretici simülasyondur; üretim kararları için gerçek ölçüm zorunludur."
            : "Four interactive labs that turn abstract concepts into concrete visuals. Each is a teaching simulation; production decisions need real measurement."}
        </p>
        <span className="evidence-pill evidence-simulation">{tr ? "Öğretici simülasyon" : "Teaching simulation"}</span>
      </div>

      <TokenizerPlayground locale={locale} />
      <VRAMVisualizer locale={locale} />
      <LossSimulator locale={locale} />
      <AttentionHeatmap locale={locale} />
    </section>
  );
}
