import { readFileSync } from 'node:fs'
import { defineConfig } from 'vocs/config'
import { flowMarkdown } from './docs/components/flow-content.ts'
import { heroMarkdown } from './docs/components/hero-content.ts'
import {
  absolutizeLinks,
  formatLlmsIndex,
  homepageJsonLd,
  includeInSitemap,
  makeHead,
  siteUrl,
} from './scripts/docs/agent-ready.js'

const basePath = process.env.BASE_PATH ?? '/'
// Absolute URL of this build, e.g. https://jessepinkman9900.github.io/claude-second-brain
// (PR previews set BASE_PATH to their own sub-path).
const site = siteUrl(basePath)
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

const description =
  'The fastest way to start your personal knowledge base powered by Obsidian, your AI coding agent (Claude Code, Codex, Cursor, Copilot, and more), qmd, and git.'

export default defineConfig({
  title: 'claude-second-brain',
  description,
  // Pages live in docs/pages and the build writes to docs/dist.
  srcDir: 'docs',
  outDir: 'docs/dist',
  basePath,
  // Used for sitemap.xml, robots.txt and JSON-LD URLs.
  baseUrl: site,
  sitemap: { include: includeInSitemap },
  // GitHub Pages is a static host, so there is no server runtime.
  renderStrategy: 'full-static',
  // Canonical URLs, keywords, Markdown alternates, and JSON-LD on the homepage.
  head: makeHead({
    site,
    jsonLd: homepageJsonLd({ site, version, description }),
  }),
  markdown: {
    output: {
      // llms.txt, llms-full.txt and the .md exports: absolute links that keep
      // the base path, and an llms.txt laid out per https://llmstxt.org.
      // The landing-page hero is a React component; give it a Markdown form.
      components: [
        { module: './docs/components/Hero', export: 'Hero', render: () => heroMarkdown() },
        { module: './docs/components/FlowDiagram', export: 'FlowDiagram', render: () => flowMarkdown() },
      ],
      transform: ({ index, pages }) => ({
        index: formatLlmsIndex(index, site),
        pages: Object.fromEntries(
          Object.entries(pages).map(([route, body]) => [route, absolutizeLinks(body, site)]),
        ),
      }),
    },
  },
  iconUrl: '/favicon.svg',
  logoUrl: '/favicon.svg',
  socials: [
    {
      icon: 'github',
      link: 'https://github.com/jessepinkman9900/claude-second-brain',
    },
    {
      icon: 'x',
      link: 'https://x.com/jessepinkman9900',
    },
  ],
  topNav: [
    { text: 'Getting Started', link: '/getting-started' },
    {
      text: 'GitHub',
      link: 'https://github.com/jessepinkman9900/claude-second-brain',
    },
    {
      text: 'npm',
      link: 'https://www.npmjs.com/package/claude-second-brain',
    },
  ],
  sidebar: [
    { text: 'Introduction', link: '/' },
    { text: 'Getting Started', link: '/getting-started' },
    { text: 'CLI Reference', link: '/cli' },
    {
      text: 'Concepts',
      items: [
        { text: 'How it works', link: '/concepts/how-it-works' },
        { text: 'Wiki Folder Structure', link: '/concepts/schema' },
      ],
    },
    {
      text: 'Git backends',
      items: [
        { text: 'GitHub', link: '/remotes/github' },
        { text: 'Cloudflare Artifacts', link: '/remotes/cloudflare-artifacts' },
      ],
    },
    {
      text: 'Skills',
      items: [
        { text: 'Overview', link: '/skills' },
        { text: '/brain-ingest', link: '/skills/brain-ingest' },
        { text: '/brain-search', link: '/skills/brain-search' },
        { text: '/brain-refresh', link: '/skills/brain-refresh' },
        { text: '/brain-rebuild', link: '/skills/brain-rebuild' },
        { text: '/lint', link: '/skills/lint' },
      ],
    },
    { text: 'Ship log', link: '/ship-log' },
  ],
})
