import type { Metadata } from "next";
import { lessons, type Locale, type Surface } from "./atlas-data";

const origin = "https://usl.aserdargun.com";
const surfaceTitles: Record<Locale, Record<Surface, string>> = {
  tr: { dashboard: "Panel", roadmap: "12 Haftalık Yol Haritası", labs: "Etkileşimli Laboratuvarlar", evidence: "Deney ve Kanıt Kaydı", "data-evaluation": "Veri ve Değerlendirme", journey: "Öğrenme Yolculuğu", visualize: "Görsel ve İnteraktif Laboratuvar", flashcards: "Aralıklı Tekrar Kartları" },
  en: { dashboard: "Dashboard", roadmap: "12-Week Roadmap", labs: "Interactive Labs", evidence: "Experiment and Evidence Record", "data-evaluation": "Data and Evaluation", journey: "Learning Journey", visualize: "Visual and Interactive Lab", flashcards: "Spaced Repetition Cards" },
};

export function atlasMetadata(locale: Locale, surface: Surface = "dashboard", slug?: string): Metadata {
  const suffix = slug ? `learn/${slug}` : surface === "dashboard" ? "" : surface;
  const lesson = slug ? lessons[locale].find((item) => item.slug === slug) : undefined;
  const title = lesson?.title ?? surfaceTitles[locale][surface];
  const description = lesson?.summary ?? (locale === "tr"
    ? "Unsloth Studio, LoRA, QLoRA, dataset mühendisliği ve değerlendirme için kanıt odaklı iki dilli öğrenme atlası."
    : "An evidence-aware bilingual learning atlas for Unsloth Studio, LoRA, QLoRA, dataset engineering, and evaluation.");
  const trPath = `/tr/${suffix ? `${suffix}/` : ""}`;
  const enPath = `/en/${suffix ? `${suffix}/` : ""}`;
  const canonical = locale === "tr" ? trPath : enPath;
  return {
    title: `USL - ${title}`,
    description,
    alternates: { canonical, languages: { tr: trPath, en: enPath, "x-default": enPath } },
    openGraph: { title: `USL - ${title}`, description, url: `${origin}${canonical}`, locale: locale === "tr" ? "tr_TR" : "en_US", alternateLocale: locale === "tr" ? ["en_US"] : ["tr_TR"], images: ["/og.png"] },
    twitter: { title: `USL - ${title}`, description, images: ["/og.png"] },
  };
}
