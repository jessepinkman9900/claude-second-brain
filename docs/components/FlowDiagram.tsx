import { icons } from './diagram-icons'
import { flow } from './flow-content'

// Hub-and-spoke diagram for "How it works": inputs on the left flow into the
// wiki in the middle, which every reader/editor on the right works from.
// Pure SVG + CSS animation (no client JS); motion stops for prefers-reduced-motion.

const W = 760
const H = 380
const HUB = { x: 380, y: H / 2, w: 128, h: 104 }
const ICON = 36
const LEFT_X = 190 // left icon column (center)
const RIGHT_X = W - 190 // right icon column (center)

function rows(n: number) {
  const gap = 66
  const top = H / 2 - ((n - 1) * gap) / 2
  return Array.from({ length: n }, (_, i) => top + i * gap)
}

function Icon(props: { name: string; x: number; y: number; color?: string | undefined }) {
  const { name, x, y, color } = props
  return (
    <g transform={`translate(${x - ICON / 2} ${y - ICON / 2})`}>
      <rect className="csb-flow-tile" width={ICON} height={ICON} rx={9} />
      <svg
        x={9}
        y={9}
        width={18}
        height={18}
        viewBox="0 0 24 24"
        style={color ? { color } : undefined}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static icon markup from @iconify-json
        dangerouslySetInnerHTML={{ __html: icons[name] ?? '' }}
      />
    </g>
  )
}

const css = `
.csb-flow { margin: 28px 0 8px; border: 1px solid rgba(127,127,127,.25); border-radius: 14px; padding: 8px; overflow: hidden; }
.csb-flow svg.csb-flow-svg { display: block; width: 100%; height: auto; }
.csb-flow text { fill: currentColor; font-size: 13px; }
.csb-flow .csb-flow-label { opacity: .75; }
.csb-flow .csb-flow-heading { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; opacity: .45; }
.csb-flow .csb-flow-tile { fill: rgba(127,127,127,.12); stroke: rgba(127,127,127,.35); }
.csb-flow .csb-flow-hub { fill: rgba(127,127,127,.10); stroke: rgba(127,127,127,.55); }
.csb-flow .csb-flow-line { fill: none; stroke: currentColor; stroke-opacity: .18; stroke-width: 1.2; }
.csb-flow .csb-flow-pulse { fill: none; stroke: currentColor; stroke-opacity: .7; stroke-width: 1.6; stroke-linecap: round;
  stroke-dasharray: 18 292; stroke-dashoffset: 310; animation: csb-flow-run 3.2s linear infinite; }
@keyframes csb-flow-run { to { stroke-dashoffset: 0; } }
@media (prefers-reduced-motion: reduce) { .csb-flow .csb-flow-pulse { animation: none; stroke-dasharray: none; stroke-opacity: .3; } }
.csb-flow figcaption { font-size: .9rem; opacity: .65; text-align: center; padding: 6px 12px 10px; }
`

export function FlowDiagram() {
  const leftY = rows(flow.inputs.length)
  const rightY = rows(flow.outputs.length)
  const hubLeft = HUB.x - HUB.w / 2
  const hubRight = HUB.x + HUB.w / 2

  const leftPaths = leftY.map(
    (y) => `M ${LEFT_X + ICON / 2} ${y} C ${LEFT_X + 90} ${y}, ${hubLeft - 70} ${HUB.y}, ${hubLeft} ${HUB.y}`,
  )
  const rightPaths = rightY.map(
    (y) => `M ${hubRight} ${HUB.y} C ${hubRight + 70} ${HUB.y}, ${RIGHT_X - 90} ${y}, ${RIGHT_X - ICON / 2} ${y}`,
  )

  return (
    <figure className="csb-flow">
      <style>{css}</style>
      <svg className="csb-flow-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={flow.summary}>
        <text className="csb-flow-heading" x={LEFT_X} y={22} textAnchor="middle">
          {flow.inputsHeading}
        </text>
        <text className="csb-flow-heading" x={RIGHT_X} y={22} textAnchor="middle">
          {flow.outputsHeading}
        </text>

        {[...leftPaths, ...rightPaths].map((d) => (
          <path key={`line-${d}`} className="csb-flow-line" d={d} />
        ))}
        {leftPaths.map((d, i) => (
          <path key={`pulse-${d}`} className="csb-flow-pulse" d={d} pathLength={310} style={{ animationDelay: `${i * 0.45}s` }} />
        ))}
        {rightPaths.map((d, i) => (
          <path
            key={`pulse-${d}`}
            className="csb-flow-pulse"
            d={d}
            pathLength={310}
            style={{ animationDelay: `${1.6 + i * 0.35}s` }}
          />
        ))}

        {flow.inputs.map((item, i) => (
          <g key={item.label}>
            <Icon name={item.icon} x={LEFT_X} y={leftY[i]!} />
            <text className="csb-flow-label" x={LEFT_X - ICON / 2 - 12} y={leftY[i]! + 4.5} textAnchor="end">
              {item.label}
            </text>
          </g>
        ))}

        {flow.outputs.map((item, i) => (
          <g key={item.label}>
            <Icon name={item.icon} x={RIGHT_X} y={rightY[i]!} color={item.color} />
            <text className="csb-flow-label" x={RIGHT_X + ICON / 2 + 12} y={rightY[i]! + 4.5}>
              {item.label}
            </text>
          </g>
        ))}

        <g>
          <rect className="csb-flow-hub" x={hubLeft} y={HUB.y - HUB.h / 2} width={HUB.w} height={HUB.h} rx={14} />
          <g
            transform={`translate(${HUB.x - 13} ${HUB.y - 36}) scale(${26 / 64})`}
            fill="none"
            stroke="currentColor"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 52 L56 52 M10 48 L54 48 M32 12 L10 24 L54 24 Z M14 48 L14 26 M24 48 L24 26 M40 48 L40 26 M50 48 L50 26" />
          </g>
          <text x={HUB.x} y={HUB.y + 14} textAnchor="middle" style={{ fontWeight: 600, fontSize: 14 }}>
            {flow.hub.label}
          </text>
          <text className="csb-flow-label" x={HUB.x} y={HUB.y + 32} textAnchor="middle" style={{ fontSize: 11 }}>
            {flow.hub.sublabel}
          </text>
        </g>
      </svg>
      <figcaption>{flow.caption}</figcaption>
    </figure>
  )
}
