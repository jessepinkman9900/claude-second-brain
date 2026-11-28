// Content for the "How it works" diagram, shared by FlowDiagram.tsx and its
// Markdown form in vocs.config.ts.

export const flow = {
  summary:
    'Articles, PDFs, notes and your questions go in through your agent; the wiki and its qmd index sit in the middle; Claude Code, Codex, Cursor, Obsidian and git all read and edit the same vault.',
  inputsHeading: 'You bring',
  outputsHeading: 'Works with',
  inputs: [
    { icon: 'newspaper', label: 'Articles' },
    { icon: 'file-text', label: 'PDFs' },
    { icon: 'notebook-pen', label: 'Personal notes' },
    { icon: 'message-circle-question-mark', label: 'Questions' },
  ],
  hub: { label: 'Your wiki', sublabel: 'wiki/ + qmd index' },
  outputs: [
    { icon: 'claude', label: 'Claude Code', color: '#D97757' },
    { icon: 'openai', label: 'Codex' },
    { icon: 'cursor', label: 'Cursor' },
    { icon: 'obsidian', label: 'Obsidian', color: '#7C3AED' },
    { icon: 'git', label: 'Git remote', color: '#F05032' },
  ],
  caption:
    'Your agent runs /brain-ingest on new sources and /brain-search on questions; qmd indexes every page; git keeps every device in sync.',
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
