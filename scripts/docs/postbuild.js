#!/usr/bin/env node
// Post-build step for the static (GitHub Pages) docs build.
//
// Vocs writes each page's Markdown export to assets/md/<route>.md and, when it
// runs with a server, serves it at /<route>.md. GitHub Pages has no server, so
// copy the exports to the URLs that llms.txt and <link rel="alternate"> use.
import { cp, readdir, stat } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const publicDir = process.argv[2] ?? join(root, 'docs', 'dist', 'public')
const mdDir = join(publicDir, 'assets', 'md')

/** Copy every assets/md/**.md file to the same path under publicDir. */
export async function publishMarkdown(dir = publicDir) {
  const source = join(dir, 'assets', 'md')
  const copied = []
  for (const file of await readdir(source, { recursive: true })) {
    if (!file.endsWith('.md')) continue
    if (!(await stat(join(source, file))).isFile()) continue
    if (file === '404.md') continue
    await cp(join(source, file), join(dir, file))
    copied.push(file)
  }
  return copied.sort()
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const copied = await publishMarkdown(publicDir)
  console.log(`[postbuild] published ${copied.length} Markdown pages from ${relative(root, mdDir)}`)
}
