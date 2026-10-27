# Version-sensitive claim verification

Last verified: **2026-10-27**

The application deliberately avoids presenting a planning calculator as a real training run. The following product claims were rechecked against first-party documentation for this release:

| Claim used by the atlas | Evidence and boundary |
|---|---|
| LoRA adds trainable low-rank adapters while keeping the base frozen | [Unsloth LoRA hyperparameters guide](https://unsloth.ai/docs/get-started/fine-tuning-llms-guide/lora-hyperparameters-guide). Rechecked 2026-10-27: the guide states that thin matrices A and B are added to each weight and those are optimized, so roughly 1% of weights train. Module names and supported options remain model/version dependent. |
| Standard LoRA scale is `alpha / r`; rsLoRA uses `alpha / sqrt(r)` | [Unsloth LoRA hyperparameters guide](https://unsloth.ai/docs/get-started/fine-tuning-llms-guide/lora-hyperparameters-guide). Rechecked 2026-10-27 against the guide's own equations: `Ŵ = W + (α/rank)·AB` and `Ŵ_rslora = W + (α/√rank)·AB`, with `use_rslora = True` selecting the second. The guide's own recommendation is `alpha = rank` or `2·rank`, so `alpha/rank ≥ 1`; the lab exposes both formulas but does not recommend a universal winner. |
| QLoRA uses a quantized frozen base plus trainable adapters | [Unsloth fine-tuning guide](https://unsloth.ai/docs/get-started/fine-tuning-llms-guide). Rechecked 2026-10-27: the hyperparameters guide states QLoRA is 4-bit fine-tuning using much less VRAM (4× less than 16-bit LoRA) and that 4-bit precision reduces VRAM by over 75%. This expands feasible configurations but does not guarantee that a model/context/batch fits 16 GB. |
| Context length, batch size, gradient accumulation, and checkpointing are memory/performance controls | [Unsloth fine-tuning guide](https://unsloth.ai/docs/get-started/fine-tuning-llms-guide) for the context-length, batch-size and gradient-accumulation settings, and [Unsloth LoRA hyperparameters guide](https://unsloth.ai/docs/get-started/fine-tuning-llms-guide/lora-hyperparameters-guide) for the batch arithmetic and the checkpointing switch. Rechecked 2026-10-27: the hyperparameters guide gives `Effective Batch Size = batch_size × gradient_accumulation_steps`, describes batch size as the primary driver of VRAM usage and gradient accumulation as the primary driver of training time, and sets `use_gradient_checkpointing = "unsloth"` for very long context. The 4070 Ti Super card is explicitly a planning simulation until measured on hardware. |
| Azure static Next.js deployment uses `output: "export"` and `out/` | [Azure Static Web Apps Next.js documentation](https://learn.microsoft.com/en-us/azure/static-web-apps/nextjs). The page specifies `output: 'export'` in `next.config.js`, `out` as the default `output_location`, and `IS_STATIC_EXPORT: true` for custom build scripts. This repository enables it only through `IS_STATIC_EXPORT=true`; Vinext uses its normal worker build. |
| Unsloth release status used during this review | [Unsloth v0.1.911-beta release](https://github.com/unslothai/unsloth/releases/tag/v0.1.911-beta), published 2026-10-26 at 14:23:54Z, titled "Scheduled + MiniMax-M3.1-Flash + Perf Gains". It adds scheduled prompt runs that can fire once, daily, on weekdays, weekly or monthly, each answer saved as a new chat, on the loaded model, a model on the device or a model from a connected API provider, with per-task notification and with tools and web search off; MiniMax-M3.1-Flash, MiniMax's 428B MoE with 23B active parameters and up to 1M tokens of context, whose GGUF build needs at least 130 GB of combined RAM and VRAM at 1-bit; FLUX 3 image editing; and saved named presets per model in the model picker. For training it adds splitting each layer of a model across GPUs for LoRA and QLoRA through `UNSLOTH_TP_SIZE` with `torchrun`, so each GPU holds less; a fix for 4-bit gpt-oss checkpoints that used to crash on the first training step; and GRPO that generates with vLLM running up to 1.9x faster per step with 16-bit LoRA on Linux with NVIDIA GPUs, and up to 4.4x faster per step without vLLM for Llama and Qwen3 on NVIDIA GPUs. On Mac it reports MLX chats replying up to 16% faster with draft models, MLX models that ship a built-in draft model using it automatically, and Z-Image GGUF text-to-image rendering 1.5-2x faster with the MLX engine. It also fixes GGUF models failing to load on some Windows PCs. Two changes tighten security rather than add capability: apps using an Unsloth API key can no longer approve their own Python or terminal calls to run outside the sandbox, and Unsloth no longer trusts forwarded client IPs by default, so behind your own reverse proxy `UNSLOTH_STUDIO_TRUST_FORWARDED=1` is needed or all users share one login rate limit. No release has landed since the previous review: the releases feed still shows v0.1.911-beta (2026-10-26, 14:23:54Z) as the tip, and the tag list behind it is unchanged at v0.1.910-beta, v0.1.909-beta, v0.1.908-beta, v0.1.907-beta and v0.1.906-beta, so the release cited above is still the current one. The LoRA, rsLoRA and QLoRA claims above are unchanged; their first-party documentation was re-read for this pass. Every memory and performance figure here is the release notes' own, is specific to the named models, hardware and Unsloth's own implementation, and none of it is a training result this atlas produced. |

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

## Version-sensitive recheck — 2026-10-09

Every row in the table above was re-read against first-party documentation on
9 October 2026. All six claims still hold. The pinned Unsloth release moved from
v0.1.904-beta (2026-10-07) to v0.1.905-beta (2026-10-08), and that release is
now the one cited above.

One boundary in that release is worth stating here, because it is a property of
the tool and not of the learner's hardware. Unsloth now sandboxes its runs with
Bwrap on Linux, Seatbelt on Mac and MXC on Windows. That is a containment
boundary around the tool's own execution, and it does not change any LoRA,
QLoRA or VRAM claim recorded above. A reader should not read it as a guarantee
that a training job is reproducible across those three platforms, nor as a
measurement of anything; the atlas records it as release context.

The decision-model material that arrived with v0.1.904-beta is carried forward
rather than restated as new: the 30% to 80% figure is still the vendor's own
reported number for a Jev-style decision model, and it is recorded here with
the same boundary as before. The ComfyUI and diffusion work is upstream of
anything this atlas teaches.

This recheck read release metadata and documentation. It is not a training run,
not a hardware measurement, and not a reproduction of any published result. The
calculator and flashcard behavior versions are unchanged, no lesson or locale
content was edited, so `content/locale-parity.json` keeps its existing
`reviewedAt` of 2026-09-21 and an empty `stale` array; the evidence ledger and
the bilingual content review are separate contracts and only the first one
moved. The portfolio research cutoff is unchanged at its existing value because
this review moved a pinned version reference, not the evidence base.

## Version-sensitive recheck — 2026-10-15

Every row in the table above was re-read against first-party documentation on
15 October 2026. All six claims still hold. The pinned Unsloth release moved from
v0.1.906-beta (2026-10-12) to v0.1.907-beta (2026-10-13, 16:02:04Z), and that
release is now the one cited above.

That release is overwhelmingly a performance and browser-surface release, and its
numbers are worth fencing. Up to 10x faster UI for multiple chats, up to 5x faster
inference, 3x more supported file types and the 200 MB document ceiling are all
the release notes' own claims about Unsloth's own implementation on the hardware
and workloads they name. None of them is a training result, none is a measurement
this atlas took, and none carries over to another model, card or runtime. The
browser additions — click at a point, move the mouse, drag unlabelled targets such
as canvases, run approved scripts per invocation, set per-site rules for unlabelled
clicks — extend what the model may operate on. They remain release context about a
tool's capability surface; they do not make any statement about the learner's
hardware or about reproducibility across platforms, and the v0.1.905-beta sandboxing
boundary recorded in the 9 October section still stands unchanged.

The LoRA, rsLoRA and QLoRA documentation pages were re-read for this pass and are
unchanged, so no equation, no memory formula and no calculator behaviour moved.
As on 2026-10-09, `content/locale-parity.json` keeps its existing `reviewedAt` of
2026-09-21 and an empty `stale` array: no lesson or locale content was edited, and
the evidence ledger and the bilingual content review are separate contracts of
which only the first moved. The portfolio research cutoff is likewise unchanged,
because this review moved a pinned version reference rather than the evidence base.

## Version-sensitive recheck — 2026-10-16

Every row in the table above was re-read against first-party documentation on
16 October 2026. All six claims still hold. The pinned Unsloth release moved from
v0.1.907-beta (2026-10-13, 16:02:04Z) to v0.1.908-beta (2026-10-15, 18:50:55Z),
and that release is now the one cited above.

This release is a model-support release rather than a training-method release, and
that distinction is the point worth keeping. Its headline numbers are memory and
fit figures attached to named checkpoints: Nemotron 3.5 Bolt at about 32 GB,
Nemotron 3.5 Super VL at about 64 GB at 1-bit or 128 GB at 4-bit, and Muse Spark
Open at about 256 GB at 2-bit. They describe Unsloth running those specific
models on the hardware Unsloth measured. They are not the 16 GB fit this atlas
plans against, they are not a result this atlas reproduced, and they do not lower
the VRAM figures the calculator teaches — that teaching model still excludes
quantization metadata, runtime workspaces and allocator overhead, so a budget the
calculator calls feasible remains unproven until it is measured on the card.

The training additions — text-diffusion LLM families, DeepSpeed ZeRO-2/ZeRO-3 with
4-bit QLoRA and DPO — are upstream of anything this atlas teaches, and the LoRA,
rsLoRA and QLoRA rows above are unchanged by them. The prompt-caching and
`model.generate` speedups are the release notes' own claims about Unsloth's own
runtime on the models they name; as before, none of them generalizes to another
model, card or runtime, and the v0.1.905-beta sandboxing boundary recorded in the
9 October section still stands unchanged.

The LoRA, rsLoRA and QLoRA documentation pages were re-read for this pass and are
unchanged, so no equation, no memory formula and no calculator behaviour moved.
As on 2026-10-09 and 2026-10-15, `content/locale-parity.json` keeps its existing
`reviewedAt` of 2026-09-21 and an empty `stale` array: no lesson or locale content
was edited, and the evidence ledger and the bilingual content review are separate
contracts of which only the first moved. The portfolio research cutoff is likewise
unchanged, because this review moved a pinned version reference rather than the
evidence base.

## Version-sensitive recheck — 2026-10-20

Every row in the table above was re-read against first-party documentation on
20 October 2026. All six claims still hold. The pinned Unsloth release moved from
v0.1.908-beta (2026-10-15, 18:50:55Z) to v0.1.909-beta (2026-10-19, 16:21:58Z),
and that release is now the one cited above.

This one is not only a model-support release. It also carries the first alpha
multi-GPU training path seen from Unsloth: FSDP2 for spreading LoRA, QLoRA and
full fine-tuning across GPUs, and `context_parallel_size` for splitting long
sequences including packed ones. The alpha label is the boundary worth keeping.
It is a preview path, not a supported configuration, and it does not change the
single-card teaching model this atlas plans against.

The headline numbers are again memory and fit figures attached to named
checkpoints: DeepSeek-V4.1-Flash-1017 at about 125 GB at 1-bit with its Engram
table left on SSD and 300 GB at 4-bit, and FLUX.3 Image Klein on 24 GB of GPU
memory. They describe Unsloth running those specific models on the hardware
Unsloth measured. They are not the 16 GB fit this atlas plans against, they are
not a result this atlas reproduced, and they do not lower the VRAM figures the
calculator teaches — that teaching model still excludes quantization metadata,
runtime workspaces and allocator overhead, so a budget the calculator calls
feasible remains unproven until it is measured on the card. The Terminal-Bench
4.0 figure of 42.3 against 31.2 for the earlier checkpoint is the release's own
benchmark on its own checkpoint and does not transfer to another model, card or
runtime.

The LoRA, rsLoRA and QLoRA documentation pages were re-read for this pass and
are unchanged, so no equation, no memory formula and no calculator behaviour
moved. The FSDP2 and `context_parallel_size` additions sit upstream of anything
this atlas teaches, and the `unsloth mcp add` integration for Claude Code, Codex
or Cursor is a local tool wiring detail rather than a training claim. The
v0.1.905-beta sandboxing boundary recorded in the 9 October section still stands
unchanged.

As on 2026-10-09, 2026-10-15 and 2026-10-16, `content/locale-parity.json` keeps
its existing `reviewedAt` of 2026-09-21 and an empty `stale` array: no lesson or
locale content was edited, and the evidence ledger and the bilingual content
review are separate contracts of which only the first moved. The portfolio
research cutoff is likewise unchanged, because this review moved a pinned version
reference rather than the evidence base.

## Version-sensitive recheck — 2026-10-21

Every row in the table above was re-read against first-party documentation on
21 October 2026. All six claims still hold. The pinned Unsloth release did not
move: the releases feed still shows v0.1.909-beta (2026-10-19, 16:21:58Z) as the
tip, so the release cited above is still the current one and no row was rewritten
on the strength of a version change that did not happen.

The version-sensitive boundary is the same one the previous pass recorded. The
alpha multi-GPU training path — FSDP2 for spreading LoRA, QLoRA and full
fine-tuning across GPUs, and `context_parallel_size` for splitting long
sequences including packed ones — is still labelled alpha in that release, so it
remains a preview path rather than a supported configuration, and it does not
change the single-card teaching model this atlas plans against. The headline
figures stay attached to named checkpoints on Unsloth's own hardware:
DeepSeek-V4.1-Flash-1017 at about 125 GB at 1-bit with its Engram table left on
SSD and 300 GB at 4-bit, and FLUX.3 Image Klein on 24 GB of GPU memory. None of
them is the 16 GB fit this atlas plans against, none is a result this atlas
reproduced, and none of them lowers the VRAM figures the calculator teaches.
That teaching model still excludes quantization metadata, runtime workspaces and
allocator overhead, so a budget the calculator calls feasible remains unproven
until it is measured on the card. The Terminal-Bench 4.0 figure of 42.3 against
31.2 for the earlier checkpoint is the release's own benchmark on its own
checkpoint and does not transfer to another model, card or runtime.

The LoRA, rsLoRA and QLoRA documentation pages were re-read for this pass and
are unchanged, so no equation, no memory formula and no calculator behaviour
moved. The `unsloth mcp add` integration for Claude Code, Codex or Cursor
remains a local tool wiring detail rather than a training claim. The
v0.1.905-beta sandboxing boundary recorded in the 9 October section still stands
unchanged. `content/locale-parity.json` keeps its existing 21 September 2026
review date because no source digest moved on this pass, and its `stale` list
stays empty.

## Version-sensitive recheck — 2026-10-24

Every row in the table above was re-read against first-party documentation on
24 October 2026. All six claims still hold. The pinned Unsloth release did
move: the releases feed now shows v0.1.910-beta (2026-10-23, 15:26:53Z) as the
tip, so the release cited above is rewritten around that release, and the
previous pin, v0.1.909-beta of 19 October, is no longer the tip though its
material is not retracted.

The version-sensitive boundary is the one the previous pass recorded, measured
against what this release adds. The release's own change list includes FSDP2
work - gathering for `push_to_hub`, refusing GGUF and torchao exports, sizing
offloaded state and per-shard 4-bit counts - but it does not restate the alpha
label for the alpha multi-GPU training path, so that path remains a preview
rather than a supported configuration and the single-card teaching model this
atlas plans against is unchanged. The new headline figures stay attached to
named checkpoints on Unsloth's own hardware: Flint at 24 GB at 3-bit at short
contexts, MOSS-Image on 16 GB of GPU memory, and Nemotron 3.5 Bolt E4B on
Tau2-Bench. None of them is a result this atlas reproduced, and none of them
lowers the VRAM figures the calculator teaches. The teaching model still
excludes quantization metadata, runtime workspaces and allocator overhead, so
a budget the calculator calls feasible remains unproven until it is measured on
the card. The 89.7 against 73.8 SWE-bench Pro v2 score and the 63.2 against
38.7 Tau2-Bench score are each the release's own benchmark on its own
checkpoint and do not transfer to another model, card or runtime. The REAP
expert-pruning path, the OpenAI-compatible fine-tuning API and the chat-only
Desktop install are Unsloth product surfaces this atlas does not teach, so no
row was rewritten for them.

The two security changes are recorded as boundaries rather than as
capabilities. Unsloth's own install and update path now rejects eMudhra's
compromised emSign certificates, which the release notes say let attackers
impersonate websites, while the optional vLLM and SGLang engines still trust
them; this atlas teaches a first-party install, so the boundary it describes
is the one Unsloth enforces, and it does not describe the optional engines'
trust. A request carrying an Unsloth API key can no longer run Python and
terminal tools unsandboxed and only the Unsloth UI can allow that, which
tightens the sandbox boundary the 9 October section recorded rather than
replacing it, and `unsloth start` no longer sends the Unsloth API key in plain
text through an HTTP proxy to a local Unsloth. The v0.1.905-beta sandboxing
boundary recorded in the 9 October section still stands as documented in the
[sandboxing guide](https://unsloth.ai/docs/new/studio/sandboxing-in-unsloth).

The LoRA, rsLoRA and QLoRA documentation pages were re-read for this pass and
are unchanged, so no equation, no memory formula and no calculator behaviour
moved. `content/locale-parity.json` keeps its existing 21 September 2026 review
date because no source digest moved on this pass, and its `stale` list stays
empty.

## Version-sensitive recheck — 2026-10-25

Every row in the table above was re-read against first-party documentation on
25 October 2026. All six claims still hold. The pinned Unsloth release did not
move: the releases feed still shows v0.1.910-beta (2026-10-23, 15:26:53Z) as the
tip, and the tag list behind it is unchanged at v0.1.910-beta, v0.1.909-beta,
v0.1.908-beta, v0.1.907-beta and v0.1.906-beta, so the release cited above is
still the current one and no row was rewritten on the strength of a version
change that did not happen.

The version-sensitive boundary is the one the previous pass recorded, measured
against what this release adds. The release's own change list includes FSDP2
work - gathering for `push_to_hub`, refusing GGUF and torchao exports, sizing
offloaded state and per-shard 4-bit counts - but it does not restate the alpha
label for the alpha multi-GPU training path, so that path remains a preview
rather than a supported configuration and the single-card teaching model this
atlas plans against is unchanged. The headline figures stay attached to named
checkpoints on Unsloth's own hardware: Flint at 24 GB at 3-bit at short
contexts, MOSS-Image on 16 GB of GPU memory, and Nemotron 3.5 Bolt E4B on
Tau2-Bench. None of them is a result this atlas reproduced, and none of them
lowers the VRAM figures the calculator teaches. The teaching model still
excludes quantization metadata, runtime workspaces and allocator overhead, so
a budget the calculator calls feasible remains unproven until it is measured on
the card. The 89.7 against 73.8 SWE-bench Pro v2 score and the 63.2 against
38.7 Tau2-Bench score are each the release's own benchmark on its own
checkpoint and do not transfer to another model, card or runtime. The REAP
expert-pruning path, the OpenAI-compatible fine-tuning API and the chat-only
Desktop install are Unsloth product surfaces this atlas does not teach, so no
row was rewritten for them.

The two security changes are recorded as boundaries rather than as
capabilities. Unsloth's own install and update path now rejects eMudhra's
compromised emSign certificates, which the release notes say let attackers
impersonate websites, while the optional vLLM and SGLang engines still trust
them; this atlas teaches a first-party install, so the boundary it describes
is the one Unsloth enforces, and it does not describe the optional engines'
trust. A request carrying an Unsloth API key can no longer run Python and
terminal tools unsandboxed and only the Unsloth UI can allow that, which
tightens the sandbox boundary the 9 October section recorded rather than
replacing it. The v0.1.905-beta sandboxing boundary recorded in the 9 October
section still stands as documented in the
[sandboxing guide](https://unsloth.ai/docs/new/studio/sandboxing-in-unsloth).

The LoRA, rsLoRA and QLoRA documentation pages were re-read for this pass and
are unchanged, so no equation, no memory formula and no calculator behaviour
moved. `content/locale-parity.json` keeps its existing 21 September 2026 review
date because no source digest moved on this pass, and its `stale` list stays
empty. This ledger is not part of the published build, so the deployed site
will not change its text; that is the expected behaviour of a claim-ledger
pass, not a missing release.

## Version-sensitive recheck — 2026-10-27

Every row in the table above was re-read against first-party documentation on
27 October 2026. All six claims still hold. The pinned Unsloth release did move:
the releases feed now shows v0.1.911-beta (2026-10-26, 14:23:54Z) as the tip, so
the release cited above is rewritten around that release, and the previous pin,
v0.1.910-beta of 23 October, is no longer the tip though its material is not
retracted.

This release is the first in this series whose training changes touch the atlas's
own subject directly. It adds layer-wise splitting of a model across GPUs for
LoRA and QLoRA, through `UNSLOTH_TP_SIZE` set to the number of GPUs and
`torchrun` as the launcher, so that each GPU holds a slice of every layer rather
than the whole layer. That is a memory-distribution control and not a memory-model
change: it moves where the weights live across several devices, and the atlas
still plans against a single card. It also fixes 4-bit gpt-oss checkpoints that
used to crash on the first training step, which is a defect fix rather than a new
capability, and reports GRPO generating with vLLM up to 1.9x faster per step with
16-bit LoRA on Linux with NVIDIA GPUs, and up to 4.4x faster per step without
vLLM for Llama and Qwen3 on NVIDIA GPUs. Those two figures are the release's own
measurements on named frameworks, models and GPU vendors, and they describe
generation speed during reinforcement fine-tuning rather than the LoRA and QLoRA
path this atlas teaches.

The new headline figures stay attached to named checkpoints on Unsloth's own
hardware, as the previous passes recorded. MiniMax-M3.1-Flash is a 428B MoE with
23B active parameters and up to 1M tokens of context, and the release states that
at 1-bit it needs at least 130 GB of RAM and VRAM combined; that figure belongs
to that model at that quantization, not to the atlas's teaching model, and no
figure in it lowers the VRAM numbers the calculator teaches. The Mac figures -
MLX chats up to 16% faster with draft models, and Z-Image GGUF text-to-image
rendering 1.5-2x faster with the MLX engine - are Unsloth's own measurements on
Apple Silicon. The teaching model still excludes quantization metadata, runtime
workspaces and allocator overhead, so a budget the calculator calls feasible
remains unproven until it is measured on the card.

The two security changes are recorded as boundaries rather than as capabilities.
Apps using an Unsloth API key can no longer approve their own Python or terminal
calls to run outside the sandbox, which tightens the sandbox boundary the 23
October section recorded rather than replacing it. Unsloth no longer trusts
forwarded client IPs by default, so an installation behind its own reverse proxy
has to set `UNSLOTH_STUDIO_TRUST_FORWARDED=1` or every user shares one login
rate limit. The v0.1.905-beta sandboxing boundary recorded in the 9 October
section still stands as documented in the
[sandboxing guide](https://unsloth.ai/docs/new/studio/sandboxing-in-unsloth).
The scheduled-task surface, the FLUX 3 editing path and the saved model presets
are Unsloth product surfaces this atlas does not teach, so no row was rewritten
for them.

The LoRA, rsLoRA and QLoRA documentation pages were re-read for this pass and
are unchanged, so no equation, no memory formula and no calculator behaviour
moved. One citation was corrected while reading them: the `Effective Batch
Size = batch_size × gradient_accumulation_steps` arithmetic, the "primary driver
of VRAM usage" and "primary driver of training time" wording, and the
`use_gradient_checkpointing` switch are stated in the hyperparameters guide,
not in the fine-tuning guide that the row previously linked alone, so the row now
cites both pages and says which one carries which statement. `content/locale-parity.json`
keeps its existing 21 September 2026 review date because no source digest moved
on this pass, and its `stale` list stays empty. This ledger is not part of the
published build, so the deployed site will not change its text; that is the
expected behaviour of a claim-ledger pass, not a missing release.
