"use client";

// Sözlük yüzeyi: derslerde tooltip olarak bağlanmayan terimleri okunur hale getirir.
// Bu yüzey yeni kanıt iddiası eklemez; yalnızca mevcut terim tanımlarını listeler.

import { useMemo, useState } from "react";
import type { Locale } from "../atlas-data";
import { glossary } from "../atlas-data";

type Entry = { tr: { term: string; short: string; long: string }; en: { term: string; short: string; long: string } };

export function GlossaryPage({ locale }: { locale: Locale }) {
  const tr = locale === "tr";
  const entries = glossary[locale] as Record<string, Entry>;
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const all = Object.entries(entries).map(([id, value]) => ({ id, value: value[locale] }));
    const needle = query.trim().toLocaleLowerCase(locale);
    if (!needle) return all.sort((a, b) => a.value.term.localeCompare(b.value.term, locale));
    return all
      .filter(({ id, value }) => `${value.term} ${value.short} ${id}`.toLocaleLowerCase(locale).includes(needle))
      .sort((a, b) => a.value.term.localeCompare(b.value.term, locale));
  }, [entries, locale, query]);

  return (
    <section className="glossary-page">
      <header>
        <p className="eyebrow">{tr ? "Sözlük" : "Glossary"}</p>
        <h1>{tr ? "Terimler sözlüğü" : "Term glossary"}</h1>
        <p>
          {tr
            ? "Atlas boyunca geçen terimlerin kısa tanımları. Her terim tek bir kavramı açıklar; ölçüm veya doğrulanmış sonuç iddia etmez."
            : "Short definitions for the terms used across the Atlas. Each entry explains one concept and asserts no measurement or verified result."}
        </p>
      </header>

      <label className="glossary-search">
        <span>{tr ? "Terim ara" : "Search terms"}</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={tr ? "terim veya kısa açıklama" : "term or short definition"}
        />
      </label>

      <p className="glossary-count">
        {rows.length} {tr ? "terim" : rows.length === 1 ? "term" : "terms"}
      </p>

      <dl className="glossary-list">
        {rows.map(({ id, value }) => (
          <div key={id} className="glossary-entry" id={`term-${id}`}>
            <dt>
              <b>{value.term}</b>
              <code>{id}</code>
            </dt>
            <dd>
              <p className="glossary-short">{value.short}</p>
              <p>{value.long}</p>
            </dd>
          </div>
        ))}
      </dl>

      {rows.length === 0 ? <p className="glossary-empty">{tr ? "Eşleşen terim yok." : "No matching term."}</p> : null}
    </section>
  );
}
