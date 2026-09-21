import type { Locale } from "../atlas-data";
import pathways from "../../content/learning-pathways.json";

export function PortfolioPathways({ locale }: { locale: Locale }) {
  const tr = locale === "tr";
  return <section className="portfolio-pathways" data-content-id="portfolio-pathways">
    <div className="section-heading"><div>
      <p className="eyebrow">ASERDARGUN.COM</p>
      <h2>{tr ? "Öğrenme sisteminde sonraki adım" : "Next in the learning system"}</h2>
      <p>{tr ? "USL, model uyarlamanın temelini kurar. Bu bağlantılar öğrenme geçişleridir; model, veri veya ilerleme aktarmaz." : "USL provides the foundations of model adaptation. These are learning links; they do not transfer models, data or progress."}</p>
    </div><a href={tr ? "https://aserdargun.com/tr/#learning" : "https://aserdargun.com/#learning"}>{tr ? "Tüm öğrenme haritası" : "Full learning map"} →</a></div>
    <div className="lesson-grid">{pathways.links.map((link) => <a className="lesson-tile" href={link.url} key={link.id} data-content-id={link.id}>
      <span>{link.code}</span><h3>{link[locale].title}</h3><p>{link[locale].description}</p><b aria-hidden="true">↗</b>
    </a>)}</div>
  </section>;
}
