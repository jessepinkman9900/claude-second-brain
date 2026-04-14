/**
 * Idempotent qmd setup — registers collections and contexts for this vault.
 * Safe to re-run: skips collections that already exist, upserts contexts.
 *
 * Run once from vault root:
 *   bun scripts/qmd/setup.ts
 *
 * After setup, index the vault:
 *   bun scripts/qmd/reindex.ts
 */

import { createStore } from "@tobilu/qmd"
import { join } from "path"

const VAULT = join(import.meta.dir, "../..")
const DB = "__QMD_PATH__"

const store = await createStore({ dbPath: DB })

// --- Collections (idempotent) ---
const existingCols = await store.listCollections()
const existing = new Set(existingCols.map((c: any) => c.name))

async function ensureCollection(name: string, relPath: string, pattern: string) {
  if (existing.has(name)) {
    console.log(`  skip (exists): ${name}`)
    return
  }
  await store.addCollection(name, { path: join(VAULT, relPath), pattern })
  console.log(`  added: ${name}`)
}

console.log("Collections:")
await ensureCollection("wiki",        "wiki",        "**/*.md")
await ensureCollection("raw-sources", "sources",     "**/*.md")
await ensureCollection("human",       "human",       "**/*.md")
await ensureCollection("daily-notes", "daily-notes", "**/*.md")

// --- Global context ---
console.log("\nContexts:")
await store.setGlobalContext(
  "Personal knowledge vault. Uses Obsidian [[wiki/page]] wikilinks. " +
  "Wiki pages have YAML frontmatter: type (overview|topic|entity|source-summary|qa), " +
  "tags, sources, related, updated."
)

// wiki/
await store.addContext("wiki", "",         "LLM-maintained synthesized knowledge base — the authoritative wiki layer")
await store.addContext("wiki", "/sources", "Source summaries — one page per ingested source, with abstract, key claims, and synthesis notes")
await store.addContext("wiki", "/qa",      "Filed Q&A answers that synthesize multiple wiki pages around a notable question")

// sources/
await store.addContext("raw-sources", "",          "Raw source material — immutable originals, never modified after ingestion")
await store.addContext("raw-sources", "/articles", "Web articles saved as markdown")
await store.addContext("raw-sources", "/pdfs",     "PDF files or their extracted text")
await store.addContext("raw-sources", "/personal", "Personal notes flagged for wiki ingestion")

// human/
await store.addContext("human", "",             "User's personal notes — not Claude-maintained; covers work, social life, investing, hobbies, and more")
await store.addContext("human", "/ideas",       "Brainstorming and exploratory ideas")
await store.addContext("human", "/job-hunt",    "Job search notes and preparation")
await store.addContext("human", "/misc",        "Miscellaneous personal notes")

// daily-notes/
await store.addContext("daily-notes", "", "User's daily and weekly journal entries, dated by year and week number")

console.log("\nSetup complete. Run: bun scripts/qmd/reindex.ts")
