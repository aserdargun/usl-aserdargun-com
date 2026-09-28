"use client";

import Link from "next/link";
import { useEffect } from "react";

import { readStorage } from "@/lib/learning-state";

const LANGUAGE_KEY = "unsloth-atlas-language";

export default function Home() {
  useEffect(() => {
    const saved = readStorage(LANGUAGE_KEY);
    const locale = saved === "tr" ? "tr" : "en";
    window.location.replace(`/${locale}/`);
  }, []);

  return <main className="locale-gateway"><noscript><div><h2>Unsloth Studio Learning Atlas</h2><p>A bilingual learning atlas with eight lessons, a 12-week roadmap, teaching labs and historical experiment evidence for LoRA/QLoRA, datasets, evaluation and local deployment. This page normally forwards you to your saved language; without JavaScript, pick one below.</p><p>What this atlas covers:</p><ul><li>Eight lessons from LoRA and QLoRA concepts through dataset engineering and evaluation.</li><li>A 12-week roadmap with weekly outcomes and capstone work.</li><li>Teaching labs and simulations: calculators and visual, interactive exercises.</li><li>A dated experiment and evidence record with its source papers.</li><li>Spaced-repetition flashcards; progress stays in this browser.</li></ul><p>There is no live training and no live GPU here. The labs are teaching simulations, and the experiment record is historical evidence, not a live run.</p><p><Link href="/tr/" lang="tr" hrefLang="tr">Türkçe</Link> · <Link href="/en/" lang="en" hrefLang="en">English</Link></p></div></noscript><p className="eyebrow">UNSLOTH STUDIO LEARNING ATLAS</p><h1>Loading the atlas…</h1><p>Atlas yükleniyor · Redirecting to your learning environment.</p><p><Link href="/tr/">Türkçe</Link> · <Link href="/en/">English</Link></p></main>;
}
