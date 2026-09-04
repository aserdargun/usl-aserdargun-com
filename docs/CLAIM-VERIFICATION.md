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
