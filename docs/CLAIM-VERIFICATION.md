# Version-sensitive claim verification

Last verified: **2026-10-02**

The application deliberately avoids presenting a planning calculator as a real training run. The following product claims were rechecked against first-party documentation for this release:

| Claim used by the atlas | Evidence and boundary |
|---|---|
| LoRA adds trainable low-rank adapters while keeping the base frozen | [Unsloth LoRA hyperparameters guide](https://unsloth.ai/docs/get-started/fine-tuning-llms-guide/lora-hyperparameters-guide). Rechecked 2026-10-02: the guide states that thin matrices A and B are added to each weight and those are optimized, so roughly 1% of weights train. Module names and supported options remain model/version dependent. |
| Standard LoRA scale is `alpha / r`; rsLoRA uses `alpha / sqrt(r)` | [Unsloth LoRA hyperparameters guide](https://unsloth.ai/docs/get-started/fine-tuning-llms-guide/lora-hyperparameters-guide). Rechecked 2026-10-02 against the guide's own equations: `Ŵ = W + (α/rank)·AB` and `Ŵ_rslora = W + (α/√rank)·AB`, with `use_rslora = True` selecting the second. The guide's own recommendation is `alpha = rank` or `2·rank`, so `alpha/rank ≥ 1`; the lab exposes both formulas but does not recommend a universal winner. |
| QLoRA uses a quantized frozen base plus trainable adapters | [Unsloth fine-tuning guide](https://unsloth.ai/docs/get-started/fine-tuning-llms-guide). The hyperparameters guide states QLoRA is 4-bit fine-tuning using much less VRAM (4× less than 16-bit LoRA) and that 4-bit precision reduces VRAM by over 75%. This expands feasible configurations but does not guarantee that a model/context/batch fits 16 GB. |
| Context length, batch size, gradient accumulation, and checkpointing are memory/performance controls | [Unsloth fine-tuning guide](https://unsloth.ai/docs/get-started/fine-tuning-llms-guide). The guide gives `Effective Batch Size = batch_size × gradient_accumulation_steps` and describes batch size as the primary driver of VRAM use and gradient accumulation as the primary driver of training time. The 4070 Ti Super card is explicitly a planning simulation until measured on hardware. |
| Azure static Next.js deployment uses `output: "export"` and `out/` | [Azure Static Web Apps Next.js documentation](https://learn.microsoft.com/en-us/azure/static-web-apps/nextjs). The page specifies `output: 'export'` in `next.config.js`, `out` as the default `output_location`, and `IS_STATIC_EXPORT: true` for custom build scripts. This repository enables it only through `IS_STATIC_EXPORT=true`; Vinext uses its normal worker build. |
| Unsloth release status used during this review | [Unsloth v0.1.902-beta release](https://github.com/unslothai/unsloth/releases/tag/v0.1.902-beta), published 2026-10-01, titled "Command Palette + Desktop UI/UX". It keeps NVFP4, INT4 and MXFP4 checkpoints packed in 4-bit during LoRA training, and reports Laya decision models up to 4.1× faster. This is release context only; neither the speed figure nor the memory figures generalize to other models, hardware or workloads, and this atlas runs no training. |

Reverification rule: whenever the Turkish source digest changes or a version-sensitive product claim changes, update this date, re-check first-party documentation, and keep `content/locale-parity.json.stale` empty before release.

## Calculator review — 2026-09-10

Teaching-model behavior version: **2** (VRAM layer/KV accounting, deterministic loss baseline and total-preserving dataset allocation). Flashcard scheduling behavior version: **2** (due-card order and completed-deck handling). Stored progress and flashcard record schemas remain v1 because the serialized fields remain compatible.

- The VRAM teaching model now counts all 32 assumed layers for adapters and activations. Seven square target matrices per layer and a KV width of one quarter of hidden width are explicitly displayed assumptions, not specifications for the model sizes in the selector. Quantization metadata, runtime workspaces and allocator overhead remain excluded; being below budget does not establish hardware fit.
- FP16 KV storage uses `2 * batch * layers * sequence * KV width * 2 bytes / 1024^3`. [Transformers cache documentation](https://huggingface.co/docs/transformers/kv_cache) describes per-layer key/value storage and architecture-dependent caching behavior. [PEFT LoRA documentation](https://huggingface.co/docs/peft/main/package_reference/lora) distinguishes rank, target modules and selected layers. These sources support the structure, not the illustrative architecture defaults.
- Tokenizer comparisons use paired translations and a toy splitting rule. The ratio is not a measurement of token efficiency or inference cost. Loss curves remain deterministic illustrations, and the chart scales to show the full curve.

## Bilingual content and portfolio review — 2026-09-21

This is a local editorial review, not a new training run or production release. The original source snapshot and its 2026-08-08 experiment remain historical. The live footer was checked at `https://usl.aserdargun.com/en/` and still reports `beb0135`; the root portfolio release record now matches the existing 2026-09-10 commit. The portfolio research cutoff remains unchanged.

Rechecked sources: [PEFT LoRA](https://huggingface.co/docs/peft/main/package_reference/lora), [Unsloth hyperparameters](https://unsloth.ai/docs/get-started/fine-tuning-llms-guide/lora-hyperparameters-guide), [Transformers chat templates](https://huggingface.co/docs/transformers/chat_templating), and the original [LoRA](https://arxiv.org/abs/2106.09685), [QLoRA](https://arxiv.org/abs/2305.14314), [Transformer](https://arxiv.org/abs/1706.03762), and [DeepSeekMath](https://arxiv.org/abs/2402.03300) papers.

- Standard LoRA initialization is distinguished from alternative initialization methods. The low-rank update is learned directly; a full update is not first computed and projected.
- Removed universal Turkish token-cost, 16 GB model-fit, rank/overfitting and model-label/training-cost claims. Loss analogies now consistently describe error rather than confusing low loss with low scores.
- Dataset ratios, benchmark weights and acceptance thresholds are explicitly capstone teaching assumptions. Retention deltas use percentage points; flashcard ratings are self-assessments.
- Paper cards link to original papers. USL links to the AIA, ADP, LLM, EVL and LCL learning surfaces and back to the root map; these links transfer no runtime state.
- Locale review schema is **2**: 95 shared IDs cover lessons, weeks, questions, cards, papers, citations, tokenizer samples, labs, visualizers, routes and pathways. Source, public-body and reviewed editorial digests are checked. `content:sync` preserves the last review and marks changed sources/content stale instead of silently approving translations.
- Calculator behavior remains **2**; formulas and numerical simulation behavior did not change. Browser storage formats, experiment records and export formats did not change. The attention example's text changed without changing the matrix.

After a source/content edit, review both languages, then regenerate `translations` and `reviewedContentDigests` using `currentReview(locale)` from `scripts/content-contract.mjs`; update `sourceDigest` from the reviewed snapshot's source hashes, record `reviewedAt`, and clear `stale` only after that review. Run `validate:content` and `validate:codex`. Digest equality establishes review freshness and identity, not scientific truth or automatic translation quality.

## Version-sensitive recheck — 2026-10-02

Every row in the table above was re-read against first-party documentation on
2 October 2026. All six claims still hold. The pinned Unsloth release moved from
v0.1.806-beta (2026-09-02) to v0.1.902-beta (2026-10-01), and that release is
now the one cited above.

Four things in the current Unsloth documentation were not recorded here and are
worth stating, because each one is a limit a learner will otherwise trip over:

- `lora_dropout` is now described as "not that useful" with a default of 0, and
  the guide cites [arXiv:2410.09692](https://arxiv.org/abs/2410.09692) for the
  claim that it may be an unreliable regularizer for the short training runs
  that fine-tuning usually consists of. A course that teaches dropout as the
  default anti-overfitting lever is out of step with current guidance.
- Batch size and gradient accumulation combinations with the same effective
  batch size are now stated to be "fully equivalent in Unsloth" because of
  specific bug fixes, where they previously produced different loss curves. The
  equivalence is a property of Unsloth's implementation, not of gradient
  accumulation in general.
- When verifying that adapter weights actually changed, the guide advises
  against `np.allclose()`, which can miss changes in LoRA A because it is
  initialized with small Gaussian values; it recommends checksums, sums of
  absolute differences, or `np.array_equal()`.
- `LoftQ` initializes adapter matrices from the top singular vectors of the
  pretrained weights and can cause a large memory spike at the start of
  training.

Two deployment-model notes. The Azure page now describes Next.js support as two
models, Hybrid (preview) and Static, where the previous framing here named only
static export. And v0.1.902-beta's memory figures are specific to named
hardware: Qwen3.8-27B-NVFP4 at 40.2 GB instead of 72.9 GB on one RTX PRO 6000,
Qwen3-8B w4a16 at 8.5 GB on a B200. None of that carries over to the 4070 Ti
Super planning simulation this atlas uses.

This recheck read documentation and release metadata. It is not a training run,
not a hardware measurement, and not a reproduction of any published result. The
calculator and flashcard behavior versions are unchanged, no lesson or locale
content was edited, and the portfolio research cutoff is unchanged at its
existing value because this review moved a pinned version reference, not the
evidence base.
