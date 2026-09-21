// Üniversite öğrencisi için "kalıcı bilgi + görsel zenginlik" katmanı.
// Bu dosya yalnızca veri sağlar; UI AtlasApp.tsx ve diğer bileşenlerde yaşar.
// Mevcut atlas-data.ts sözleşmesine (TR/EN pair, kanıt ayrımı) sadık kalır.

import type { Locale } from "./atlas-data";

// ---------------------------------------------------------------------------
// 1) Tokenizer Playground — örnek metinler
//    Gerçek bir tokenizer çalıştırmaz; BPE benzeri kural-tabanlı bir
//    parçalama simülasyonu yapar. Sonuçlar eğitim amaçlıdır ve tahmindir;
//    üretim kararları için gerçek tokenizer ile ölçüm zorunludur.
//    Evidence seviyesi: simulation.
// ---------------------------------------------------------------------------

export interface TokenizerSample {
  id: string;
  tr: { text: string; note: string };
  en: { text: string; note: string };
  // BPE-benzeri parçalama kuralı. Görselde her parça ayrı token olarak
  // gösterilir. Akademik gerçeklik iddiası taşımaz.
  splitRule: "word-subword" | "char-ngram" | "syllable";
  // Karşılaştırma için karakter sayısı
  charCount: { tr: number; en: number };
}

export const tokenizerSamples: Record<Locale, TokenizerSample[]> = {
  tr: [
    {
      id: "tr-daily",
      tr: { text: "Aynı metni farklı tokenizerlarla ölçebiliriz.", note: "Günlük cümle: parçaları iki dilde karşılaştır." },
      en: { text: "We can measure the same text with different tokenizers.", note: "Compare the same meaning with a toy splitting rule." },
      splitRule: "word-subword",
      charCount: { tr: 0, en: 0 },
    },
    {
      id: "tr-compound",
      tr: { text: "Üniversite öğrencileri için kalıcı bilgi.", note: "İsim grubu: bu oyuncak kuralda uzun sözcükler bölünür." },
      en: { text: "Durable knowledge for university students.", note: "Compare an English noun phrase with its Turkish counterpart." },
      splitRule: "word-subword",
      charCount: { tr: 0, en: 0 },
    },
    {
      id: "tr-agglutination",
      tr: { text: "Eğitimlerini tamamlamadıkları için belgelendirilemediler.", note: "Eklemeli yapı: gerçek token sınırları tokenizer sözlüğüne bağlıdır." },
      en: { text: "They could not be certified because they did not finish.", note: "An English phrase corresponding to Turkish suffixes." },
      splitRule: "word-subword",
      charCount: { tr: 0, en: 0 },
    },
  ],
  en: [],
};

// Keep the paired data and derived character counts identical in either UI language.
for (const sample of tokenizerSamples.tr) {
  sample.charCount = { tr: Array.from(sample.tr.text).length, en: Array.from(sample.en.text).length };
}
tokenizerSamples.en = tokenizerSamples.tr.map((sample) => ({ ...sample }));

// BPE-benzeri parçalama: önce boşlukla böl, sonra uzun parçaları
// alt-sözcüklere ayır. Akademik değil; yalnızca "yaklaşık gösterim".
export function pseudoBpeSplit(text: string, rule: TokenizerSample["splitRule"]): string[] {
  if (!text) return [];
  const words = text.split(/\s+/).filter(Boolean);
  if (rule === "char-ngram") {
    return words.flatMap((w) => w.split(""));
  }
  if (rule === "syllable") {
    // Çok kaba: sesli harf etrafında böl. Tam doğru heceleme değil.
    return words.flatMap((w) => w.split(/(?=[aeıioöuüAEIİOÖUÜ])/));
  }
  // word-subword: BPE-yaklaşımı — sık kelimeleri tek parça, uzunları kısalt.
  return words.flatMap((w) => {
    const clean = w.replace(/[.,!?;:]/g, "");
    const punct = w.match(/[.,!?;:]+$/)?.[0] ?? "";
    if (clean.length <= 5) return [w];
    if (clean.length <= 9) {
      // 2 parça
      const mid = Math.floor(clean.length / 2);
      return [`${clean.slice(0, mid)}##`, `${clean.slice(mid)}${punct}`];
    }
    // 3 parça
    const third = Math.floor(clean.length / 3);
    return [
      `${clean.slice(0, third)}##`,
      `${clean.slice(third, third * 2)}##`,
      `${clean.slice(third * 2)}${punct}`,
    ];
  });
}

// ---------------------------------------------------------------------------
// 2) Spaced Repetition Flashcards
//    5-kutu SRS (1, 3, 7, 14, 30 gün). localStorage'da her kartın
//    "kutu" numarası saklanır. "Zor" → kutu azalır, "kolay" → kutu artar.
//    Evidence: pedagogik iyi uygulama, simulated practice.
// ---------------------------------------------------------------------------

export interface Flashcard {
  id: string;
  topic: string; // ilgili ders kimliği
  tr: { front: string; back: string; hint?: string };
  en: { front: string; back: string; hint?: string };
}

export const flashcards: Record<Locale, Flashcard[]> = {
  tr: [
    // models
    { id: "fc-models-1", topic: "models", tr: { front: "Base model ne yapar?", back: "Yalnızca sonraki token tahmini yapar; talimat takip etmek zorunda değildir." }, en: { front: "What does a Base model do?", back: "It only predicts the next token; it is not required to follow instructions." } },
    { id: "fc-models-2", topic: "models", tr: { front: "Dar bir domain asistanı için en savunulabilir başlangıç?", back: "Instruct checkpoint; çünkü zaten hizalı, daha düşük öğrenme yükü." }, en: { front: "Best start for a narrow domain assistant?", back: "Instruct checkpoint; already aligned, lower learning load." } },
    // tokens
    { id: "fc-tokens-1", topic: "tokens", tr: { front: "Bağlam bütçesine neler girer?", back: "Sistem + şablon + kullanıcı + RAG + yanıt." }, en: { front: "What goes into context budget?", back: "System + template + user + RAG + response." } },
    { id: "fc-tokens-2", topic: "tokens", tr: { front: "Inference sırasında sabit kalan nedir?", back: "WQ/WK/WV ağırlıkları; Q/K/V vektörleri bağlama göre değişir." }, en: { front: "What stays fixed during inference?", back: "WQ/WK/WV weights; Q/K/V vectors change with input." } },
    // lora
    { id: "fc-lora-1", topic: "lora", tr: { front: "LoRA hangi iki matris eğitir?", back: "Yalnızca A ve B; B=0 başlangıcı taban davranışını korur." }, en: { front: "Which two matrices does LoRA train?", back: "Only A and B; B=0 start preserves base behavior." } },
    { id: "fc-lora-2", topic: "lora", tr: { front: "QLoRA'da 4-bit olan nedir?", back: "Donmuş taban ağırlıkları; adaptörler daha yüksek hassasiyette." }, en: { front: "What is 4-bit in QLoRA?", back: "The frozen base; adapters keep higher precision." } },
    // rank
    { id: "fc-rank-1", topic: "rank", tr: { front: "Rank iki katına çıkınca LoRA parametre sayısı?", back: "Yaklaşık iki kat; r × (d_in + d_out) doğrusal ölçeklenir." }, en: { front: "What happens to LoRA params when rank doubles?", back: "Roughly doubles; r × (d_in + d_out) scales linearly." } },
    { id: "fc-rank-2", topic: "rank", tr: { front: "rsLoRA ölçeği nedir?", back: "α/√r (standart LoRA: α/r)." }, en: { front: "What is rsLoRA scale?", back: "α/√r (standard LoRA: α/r)." } },
    // steps
    { id: "fc-steps-1", topic: "steps", tr: { front: "Etkin toplu iş nasıl hesaplanır?", back: "Mikro toplu iş × birikim × GPU sayısı." }, en: { front: "How is effective batch computed?", back: "μ × accumulation × GPU count." } },
    { id: "fc-steps-2", topic: "steps", tr: { front: "Accumulation 8 ne anlama gelir?", back: "8 backward + 1 optimizer step. Ağırlık 1 kez güncellenir." }, en: { front: "What does accumulation 8 mean?", back: "8 backward passes + 1 optimizer step. Weights update once." } },
    // loss
    { id: "fc-loss-1", topic: "loss", tr: { front: "Train↓ Val↑ ne sinyal verir?", back: "Klasik overfitting." }, en: { front: "Train↓ Val↑ signals what?", back: "Classic overfitting." } },
    { id: "fc-loss-2", topic: "loss", tr: { front: "Alan↑ Genel↓ neyi gösterir?", back: "Unutma veya adaptör kaynaklı davranışsal girişim." }, en: { front: "Domain↑ General↓ indicates?", back: "Forgetting or adapter-induced behavioral interference." } },
    // templates
    { id: "fc-tpl-1", topic: "templates", tr: { front: "Doğru yaklaşım nedir?", back: "Rol/içerik kayıtlarını bağımsız sakla, her modelin şablonuyla işle." }, en: { front: "What is the right approach?", back: "Store role/content independently, render with each model's template." } },
    { id: "fc-tpl-2", topic: "templates", tr: { front: "Yanlış delimiter ne yapar?", back: "Cevap loss dışında kalabilir ya da prompt yanlışlıkla eğitilir." }, en: { front: "What does a wrong delimiter do?", back: "Assistant answers may be excluded from loss; prompt may be trained by accident." } },
    // evaluation
    { id: "fc-eval-1", topic: "evaluation", tr: { front: "Atlasın örnek veri karışımı?", back: "%55 standart, %10 parafraz, %15 eksik bilgi, %10 negatif, %10 eskalasyon." }, en: { front: "What is the atlas’s illustrative data mix?", back: "55% standard, 10% paraphrase, 15% missing info, 10% negative, 10% escalation." } },
    { id: "fc-eval-2", topic: "evaluation", tr: { front: "Geçerli JSON neyi garanti eder?", back: "Yalnız yapı geçerliliği; içerik doğruluğu ve güvenlik ayrı test edilir." }, en: { front: "What does valid JSON guarantee?", back: "Only structural validity; correctness and safety need separate tests." } },
  ],
  en: [],
};
flashcards.en = flashcards.tr.map((card) => ({
  ...card,
  tr: card.tr,
  en: card.en,
}));

// SRS kutu aralıkları (gün). 0: yeni, 1-4: kutu numarası.
export const srsBoxes: number[] = [1, 3, 7, 14, 30];

// ---------------------------------------------------------------------------
// 3) Concept Depth — 3 Seviye Açıklama
//    Her ders için: layman (günlük dil) / undergrad (üniversite) / advanced
//    (uzman). Öğrenci kendi seviyesini seçer. Kalıcı öğrenme için
//    "elaboration" ve "self-explanation" prensiplerini destekler.
// ---------------------------------------------------------------------------

export type DepthLevel = "layman" | "undergrad" | "advanced";

export interface ConceptDepth {
  layman: { tr: string; en: string };
  undergrad: { tr: string; en: string };
  advanced: { tr: string; en: string };
}

export const conceptDepth: Record<string, Partial<Record<Locale, ConceptDepth>>> = {
  models: {
    tr: {
      layman: { tr: "Base model dil örüntülerini ön-eğitimden öğrenir; talimat takibi garanti değildir. Instruct talimat izleme için uyarlanır. Reasoning bir yetenek özelliğidir ve Instruct ile birlikte bulunabilir.", en: "A base model learns language patterns during pretraining; instruction following is not guaranteed. Instruct is adapted for following instructions. Reasoning is a capability that can coexist with Instruct." },
      undergrad: { tr: "Base, ön-eğitimden gelen başlangıç ağırlıklarıdır. Instruct, SFT ve tercih optimizasyonu gibi yöntemlerle talimat takibine uyarlanabilir. Reasoning davranışı gözetimli örnekler, damıtma veya RL ile desteklenebilir; yalnız RL gerektirmez.", en: "Base provides pretrained starting weights. Instruct can use SFT and preference optimization for instruction following. Reasoning behavior may be supported by supervised examples, distillation or RL; RL is not required in every case." },
      advanced: { tr: "Model etiketi eğitim maliyetini sıralamaz. Başlangıç checkpoint’ini görev, veri, lisans ve sabit benchmark ile seç; Base, Instruct ve Reasoning arasında evrensel bir adapter eğitim yükü sıralaması yoktur.", en: "Model labels do not rank training cost. Choose a checkpoint using task, data, license and a fixed benchmark; there is no universal adapter training-load ordering across Base, Instruct and Reasoning." },
    },
  },
  tokens: {
    tr: {
      layman: { tr: "Tokenizer metni kelime, kelime parçası veya noktalama gibi birimlere böler. Aynı anlam farklı dillerde farklı sayıda token üretebilir; farkı hedef tokenizer ile ölç.", en: "A tokenizer splits text into units such as words, word pieces or punctuation. The same meaning may use different token counts across languages; measure the difference with the target tokenizer." },
      undergrad: { tr: "BPE bir alt-sözcük algoritmasıdır; SentencePiece farklı algoritmaları destekleyen bir araçtır. Token sayısı sözlük, normalleştirme ve metne bağlıdır. Türkçe için sabit bir maliyet çarpanı kullanma; eş anlamlı metinleri aynı tokenizer ve şablonla ölç.", en: "BPE is a subword algorithm; SentencePiece is a toolkit supporting multiple algorithms. Token count depends on vocabulary, normalization and text. Avoid a fixed Turkish cost multiplier; measure paired meanings with the same tokenizer and template." },
      advanced: { tr: "BPE birleştirmeleri sıklık temellidir; nadir bayt çiftleri sona kalır. Türkçe morfolojisi parça dağılımını etkileyebilir, ancak fark tokenizer'a ve metne bağlıdır. Doğru ölçüm hedef modelin gerçek tokenizer'ıyla yapılmalı; kesme, doldurma ve özel tokenlar da hesaba katılmalıdır.", en: "BPE merges are frequency-based; rare byte pairs remain at the end. Turkish morphology can affect the piece distribution, but the difference depends on the tokenizer and text. Measure with the target model's real tokenizer, including truncation, padding, and special tokens." },
    },
  },
  lora: {
    tr: {
      layman: { tr: "Dev bir kitabın arasına küçük yapışkan notlar iliştirmek gibi. Kitabı değiştirmezsin, sadece yorumunu eklersin. Adapter'ı çıkarınca orijinal kitap geri gelir. QLoRA ise kitabın kendisini 'küçültülmüş' tutar (4-bit), böylece aynı masada daha çok şey sığar.", en: "Like sticking small sticky notes into a huge textbook. You do not change the book, you just add your commentary. Remove the adapters and the original book comes back. QLoRA keeps the book itself 'shrunken' (4-bit) so more fits on the same desk." },
      undergrad: { tr: "LoRA, W' = W + scale·BA biçiminde düşük-rank bir düzeltme öğrenir. Sadece A ve B eğitilir, W donuk kalır. QLoRA, W'yi 4-bit (NF4) olarak saklar; A/B ve kritik hesaplar daha yüksek hassasiyette kalabilir. Gerçek bellek uygunluğu model, bağlam, toplu iş ve çalışma zamanına bağlıdır; 16 GB garanti değildir.", en: "LoRA learns a low-rank correction W' = W + scale·BA. Only A and B are trained; W stays frozen. QLoRA stores W in 4-bit (NF4); A/B and critical compute can stay at higher precision. Actual memory fit depends on the model, context, batch and runtime; 16 GB is not a guarantee." },
      advanced: { tr: "LoRA, tam güncellemeyi önce hesaplayıp yansıtmak yerine BA düşük-rank güncellemesini doğrudan öğrenir. Varsayılan rastgele A ve sıfır B başlangıcı kimlik dönüşümünü korur; PiSSA ve diğer başlangıçlar farklıdır. QLoRA’nın NF4, çift niceleme ve sayfalı optimizer seçenekleri bellek yükünü azaltmayı hedefler; gerçek peak ayrıca ölçülür.", en: "LoRA directly learns the low-rank update BA rather than first computing and projecting a full update. Default random A and zero B preserve the identity transformation; PiSSA and other initializations differ. QLoRA uses NF4, double quantization and paged optimizers to reduce memory pressure; actual peak memory needs measurement." },
    },
  },
  rank: {
    tr: {
      layman: { tr: "Adapter'ı küçük bir defter gibi düşün. Rank, defterdeki sayfa sayısıdır. Daha çok sayfa = daha çok not yeri = daha çok şey öğrenebilir. Ama her sayfaya ne kadar yazdığını alpha belirler; çok yazarsan eski notlar silikleşir, az yazarsan yer boş kalır.", en: "Think of the adapter as a small notebook. Rank is the number of pages. More pages = more space = more learning. But how much you write per page is set by alpha; too much and old notes blur, too little and space is wasted." },
      undergrad: { tr: "Rank r, A ∈ R^(r×d_in) ve B ∈ R^(d_out×r) matrislerinin iç boyutudur. Parametre sayısı r × (d_in + d_out) ile ölçeklenir. Alpha, ölçek çarpanıdır: standart LoRA'da α/r, rsLoRA'da α/√r. Aynı etkin ölçek korunsa bile, yüksek rank daha çok kapasite taşır ve overfitting riski artar.", en: "Rank r is the inner dimension of A ∈ R^(r×d_in) and B ∈ R^(d_out×r). Parameter count scales as r × (d_in + d_out). Alpha is the scale factor: α/r in standard LoRA, α/√r in rsLoRA. Even if effective scale is held constant, higher rank carries more capacity and increases overfitting risk." },
      advanced: { tr: "BA güncellemesinin rankı en fazla r’dir; öğrenilmiş rank daha düşük olabilir. r × (d_in + d_out) her hedef matrisin parametre sayısıdır. Hedef modülleri model.named_modules() ile doğrula; rank deneyinde etkin ölçeği ve diğer ayarları kaydet.", en: "The rank of BA is at most r; its learned rank may be lower. r × (d_in + d_out) counts parameters per target matrix. Verify target modules with model.named_modules(); record effective scaling and other settings when comparing ranks." },
    },
  },
  steps: {
    tr: {
      layman: { tr: "Öğrenci günde 5 soru çözer; haftada bir 'öğrenildi' yazılır. 5 soru micro-step, 'öğrenildi' optimizer step. 7 gün accumulation. Eğer günlük sorulara bilgisayar yetmezse (OOM), soru sayısını düşürür, ama haftalık toplamı korumak için gün sayısını artırırsın.", en: "A student solves 5 problems per day; once a week a 'learned' mark is written. 5 problems is a micro-step, the 'learned' mark is the optimizer step. 7 days is accumulation. If the computer cannot handle the daily problems (OOM), you lower the question count, but to keep the weekly total you increase the day count." },
      undergrad: { tr: "Micro-step, bir micro batch için forward/loss/backward geçişidir. Optimizer step, accumulation tamamlandıktan sonra ağırlığın bir kez güncellenmesidir. Effective batch = μ × accumulation × GPU sayısı. OOM'da ilk düşürülecek şey micro batch veya sequence length; effective batch korunacaksa accumulation artırılır.", en: "A micro-step is one forward/loss/backward pass for a micro batch. An optimizer step is one weight update after accumulation completes. Effective batch = μ × accumulation × GPU count. On OOM, the first thing to drop is micro batch or sequence length; if the effective batch must be preserved, accumulation is increased." },
      advanced: { tr: "Effective batch, convergence dynamics ve genellemeyi doğrudan etkiler. Çok küçük effective batch gradient noise'unu artırır; çok büyük effective batch sharp minima'ya kaçabilir. LR scheduler (cosine, linear, constant_with_warmup) optimizer step sayısına göre ilerler; epoch sayısına göre değil. Gradient checkpointing memory'i activation rekaytıyla takas eder; FLOPs artar ama VRAM azalır.", en: "Effective batch directly affects convergence dynamics and generalization. Too small a batch increases gradient noise; too large a batch can fall into sharp minima. LR scheduler (cosine, linear, constant_with_warmup) advances by optimizer step count, not by epoch count. Gradient checkpointing trades memory for activation recomputation; FLOPs increase but VRAM decreases." },
    },
  },
  loss: {
    tr: {
      layman: { tr: "Training loss çalıştığın sorulardaki hata, validation loss görülmemiş kontrol sorularındaki hata gibidir. Çalışma sorularında az hata, bağımsız sorularda da az hata olacağını garanti etmez.", en: "Training loss is like errors on practiced questions; validation loss is errors on unseen review questions. Low practice error does not guarantee low error on independent questions." },
      undergrad: { tr: "Training loss, optimize edilen hedefe uyumu ölçer. Validation loss, görülmemiş split üzerindeki genellemeyi ölçer. Train düşerken validation yükseliyorsa overfitting. Catastrophic forgetting farklıdır: yeni yetenek kazanırken eski/genel yetenek geriler. Loss tek başına kalite kanıtı değildir; domain/format/safety metrikleri de ölçülmelidir.", en: "Training loss measures fit to the optimized target. Validation loss measures generalization on an unseen split. If train falls while validation rises, that is overfitting. Catastrophic forgetting is different: new ability improves while prior/general ability declines. Loss is not by itself a quality proof; domain/format/safety metrics must also be measured." },
      advanced: { tr: "Loss yanında gradient norm, learning rate ve veri karışımını izle. Train/validation ayrışması bir teşhis sinyalidir; nedeni tek başına kanıtlamaz. Forgetting için önceki görevlerin sabit benchmark’ını tekrar ölç. Adapter kapatılınca düzelme, adapter kaynaklı girişime işaret eder.", en: "Monitor gradient norm, learning rate and data mix alongside loss. Train/validation divergence is a diagnostic signal, not proof of its cause. Re-evaluate fixed prior-task benchmarks for forgetting. Recovery after disabling the adapter indicates adapter-induced interference." },
    },
  },
  templates: {
    tr: {
      layman: { tr: "Bir mektup şablonu: 'Sayın X, ... Saygılarımla Y'. İçerik aynı ama biçim modele göre değişir. Şablon yanlışsa hitap ve kapanış yanlış yere düşer. Model için de benzer: aynı role/content kaydı, modele göre farklı token dizisine dönüşür.", en: "A letter template: 'Dear X, ... Sincerely, Y'. The content is the same but the format changes per model. With the wrong template, the salutation and sign-off land in the wrong place. For models it is similar: the same role/content record turns into a different token sequence per model." },
      undergrad: { tr: "Her modelin kendi chat template'i vardır (ChatML, Llama-3, Qwen, Phi). role/content kayıtlarını modelden bağımsız sakla; her model için kendi tokenizer ve template'iyle yeniden render et. Response-only masking'de assistant sınırları gerçek render ile eşleşmezse cevap loss dışında kalabilir.", en: "Each model has its own chat template (ChatML, Llama-3, Qwen, Phi). Store role/content records independently of the model; re-render with each model's own tokenizer and template. In response-only masking, if the assistant boundaries do not match the real render, the answer can fall outside the loss." },
      advanced: { tr: "BOS/EOS, rol tokenları ve assistant sınırları checkpoint’e bağlıdır. Belirli bir modelin daha az token ürettiğini ölçmeden varsayma. Eğitim ve çıkarımda uyumlu şablon kullan; render edilmiş örneği, özel tokenları ve loss maskesini incele.", en: "BOS/EOS, role tokens and assistant boundaries depend on the checkpoint. Do not assume a model produces fewer tokens without measuring it. Use compatible templates for training and inference; inspect a rendered example, special tokens and the loss mask." },
    },
  },
  evaluation: {
    tr: {
      layman: { tr: "Bir arabanın yalnız hızına değil, frenine, yakıt tüketimine, güvenliğine ve konforuna da bakarsın. Tek metrik yanıltıcıdır. Model değerlendirmesinde de 'hız' = loss; ama asıl önemli olan 'fren, güvenlik, konfor' = domain, format, safety, retention.", en: "You do not judge a car by speed alone; you also look at brakes, fuel economy, safety, and comfort. A single metric is misleading. In model evaluation, 'speed' is loss; but what really matters is 'brakes, safety, comfort' = domain, format, safety, retention." },
      undergrad: { tr: "Train/validation/test split'leri ayrı kaynaklardan dondurulmalıdır. Bu atlasın örnek veri karışımı (evrensel öneri değil): %55 standart, %10 parafraz, %15 eksik bilgi, %10 negatif, %10 eskalasyon. 100 soruluk benchmark domain/format/safety/uncertainty/retention ağırlıklı ortalama ile skorlanır. Eğitim verisini evaluation'da kullanmak genelleme kanıtı değildir.", en: "Train/validation/test splits must be frozen from separate sources. This atlas’s illustrative data mix (not universal): 55% standard, 10% paraphrase, 15% missing info, 10% negative, 10% escalation. A 100-question benchmark scores with a weighted average of domain/format/safety/uncertainty/retention. Reusing training data for evaluation is not generalization evidence." },
      advanced: { tr: "Split stratejisini kullanım senaryosuna göre kaynak, zaman veya varlık üzerinden kur; yakın kopyaları kontrol et. Metrik farklarına örnek sayısı ve uygun güven aralığı ekle. LLM-as-judge yardımcı bir ölçümdür; insan değerlendirmesine karşı kalibre edilmeli, konum ve uzunluk yanlılıkları incelenmelidir.", en: "Choose source, time or asset splits for the deployment setting and check near duplicates. Report sample counts and suitable confidence intervals for metric differences. LLM-as-judge is a supporting measure; calibrate it against human evaluation and inspect position and length bias." },
    },
  },
};

// ---------------------------------------------------------------------------
// 4) Prerequisite Graph — Kavram bağımlılıkları
//    Her ders için "önce şunu bil" listesi. Öğrenci bir derse geldiğinde
//    hangi kavramları önce öğrenmesi gerektiğini görür. Kalıcı öğrenme
//    için "spaced prerequisites" prensibi: önkoşullar zayıfsa kavram da
//    zayıf öğrenilir.
// ---------------------------------------------------------------------------

export interface Prereq {
  lessonId: string;
  // Bu ders için zorunlu önkoşul kavramlar
  required: string[];
  // İleri seviye: bunlar bilinirse kavram daha derin oturur
  recommended: string[];
}

export const prerequisites: Prereq[] = [
  { lessonId: "models", required: [], recommended: [] },
  { lessonId: "tokens", required: ["models"], recommended: [] },
  { lessonId: "lora", required: ["models", "tokens"], recommended: [] },
  { lessonId: "rank", required: ["lora"], recommended: ["tokens"] },
  { lessonId: "steps", required: ["lora"], recommended: ["tokens"] },
  { lessonId: "loss", required: ["steps", "rank"], recommended: ["tokens"] },
  { lessonId: "templates", required: ["lora", "tokens"], recommended: ["steps"] },
  { lessonId: "evaluation", required: ["loss", "templates"], recommended: ["rank", "steps"] },
];

// ---------------------------------------------------------------------------
// 5) Paper Reading Hub — Klasik makalelerin 1 sayfalık özeti
//    Üniversite öğrencisinin ders dışı okuma için referansı.
//    Evidence: bibliyografik (alıntı doğrulanmış, içerik yazarın kendi
//    özetidir; orijinal makaleye bakılmadan kullanılmamalıdır).
// ---------------------------------------------------------------------------

export interface PaperSummary {
  id: string;
  year: number;
  authors: string;
  url: string;
  tr: { title: string; takeaway: string; relevance: string; citation: string };
  en: { title: string; takeaway: string; relevance: string; citation: string };
}

export const paperReadings: Record<Locale, PaperSummary[]> = {
  tr: [
    {
      id: "attention-is-all-you-need",
      url: "https://arxiv.org/abs/1706.03762",
      year: 2017,
      authors: "Vaswani et al.",
      tr: {
        title: "Attention Is All You Need (Transformer)",
        takeaway: "RNN/CNN olmadan, yalnızca multi-head self-attention ile sıralı modelleme mümkün. Q/K/V lineer projeksiyon, scaled dot-product attention, paralel eğitim.",
        relevance: "Modern LLM'lerin temel yapı taşı. Token/attention/context kavramlarının matematiksel temeli.",
        citation: "Vaswani, A. et al. (2017). Attention Is All You Need. NeurIPS.",
      },
      en: {
        title: "Attention Is All You Need (Transformer)",
        takeaway: "Without RNN/CNN, only multi-head self-attention can do sequence modeling. Q/K/V linear projection, scaled dot-product attention, parallel training.",
        relevance: "The building block of modern LLMs. Mathematical basis of token/attention/context concepts.",
        citation: "Vaswani, A. et al. (2017). Attention Is All You Need. NeurIPS.",
      },
    },
    {
      id: "lora-paper",
      url: "https://arxiv.org/abs/2106.09685",
      year: 2021,
      authors: "Hu et al.",
      tr: {
        title: "LoRA: Low-Rank Adaptation of Large Language Models",
        takeaway: "ΔW'yi düşük-rank bir güncellemeyle ifade ederek, makaledeki GPT-3 örneklerinde eğitilebilir parametre sayısını 10.000 kata kadar azaltır. Adaptör temel modele geri dönüşlü olarak eklenir.",
        relevance: "LoRA kavramının orijinal kaynağı. r × (d_in + d_out) formülü, alpha/r ölçeği burada gelir.",
        citation: "Hu, E.J. et al. (2021). LoRA: Low-Rank Adaptation of Large Language Models. arXiv:2106.09685.",
      },
      en: {
        title: "LoRA: Low-Rank Adaptation of Large Language Models",
        takeaway: "Learns a low-rank weight update; the paper reports up to 10,000× fewer trainable parameters in its GPT-3 175B comparison. This is not a universal reduction factor.",
        relevance: "Original source of the LoRA concept. The r × (d_in + d_out) formula and alpha/r scale come from here.",
        citation: "Hu, E.J. et al. (2021). LoRA: Low-Rank Adaptation of Large Language Models. arXiv:2106.09685.",
      },
    },
    {
      id: "qlora-paper",
      url: "https://arxiv.org/abs/2305.14314",
      year: 2023,
      authors: "Dettmers et al.",
      tr: {
        title: "QLoRA: Efficient Finetuning of Quantized LLMs",
        takeaway: "NF4 (4 bit normal kayan nokta), çift niceleme ve sayfalı iyileştirici durumlarıyla 65B modeli tek bir 48 GB GPU'da ince ayarlar. Bu sonuç bellek tasarrufunu gösterir; belirli bir modelin 16 GB'a sığacağını garanti etmez.",
        relevance: "QLoRA, NF4, double-quantization, page optimizer kavramlarının orijinal kaynağı.",
        citation: "Dettmers, T. et al. (2023). QLoRA: Efficient Finetuning of Quantized LLMs. NeurIPS.",
      },
      en: {
        title: "QLoRA: Efficient Finetuning of Quantized LLMs",
        takeaway: "NF4 (4-bit normal float), double quantization, and paged optimizer states fine-tune a 65B model on a single 48 GB GPU. This demonstrates memory savings but does not guarantee that a particular model fits in 16 GB.",
        relevance: "Original source of QLoRA, NF4, double-quantization, page optimizer concepts.",
        citation: "Dettmers, T. et al. (2023). QLoRA: Efficient Finetuning of Quantized LLMs. NeurIPS.",
      },
    },
    {
      id: "grpo-paper",
      url: "https://arxiv.org/abs/2402.03300",
      year: 2024,
      authors: "Shao et al. (DeepSeek)",
      tr: {
        title: "DeepSeekMath: GRPO",
        takeaway: "Group Relative Policy Optimization: PPO'dan daha basit, value model olmadan, grup içi avantaj normalizasyonu. Reasoning modellerinde yaygınlaştı.",
        relevance: "Week 11'deki GRPO deneyinin arkasındaki yöntem. Otomatik doğrulanabilir reward'lar için temel.",
        citation: "Shao, Z. et al. (2024). DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models. arXiv:2402.03300.",
      },
      en: {
        title: "DeepSeekMath: GRPO",
        takeaway: "Group Relative Policy Optimization: simpler than PPO, no value model, in-group advantage normalization. Became widespread in reasoning models.",
        relevance: "The method behind Week 11's GRPO experiment. Foundation for automatically verifiable rewards.",
        citation: "Shao, Z. et al. (2024). DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models. arXiv:2402.03300.",
      },
    },
  ],
  en: [],
};
paperReadings.en = paperReadings.tr.map((paper) => ({
  ...paper,
  tr: paper.tr,
  en: paper.en,
}));

// ---------------------------------------------------------------------------
// 6) Citation Kit — Akademik snippet'ler
//    Üniversite öğrencisi tez/rapor yazarken kullanabileceği, kanıt
//    seviyesi etiketli, doğrudan alıntılanabilir cümleler.
// ---------------------------------------------------------------------------

export interface Citation {
  id: string;
  topic: string;
  tr: { text: string; usage: string };
  en: { text: string; usage: string };
  evidence: "verified" | "observed" | "planned" | "unknown" | "simulation";
}

export const citationKit: Record<Locale, Citation[]> = {
  tr: [
    {
      id: "cit-1",
      topic: "lora",
      evidence: "verified",
      tr: {
        text: "LoRA, eğitilebilir parametreleri r × (d_in + d_out) ile sınırlayarak orijinal W matrisini donuk tutar; bu, full fine-tuning'a kıyasla VRAM ve depolama gereksinimini dramatik biçimde düşürür.",
        usage: "LoRA'nın temel formülü için.",
      },
      en: {
        text: "LoRA limits trainable parameters to r × (d_in + d_out) while keeping the original W matrix frozen; this dramatically lowers VRAM and storage requirements compared to full fine-tuning.",
        usage: "For the LoRA core formula.",
      },
    },
    {
      id: "cit-2",
      topic: "evaluation",
      evidence: "verified",
      tr: {
        text: "Bağımsız test seti olmadan fine-tuning kalite iddiası üretilemez; train split loss'u genelleme kanıtı değildir (Bishop, 2006; Goodfellow et al., 2016).",
        usage: "Eval split zorunluluğunu savunmak için.",
      },
      en: {
        text: "Without an independent test set, a quality claim from fine-tuning cannot be made; train-split loss is not generalization evidence (Bishop, 2006; Goodfellow et al., 2016).",
        usage: "To defend the eval split requirement.",
      },
    },
    {
      id: "cit-3",
      topic: "tokens",
      evidence: "observed",
      tr: {
        text: "Türkçe token maliyeti tokenizer'a göre değişir; bağlam ve çıkarım maliyeti hedef modelin gerçek tokenizer'ıyla ölçülmelidir.",
        usage: "Türkçe tokenlaştırma maliyetini açıklamak için.",
      },
      en: {
        text: "Turkish token cost varies by tokenizer; context and inference cost must be measured with the target model's actual tokenizer.",
        usage: "To discuss Turkish tokenization cost.",
      },
    },
    {
      id: "cit-4",
      topic: "steps",
      evidence: "verified",
      tr: {
        text: "Effective batch size = micro batch × gradient accumulation × GPU sayısı; OOM'da ilk düşürülecek değişken micro batch veya sequence length'tir, accumulation korunarak effective batch telafi edilir.",
        usage: "Eğitim mekaniğini açıklamak için.",
      },
      en: {
        text: "Effective batch size = micro batch × gradient accumulation × GPU count; on OOM, the first variable to drop is micro batch or sequence length, with accumulation raised to compensate for effective batch.",
        usage: "To explain training mechanics.",
      },
    },
    {
      id: "cit-5",
      topic: "templates",
      evidence: "verified",
      tr: {
        text: "Aynı role/content kaydı, farklı modellerin chat template'lerinde farklı token dizilerine dönüşür; bu nedenle semantic kayıtlar modelden bağımsız saklanmalı, render her modelin kendi template'i ile yapılmalıdır.",
        usage: "Chat template neden kritik için.",
      },
      en: {
        text: "The same role/content record turns into different token sequences under different models' chat templates; therefore semantic records must be stored independently of the model, and rendering must use each model's own template.",
        usage: "Why chat template is critical.",
      },
    },
  ],
  en: [],
};
citationKit.en = citationKit.tr.map((c) => ({ ...c, tr: c.tr, en: c.en }));

// ---------------------------------------------------------------------------
// 7) VRAM Bütçesi Hesaplayıcı (kural-tabanlı, simulated)
//    16 GB / 24 GB / 40 GB / 80 GB kartlar için yaklaşık VRAM payı.
//    Evidence: simulation. Gerçek ölçüm gerekir.
// ---------------------------------------------------------------------------

export interface VramEstimate {
  weights: number;     // model ağırlıkları (GiB)
  adapter: number;     // LoRA adapter
  optimizer: number;   // optimizer state (Adam fp32 ~ 8x params)
  gradients: number;   // gradyan (yalnız eğitilebilir)
  activations: number; // aktivasyon (sequence ve batch'e bağlı)
  kvCache: number;     // KV cache (inference)
  total: number;       // toplam
  fits: boolean;       // budget'a sığıyor mu
  budget: number;      // hedef VRAM
}

export interface VramInput {
  paramsB: number;      // milyar parametre (örn. 4)
  quantizationBits: 4 | 8 | 16; // base quantization
  adapterRank: number;
  adapterMatrices: number; // target matrices per layer, simplified as square
  layers?: number; // teaching default: 32
  kvDimension?: number; // num_key_value_heads * head_dim; default hiddenDim / 4
  hiddenDim: number;
  contextLength: number;
  microBatch: number;
  gradientCheckpointing: boolean;
  budget: number;       // GiB
}

export function vramEstimate(input: VramInput): VramEstimate {
  const layers = input.layers ?? 32;
  const kvDimension = input.kvDimension ?? input.hiddenDim / 4;
  const bytesPerParam = input.quantizationBits / 8;
  const totalParams = input.paramsB * 1e9;
  const weights = (totalParams * bytesPerParam) / (1024 ** 3);

  // Adapter: rank × hidden × 2 (A+B) × matrices. Float32 eğitim.
  const adapterParams = input.adapterRank * input.hiddenDim * 2 * input.adapterMatrices * layers;
  const adapter = (adapterParams * 4) / (1024 ** 3);

  // Optimizer (Adam): momentum + variance = 8 bytes per trainable parameter (fp32)
  // Biz sadece adapter eğitiyoruz, bu yüzden yalnızca adapter üzerinden.
  const optimizer = (adapterParams * 8) / (1024 ** 3);

  // Gradients: sadece eğitilebilir parametreler (adapter)
  const gradients = (adapterParams * 4) / (1024 ** 3);

  // Aktivasyon: yaklaşık olarak batch × seq × hidden × 4 byte × 2 (fwd+bwd)
  // Gradient checkpointing için öğretici bir bellek azaltma katsayısı.
  const actBytes = input.microBatch * input.contextLength * input.hiddenDim * 4 * 2 * layers;
  const ckptFactor = input.gradientCheckpointing ? 0.55 : 1;
  const activations = (actBytes * ckptFactor) / (1024 ** 3);

  // FP16 key + value tensors across batch, layers, sequence and KV width.
  // The default GQA width is an explicit teaching assumption, not a model spec.
  const kvCache = (2 * input.microBatch * layers * input.contextLength * kvDimension * 2) / (1024 ** 3);

  const total = weights + adapter + optimizer + gradients + activations;
  return {
    weights: round(weights),
    adapter: round(adapter),
    optimizer: round(optimizer),
    gradients: round(gradients),
    activations: round(activations),
    kvCache: round(kvCache),
    total: round(total),
    fits: total <= input.budget,
    budget: input.budget,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// 8) Eğitim Loss Simülatörü
//    Slider'larla (lr, batch, epoch) değiştir, canlı loss eğrisi üret.
//    Yalnızca öğretici simülasyondur; gerçek fine-tuning eğrisi değildir.
//    Formül: üstel bozunma + lr/batch oranı + epoch aşırı öğrenme eşiği.
// ---------------------------------------------------------------------------

export interface LossSimulation {
  steps: number[];           // x ekseni
  train: number[];           // train loss
  val: number[];             // validation loss
  bestStep: number;          // val loss minimumu
  finalTrain: number;
  finalVal: number;
  overfitPoint: number;      // train↓ val↑ başlangıç step'i
}

export interface LossInput {
  baseLoss: number;          // başlangıç loss (örn. 2.5)
  floor: number;             // asimptotik minimum (örn. 0.7)
  steps: number;             // toplam optimizer step (örn. 1000)
  lr: number;                // öğrenme oranı (1e-5 .. 5e-3)
  batch: number;             // effective batch (8 .. 256)
  epochs: number;            // 1 .. 5
  overfitRisk: number;       // 0..1, veri kalitesi/karmaşıklığı
}

export function simulateLoss(input: LossInput): LossSimulation {
  const { baseLoss, floor, steps, lr, batch, epochs, overfitRisk } = input;
  const train: number[] = [];
  const val: number[] = [];
  const xs: number[] = [];

  // Effective learning rate: büyük batch daha büyük lr tolere eder.
  // Burada oranı normalize ediyoruz.
  const lrFactor = Math.min(1.5, Math.max(0.4, lr / 2e-4));
  const batchFactor = Math.min(1.4, Math.max(0.7, batch / 32));

  // Half-life: step sayısı. Yüksek lr → hızlı düşüş. Batch büyüdükçe
  // effective update seyrekleşir, yarı-ömür hafifçe uzar.
  const halfLife = Math.max(20, steps * 0.25 / lrFactor) * batchFactor;
  const decayRate = Math.log(2) / halfLife;

  // Val loss valley'si epoch × overfitRisk ile erkene çekilir.
  const valValleyStep = Math.max(40, Math.floor(steps * (0.6 - 0.15 * overfitRisk)));

  // Val sonrası overfit yükselişi
  const overfitRate = overfitRisk * 0.002 * (epochs - 1);

  for (let s = 0; s < steps; s++) {
    xs.push(s);
    // train loss: üstel bozunma
    const t = (baseLoss - floor) * Math.exp(-decayRate * s) + floor;
    // Deterministic visual noise: the same inputs produce the same curve.
    const noise = (Math.sin(s * 0.7) + Math.cos(s * 0.3)) * 0.005 * lrFactor;
    train.push(t + noise);

    // val loss: önce düşer, sonra yükselir
    let v: number;
    if (s < valValleyStep) {
      v = (baseLoss - floor) * Math.exp(-decayRate * s * 0.9) + floor + 0.05;
    } else {
      const over = (s - valValleyStep) * overfitRate;
      v = (baseLoss - floor) * Math.exp(-decayRate * valValleyStep * 0.9) + floor + 0.05 + over;
    }
    val.push(v);
  }

  // Best step: val minimum
  let bestStep = 0;
  let bestVal = val[0] ?? Infinity;
  val.forEach((v, i) => { if (v < bestVal) { bestVal = v; bestStep = i; } });

  // Overfit noktası: train↓ val↑ ayrışmasının başladığı step
  let overfitPoint = steps;
  for (let i = 1; i < steps; i++) {
    if (val[i] > val[i - 1] && train[i] < train[i - 1] && i > bestStep / 2) {
      overfitPoint = i;
      break;
    }
  }

  return {
    steps: xs,
    train,
    val,
    bestStep,
    finalTrain: train[train.length - 1] ?? 0,
    finalVal: val[val.length - 1] ?? 0,
    overfitPoint,
  };
}

// ---------------------------------------------------------------------------
// 9) Attention Heatmap Demo
//    Basit bir cümle için Q·K^T softmax heatmap. Gerçek modelden değil,
//    kural-tabanlı bir simülasyondan üretilir (Evidence: simulation).
//    Kelimeler arasında "anlam ilişkisi" heuristik bir mesafe ile simüle
//    edilir. Eğitim amaçlı görselleştirmedir.
// ---------------------------------------------------------------------------

export interface AttentionDemo {
  tokens: { tr: string; en: string }[];
  matrix: number[][];  // n x n, satır toplamı = 1 (softmax sonrası)
}

export const attentionDemos: Record<Locale, AttentionDemo> = {
  tr: {
    tokens: [
      { tr: "Bu", en: "This" },
      { tr: "öğretici", en: "teaching" },
      { tr: "örnek", en: "example" },
      { tr: "kelimeler", en: "shows" },
      { tr: "arasındaki", en: "illustrative" },
      { tr: "temsili", en: "attention" },
      { tr: "dikkat", en: "relationships" },
      { tr: "ilişkilerini", en: "between" },
      { tr: "gösterir", en: "words" },
    ],
    // Deterministik: 9x9. Satır bazlı normalize edilir.
    matrix: [
      [0.55, 0.10, 0.10, 0.05, 0.05, 0.05, 0.05, 0.04, 0.01],
      [0.12, 0.40, 0.10, 0.08, 0.06, 0.08, 0.06, 0.06, 0.04],
      [0.10, 0.10, 0.35, 0.10, 0.08, 0.10, 0.07, 0.07, 0.03],
      [0.08, 0.08, 0.10, 0.32, 0.10, 0.10, 0.10, 0.08, 0.04],
      [0.06, 0.06, 0.10, 0.10, 0.30, 0.10, 0.10, 0.12, 0.06],
      [0.06, 0.08, 0.10, 0.10, 0.10, 0.25, 0.10, 0.10, 0.11],
      [0.05, 0.06, 0.08, 0.10, 0.10, 0.10, 0.25, 0.14, 0.12],
      [0.04, 0.04, 0.05, 0.05, 0.05, 0.10, 0.10, 0.40, 0.17],
      [0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.03, 0.03, 0.84],
    ],
  },
  en: {
    tokens: [
      { tr: "Bu", en: "This" },
      { tr: "öğretici", en: "teaching" },
      { tr: "örnek", en: "example" },
      { tr: "kelimeler", en: "shows" },
      { tr: "arasındaki", en: "illustrative" },
      { tr: "temsili", en: "attention" },
      { tr: "dikkat", en: "relationships" },
      { tr: "ilişkilerini", en: "between" },
      { tr: "gösterir", en: "words" },
    ],
    matrix: [
      [0.55, 0.10, 0.10, 0.05, 0.05, 0.05, 0.05, 0.04, 0.01],
      [0.12, 0.40, 0.10, 0.08, 0.06, 0.08, 0.06, 0.06, 0.04],
      [0.10, 0.10, 0.35, 0.10, 0.08, 0.10, 0.07, 0.07, 0.03],
      [0.08, 0.08, 0.10, 0.32, 0.10, 0.10, 0.10, 0.08, 0.04],
      [0.06, 0.06, 0.10, 0.10, 0.30, 0.10, 0.10, 0.12, 0.06],
      [0.06, 0.08, 0.10, 0.10, 0.10, 0.25, 0.10, 0.10, 0.11],
      [0.05, 0.06, 0.08, 0.10, 0.10, 0.10, 0.25, 0.14, 0.12],
      [0.04, 0.04, 0.05, 0.05, 0.05, 0.10, 0.10, 0.40, 0.17],
      [0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.03, 0.03, 0.84],
    ],
  },
};

// EN'i TR'den türet: kalıcı içerik için TR→EN kopyalama. EN metni
// ihtiyaç halinde ayrıca genişletilebilir; şu an otomatik kopyalanır.
for (const key of Object.keys(conceptDepth) as Array<keyof typeof conceptDepth>) {
  if (!conceptDepth[key].en) {
    conceptDepth[key].en = conceptDepth[key].tr;
  }
}
