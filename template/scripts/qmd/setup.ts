/**
 * Idempotent qmd setup — registers collections and contexts for this vault.
 * Safe to re-run: skips collections that already exist, upserts contexts.
 *
 * Run once from vault root:
 *   pnpm qmd:setup
 *
 * After setup, index the vault:
 *   pnpm qmd:reindex
 */

import { createStore } from "@tobilu/qmd"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const VAULT = join(dirname(fileURLToPath(import.meta.url)), "../..")
const DB = join(VAULT, ".qmd", "index.sqlite")

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
await ensureCollection("raw-sources", "raw-sources", "**/*.md")

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

// raw-sources/
await store.addContext("raw-sources", "",          "Raw source material — immutable originals, never modified after ingestion")
await store.addContext("raw-sources", "/articles", "Web articles saved as markdown")
await store.addContext("raw-sources", "/pdfs",     "PDF files or their extracted text")
await store.addContext("raw-sources", "/personal", "Personal notes flagged for wiki ingestion")

console.log("\nSetup complete. Run: pnpm qmd:reindex")
