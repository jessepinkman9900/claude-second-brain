---
name: brain-rebuild
description: "Redesign the qmd schema for this vault — analyze the current wiki, recommend a new set of collections and contexts, update scripts/qmd/setup.ts, then tear down and rebuild the index from scratch. Destructive. Trigger phrases: /brain-rebuild, rebuild the brain, restructure qmd, redesign collections, redo contexts, recompute schema."
argument-hint: "Optional: a hint about the desired structure (e.g. 'split wiki by domain', 'add a separate collection for qa pages')"
---

# Brain Rebuild

Redesigns the qmd schema based on what the wiki actually contains today, then rebuilds the index from scratch. **Destructive** — wipes existing collections/contexts and their embeddings. Always get explicit user approval before applying changes.

## When to Use

- The wiki has grown and the current single `wiki` collection no longer matches how the user searches
- The user wants finer-grained contexts (e.g. distinct context descriptions per sub-folder)
- After significant reorganization of `wiki/` or `raw-sources/` folder structure
- Never as a routine refresh — for that, use `/brain-refresh`

## Procedure

All commands run from the vault root.

### Step 1 — Survey the current state

- Read `scripts/qmd/setup.ts` to see the current collections and contexts
- Read `CLAUDE.md` to understand the documented schema and any references to collection names
- List current state from qmd:
  ```bash
  INDEX_PATH=.qmd/index.sqlite pnpm dlx @tobilu/qmd collection list
  INDEX_PATH=.qmd/index.sqlite pnpm dlx @tobilu/qmd context list
  INDEX_PATH=.qmd/index.sqlite pnpm dlx @tobilu/qmd status
  ```

### Step 2 — Analyze the wiki

- Glob `wiki/**/*.md` and `raw-sources/**/*.md`
- Read enough pages (especially `wiki/index.md` and `wiki/overview.md`) to understand actual topic clusters, page-type distribution, and folder structure
- Identify natural groupings: by domain (e.g. ml, distributed-systems, finance), by page type (topics vs entities vs qa), by source provenance, etc.

### Step 3 — Propose a new schema

Produce a recommendation that includes:

- **Collections** — name, root path (relative to vault), file glob pattern. Justify each split.
- **Contexts** — global context, plus per-collection and per-subpath context descriptions. Each context should be a one-sentence description that helps a future search disambiguate between similar pages.
- **Migration impact** — what changes for `/brain-ingest`, `/brain-search`, `/lint`, and `CLAUDE.md` (e.g. if collection name `wiki` becomes `wiki-topics`, all `-c wiki` invocations break)

Present the recommendation as a clear diff against the current schema. Do not modify any files yet.

### Step 4 — Get explicit approval

Ask the user: "Apply this schema? This will drop existing collections and their embeddings, then rebuild from scratch. Re-embedding the full wiki may take significant time and download GGUF models if not cached."

Do not proceed without an explicit yes.

### Step 5 — Update `scripts/qmd/setup.ts`

Edit `scripts/qmd/setup.ts` to reflect the new schema:

- Update the `ensureCollection` calls (add, remove, or rename)
- Update `setGlobalContext` and the `addContext` calls
- Leave the `DB` constant alone — its value was substituted at scaffold time and must not change
- Keep the script idempotent

### Step 6 — Update related references

If collection names changed:

- Update every occurrence in `CLAUDE.md` (e.g. `qmd query -c wiki` → new name)
- Update `.claude/skills/brain-ingest/SKILL.md`, `.claude/skills/brain-search/SKILL.md`, `.claude/skills/lint/SKILL.md` — anywhere collection names are hard-coded
- Use Grep to find any remaining stale references before moving on

### Step 7 — Tear down the old schema

For each existing collection that no longer fits the new schema:

```bash
INDEX_PATH=.qmd/index.sqlite pnpm dlx @tobilu/qmd collection remove <old-name>
```

For each obsolete context:

```bash
INDEX_PATH=.qmd/index.sqlite pnpm dlx @tobilu/qmd context rm <path>
```

### Step 8 — Register the new schema

Run:
```bash
pnpm qmd:setup
```

This is idempotent — collections that already exist (e.g. ones you kept) are skipped; new ones are added; contexts are upserted.

### Step 9 — Rebuild embeddings from scratch

Run:
```bash
pnpm qmd:reindex
```

This indexes all files under the new collections and generates fresh embeddings.

### Step 10 — Verify and report

```bash
INDEX_PATH=.qmd/index.sqlite pnpm dlx @tobilu/qmd collection list
INDEX_PATH=.qmd/index.sqlite pnpm dlx @tobilu/qmd context list
INDEX_PATH=.qmd/index.sqlite pnpm dlx @tobilu/qmd status
```

Confirm the new collections appear, contexts match the plan, and document/embedding counts are non-zero. Report a summary of what changed (collections added/removed/renamed, contexts updated, files re-indexed, references updated in CLAUDE.md and skills).

## Hard Rules

- Never apply schema changes without explicit user approval at Step 4
- Never delete a collection without first showing the user what will be dropped
- Always update `CLAUDE.md` and skill files in lockstep with collection renames — stale `-c <name>` references will silently break `/brain-search`
- Do not touch `wiki/`, `raw-sources/`, or any user content — this skill changes the index schema, not the data
