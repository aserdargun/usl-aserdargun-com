"use client";

// Kalıcı bilgi katmanı: Concept Depth ve Prerequisite Graph bileşenleri.
// Her ders sayfasında gömülü olarak görünür.

import { useState } from "react";
import Link from "next/link";
import type { Locale } from "../atlas-data";
import { conceptDepth, prerequisites, type DepthLevel } from "../atlas-extras";

// ---------------------------------------------------------------------------
// ConceptDepth: Aynı kavramı 3 derinlikte anlatır. Öğrenci kendi
// seviyesini seçer. Kalıcı öğrenme için elaboration + self-explanation.
// ---------------------------------------------------------------------------

const levelMeta: Record<DepthLevel, { tr: string; en: string; description: { tr: string; en: string } }> = {
  layman: {
    tr: "GÜNLÜK DİL",
    en: "EVERYDAY",
    description: {
      tr: "Kavramı bir benzetme ile anlatır. Üst sınıf lise / lisans başlangıç.",
      en: "Explains the concept through an analogy. High school / undergrad start.",
    },
  },
  undergrad: {
    tr: "LİSANS",
    en: "UNDERGRAD",
    description: {
      tr: "Üniversite düzeyinde; formüller, mimari kararlar ve sayılar.",
      en: "University level; formulas, architectural decisions, and numbers.",
    },
  },
  advanced: {
    tr: "İLERİ",
    en: "ADVANCED",
    description: {
      tr: "Araştırma düzeyinde; orijinal makalelere referanslar ve uç durumlar.",
      en: "Research level; references to original papers, edge cases.",
    },
  },
};

const order: DepthLevel[] = ["layman", "undergrad", "advanced"];

export function ConceptDepth({ locale, lessonId }: { locale: Locale; lessonId: string }) {
  const tr = locale === "tr";
  const data = conceptDepth[lessonId]?.[locale];
  const [active, setActive] = useState<DepthLevel>("undergrad");

  if (!data) return null;

  return (
    <section className="concept-depth" aria-label={tr ? "Kavram derinliği" : "Concept depth"}>
      <div className="concept-depth-head">
        <p className="kicker">{tr ? "KAVRAM DERİNLİĞİ" : "CONCEPT DEPTH"}</p>
        <p className="concept-depth-sub">
          {tr
            ? "Aynı kavramı üç derinlikte anlat. Seviyeni seç, anında geç. Üniversite öğrencisi için önerilen başlangıç: LİSANS."
            : "Read the same concept at three depths. Pick a level, switch instantly. Recommended starting point for university students: UNDERGRAD."}
        </p>
      </div>

      <div className="concept-depth-tabs" role="tablist">
        {order.map((level) => {
          const meta = levelMeta[level];
          return (
            <button
              key={level}
              role="tab"
              aria-selected={active === level}
              className={`concept-depth-tab ${active === level ? "active" : ""}`}
              onClick={() => setActive(level)}
              type="button"
            >
              <span className="concept-depth-label">{tr ? meta.tr : meta.en}</span>
              <span className="concept-depth-desc">{tr ? meta.description.tr : meta.description.en}</span>
            </button>
          );
        })}
      </div>

      <article className={`concept-depth-content concept-depth-${active}`} role="tabpanel">
        <span className="kicker">{tr ? levelMeta[active].tr : levelMeta[active].en}</span>
        <p>{data[active][locale]}</p>
      </article>
    </section>
  );
}

// ---------------------------------------------------------------------------
// PrerequisiteList: Bir derse gelen öğrenciye "önce şunu bil" listesi.
// Spaced prerequisites: önkoşullar zayıfsa kavram da zayıf öğrenilir.
// ---------------------------------------------------------------------------

import { lessons } from "../atlas-data";

export function PrerequisiteList({ locale, lessonId }: { locale: Locale; lessonId: string }) {
  const tr = locale === "tr";
  const prereq = prerequisites.find((p) => p.lessonId === lessonId);
  if (!prereq) return null;

  const required = prereq.required
    .map((id) => lessons[locale].find((l) => l.id === id))
    .filter((l): l is NonNullable<typeof l> => Boolean(l));
  const recommended = prereq.recommended
    .map((id) => lessons[locale].find((l) => l.id === id))
    .filter((l): l is NonNullable<typeof l> => Boolean(l));

  if (required.length === 0 && recommended.length === 0) {
    return (
      <section className="prereq prereq-empty">
        <p className="kicker">{tr ? "ÖNKOŞUL" : "PREREQUISITE"}</p>
        <p>{tr ? "Bu ders temel kavramlardan biridir; önkoşul gerektirmez." : "This lesson is foundational; no prerequisites required."}</p>
      </section>
    );
  }

  return (
    <section className="prereq">
      <p className="kicker">{tr ? "ÖNCE BUNLARI BİL" : "KNOW THESE FIRST"}</p>
      {required.length > 0 && (
        <div className="prereq-group">
          <span className="kicker prereq-required">{tr ? "ZORUNLU" : "REQUIRED"}</span>
          <ul>
            {required.map((l) => (
              <li key={l.id}>
                <Link href={`/${locale}/learn/${l.slug}/`}>
                  <span className="prereq-dot required" aria-hidden>●</span>
                  {l.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {recommended.length > 0 && (
        <div className="prereq-group">
          <span className="kicker prereq-recommended">{tr ? "ÖNERİLEN" : "RECOMMENDED"}</span>
          <ul>
            {recommended.map((l) => (
              <li key={l.id}>
                <Link href={`/${locale}/learn/${l.slug}/`}>
                  <span className="prereq-dot recommended" aria-hidden>○</span>
                  {l.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
