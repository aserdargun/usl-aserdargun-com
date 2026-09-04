"use client";

import { useEffect } from "react";

const LANGUAGE_KEY = "unsloth-atlas-language";

export default function Home() {
  useEffect(() => {
    const saved = window.localStorage.getItem(LANGUAGE_KEY);
    const locale = saved === "tr" ? "tr" : "en";
    window.location.replace(`/${locale}/`);
  }, []);

  return <main className="locale-gateway"><p className="eyebrow">UNSLOTH STUDIO LEARNING ATLAS</p><h1>Loading the atlas…</h1><p>Atlas yükleniyor · Redirecting to your learning environment.</p></main>;
}
