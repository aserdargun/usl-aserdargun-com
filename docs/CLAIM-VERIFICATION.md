# Version-sensitive claim verification

Last verified: **2026-09-04**

The application deliberately avoids presenting a planning calculator as a real training run. The following product claims were rechecked against first-party documentation for this release:

| Claim used by the atlas | Evidence and boundary |
|---|---|
| LoRA adds trainable low-rank adapters while keeping the base frozen | [Unsloth LoRA hyperparameters guide](https://unsloth.ai/docs/get-started/fine-tuning-llms-guide/lora-hyperparameters-guide). Module names and supported options remain model/version dependent. |
| Standard LoRA scale is `alpha / r`; rsLoRA uses `alpha / sqrt(r)` | [Unsloth LoRA hyperparameters guide](https://unsloth.ai/docs/get-started/fine-tuning-llms-guide/lora-hyperparameters-guide). The lab exposes both formulas but does not recommend a universal winner. |
| QLoRA uses a quantized frozen base plus trainable adapters | [Unsloth fine-tuning guide](https://unsloth.ai/docs/get-started/fine-tuning-llms-guide). This expands feasible configurations but does not guarantee that a model/context/batch fits 16 GB. |
| Context length, batch size, gradient accumulation, and checkpointing are memory/performance controls | [Unsloth fine-tuning guide](https://unsloth.ai/docs/get-started/fine-tuning-llms-guide). The 4070 Ti Super card is explicitly a planning simulation until measured on hardware. |
| Azure static Next.js deployment uses `output: "export"` and `out/` | [Azure Static Web Apps Next.js documentation](https://learn.microsoft.com/en-us/azure/static-web-apps/nextjs). This repository enables it only through `IS_STATIC_EXPORT=true`; Vinext uses its normal worker build. |
| Unsloth release status used during this review | [Unsloth v0.1.806-beta release](https://github.com/unslothai/unsloth/releases/tag/v0.1.806-beta), published 2026-09-02, enables multi-token prediction by default for the named supported models. This is release context only; the atlas does not generalize its speed claim to every model or workload. |

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
