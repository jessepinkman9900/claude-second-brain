// Tests for the docs site's agent-facing output: llms.txt layout, absolute
// links, head metadata, JSON-LD, sitemap filtering, and the build verifier.
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  absolutizeLinks,
  formatLlmsIndex,
  homepageJsonLd,
  includeInSitemap,
  KEYWORDS,
  makeHead,
  normalizeBasePath,
  NPM_URL,
  REPO_URL,
  siteUrl,
} from '../scripts/docs/agent-ready.js'
import { publishMarkdown } from '../scripts/docs/postbuild.js'
import { verifyDocs } from '../scripts/docs/verify.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SITE = 'https://jessepinkman9900.github.io/claude-second-brain'

describe('site URL helpers', () => {
  it('normalizes base paths', () => {
    assert.equal(normalizeBasePath('/'), '')
    assert.equal(normalizeBasePath(''), '')
    assert.equal(normalizeBasePath('/claude-second-brain/'), '/claude-second-brain')
    assert.equal(normalizeBasePath('claude-second-brain/pr-preview/pr-7'), '/claude-second-brain/pr-preview/pr-7')
  })

  it('builds the production and preview site URLs', () => {
    assert.equal(siteUrl(), SITE)
    assert.equal(siteUrl('/claude-second-brain/pr-preview/pr-7/'), `${SITE}/pr-preview/pr-7`)
  })
})

describe('absolutizeLinks', () => {
  it('rewrites root-relative links and images to keep the base path', () => {
    assert.equal(
      absolutizeLinks('See [CLI](/cli) and ![x](/favicon.svg).', SITE),
      `See [CLI](${SITE}/cli) and ![x](${SITE}/favicon.svg).`,
    )
  })

  it('leaves absolute, protocol-relative, anchor and code links alone', () => {
    const md = [
      '[a](https://example.com/x) [b](//cdn.example.com/y) [c](#heading)',
      '`[d](/inline)`',
      '```md',
      '[e](/fenced)',
      '```',
    ].join('\n')
    assert.equal(absolutizeLinks(md, SITE), md)
  })
})

describe('formatLlmsIndex', () => {
  const generated = [
    '# claude-second-brain',
    '',
    'The fastest way to start your personal knowledge base.',
    '',
    '- [Intro](/index.md): Home',
    '- [Getting Started](/getting-started.md): Install',
    '- [Page not found](/404.md): Missing page',
    '- [Ship log](/ship-log.md): Releases',
  ].join('\n')
  const out = formatLlmsIndex(generated, SITE)
  const lines = out.split('\n')

  it('follows the llms.txt layout: H1, blockquote, then H2 sections', () => {
    assert.equal(lines[0], '# claude-second-brain')
    assert.match(lines.slice(1).find((l) => l.trim()), /^> /)
    const h2 = lines.filter((l) => l.startsWith('## '))
    assert.deepEqual(h2, ['## Docs', '## Project', '## Optional'])
    assert.doesNotMatch(out, /^#{3,} /m)
  })

  it('uses absolute links and drops the 404 page', () => {
    assert.ok(out.includes(`[Getting Started](${SITE}/getting-started.md)`))
    assert.doesNotMatch(out, /\]\(\/(?!\/)/)
    assert.doesNotMatch(out, /404/)
  })

  it('puts the ship log under Optional and links GitHub and npm', () => {
    const optional = out.slice(out.indexOf('## Optional'))
    assert.match(optional, /\[Ship log\]/)
    assert.ok(out.includes(`](${REPO_URL})`))
    assert.ok(out.includes(`](${NPM_URL})`))
  })
})

describe('homepageJsonLd', () => {
  const ld = homepageJsonLd({ site: SITE, version: '9.9.9', description: 'desc' })

  it('describes a SoftwareApplication with the fields agents read', () => {
    assert.equal(ld['@context'], 'https://schema.org')
    assert.equal(ld['@type'], 'SoftwareApplication')
    assert.equal(ld.name, 'claude-second-brain')
    assert.equal(ld.description, 'desc')
    assert.equal(ld.url, `${SITE}/`)
    assert.equal(ld.softwareVersion, '9.9.9')
    assert.equal(ld.offers.price, '0')
    assert.deepEqual(ld.sameAs, [REPO_URL, NPM_URL])
    assert.ok(ld.applicationCategory && ld.operatingSystem && ld.keywords)
  })

  it('round-trips through JSON', () => {
    assert.deepEqual(JSON.parse(JSON.stringify(ld)), ld)
  })
})

describe('makeHead', () => {
  const jsonLd = homepageJsonLd({ site: SITE, version: '1.0.0', description: 'config desc' })
  const head = makeHead({ site: SITE, jsonLd })

  it('survives the way Vocs serializes config functions', () => {
    // Vocs stores functions as source text and re-evaluates them later.
    const revived = (0, eval)(`(${head.toString()})`)
    assert.equal(revived('/cli', {}).canonical, `${SITE}/cli`)
  })

  it('sets canonical, og:url, keywords and a Markdown alternate on every page', () => {
    const tags = head('/skills/lint', { frontmatter: {} })
    assert.equal(tags.base, false)
    assert.equal(tags.canonical, `${SITE}/skills/lint`)
    assert.equal(tags.meta.ogUrl, `${SITE}/skills/lint`)
    assert.equal(tags.meta.keywords, KEYWORDS.join(', '))
    assert.deepEqual(tags.link, [
      { rel: 'alternate', type: 'text/markdown', href: `${SITE}/skills/lint.md` },
    ])
    assert.equal(tags.script, undefined)
  })

  it('adds one SoftwareApplication JSON-LD script on the homepage', () => {
    const tags = head('/', { frontmatter: { description: 'page desc' } })
    assert.equal(tags.canonical, `${SITE}/`)
    assert.equal(tags.link[0].href, `${SITE}/index.md`)
    assert.equal(tags.script.length, 1)
    assert.equal(tags.script[0].type, 'application/ld+json')
    assert.equal(tags.script[0].innerHTML['@type'], 'SoftwareApplication')
    assert.equal(tags.script[0].innerHTML.description, 'page desc')
  })

  it('skips JSON-LD when called without page frontmatter (avoids duplicates)', () => {
    assert.equal(head('/', {}).script, undefined)
  })
})

describe('docs pages', () => {
  const pagesDir = join(root, 'docs', 'pages')
  const pages = readdirSync(pagesDir, { recursive: true }).filter((f) => /\.mdx?$/.test(f))

  it('every page has a frontmatter description for meta tags and llms.txt', () => {
    for (const page of pages) {
      const src = readFileSync(join(pagesDir, page), 'utf-8')
      const fm = src.match(/^---\n([\s\S]*?)\n---/)
      assert.ok(fm, `${page} has no frontmatter`)
      const description = fm[1].match(/^description: "(.+)"$/m)?.[1]
      assert.ok(description && description.length >= 50, `${page} needs a description of 50+ characters`)
    }
  })

  it('every meta keyword appears on the homepage', () => {
    const home = readFileSync(join(pagesDir, 'index.mdx'), 'utf-8').toLowerCase()
    for (const k of KEYWORDS) assert.ok(home.includes(k.toLowerCase()), `"${k}" is not on the homepage`)
  })

  it('the homepage title names the product and says it is a CLI', () => {
    const home = readFileSync(join(pagesDir, 'index.mdx'), 'utf-8')
    assert.match(home, /^title: "claude-second-brain: CLI .+"$/m)
  })

  it('the 404 page is kept out of the sitemap', () => {
    assert.equal(includeInSitemap('/404'), false)
    assert.equal(includeInSitemap('/cli'), true)
  })
})

describe('postbuild publishMarkdown', () => {
  it('copies assets/md exports next to the HTML pages, except 404', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'csb-docs-'))
    try {
      mkdirSync(join(dir, 'assets', 'md', 'skills'), { recursive: true })
      writeFileSync(join(dir, 'assets', 'md', 'index.md'), '# Home')
      writeFileSync(join(dir, 'assets', 'md', '404.md'), '# Missing')
      writeFileSync(join(dir, 'assets', 'md', 'skills', 'lint.md'), '# Lint')
      const copied = await publishMarkdown(dir)
      assert.deepEqual(copied, ['index.md', join('skills', 'lint.md')])
      assert.equal(readFileSync(join(dir, 'skills', 'lint.md'), 'utf-8'), '# Lint')
      assert.equal(existsSync(join(dir, '404.md')), false)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('verifyDocs', () => {
  it('reports problems in a broken build', () => {
    const dir = mkdtempSync(join(tmpdir(), 'csb-docs-'))
    try {
      writeFileSync(join(dir, 'llms.txt'), '# x\n\n- [a](/a.md)\n')
      writeFileSync(join(dir, 'index.html'), '<html><head><title>x</title></head></html>')
      const errors = verifyDocs(dir, SITE)
      for (const expected of [
        /blockquote summary/,
        /root-relative links/,
        /llms-full\.txt is missing/,
        /sitemap\.xml is missing/,
        /0 SoftwareApplication/,
        /no meta keywords/,
        /404\.html is missing/,
      ])
        assert.ok(errors.some((e) => expected.test(e)), `expected an error matching ${expected}:\n${errors.join('\n')}`)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  const built = join(root, 'docs', 'dist', 'public')
  it('passes on the real docs build', { skip: !existsSync(join(built, 'llms.txt')) && 'run pnpm docs:build first' }, () => {
    assert.deepEqual(verifyDocs(built, siteUrl(process.env.BASE_PATH ?? '/claude-second-brain')), [])
  })
})
