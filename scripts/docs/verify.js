#!/usr/bin/env node
// Verify the machine-readable parts of a built docs site: llms.txt,
// llms-full.txt, per-page .md exports, head metadata, JSON-LD, sitemap, 404.
//
//   node scripts/docs/verify.js [publicDir] [siteUrl]
//
// Defaults to docs/dist/public and the URL for BASE_PATH (production if unset).
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { KEYWORDS, NPM_URL, REPO_URL, siteUrl } from './agent-ready.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** Map an absolute URL on this site to a file under publicDir, or null. */
function fileFor(url, publicDir, site) {
  if (!url.startsWith(`${site}/`)) return null
  let path = decodeURIComponent(url.slice(site.length).split('#')[0].split('?')[0])
  if (path === '/' || path === '') return join(publicDir, 'index.html')
  if (/\.[a-z]+$/i.test(path)) return join(publicDir, path)
  return join(publicDir, path, 'index.html')
}

function attr(html, re) {
  return html.match(re)?.[1]
}

function decode(s) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function jsonLdBlocks(html) {
  return [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(
    (m) => JSON.parse(m[1]),
  )
}

/** Returns a list of problems; empty means the build passes. */
export function verifyDocs(publicDir, site) {
  const errors = []
  const fail = (msg) => errors.push(msg)
  const read = (p) => readFileSync(join(publicDir, p), 'utf-8')
  const has = (p) => existsSync(join(publicDir, p))

  // llms.txt (https://llmstxt.org): H1, blockquote summary, H2 link sections.
  if (!has('llms.txt')) fail('llms.txt is missing')
  else {
    const llms = read('llms.txt')
    const lines = llms.split('\n')
    if (!/^# \S/.test(lines[0])) fail('llms.txt must start with an H1')
    const firstContent = lines.slice(1).find((l) => l.trim())
    if (!firstContent?.startsWith('> ')) fail('llms.txt must have a blockquote summary after the H1')
    if (!/^## Docs$/m.test(llms)) fail('llms.txt has no "## Docs" section')
    if (/^#{3,} /m.test(llms)) fail('llms.txt must only use H1 and H2 headings')
    if (/\]\(\/(?!\/)/.test(llms)) fail('llms.txt has root-relative links (they drop the base path)')
    const links = [...llms.matchAll(/^- \[[^\]]+\]\(([^)]+)\)/gm)].map((m) => m[1])
    if (links.length < 5) fail(`llms.txt lists only ${links.length} links`)
    for (const url of links) {
      const file = fileFor(url, publicDir, site)
      if (file && !existsSync(file)) fail(`llms.txt links to ${url}, which was not built`)
    }
  }

  // llms-full.txt: the whole site in one Markdown file.
  if (!has('llms-full.txt')) fail('llms-full.txt is missing')
  else if (read('llms-full.txt').length < 10_000) fail('llms-full.txt looks truncated')

  // sitemap.xml lists every page; each page has metadata and a .md export.
  if (!has('sitemap.xml')) fail('sitemap.xml is missing')
  const locs = has('sitemap.xml')
    ? [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
    : []
  if (has('sitemap.xml') && locs.length < 5) fail(`sitemap.xml lists only ${locs.length} pages`)
  for (const loc of locs) {
    if (/\/404$/.test(loc)) fail('sitemap.xml must not list the 404 page')
    const file = fileFor(loc, publicDir, site)
    if (!file || !existsSync(file)) {
      fail(`${loc} is in sitemap.xml but has no HTML file`)
      continue
    }
    const html = readFileSync(file, 'utf-8')
    if (!/<title>[^<]{3,}<\/title>/.test(html)) fail(`${loc} has no <title>`)
    if (!/<meta name="description" content="[^"]{50,}"/.test(html))
      fail(`${loc} has no meta description of 50+ characters`)
    const canonical = attr(html, /<link rel="canonical" href="([^"]+)"/)
    const expected = loc.endsWith('/') ? loc : loc.replace(/\/$/, '')
    if (canonical !== expected) fail(`${loc} has canonical ${canonical}`)
    if (/<base /.test(html)) fail(`${loc} has a <base> tag`)
    const alt = attr(html, /<link rel="alternate" type="text\/markdown" href="([^"]+)"/)
    if (!alt) fail(`${loc} has no Markdown alternate link`)
    else {
      const md = fileFor(alt, publicDir, site)
      if (!md || !existsSync(md)) fail(`${loc} links to Markdown ${alt}, which was not built`)
      else if (readFileSync(md, 'utf-8').trim().length < 50) fail(`${alt} is empty`)
    }
    // Agents fetching the HTML should get the content, not an empty app shell.
    if (!/<h1[\s>]/.test(html)) fail(`${loc} has no prerendered <h1>`)
  }

  // Homepage: product title, keywords, JSON-LD SoftwareApplication, repo + npm links.
  if (!has('index.html')) fail('index.html is missing')
  else {
    const html = read('index.html')
    const title = attr(html, /<title>([^<]+)<\/title>/) ?? ''
    if (!/claude-second-brain/.test(title) || !/CLI/.test(title))
      fail(`homepage title should name the product and say it is a CLI: "${title}"`)
    const keywords = decode(attr(html, /<meta name="keywords" content="([^"]+)"/) ?? '')
    if (!keywords) fail('homepage has no meta keywords')
    const text = decode(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).toLowerCase()
    for (const k of KEYWORDS)
      if (!text.includes(k.toLowerCase())) fail(`keyword "${k}" does not appear in the homepage text`)
    let blocks = []
    try {
      blocks = jsonLdBlocks(html)
    } catch (e) {
      fail(`homepage JSON-LD is not valid JSON: ${e.message}`)
    }
    const apps = blocks.filter((b) => b['@type'] === 'SoftwareApplication')
    if (apps.length !== 1) fail(`homepage has ${apps.length} SoftwareApplication JSON-LD blocks, expected 1`)
    const app = apps[0]
    if (app) {
      if (app['@context'] !== 'https://schema.org') fail('JSON-LD @context must be https://schema.org')
      for (const key of ['name', 'description', 'url', 'applicationCategory', 'operatingSystem', 'offers', 'sameAs', 'keywords'])
        if (!app[key]) fail(`JSON-LD SoftwareApplication is missing ${key}`)
      if (app.url !== `${site}/`) fail(`JSON-LD url is ${app.url}, expected ${site}/`)
      for (const url of [REPO_URL, NPM_URL])
        if (!app.sameAs?.includes(url)) fail(`JSON-LD sameAs is missing ${url}`)
    }
    for (const url of [REPO_URL, NPM_URL])
      if (!html.includes(`href="${url}"`)) fail(`homepage does not link to ${url}`)
  }

  // 404 page: explains the error and points agents at llms.txt.
  if (!has('404.html')) fail('404.html is missing')
  else {
    const html = read('404.html')
    if (!/Page not found/.test(html)) fail('404.html does not say the page was not found')
    if (!html.includes(`href="${site}/llms.txt"`) && !/href="[^"]*\/llms\.txt"/.test(html))
      fail('404.html does not link to llms.txt')
    if (!/<meta name="robots" content="noindex"/.test(html)) fail('404.html should be noindex')
  }

  return errors
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const publicDir = process.argv[2] ?? join(root, 'docs', 'dist', 'public')
  const site = process.argv[3] ?? siteUrl(process.env.BASE_PATH ?? '/claude-second-brain')
  const errors = verifyDocs(publicDir, site)
  if (errors.length) {
    console.error(`[verify] ${errors.length} problem(s) in ${publicDir}:`)
    for (const e of errors) console.error(`  - ${e}`)
    process.exit(1)
  }
  console.log(`[verify] docs build OK (${site})`)
}
