"use client";

// Spaced Repetition Flashcards sayfası.
// 5-kutu SRS: 1, 3, 7, 14, 30 gün. "Zor" → kutu azalır, "kolay" → kutu artar.
// localStorage'da durum saklanır. "Benim ilerlemem" ile entegre.

import { useEffect, useMemo, useState } from "react";
import type { Locale } from "../atlas-data";
import { flashcards, srsBoxes } from "../atlas-extras";

interface FlashcardState {
  box: number;       // 0=yeni, 1-4=kutu numarası
  nextReview: number; // timestamp (ms)
  seenCount: number;
  correctCount: number;
}

type FlashcardProgress = Record<string, FlashcardState>;

const STORAGE_KEY = "unsloth-atlas-flashcards:v1";

function emptyState(): FlashcardProgress {
  return {};
}

function loadFromStorage(): FlashcardProgress {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    return JSON.parse(raw) as FlashcardProgress;
  } catch {
    return emptyState();
  }
}

function saveToStorage(state: FlashcardProgress): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function dueCards(cards: { id: string }[], progress: FlashcardProgress, now: number) {
  return cards.filter((c) => {
    const p = progress[c.id];
    if (!p) return true; // yeni kart
    return p.nextReview <= now;
  });
}

export function FlashcardsPage({ locale }: { locale: Locale }) {
  const tr = locale === "tr";
  const cards = flashcards[locale];
  const [progress, setProgress] = useState<FlashcardProgress>(emptyState);
  const [now, setNow] = useState<number>(0);
  const [flipped, setFlipped] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Hydration sonrası yükle (AtlasApp ile aynı pattern — setTimeout ile
  // cascading render uyarısından kaçınılır)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setProgress(loadFromStorage());
      setNow(Date.now());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const due = useMemo(() => dueCards(cards, progress, now), [cards, progress, now]);
  const queue = due.length > 0 ? due : cards.slice(0, 1);
  const current = queue[activeIndex] ?? queue[0];
  const card = current ? cards.find((c) => c.id === current.id) : null;

  // İstatistikler
  const stats = useMemo(() => {
    const seen = Object.keys(progress).length;
    const totalCorrect = Object.values(progress).reduce((s, p) => s + p.correctCount, 0);
    const totalSeen = Object.values(progress).reduce((s, p) => s + p.seenCount, 0);
    const accuracy = totalSeen > 0 ? Math.round((totalCorrect / totalSeen) * 100) : 0;
    return { seen, total: cards.length, accuracy, due: due.length };
  }, [progress, cards, due]);

  function answer(level: "hard" | "good" | "easy") {
    if (!current) return;
    const p = progress[current.id] ?? { box: 0, nextReview: 0, seenCount: 0, correctCount: 0 };
    let nextBox = p.box;
    if (level === "hard") nextBox = Math.max(0, p.box - 1);
    if (level === "good") nextBox = Math.min(srsBoxes.length - 1, p.box + 1);
    if (level === "easy") nextBox = Math.min(srsBoxes.length - 1, p.box + 2);

    const correctCount = p.correctCount + (level !== "hard" ? 1 : 0);
    const next: FlashcardState = {
      box: nextBox,
      nextReview: Date.now() + srsBoxes[nextBox] * 24 * 60 * 60 * 1000,
      seenCount: p.seenCount + 1,
      correctCount,
    };
    const next_ = { ...progress, [current.id]: next };
    setProgress(next_);
    saveToStorage(next_);

    setFlipped(false);
    if (activeIndex + 1 < queue.length) {
      setActiveIndex(activeIndex + 1);
    } else {
      setActiveIndex(0);
      setNow(Date.now());
    }
  }

  function reset() {
    setProgress(emptyState());
    saveToStorage(emptyState());
    setActiveIndex(0);
    setFlipped(false);
  }

  return (
    <section className="surface-stack">
      <div className="page-intro">
        <p className="eyebrow">{tr ? "ARALIKLI TEKRAR · 5 KUTU" : "SPACED REPETITION · 5 BOXES"}</p>
        <h1>{tr ? "Tekrar Kartları" : "Flashcards"}</h1>
        <p>
          {tr
            ? "Her kavram için ön/arka kart. “Zor” kutu numarasını düşürür, “kolay” yükseltir. Aralıklar 1, 3, 7, 14 ve 30 gündür. Unutma eğrisi çalışmalarından esinlenen bu sabit aralıklar öğretici bir programdır; kişisel etki kanıtı değildir."
            : "A front/back card for each concept. 'Hard' lowers the box number and 'easy' raises it. Spacing is 1, 3, 7, 14, and 30 days. Inspired by forgetting-curve research, these fixed intervals are a teaching schedule, not evidence of individual effectiveness."}
        </p>
        <EvidencePillTr level="simulation" tr={tr} />
      </div>

      <div className="flash-stats">
        <div><b>{stats.seen}/{stats.total}</b><span>{tr ? "görülen kart" : "seen cards"}</span></div>
        <div><b>{stats.due}</b><span>{tr ? "tekrar zamanı gelen" : "due now"}</span></div>
        <div><b>%{stats.accuracy}</b><span>{tr ? "isabet" : "accuracy"}</span></div>
        <button className="reset-button" onClick={reset}>{tr ? "Sıfırla" : "Reset"}</button>
      </div>

      {card ? (
        <div
          className={`flash-card ${flipped ? "flipped" : ""}`}
          role="button"
          tabIndex={0}
          onClick={() => setFlipped(!flipped)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setFlipped(!flipped);
            }
          }}
        >
          <div className="flash-card-inner">
            <div className="flash-card-face flash-card-front">
              <span className="kicker">{tr ? "ÖN YÜZ" : "FRONT"}</span>
              <p>{card[locale].front}</p>
              <small>{tr ? "Cevabı görmek için tıkla" : "Click to reveal"}</small>
            </div>
            <div className="flash-card-face flash-card-back">
              <span className="kicker">{tr ? "ARKA YÜZ" : "BACK"}</span>
              <p>{card[locale].back}</p>
              {card[locale].hint && <small>{tr ? "İpucu: " : "Hint: "}{card[locale].hint}</small>}
            </div>
          </div>
        </div>
      ) : (
        <article className="flash-card flash-card-empty">
          <p>{tr ? "Şu an görülecek kart yok. Yarın tekrar gel." : "No cards due. Come back tomorrow."}</p>
        </article>
      )}

      {card && flipped && (
        <div className="flash-actions">
          <button onClick={() => answer("hard")} className="flash-btn flash-btn-hard">
            <b>{tr ? "Zor" : "Hard"}</b>
            <span>{tr ? "1 gün sonra" : "in 1 day"}</span>
          </button>
          <button onClick={() => answer("good")} className="flash-btn flash-btn-good">
            <b>{tr ? "İyi" : "Good"}</b>
            <span>{tr ? `${srsBoxes[Math.min(srsBoxes.length - 1, (progress[card.id]?.box ?? 0) + 1)]} gün sonra` : `in ${srsBoxes[Math.min(srsBoxes.length - 1, (progress[card.id]?.box ?? 0) + 1)]} days`}</span>
          </button>
          <button onClick={() => answer("easy")} className="flash-btn flash-btn-easy">
            <b>{tr ? "Kolay" : "Easy"}</b>
            <span>{tr ? `${srsBoxes[Math.min(srsBoxes.length - 1, (progress[card.id]?.box ?? 0) + 2)]} gün sonra` : `in ${srsBoxes[Math.min(srsBoxes.length - 1, (progress[card.id]?.box ?? 0) + 2)]} days`}</span>
          </button>
        </div>
      )}

      <div className="flash-boxes">
        <p className="kicker">{tr ? "KUTU DURUMU" : "BOX STATE"}</p>
        <div className="flash-boxes-row">
          {srsBoxes.map((days, idx) => {
            const count = Object.values(progress).filter((p) => p.box === idx).length;
            return (
              <div key={idx} className="flash-box">
                <b>{count}</b>
                <span>{tr ? `Kutu ${idx + 1}` : `Box ${idx + 1}`}</span>
                <small>{days} {tr ? "gün" : "days"}</small>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function EvidencePillTr({ level, tr }: { level: "verified" | "observed" | "planned" | "unknown" | "simulation"; tr: boolean }) {
  const map = {
    verified: tr ? "Doğrulandı" : "Verified",
    observed: tr ? "Gözlendi" : "Observed",
    planned: tr ? "Planlandı" : "Planned",
    unknown: tr ? "Bilinmiyor" : "Unknown",
    simulation: tr ? "Öğretici simülasyon" : "Teaching simulation",
  } as const;
  return <span className={`evidence-pill evidence-${level}`}>{map[level]}</span>;
}
