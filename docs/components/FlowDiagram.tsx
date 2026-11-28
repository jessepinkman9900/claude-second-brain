import { icons } from './diagram-icons'
import { flow } from './flow-content'

// Hub-and-spoke diagram: your sources on the left, your brain in the middle,
// every agent on the right. Thin curved lines, with one bright pulse at a
// time travelling from a source, through the brain, to an agent.
// Pure SVG + CSS animation (no client JS); motion stops for prefers-reduced-motion.

const W = 900
const H = 380
const HUB = { x: W / 2, y: H / 2, w: 112, h: 108 }
const TILE = 40
const LEFT_X = 160 // left tile column (center)
const RIGHT_X = W - 160 // right tile column (center)
const GAP = 64
const MERGE = 60 // right-hand lines run together this far before fanning out
const STEP = 1.3 // seconds for a pulse to cross one side
const CYCLE = flow.inputs.length * STEP * 2 // one source -> agent trip at a time

function rows(n: number) {
  const top = H / 2 - ((n - 1) * GAP) / 2
  return Array.from({ length: n }, (_, i) => top + i * GAP)
}

function Tile(props: { name: string; x: number; y: number; color?: string | undefined }) {
  const { name, x, y, color } = props
  return (
    <g transform={`translate(${x - TILE / 2} ${y - TILE / 2})`}>
      <rect className="csb-flow-tile" width={TILE} height={TILE} rx={10} />
      <svg
        x={10}
        y={10}
        width={20}
        height={20}
        viewBox="0 0 24 24"
        style={color ? { color } : undefined}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static icon markup from @iconify-json
        dangerouslySetInnerHTML={{ __html: icons[name] ?? '' }}
      />
    </g>
  )
}

const travel = (100 * STEP) / CYCLE
const css = `
.csb-flow { margin: 28px 0 8px; }
.csb-flow-card { border: 1px solid rgba(127,127,127,.22); border-radius: 16px; background: rgba(127,127,127,.05); padding: 12px 8px; }
.csb-flow svg.csb-flow-svg { display: block; width: 100%; height: auto; }
.csb-flow text { fill: currentColor; font-size: 15px; }
.csb-flow .csb-flow-label { opacity: .72; }
.csb-flow .csb-flow-tile { fill: var(--vocs-color-background, transparent); stroke: rgba(127,127,127,.35); }
.csb-flow .csb-flow-hub { fill: var(--vocs-color-background, transparent); stroke: rgba(127,127,127,.5); }
.csb-flow .csb-flow-line { fill: none; stroke: currentColor; stroke-opacity: .16; stroke-width: 1; }
.csb-flow .csb-flow-pulse { fill: none; stroke: currentColor; stroke-opacity: .95; stroke-width: 1.6; stroke-linecap: round;
  stroke-dasharray: 70 2000; stroke-dashoffset: 70; animation: csb-flow-run ${CYCLE}s linear infinite; }
@keyframes csb-flow-run {
  0% { stroke-dashoffset: 70; }
  ${travel.toFixed(3)}% { stroke-dashoffset: -1000; }
  100% { stroke-dashoffset: -1000; }
}
@media (prefers-reduced-motion: reduce) { .csb-flow .csb-flow-pulse { display: none; } }
.csb-flow figcaption { font-size: .9rem; opacity: .65; text-align: center; padding: 10px 12px 0; }
`

export function FlowDiagram() {
  const leftY = rows(flow.inputs.length)
  const rightY = rows(flow.outputs.length)
  const hubLeft = HUB.x - HUB.w / 2
  const hubRight = HUB.x + HUB.w / 2
  const leftEdge = LEFT_X + TILE / 2
  const rightEdge = RIGHT_X - TILE / 2
  const mergeX = hubRight + MERGE

  // Sources curve into the hub's left edge, spread over its height.
  const leftPaths = leftY.map((y) => {
    const endY = HUB.y + (y - HUB.y) * 0.3
    const k = (hubLeft - leftEdge) * 0.5
    return `M ${leftEdge} ${y} C ${leftEdge + k} ${y}, ${hubLeft - k} ${endY}, ${hubLeft} ${endY}`
  })
  // Agents share one line out of the hub, then fan out.
  const k = (rightEdge - mergeX) * 0.5
  const rightPaths = rightY.map(
    (y) => `M ${hubRight} ${HUB.y} L ${mergeX} ${HUB.y} C ${mergeX + k} ${HUB.y}, ${rightEdge - k} ${y}, ${rightEdge} ${y}`,
  )
  const pulse = (d: string, delay: number) => (
    <path key={`pulse-${d}`} className="csb-flow-pulse" d={d} pathLength={1000} style={{ animationDelay: `${delay}s` }} />
  )

  return (
    <figure className="csb-flow">
      <style>{css}</style>
      <div className="csb-flow-card">
        <svg className="csb-flow-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={flow.summary}>
          {[...leftPaths, ...rightPaths].map((d) => (
            <path key={`line-${d}`} className="csb-flow-line" d={d} />
          ))}
          {leftPaths.map((d, i) => pulse(d, i * STEP * 2))}
          {/* Each trip ends at a different agent: source i -> agent (2i mod n). */}
          {rightPaths.map((d, j) => {
            const i = flow.inputs.findIndex((_, k) => (k * 2) % rightPaths.length === j)
            return pulse(d, (i < 0 ? j : i) * STEP * 2 + STEP)
          })}

          {flow.inputs.map((item, i) => (
            <g key={item.label}>
              <Tile name={item.icon} x={LEFT_X} y={leftY[i]!} color={'color' in item ? item.color : undefined} />
              <text className="csb-flow-label" x={LEFT_X - TILE / 2 - 12} y={leftY[i]! + 5} textAnchor="end">
                {item.label}
              </text>
            </g>
          ))}

          {flow.outputs.map((item, i) => (
            <g key={item.label}>
              <Tile name={item.icon} x={RIGHT_X} y={rightY[i]!} color={'color' in item ? item.color : undefined} />
              <text className="csb-flow-label" x={RIGHT_X + TILE / 2 + 12} y={rightY[i]! + 5}>
                {item.label}
              </text>
            </g>
          ))}

          <g>
            <rect className="csb-flow-hub" x={hubLeft} y={HUB.y - HUB.h / 2} width={HUB.w} height={HUB.h} rx={14} />
            <g
              transform={`translate(${HUB.x - 14} ${HUB.y - 38}) scale(${28 / 64})`}
              fill="none"
              stroke="currentColor"
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 52 L56 52 M10 48 L54 48 M32 12 L10 24 L54 24 Z M14 48 L14 26 M24 48 L24 26 M40 48 L40 26 M50 48 L50 26" />
            </g>
            <text x={HUB.x} y={HUB.y + 16} textAnchor="middle" style={{ fontWeight: 600, fontSize: 14 }}>
              {flow.hub.label}
            </text>
            <text className="csb-flow-label" x={HUB.x} y={HUB.y + 34} textAnchor="middle" style={{ fontSize: 11 }}>
              {flow.hub.sublabel}
            </text>
          </g>
        </svg>
      </div>
      <figcaption>{flow.caption}</figcaption>
    </figure>
  )
}
