# USL working contract

- Build the bilingual, evidence-aware learning atlas for Unsloth Studio, LoRA, QLoRA, dataset engineering, evaluation, and local model deployment.
- Keep the canonical Unsloth vault read-only; sanitize through `content:sync` into `content/`, then drive the public atlas from there. Vault path comes from `UNSLOTH_VAULT_PATH`, never inlined. Browser storage keys `unsloth-atlas-language` and `unsloth-atlas-progress:v1` are the only runtime state. No backend, no live GPU, no real training run in v1.
- The canonical vault is read-only source. The sanitized `content/` tree is build input. Visitor progress (`unsloth-atlas-progress:v1`) is local browser state and never decision input to content. Source progress and "my progress" are explicitly separated.
- Behavior, experiment, world, simulation, metric, and export schema versions are explicit. Update affected versions when semantics change.
- Every public surface (lesson, lab, assessment, calculator) carries stable content IDs shared across TR/EN. `validate:content` rejects stale `locale-parity.json`, missing translations, or unsanitized leaks before any release; claim versioning lives in `docs/CLAIM-VERIFICATION.md`.
- Keep Turkish and English controls and explanations equivalent. Label model assumptions and simulation units.
- Verify `npm run validate:codex` and review `git diff --check` before handoff.
- Local work only unless the user authorizes external publication. Preserve unrelated work and processes.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
