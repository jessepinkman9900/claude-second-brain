// Copy for the landing-page hero, shared by the React component (Hero.tsx) and
// the Markdown renderer in vocs.config.ts (index.md, llms-full.txt).

export const headline = {
  lead: "Your notes don't compound.",
  muted: 'claude-second-brain turns them into a wiki that does.',
}

export const subline =
  'Scaffold a personal knowledge base: an Obsidian vault and git repo where your AI coding agent (Claude Code, Codex, Cursor, Copilot, and more) reads your sources and maintains a cross-linked wiki with local qmd search.'

export const command = 'npx claude-second-brain'

export const primary = { text: 'Get started', href: '/getting-started' }

export const secondary = {
  prefix: 'Want the details first?',
  links: [
    { text: 'How it works', href: '/concepts/how-it-works' },
    { text: 'CLI reference', href: '/cli' },
    { text: 'GitHub', href: 'https://github.com/jessepinkman9900/claude-second-brain' },
  ],
}

/** The hero as Markdown AST nodes. */
export function heroMarkdown() {
  const text = (value: string) => ({ type: 'text' as const, value })
  const link = (l: { text: string; href: string }) => ({
    type: 'link' as const,
    url: l.href,
    children: [text(l.text)],
  })
  return [
    { type: 'heading' as const, depth: 1 as const, children: [text(`${headline.lead} ${headline.muted}`)] },
    { type: 'paragraph' as const, children: [text(subline)] },
    { type: 'code' as const, lang: 'bash', value: command },
    {
      type: 'paragraph' as const,
      children: [
        link(primary),
        text(` · ${secondary.prefix} `),
        ...secondary.links.flatMap((l, i) => (i ? [text(' · '), link(l)] : [link(l)])),
      ],
    },
  ]
}
