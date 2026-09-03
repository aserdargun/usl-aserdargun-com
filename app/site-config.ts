import type { Metadata, Viewport } from "next";

export const baseMetadata: Metadata = {
  metadataBase: new URL("https://usl.aserdargun.com"),
  title: { default: "USL - Unsloth Studio Learning", template: "%s · Unsloth Studio Learning" },
  description: "A bilingual, evidence-aware learning atlas for Unsloth Studio, LoRA, QLoRA, dataset engineering, evaluation, and local model deployment.",
  applicationName: "Unsloth Studio Learning",
  authors: [{ name: "Serdar Gündoğdu", url: "https://aserdargun.com" }],
  keywords: ["Unsloth", "LoRA", "QLoRA", "fine-tuning", "LLM", "RTX 4070 Ti Super", "learning atlas"],
  icons: { icon: "/icon.png", shortcut: "/icon.png", apple: "/icon.png" },
  openGraph: { type: "website", url: "https://usl.aserdargun.com", siteName: "Unsloth Studio Learning", title: "Unsloth Studio Learning", description: "From first principles to evidence-backed fine-tuning on a 16 GB GPU.", images: [{ url: "/og.png", width: 1536, height: 1024, alt: "Unsloth Studio Learning — TR / EN" }] },
  twitter: { card: "summary_large_image", title: "Unsloth Studio Learning", description: "A bilingual, evidence-aware path from LoRA concepts to local deployment.", images: ["/og.png"] },
};

export const baseViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#0b1220" }, { media: "(prefers-color-scheme: light)", color: "#f8fafc" }],
};

export const courseJsonLd = {
  "@context": "https://schema.org",
  "@type": "Course",
  name: "Unsloth Studio Learning",
  description: "A 12-week bilingual learning path for evidence-aware LoRA and QLoRA engineering.",
  provider: { "@type": "Person", name: "Serdar Gündoğdu", url: "https://aserdargun.com" },
  inLanguage: ["tr", "en"],
  isAccessibleForFree: true,
};
