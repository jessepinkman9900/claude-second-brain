// Content for the "How it works" diagram, shared by FlowDiagram.tsx and its
// Markdown form in vocs.config.ts.

export const flow = {
  summary:
    'Articles, PDFs and notes go in, alongside your Obsidian vault and git remote; your brain (the wiki plus its qmd index) sits in the middle; Claude Code, Codex, Cursor, GitHub Copilot and Gemini all read and maintain it.',
  inputsHeading: 'Your sources',
  outputsHeading: 'Your agents',
  inputs: [
    { icon: 'newspaper', label: 'Articles' },
    { icon: 'file-text', label: 'PDFs' },
    { icon: 'notebook-pen', label: 'Notes' },
    { icon: 'obsidian', label: 'Obsidian', color: '#7C3AED' },
    { icon: 'git', label: 'Git', color: '#F05032' },
  ],
  hub: { label: 'Your brain', sublabel: 'wiki + qmd' },
  outputs: [
    { icon: 'claude', label: 'Claude Code', color: '#D97757' },
    { icon: 'openai', label: 'Codex' },
    { icon: 'cursor', label: 'Cursor' },
    { icon: 'githubcopilot', label: 'Copilot' },
    { icon: 'googlegemini', label: 'Gemini', color: '#8E75B2' },
  ],
  caption:
    'Set it up once. Every agent you use reads the same wiki, ingests new sources with /brain-ingest and answers with /brain-search.',
} as const

/** The diagram as Markdown AST nodes: a short description plus two lists. */
export function flowMarkdown() {
  const text = (value: string) => ({ type: 'text' as const, value })
  const list = (items: readonly string[]) => ({
    type: 'list' as const,
    ordered: false,
    spread: false,
    children: items.map((value) => ({
      type: 'listItem' as const,
      spread: false,
      children: [{ type: 'paragraph' as const, children: [text(value)] }],
    })),
  })
  return [
    { type: 'paragraph' as const, children: [text(`${flow.summary} ${flow.caption}`)] },
    { type: 'paragraph' as const, children: [{ type: 'strong' as const, children: [text(`${flow.inputsHeading}:`)] }] },
    list(flow.inputs.map((i) => i.label)),
    {
      type: 'paragraph' as const,
      children: [
        { type: 'strong' as const, children: [text('In the middle:')] },
        text(` ${flow.hub.label} (${flow.hub.sublabel})`),
      ],
    },
    { type: 'paragraph' as const, children: [{ type: 'strong' as const, children: [text(`${flow.outputsHeading}:`)] }] },
    list(flow.outputs.map((o) => o.label)),
  ]
}
