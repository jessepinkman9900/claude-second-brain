import { Link } from 'vocs'
import { CopyCommand } from './CopyCommand.client'
import { command, headline, primary, secondary, subline } from './hero-content'

const css = `
.csb-hero { padding: 8px 0 40px; margin-bottom: 40px; border-bottom: 1px solid rgba(127,127,127,.25); }
.csb-hero h1 { font-size: clamp(2.25rem, 5vw, 3.5rem); line-height: 1.08; letter-spacing: -0.035em; font-weight: 600; margin: 0 0 24px; }
.csb-hero h1 .csb-muted { opacity: .45; }
.csb-hero .csb-sub { font-size: 1.15rem; line-height: 1.6; opacity: .75; max-width: 40rem; margin: 0 0 32px; }
.csb-hero-actions { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; margin-bottom: 22px; }
.csb-hero-primary { display: inline-flex; align-items: center; padding: 12px 22px; border-radius: 10px; font-weight: 500; text-decoration: none !important; background: var(--vocs-color-accent); color: var(--vocs-color-accentInvert) !important; transition: opacity .15s; }
.csb-hero-primary:hover { opacity: .88; }
.csb-hero-copy { display: inline-flex; align-items: center; gap: 12px; padding: 10px 16px; border-radius: 10px; border: 1.5px dashed rgba(127,127,127,.5); background: transparent; color: inherit; cursor: pointer; font: inherit; transition: border-color .15s; }
.csb-hero-copy:hover { border-color: currentColor; }
.csb-hero-copy code { font-size: .95rem; background: none; border: 0; padding: 0; white-space: nowrap; }
.csb-hero-copy > svg { opacity: .6; }
.csb-hero-agents { display: inline-flex; }
.csb-hero-agent { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 999px; background: rgba(127,127,127,.18); border: 1px solid rgba(127,127,127,.3); margin-left: -6px; }
.csb-hero-agent:first-child { margin-left: 0; }
.csb-hero-more { font-size: .95rem; opacity: .7; margin: 0; }
.csb-hero-more a { text-decoration: underline; text-underline-offset: 4px; text-decoration-color: rgba(127,127,127,.6); }
.csb-hero-more a:hover { text-decoration-color: currentColor; }
`

/** Landing-page hero. Its Markdown form lives in hero-content.ts. */
export function Hero() {
  return (
    <section className="csb-hero">
      <style>{css}</style>
      <h1>
        {headline.lead} <span className="csb-muted">{headline.muted}</span>
      </h1>
      <p className="csb-sub">{subline}</p>
      <div className="csb-hero-actions">
        <Link to={primary.href} className="csb-hero-primary">
          {primary.text}
        </Link>
        <CopyCommand command={command} />
      </div>
      <p className="csb-hero-more">
        {secondary.prefix}{' '}
        {secondary.links.map((l, i) => (
          <span key={l.href}>
            {i > 0 && ' · '}
            <Link to={l.href}>{l.text}</Link>
          </span>
        ))}
      </p>
    </section>
  )
}
