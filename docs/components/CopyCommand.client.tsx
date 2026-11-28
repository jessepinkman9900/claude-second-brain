'use client'

import * as React from 'react'
import { icons } from './diagram-icons'

const agents = [
  { key: 'claude', name: 'Claude Code', color: '#D97757' },
  { key: 'openai', name: 'Codex' },
  { key: 'cursor', name: 'Cursor' },
  { key: 'githubcopilot', name: 'GitHub Copilot' },
]

/** Dashed button that copies the install command, with the agents it works with. */
export function CopyCommand(props: { command: string }) {
  const { command } = props
  const [copied, setCopied] = React.useState(false)

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <button type="button" className="csb-hero-copy" onClick={onCopy} aria-label={`Copy ${command}`}>
      <span className="csb-hero-agents" aria-hidden="true">
        {agents.map((agent) => (
          <span className="csb-hero-agent" key={agent.key} title={agent.name}>
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              style={agent.color ? { color: agent.color } : undefined}
              // biome-ignore lint/security/noDangerouslySetInnerHtml: static icon markup from @iconify-json
              dangerouslySetInnerHTML={{ __html: icons[agent.key] ?? '' }}
            />
          </span>
        ))}
      </span>
      <code>{copied ? 'Copied!' : command}</code>
      <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {copied ? (
          <path d="M20 6 9 17l-5-5" />
        ) : (
          <>
            <rect width="14" height="14" x="8" y="8" rx="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </>
        )}
      </svg>
    </button>
  )
}
