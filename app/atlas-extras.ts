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
      tr: { text: "Türkçe, İngilizce tokenizerlarda daha pahalıdır.", note: "Günlük cümle: bağlam+ek yapısı BPE'yi zorlar." },
      en: { text: "Turkish is more expensive in English tokenizers.", note: "Same meaning in English: fewer tokens in EN-centric tokenizers." },
      splitRule: "word-subword",
      charCount: { tr: 50, en: 47 },
    },
    {
      id: "tr-compound",
      tr: { text: "Üniversite öğrencileri için kalıcı bilgi.", note: "Bileşik isim: tek kelime gibi ama BPE'de 2-3 parçaya bölünür." },
      en: { text: "Durable knowledge for university students.", note: "English compounds are rare; mostly single tokens." },
      splitRule: "word-subword",
      charCount: { tr: 45, en: 47 },
    },
    {
      id: "tr-agglutination",
      tr: { text: "Eğitimlerini tamamlamadıkları için belgelendirilemediler.", note: "Ek yığılması (agglutination): tek kelime BPE'yi parçalar." },
      en: { text: "They could not be certified because they did not finish.", note: "English keeps word count low with auxiliaries." },
      splitRule: "word-subword",
      charCount: { tr: 53, en: 57 },
    },
  ],
  en: [
    {
      id: "en-daily",
      en: { text: "Turkish is more expensive in English tokenizers.", note: "Same meaning in English: fewer tokens in EN-centric tokenizers." },
      tr: { text: "Türkçe, İngilizce tokenizerlarda daha pahalıdır.", note: "Daily sentence: agglutinative structure stresses BPE." },
      splitRule: "word-subword",
      charCount: { en: 47, tr: 50 },
    },
    {
      id: "en-compound",
      en: { text: "Durable knowledge for university students.", note: "English compounds are rare; mostly single tokens." },
      tr: { text: "Üniversite öğrencileri için kalıcı bilgi.", note: "Compound noun: looks like one word but BPE splits 2-3." },
      splitRule: "word-subword",
      charCount: { en: 47, tr: 45 },
    },
    {
      id: "en-agglutination",
      en: { text: "They could not be certified because they did not finish.", note: "English keeps word count low with auxiliaries." },
      tr: { text: "Eğitimlerini tamamlamadıkları için belgelendirilemediler.", note: "Suffix stacking: one word, many BPE pieces." },
      splitRule: "word-subword",
      charCount: { en: 57, tr: 53 },
    },
  ],
};

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
    { id: "fc-eval-1", topic: "evaluation", tr: { front: "Veri karışımı (önerilen)?", back: "%55 standart, %10 parafraz, %15 eksik bilgi, %10 negatif, %10 eskalasyon." }, en: { front: "Recommended data mix?", back: "55% standard, 10% paraphrase, 15% missing info, 10% negative, 10% escalation." } },
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
      layman: { tr: "Bir modeli, önceden eğitilmiş bir kafayla doğan çocuğa benzet. Base henüz konuşmayı öğrenmemiş; Instruct konuşma eğitimi almış; Reasoning ise düşünmeyi öğrenmiş. Hangi çocukla başlayacağın, ne yapmak istediğine bağlı.", en: "Think of a model as a child born with a pretrained brain. Base has not learned to talk; Instruct has had a conversation course; Reasoning has learned to think step by step. Which child to start with depends on what you want to do." },
      undergrad: { tr: "Base, sonraki-token tahmini için eğitilmiş ham ağırlıklardır. Instruct, SFT ve/veya RLHF ile konuşma ve talimat takip edecek şekilde hizalanmıştır. Reasoning, ek bir RL aşamasıyla adım adım düşünme davranışı kazanır. Hangi checkpoint'i fine-tune edeceğin, hedef görevin doğasına bağlıdır.", en: "Base is raw weights trained for next-token prediction. Instruct is aligned with SFT and/or RLHF to follow conversation and instructions. Reasoning acquires step-by-step thinking via an additional RL stage. Which checkpoint you fine-tune depends on the nature of the target task." },
      advanced: { tr: "Modeller alignment pipeline'ında farklı aşamalardan geçer. Base, self-supervised next-token prediction ile bir tokenizer-V üzerinde eğitilir. Instruct için tipik olarak SFT (cross-entropy) ve ardından preference optimization (RLHF/DPO) uygulanır. Reasoning yetenekleri genellikle outcome-based RL (GRPO, RLOO) ile emergent davranış olarak ortaya çıkar. Adapter'ın eğitim yükü: Base ≫ Instruct > Reasoning, çünkü alignment zaten bias'ı ayarlamıştır.", en: "Models go through different stages in the alignment pipeline. Base is trained with self-supervised next-token prediction over a tokenizer-V. For Instruct, typically SFT (cross-entropy) followed by preference optimization (RLHF/DPO) is applied. Reasoning abilities usually emerge from outcome-based RL (GRPO, RLOO) as an emergent behavior. Adapter training load: Base ≫ Instruct > Reasoning, because alignment has already set the bias." },
    },
  },
  tokens: {
    tr: {
      layman: { tr: "Her kelimeyi bilgisayar tek parça halinde okuyamaz; önce küçük parçalara böler. Bu parçaların her birine 'token' denir. Türkçe, İngilizce'den daha karmaşık olduğu için daha çok parçaya bölünür. Bu, modele gönderdiğin metnin 'daha ağır' olması demektir.", en: "The computer cannot read each word as a whole; it first breaks it into small pieces. Each piece is called a token. Turkish is more complex than English, so it splits into more pieces. That means the text you send the model is 'heavier'." },
      undergrad: { tr: "BPE veya SentencePiece gibi alt-sözcük tokenizer'lar, kelimeleri sıklık temelli parçalara ayırır. Türkçe gibi eklemeli (agglutinative) diller, sık başvurulan ekler yüzünden tek bir kelimede çok sayıda alt-sözcük üretir. Bu, context penceresinin daha hızlı dolması ve maliyetin artması anlamına gelir.", en: "Sub-word tokenizers like BPE or SentencePiece split words into frequency-based pieces. Agglutinative languages like Turkish generate many sub-pieces per word due to rich morphology. This means the context window fills faster and cost rises." },
      advanced: { tr: "BPE birleştirmeleri sıklık temellidir; nadir bayt çiftleri sona kalır. Türkçe morfolojisi parça dağılımını etkileyebilir, ancak fark tokenizer'a ve metne bağlıdır. Doğru ölçüm hedef modelin gerçek tokenizer'ıyla yapılmalı; kesme, doldurma ve özel tokenlar da hesaba katılmalıdır.", en: "BPE merges are frequency-based; rare byte pairs remain at the end. Turkish morphology can affect the piece distribution, but the difference depends on the tokenizer and text. Measure with the target model's real tokenizer, including truncation, padding, and special tokens." },
    },
  },
  lora: {
    tr: {
      layman: { tr: "Dev bir kitabın arasına küçük yapışkan notlar iliştirmek gibi. Kitabı değiştirmezsin, sadece yorumunu eklersin. Adapter'ı çıkarınca orijinal kitap geri gelir. QLoRA ise kitabın kendisini 'küçültülmüş' tutar (4-bit), böylece aynı masada daha çok şey sığar.", en: "Like sticking small sticky notes into a huge textbook. You do not change the book, you just add your commentary. Remove the adapters and the original book comes back. QLoRA keeps the book itself 'shrunken' (4-bit) so more fits on the same desk." },
      undergrad: { tr: "LoRA, W' = W + scale·BA biçiminde düşük-rank bir düzeltme öğrenir. Sadece A ve B eğitilir, W donuk kalır. QLoRA, W'yi 4-bit (NF4) olarak saklar; A/B ve kritik hesaplar daha yüksek hassasiyette kalabilir. Bu, 16 GB sınıfı GPU'larda 7B+ model eğitimini pratik hale getirir.", en: "LoRA learns a low-rank correction W' = W + scale·BA. Only A and B are trained; W stays frozen. QLoRA stores W in 4-bit (NF4); A/B and critical compute can stay at higher precision. This makes 7B+ training practical on 16 GB class GPUs." },
      advanced: { tr: "LoRA, optimal ΔW'nin düşük-rank manifold'a izdüşümüdür (Aghajanyan et al., 2020). NF4 quantization, normal dağılım varsayımıyla 4-bit'e informatik olarak optimal basamaklandırma yapar (Dettmers et al., 2023). Page Optimizer (paged optimizer states) ve double-quantization, peak VRAM'i daha da düşürür. B=0 başlangıcı, ilk forward'da gradyan sinyali için kritik; eğer sıfırdan başlamazsan, taban davranışından sapan rastgele bir gürültüyle başlarsın.", en: "LoRA is the projection of the optimal ΔW onto a low-rank manifold (Aghajanyan et al., 2020). NF4 quantization does information-theoretically optimal 4-bit bucketing under a normal-distribution assumption (Dettmers et al., 2023). Paged optimizer states and double-quantization further lower peak VRAM. The B=0 initialization is critical for gradient signal on the first forward; if you do not start at zero, you start with random noise that deviates from base behavior." },
    },
  },
  rank: {
    tr: {
      layman: { tr: "Adapter'ı küçük bir defter gibi düşün. Rank, defterdeki sayfa sayısıdır. Daha çok sayfa = daha çok not yeri = daha çok şey öğrenebilir. Ama her sayfaya ne kadar yazdığını alpha belirler; çok yazarsan eski notlar silikleşir, az yazarsan yer boş kalır.", en: "Think of the adapter as a small notebook. Rank is the number of pages. More pages = more space = more learning. But how much you write per page is set by alpha; too much and old notes blur, too little and space is wasted." },
      undergrad: { tr: "Rank r, A ∈ R^(r×d_in) ve B ∈ R^(d_out×r) matrislerinin iç boyutudur. Parametre sayısı r × (d_in + d_out) ile ölçeklenir. Alpha, ölçek çarpanıdır: standart LoRA'da α/r, rsLoRA'da α/√r. Aynı etkin ölçek korunsa bile, yüksek rank daha çok kapasite taşır ve overfitting riski artar.", en: "Rank r is the inner dimension of A ∈ R^(r×d_in) and B ∈ R^(d_out×r). Parameter count scales as r × (d_in + d_out). Alpha is the scale factor: α/r in standard LoRA, α/√r in rsLoRA. Even if effective scale is held constant, higher rank carries more capacity and increases overfitting risk." },
      advanced: { tr: "Effective rank'in (gerçek kullanılan rank) nominal r'ten düşük olabileceğini gösteren çalışmalar var (Aghajanyan et al., 2023). Yüksek rank'ın getirisi, veri karmaşıklığı ve task diversity ile ilişkili; linear probing ile adapter'ın hangi alt-uzayı öğrendiği ölçülebilir. Target modules, mimari-spesifik olup eğitim öncesinde model.named_modules() ile doğrulanmalıdır.", en: "Studies show effective rank (the actually-used rank) can be lower than nominal r (Aghajanyan et al., 2023). The benefit of higher rank correlates with data complexity and task diversity; linear probing can measure which subspace the adapter has learned. Target modules are architecture-specific and must be verified with model.named_modules() before training." },
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
      layman: { tr: "Sınava çalışırken yaptığın deneme testleri eğitim kaybı; sınavın kendisi doğrulama kaybı gibidir. Düşük deneme kaybı, yüksek sınav puanını garanti etmez. Sadece deneme sonucuna bakıp 'bitti' demek, gerçek sınavda hayal kırıklığı yaratır.", en: "Practice tests during your study are training loss; the exam itself is validation loss. A low practice score does not guarantee a high exam score. Calling it done by practice score alone creates disappointment at the real exam." },
      undergrad: { tr: "Training loss, optimize edilen hedefe uyumu ölçer. Validation loss, görülmemiş split üzerindeki genellemeyi ölçer. Train düşerken validation yükseliyorsa overfitting. Catastrophic forgetting farklıdır: yeni yetenek kazanırken eski/genel yetenek geriler. Loss tek başına kalite kanıtı değildir; domain/format/safety metrikleri de ölçülmelidir.", en: "Training loss measures fit to the optimized target. Validation loss measures generalization on an unseen split. If train falls while validation rises, that is overfitting. Catastrophic forgetting is different: new ability improves while prior/general ability declines. Loss is not by itself a quality proof; domain/format/safety metrics must also be measured." },
      advanced: { tr: "Loss eğrisi tek başına yeterli değildir: gradient norm, learning rate ve batch composition da izlenmelidir. Validation loss 'U-şekli' (val↓ sonra val↑) klasik overfitting sinyalidir; 'monoton artış' ise data mismatch / training instability'ye işaret eder. Forgetting tespiti için orthogonal evaluation (MMLU, domain benchmark) veya FWT/PWT oranı kullanılır. Adapter kapatınca davranış düzeliyorsa, sorun tabanda değil adapter kaynaklı girişimdir.", en: "Loss curve alone is not enough: gradient norm, learning rate, and batch composition should also be monitored. The U-shape in validation loss (val↓ then val↑) is the classic overfitting signal; monotonic increase signals data mismatch or training instability. Forgetting is detected with orthogonal evaluation (MMLU, domain benchmark) or FWT/PWT ratio. If behavior recovers when the adapter is disabled, the problem is not the base but adapter-induced interference." },
    },
  },
  templates: {
    tr: {
      layman: { tr: "Bir mektup şablonu: 'Sayın X, ... Saygılarımla Y'. İçerik aynı ama biçim modele göre değişir. Şablon yanlışsa hitap ve kapanış yanlış yere düşer. Model için de benzer: aynı role/content kaydı, modele göre farklı token dizisine dönüşür.", en: "A letter template: 'Dear X, ... Sincerely, Y'. The content is the same but the format changes per model. With the wrong template, the salutation and sign-off land in the wrong place. For models it is similar: the same role/content record turns into a different token sequence per model." },
      undergrad: { tr: "Her modelin kendi chat template'i vardır (ChatML, Llama-3, Qwen, Phi). role/content kayıtlarını modelden bağımsız sakla; her model için kendi tokenizer ve template'iyle yeniden render et. Response-only masking'de assistant sınırları gerçek render ile eşleşmezse cevap loss dışında kalabilir.", en: "Each model has its own chat template (ChatML, Llama-3, Qwen, Phi). Store role/content records independently of the model; re-render with each model's own tokenizer and template. In response-only masking, if the assistant boundaries do not match the real render, the answer can fall outside the loss." },
      advanced: { tr: "Template farkları; BOS/EOS, role token'ları, system prompt formatı ve assistant header/footer'da saklıdır. Aynı dataset Llama-3 ile ortalama 110 token, Qwen-2 ile 95 token üretebilir. Inference sırasında aynı template + aynı stop sequence kullanılmazsa train/inference dağılım kayması olur. Test için: tek bir örneği render et, BOS, role sınırı ve EOS'u görünür kıl, label'ları inspect et.", en: "Template differences hide in BOS/EOS, role tokens, system prompt format, and assistant header/footer. The same dataset can produce on average 110 tokens with Llama-3 and 95 tokens with Qwen-2. If inference uses a different template or stop sequence than training, train/inference distribution shift occurs. To test: render a single example, expose BOS, role boundary and EOS, inspect labels." },
    },
  },
  evaluation: {
    tr: {
      layman: { tr: "Bir arabanın yalnız hızına değil, frenine, yakıt tüketimine, güvenliğine ve konforuna da bakarsın. Tek metrik yanıltıcıdır. Model değerlendirmesinde de 'hız' = loss; ama asıl önemli olan 'fren, güvenlik, konfor' = domain, format, safety, retention.", en: "You do not judge a car by speed alone; you also look at brakes, fuel economy, safety, and comfort. A single metric is misleading. In model evaluation, 'speed' is loss; but what really matters is 'brakes, safety, comfort' = domain, format, safety, retention." },
      undergrad: { tr: "Train/validation/test split'leri ayrı kaynaklardan dondurulmalıdır. Veri karışımı önerisi: %55 standart, %10 parafraz, %15 eksik bilgi, %10 negatif, %10 eskalasyon. 100 soruluk benchmark domain/format/safety/uncertainty/retention ağırlıklı ortalama ile skorlanır. Eğitim verisini evaluation'da kullanmak genelleme kanıtı değildir.", en: "Train/validation/test splits must be frozen from separate sources. Recommended data mix: 55% standard, 10% paraphrase, 15% missing info, 10% negative, 10% escalation. A 100-question benchmark scores with a weighted average of domain/format/safety/uncertainty/retention. Reusing training data for evaluation is not generalization evidence." },
      advanced: { tr: "Eval split'in training'den mutlak ayrı olması yetmez; kaynak, zaman ve operatör tarafı da ayrışmalıdır (temporal split, operator split). Bootstrap confidence interval veya paired bootstrap ile metrik farkının anlamlılığı test edilir. Human eval LLM-as-judge ile ikame edilebilir, ancak bias kontrolü gerekir (position bias, verbosity bias). Safety metrikleri için red-team prompt koleksiyonu ve adversarial augmentation önerilir.", en: "It is not enough that the eval split is strictly separate from training; source, time, and operator side must also be separate (temporal split, operator split). Bootstrap confidence interval or paired bootstrap tests metric difference significance. Human eval can be substituted by LLM-as-judge but requires bias control (position bias, verbosity bias). For safety metrics, a red-team prompt collection and adversarial augmentation are recommended." },
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
  tr: { title: string; takeaway: string; relevance: string; citation: string };
  en: { title: string; takeaway: string; relevance: string; citation: string };
}

export const paperReadings: Record<Locale, PaperSummary[]> = {
  tr: [
    {
      id: "attention-is-all-you-need",
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
        takeaway: "Projects ΔW onto a low-rank manifold, reducing trainable parameters by up to 10,000×. Adapter is reversibly added to the original model.",
        relevance: "Original source of the LoRA concept. The r × (d_in + d_out) formula and alpha/r scale come from here.",
        citation: "Hu, E.J. et al. (2021). LoRA: Low-Rank Adaptation of Large Language Models. arXiv:2106.09685.",
      },
    },
    {
      id: "qlora-paper",
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
  adapterMatrices: number;
  hiddenDim: number;
  contextLength: number;
  microBatch: number;
  gradientCheckpointing: boolean;
  budget: number;       // GiB
}

export function vramEstimate(input: VramInput): VramEstimate {
  const bytesPerParam = input.quantizationBits / 8;
  const totalParams = input.paramsB * 1e9;
  const weights = (totalParams * bytesPerParam) / (1024 ** 3);

  // Adapter: rank × hidden × 2 (A+B) × matrices. Float32 eğitim.
  const adapterParams = input.adapterRank * input.hiddenDim * 2 * input.adapterMatrices;
  const adapter = (adapterParams * 4) / (1024 ** 3);

  // Optimizer (Adam): momentum + variance = 8 bytes per trainable parameter (fp32)
  // Biz sadece adapter eğitiyoruz, bu yüzden yalnızca adapter üzerinden.
  const optimizer = (adapterParams * 8) / (1024 ** 3);

  // Gradients: sadece eğitilebilir parametreler (adapter)
  const gradients = (adapterParams * 4) / (1024 ** 3);

  // Aktivasyon: yaklaşık olarak batch × seq × hidden × 4 byte × 2 (fwd+bwd)
  // Gradient checkpointing için öğretici bir bellek azaltma katsayısı.
  const actBytes = input.microBatch * input.contextLength * input.hiddenDim * 4 * 2;
  const ckptFactor = input.gradientCheckpointing ? 0.55 : 1;
  const activations = (actBytes * ckptFactor) / (1024 ** 3);

  // KV cache (inference): 2 × layers × seq × heads × head_dim × 2 byte (fp16)
  // LLaMA-3 8B için yaklaşık 32 layer, 32 head, 128 head_dim. Biz oran kullanıyoruz:
  // ~ paramsB * 0.5 MB per token (heuristic)
  const kvCache = (input.contextLength * input.paramsB * 0.0005) / 1024;

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
  const batchFactor = Math.min(1.4, Math.max(0.7, 32 / batch));

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
    const t = baseLoss * Math.exp(-decayRate * s) + floor;
    // hafif noise (sadece görsel, sabit seed yok; Math.random deterministic değil ama UI için yeterli)
    const noise = (Math.sin(s * 0.7) + Math.cos(s * 0.3)) * 0.005 * lrFactor;
    train.push(t + noise);

    // val loss: önce düşer, sonra yükselir
    let v: number;
    if (s < valValleyStep) {
      v = baseLoss * Math.exp(-decayRate * s * 0.9) + floor + 0.05;
    } else {
      const over = (s - valValleyStep) * overfitRate;
      v = baseLoss * Math.exp(-decayRate * valValleyStep * 0.9) + floor + 0.05 + over;
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
      { tr: "Model", en: "The" },
      { tr: "Türkçe", en: "model" },
      { tr: "metni", en: "tokenizes" },
      { tr: "daha", en: "Turkish" },
      { tr: "fazla", en: "into" },
      { tr: "token", en: "more" },
      { tr: "olarak", en: "tokens" },
      { tr: "böler", en: "than" },
      { tr: ".", en: "English" },
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
      { tr: "The", en: "The" },
      { tr: "model", en: "model" },
      { tr: "tokenizes", en: "tokenizes" },
      { tr: "Turkish", en: "Turkish" },
      { tr: "into", en: "into" },
      { tr: "more", en: "more" },
      { tr: "tokens", en: "tokens" },
      { tr: "than", en: "than" },
      { tr: "English", en: "English" },
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
