import type { MetadataRoute } from "next";
import { lessons, routeSurfaces } from "./atlas-data";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = "https://usl.aserdargun.com";
  const paths = ["", ...routeSurfaces.map((surface) => `${surface}/`), ...lessons.tr.map((lesson) => `learn/${lesson.slug}/`)];
  return paths.flatMap((path) => ["tr", "en"].map((locale) => ({
    url: `${origin}/${locale}/${path}`,
    lastModified: new Date("2026-09-04T00:00:00Z"),
    changeFrequency: path.startsWith("learn") ? "monthly" as const : "weekly" as const,
    priority: path === "" ? 1 : path.startsWith("learn") ? 0.8 : 0.9,
    alternates: { languages: { tr: `${origin}/tr/${path}`, en: `${origin}/en/${path}` } },
  })));
}
