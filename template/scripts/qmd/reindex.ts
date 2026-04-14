/**
 * Re-index all collections and regenerate vector embeddings.
 * Run after bulk wiki ingest sessions (not after every single file edit).
 * First run downloads ~2GB of GGUF models — expected, one-time.
 *
 * Run from vault root:
 *   bun scripts/qmd/reindex.ts
 *
 * Suitable as a cronjob:
 *   0 * * * * cd /home/user/my-brain && bun scripts/qmd/reindex.ts
 */

import { createStore } from "@tobilu/qmd"

const DB = "__QMD_PATH__"

const store = await createStore({ dbPath: DB })

console.log("Updating file index...")
const result = await store.update({
  onProgress: ({ collection, file, current, total }: any) => {
    process.stdout.write(`\r  [${collection}] ${current}/${total} ${file}`.padEnd(80))
  },
})
console.log(
  `\n  indexed: ${result.indexed} | updated: ${result.updated} | ` +
  `removed: ${result.removed} | needs embedding: ${result.needsEmbedding}`
)

console.log("Generating embeddings...")
await store.embed({
  onProgress: ({ current, total, collection }: any) => {
    process.stdout.write(`\r  [${collection}] ${current}/${total}`.padEnd(60))
  },
})
console.log("\nDone.")
