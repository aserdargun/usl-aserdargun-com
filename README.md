# Unsloth Studio Learning Atlas

[Türkçe](#türkçe) · [English](#english)

A public, bilingual, evidence-aware learning atlas for Unsloth Studio, LoRA, QLoRA, dataset engineering, evaluation, and local model deployment.

![Unsloth Studio Learning Atlas social card](public/og.png)

## Türkçe

Bu repo, 50 Markdown dosyasındaki öğrenme notlarını arındırılmış ve etkileşimli bir web uygulamasına dönüştürür. Canonical vault değiştirilmez. Türkçe ve İngilizce sürümler aynı sabit içerik kimliklerini kullanır; ziyaretçi ilerlemesi yalnızca tarayıcıda tutulur.

### Ürün yüzeyleri

- 12 haftalık yol haritası; görev, çıktı ve geçiş kriterleri
- 8 temel ders: model seçimi, token/attention, LoRA/QLoRA, rank/alpha, step/batch, loss, chat template ve evaluation
- 8 kontrollü laboratuvar: context bütçesi, effective batch, LoRA ölçeği, gerçek tokenizer girdisi, dataset karışımı, benchmark skoru, masking checklist ve 16 GB planlama rehberi
- Cevap gönderilmeden açıklamayı göstermeyen 20 soruluk karma test; `%80` geçiş hedefi ve konu eksikleri
- Kanıt seviyeleri: `verified`, `observed`, `planned`, `unknown`, `simulation`
- 4 görsel simülasyon, 16 tekrar kartı ve özgün makale bağlantıları
- AIA → USL → ADP / LLM / EVL / LCL öğrenme geçişleri; veri veya model aktarımı yok
- Kaynak ilerlemesi ile ziyaretçinin “benim ilerlemem” durumunun açık ayrımı

### Yerel geliştirme

Gereksinim: Node.js 22.13 veya daha yeni.

```bash
npm install
npm run dev
```

Vinext worker build:

```bash
npm run build
npm run test:rendered
```

Azure Static Web Apps için statik Next.js export:

```bash
IS_STATIC_EXPORT=true npm run build:azure
```

Çıktı `out/` dizinine yazılır.

### Vault senkronizasyonu

Canonical vault yolu repoya yazılmaz. Yerel senkronizasyonda ortam değişkeni kullanılır:

```bash
UNSLOTH_VAULT_PATH="/path/to/Unsloth-Studio-Learning" npm run content:sync
npm run validate:content
```

`content:sync` şunları uygular:

- 50 kaynağın her birini `content/source-manifest.json` içinde bir public çıktıya eşler.
- UUID, e-posta, mutlak kullanıcı yolu, görev provenance'ı, Obsidian plugin yolu ve özel operasyon adlarını temizler.
- İki gerçek kırık loss/overfitting wiki bağlantısını birleşik kavrama yönlendirir; Obsidian tablolarındaki kaçışlı `\|` bağlantılarını doğru ayrıştırır.
- Ham Journal anlatılarını “ilk düşünce → düzeltme → karar kuralı” kartlarına dönüştürür.
- TR kaynak digest'ini, 95 ortak içerik kimliğini ve incelenmiş TR/EN içerik digest'lerini `content/locale-parity.json` içinde tutar. `stale` listesi boş değilse veya kayıtlı digest güncel içerikle eşleşmiyorsa doğrulama başarısız olur. Senkronizasyon çevirileri otomatik onaylamaz; iki dil incelendikten sonra doğrulama kaydı yenilenir.

### Doğruluk sınırları

Hesaplayıcılar öğretici simülasyondur ve gerçek GPU çalıştırmaz. Türkçe token verimliliği için sonuç uydurulmaz; kullanıcı kendi gerçek tokenizer ölçümlerini girer. Kaydedilmiş Qwen3 4B koşusu pipeline kanıtıdır: 30/30 adım, adapter save/reload ve 0.8245 son training loss doğrulanmıştır. Evaluation split yoktur; base model üç kalite karşılaştırmasında daha güçlüdür. `9.62 / 15.99 GiB` yalnızca gözlenen anlık kullanımdır, peak VRAM değildir.

Sürüm bağımlı Unsloth iddiaları için [doğrulama kaydı](docs/CLAIM-VERIFICATION.md) tutulur.

### Testler

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run build
npm run test:rendered
npm run build:azure
```

CI; içerik kapsamını, TR/EN eşliğini, sanitizasyonu, wiki bağlantılarını, hesaplayıcıları, server render'ı ve her iki üretim build'ini doğrular.

## English

This repository turns 50 Markdown learning sources into a sanitized, interactive web application. The canonical vault is never modified. Turkish and English share stable content IDs, while visitor progress stays entirely in the browser.

### Product surfaces

- A 12-week roadmap with tasks, deliverables, and gates
- Eight foundational lessons across model choice, tokens/attention, LoRA/QLoRA, rank/alpha, steps/batches, loss, chat templates, and evaluation
- Eight controlled labs for context, effective batch, LoRA scaling, real tokenizer inputs, dataset mix, benchmark scoring, masking checks, and 16 GB planning
- A 20-question mixed assessment that hides explanations until submission, targets 80%, and reports topic gaps
- Explicit evidence levels: `verified`, `observed`, `planned`, `unknown`, and `simulation`
- Four visual simulations, 16 review cards, and original-paper links
- AIA → USL → ADP / LLM / EVL / LCL learning links without data or model transfer
- A clear separation between read-only source state and “my progress”

### Local development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
npm run test
```

The Vinext build targets the compatible local/Sites worker runtime. `npm run build:azure` sets `IS_STATIC_EXPORT=true` and produces the Azure Static Web Apps `out/` artifact.

### Browser storage

- Language: `unsloth-atlas-language`
- Progress: `unsloth-atlas-progress:v1`
- Flashcard schedule: `unsloth-atlas-flashcards:v1`
- Theme: `unsloth-atlas-theme`

Stored records are validated before use. Invalid numeric inputs keep the last valid result; corrupt records cannot prevent the app from opening. If browser storage is denied or full, controls remain usable and progress changes show a session-only notice.

There is no account, backend, central database, or live GPU connection in v1.

## Deployment

Production is built from `main` and deployed to Azure Static Web Apps. The footer embeds `NEXT_PUBLIC_COMMIT_SHA` so the browser, GitHub `main`, and the deployed artifact can be reconciled.

Target: [usl.aserdargun.com](https://usl.aserdargun.com)

## License

Source code: [MIT](LICENSE). Original educational content in this repository: [CC BY 4.0](CONTENT-LICENSE.md).

### Dependency maintenance

The `miniflare > sharp` override pins `sharp` to `0.35.4` to avoid the vulnerable image-processing dependency pinned by Miniflare. Recheck this override when upgrading Miniflare; remove it once the upstream dependency includes the fix. Both the Vinext worker and Azure static export must pass after runtime updates.
