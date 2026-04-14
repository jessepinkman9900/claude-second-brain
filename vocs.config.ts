import { defineConfig } from 'vocs'

const basePath = process.env.BASE_PATH ?? ''

export default defineConfig({
  llms: {
    generateMarkdown: true,
  },
  title: 'claude-second-brain',
  description:
    'The fastest way to start your personal knowledge base powered by Obsidian, Claude Code, qmd, and GitHub.',
  rootDir: 'docs',
  basePath,
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
    }
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
    {
      text: 'Concepts',
      items: [
        { text: 'How it works', link: '/concepts/how-it-works' },
        { text: 'Wiki Folder Structure', link: '/concepts/schema' },
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
        { text: '/setup', link: '/skills/setup' },
      ],
    },
    { text: 'Ship log', link: '/ship-log' },
  ],
})
