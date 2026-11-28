'use client'

import * as React from 'react'
import { agentIcons } from './agent-icons'

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
        {agentIcons.map((icon) => (
          <span className="csb-hero-agent" key={icon.name} title={icon.name}>
            <svg viewBox="0 0 24 24" width="14" height="14" style={icon.color ? { color: icon.color } : undefined}>
              {icon.paths.map((d) => (
                <path key={d.slice(0, 16)} fill="currentColor" d={d} />
              ))}
            </svg>
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
