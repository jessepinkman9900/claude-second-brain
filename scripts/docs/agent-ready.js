// Helpers that make the docs site readable by AI agents and search engines.
// Used by vocs.config.ts at build time and by tests/docs-agent-ready.test.js.

export const SITE_ORIGIN = 'https://jessepinkman9900.github.io'
export const PRODUCTION_BASE_PATH = '/claude-second-brain'
export const REPO_URL = 'https://github.com/jessepinkman9900/claude-second-brain'
export const NPM_URL = 'https://www.npmjs.com/package/claude-second-brain'
export const AUTHOR_URL = 'https://github.com/jessepinkman9900'

export const PRODUCT_NAME = 'claude-second-brain'

// Product terms for <meta name="keywords"> and JSON-LD `keywords`. Each one
// appears in the homepage text, which search-ranking checks expect.
export const KEYWORDS = [
  'claude-second-brain',
  'personal knowledge base',
  'cross-linked wiki',
  'Obsidian',
  'Claude Code',
  'Codex',
  'Cursor',
  'agent skills',
  'qmd',
  'semantic search',
  'git',
]

/** "/claude-second-brain/" -> "/claude-second-brain", "/" -> "" */
export function normalizeBasePath(basePath = '') {
  const trimmed = String(basePath).replace(/^\/+|\/+$/g, '')
  return trimmed ? `/${trimmed}` : ''
}

/** Absolute URL of the site root, without a trailing slash. */
export function siteUrl(basePath = PRODUCTION_BASE_PATH, origin = SITE_ORIGIN) {
  return `${origin.replace(/\/$/, '')}${normalizeBasePath(basePath)}`
}

/** Canonical URL for a route such as "/" or "/getting-started". */
export function canonicalUrl(path, site) {
  if (!path || path === '/') return `${site}/`
  return `${site}${path.startsWith('/') ? path : `/${path}`}`.replace(/\/$/, '')
}

/**
 * Rewrite root-relative Markdown links and images ("](/x)") to absolute URLs.
 * Vocs writes llms.txt and the .md exports with links relative to the domain
 * root, which drops the GitHub Pages base path. Fenced and inline code is left
 * alone.
 */
export function absolutizeLinks(markdown, site) {
  const parts = markdown.split(/(```[\s\S]*?```|`[^`\n]*`)/g)
  return parts
    .map((part, i) => (i % 2 === 1 ? part : part.replace(/\]\(\/(?!\/)/g, `](${site}/`)))
    .join('')
}

/**
 * Turn the llms.txt index Vocs generates into the layout the llms.txt spec
 * (https://llmstxt.org) describes: an H1, a blockquote summary, a short
 * description, then H2 sections of link lists. "Optional" holds links an
 * agent can skip when context is short.
 */
export function formatLlmsIndex(index, site) {
  const lines = index.split('\n')
  const links = lines
    .filter((line) => line.startsWith('- ['))
    .filter((line) => !/\]\([^)]*\/404\.md\)/.test(line))
  const optionalRoutes = ['/ship-log.md']
  const isOptional = (line) => optionalRoutes.some((r) => line.includes(`](${r})`))

  const docs = links.filter((line) => !isOptional(line))
  const optional = links.filter(isOptional)

  const out = [
    `# ${PRODUCT_NAME}`,
    '',
    `> ${PRODUCT_NAME} is an open-source CLI (\`npx claude-second-brain\`) that scaffolds a personal knowledge base: a git repository that is also an Obsidian vault, where your AI coding agent (Claude Code, Codex, Cursor, GitHub Copilot, and others) reads your sources and maintains a cross-linked wiki, searchable locally with qmd.`,
    '',
    'It is not a RAG system or a chatbot over your notes. The agent follows a schema file (`CLAUDE.md`, also reached through `AGENTS.md`) and a set of Agent Skills (`/brain-ingest`, `/brain-search`, `/brain-refresh`, `/brain-rebuild`, `/lint`) to summarize sources, update topic and entity pages, flag contradictions, and answer questions with citations. Every page below is also available as Markdown at the linked `.md` URL, and the whole site is in one file at `llms-full.txt`.',
    '',
    '## Docs',
    '',
    ...docs,
    '',
    '## Project',
    '',
    `- [GitHub repository](${REPO_URL}): Source code, issues, the \`CLAUDE.md\` schema, and the template vault copied on scaffold`,
    `- [npm package](${NPM_URL}): The published CLI. Run \`npx claude-second-brain\` with no global install`,
    `- [Full docs in one file](${site}/llms-full.txt): Every docs page concatenated as Markdown`,
    '',
  ]
  if (optional.length) out.push('## Optional', '', ...optional, '')
  return absolutizeLinks(out.join('\n'), site)
}

/** schema.org SoftwareApplication describing the CLI, for the homepage. */
export function homepageJsonLd({ site, version, description }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: PRODUCT_NAME,
    alternateName: 'csb',
    description,
    url: `${site}/`,
    applicationCategory: 'DeveloperApplication',
    applicationSubCategory: 'Command-line tool',
    operatingSystem: 'macOS, Linux, Windows',
    softwareVersion: version,
    softwareRequirements: 'Node.js 22 or later',
    downloadUrl: NPM_URL,
    installUrl: `${site}/getting-started`,
    codeRepository: REPO_URL,
    license: 'https://opensource.org/licenses/MIT',
    isAccessibleForFree: true,
    keywords: KEYWORDS.join(', '),
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    author: { '@type': 'Person', name: 'jessepinkman9900', url: AUTHOR_URL },
    sameAs: [REPO_URL, NPM_URL],
  }
}

/**
 * Build the Vocs `head` option. Vocs serializes config functions to source
 * text and re-evaluates them in the renderer, so the function can't close over
 * imports. Everything it needs is embedded as JSON in its body.
 *
 * Every page gets a canonical URL, og:url, keywords, and a
 * `<link rel="alternate" type="text/markdown">` pointing at its .md export.
 * The homepage also gets SoftwareApplication JSON-LD.
 */
export function makeHead({ site, keywords = KEYWORDS, jsonLd }) {
  const data = JSON.stringify({ site, keywords: keywords.join(', '), jsonLd })
  // eslint-disable-next-line no-new-func
  return new Function(
    'path',
    'context',
    `const d = ${data};
const route = !path || path === '/' ? '/' : path.replace(/\\/$/, '');
const url = route === '/' ? d.site + '/' : d.site + route;
const tags = {
  base: false,
  canonical: url,
  meta: { ogUrl: url, keywords: d.keywords },
  link: [{ rel: 'alternate', type: 'text/markdown', href: d.site + (route === '/' ? '/index' : route) + '.md' }],
};
const fm = context && context.frontmatter;
// Vocs also calls head() once without page frontmatter; only the page call adds JSON-LD.
if (route !== '/' || !d.jsonLd || !fm) return tags;
const jsonLd = Object.assign({}, d.jsonLd, fm.description ? { description: fm.description } : {});
tags.script = [{ type: 'application/ld+json', key: 'software-application', innerHTML: jsonLd }];
return tags;`,
  )
}

/** Routes that should not be listed in sitemap.xml. */
export function includeInSitemap(path) {
  return path !== '/404'
}
