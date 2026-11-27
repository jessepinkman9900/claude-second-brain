// Agent registry + installer for Agent Skills (https://agentskills.io).
//
// Mirrors the model used by vercel-labs/skills (`npx skills`):
//   - Every agent has a project skills dir and a global skills dir.
//   - `.agents/skills` (project) and `~/.agents/skills` (global) are the shared
//     "canonical" locations. Agents whose project dir is `.agents/skills` are
//     "universal" and read the canonical dir directly — no extra copy needed.
//   - Other agents get a symlink from their own skills dir to the canonical
//     copy, falling back to a plain copy when symlinks aren't available
//     (e.g. Windows without developer mode). `copy` mode always copies.
//
// Paths and detection checks follow vercel-labs/skills src/agents.ts.

import { existsSync, readFileSync } from "fs"
import { cp, lstat, mkdir, readlink, realpath, rm, symlink, writeFile } from "fs/promises"
import { homedir, platform } from "os"
import { dirname, join, relative, resolve } from "path"

const home = homedir()
const configHome = process.env.XDG_CONFIG_HOME?.trim() || join(home, ".config")
const claudeHome = process.env.CLAUDE_CONFIG_DIR?.trim() || join(home, ".claude")
const codexHome = process.env.CODEX_HOME?.trim() || join(home, ".codex")

export const CANONICAL_PROJECT_DIR = ".agents/skills"
export const CANONICAL_GLOBAL_DIR = join(home, ".agents", "skills")

export const DEFAULT_AGENT = "claude-code"

// `globalSkillsDir: null` = the agent reads ~/.agents/skills globally.
export const AGENTS = {
  "claude-code": {
    displayName: "Claude Code",
    skillsDir: ".claude/skills",
    globalSkillsDir: join(claudeHome, "skills"),
    detect: () => existsSync(claudeHome),
  },
  codex: {
    displayName: "Codex",
    skillsDir: ".agents/skills",
    globalSkillsDir: null,
    detect: () => existsSync(codexHome) || existsSync("/etc/codex"),
  },
  cursor: {
    displayName: "Cursor",
    skillsDir: ".agents/skills",
    globalSkillsDir: null,
    detect: () => existsSync(join(home, ".cursor")),
  },
  "gemini-cli": {
    displayName: "Gemini CLI",
    skillsDir: ".agents/skills",
    globalSkillsDir: null,
    detect: () => existsSync(join(home, ".gemini")),
  },
  "github-copilot": {
    displayName: "GitHub Copilot",
    skillsDir: ".agents/skills",
    globalSkillsDir: null,
    detect: () => existsSync(join(home, ".copilot")),
  },
  opencode: {
    displayName: "OpenCode",
    skillsDir: ".agents/skills",
    globalSkillsDir: null,
    detect: () => existsSync(join(configHome, "opencode")),
  },
  amp: {
    displayName: "Amp",
    skillsDir: ".agents/skills",
    globalSkillsDir: null,
    detect: () => existsSync(join(configHome, "amp")),
  },
  cline: {
    displayName: "Cline",
    skillsDir: ".agents/skills",
    globalSkillsDir: null,
    detect: () => existsSync(join(home, ".cline")),
  },
  windsurf: {
    displayName: "Windsurf",
    skillsDir: ".windsurf/skills",
    globalSkillsDir: join(home, ".codeium/windsurf/skills"),
    detect: () => existsSync(join(home, ".codeium/windsurf")),
  },
  goose: {
    displayName: "Goose",
    skillsDir: ".goose/skills",
    globalSkillsDir: join(configHome, "goose/skills"),
    detect: () => existsSync(join(configHome, "goose")),
  },
  "kiro-cli": {
    displayName: "Kiro CLI",
    skillsDir: ".kiro/skills",
    globalSkillsDir: join(home, ".kiro/skills"),
    detect: () => existsSync(join(home, ".kiro")),
  },
  roo: {
    displayName: "Roo Code",
    skillsDir: ".roo/skills",
    globalSkillsDir: join(home, ".roo/skills"),
    detect: () => existsSync(join(home, ".roo")),
  },
  continue: {
    displayName: "Continue",
    skillsDir: ".continue/skills",
    globalSkillsDir: join(home, ".continue/skills"),
    detect: () => existsSync(join(home, ".continue")),
  },
  junie: {
    displayName: "Junie",
    skillsDir: ".junie/skills",
    globalSkillsDir: join(home, ".junie/skills"),
    detect: () => existsSync(join(home, ".junie")),
  },
  augment: {
    displayName: "Augment",
    skillsDir: ".augment/skills",
    globalSkillsDir: join(home, ".augment/skills"),
    detect: () => existsSync(join(home, ".augment")),
  },
}

export const AGENT_IDS = Object.keys(AGENTS)

export function isUniversal(id) {
  return AGENTS[id].skillsDir === CANONICAL_PROJECT_DIR
}

export function detectAgents() {
  return AGENT_IDS.filter(id => {
    try { return AGENTS[id].detect() } catch { return false }
  })
}

// Parse "a,b c" / "all" into validated agent ids. Throws on unknown ids.
export function parseAgentList(value) {
  const ids = String(value || "").split(/[\s,]+/).map(s => s.trim()).filter(Boolean)
  if (ids.includes("all")) return [...AGENT_IDS]
  const unknown = ids.filter(id => !AGENTS[id])
  if (unknown.length) {
    throw new Error(`Unknown agent${unknown.length === 1 ? "" : "s"}: ${unknown.join(", ")}. Known: ${AGENT_IDS.join(", ")}, all.`)
  }
  return [...new Set(ids)]
}

// Pull `--agent <ids>` / `-a <ids>` (repeatable) and `--copy` out of argv.
// Returns { agents: string[] | null, copy: boolean, rest: string[] }.
export function parseAgentFlags(args) {
  let agents = null
  let copy = false
  const rest = []
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === "--agent" || a === "-a" || a === "--agents") {
      const v = args[++i]
      if (!v || v.startsWith("-")) throw new Error(`${a} needs a value, e.g. ${a} claude-code,codex`)
      agents = [...(agents || []), ...parseAgentList(v)]
      continue
    }
    if (a.startsWith("--agent=") || a.startsWith("--agents=")) {
      agents = [...(agents || []), ...parseAgentList(a.slice(a.indexOf("=") + 1))]
      continue
    }
    if (a === "--copy") { copy = true; continue }
    rest.push(a)
  }
  return { agents: agents ? [...new Set(agents)] : null, copy, rest }
}

// Resolve which agents to install for.
//   explicit (--agent)  > CSB_AGENTS env > interactive multiselect > detected + claude-code
export async function resolveAgents({ explicit, isInteractive, prompts }) {
  if (explicit && explicit.length) return explicit
  if (process.env.CSB_AGENTS?.trim()) return parseAgentList(process.env.CSB_AGENTS)

  const detected = detectAgents()
  const defaults = [...new Set([DEFAULT_AGENT, ...detected])]
  if (!isInteractive || !prompts) return defaults

  const picked = await prompts.multiselect({
    message: "Install skills for which agents?",
    options: AGENT_IDS.map(id => ({
      value: id,
      label: AGENTS[id].displayName,
      hint: [
        detected.includes(id) ? "detected" : null,
        isUniversal(id) ? ".agents/skills" : AGENTS[id].skillsDir,
      ].filter(Boolean).join(" · "),
    })),
    initialValues: defaults,
    required: true,
  })
  if (prompts.isCancel(picked)) return null
  return picked
}

// Where a global skill lives for an agent (null = reads the canonical dir).
export function globalSkillDirFor(id, name) {
  const dir = AGENTS[id].globalSkillsDir
  return dir ? join(dir, name) : null
}

async function samePath(a, b) {
  try { return (await realpath(a)) === (await realpath(b)) } catch { return false }
}

// Point `linkPath` at `target` with a relative symlink (junction on Windows).
// Returns true on success, false if the caller should fall back to copying.
async function createSymlink(target, linkPath) {
  try {
    if (resolve(target) === resolve(linkPath)) return true
    if (await samePath(target, linkPath)) return true
    try {
      const st = await lstat(linkPath)
      if (st.isSymbolicLink()) {
        const current = await readlink(linkPath)
        if (resolve(dirname(linkPath), current) === resolve(target)) return true
      }
      await rm(linkPath, { recursive: true, force: true })
    } catch {
      // linkPath doesn't exist — fine.
    }
    await mkdir(dirname(linkPath), { recursive: true })
    // Resolve the parent through symlinks (e.g. ~/.claude/skills -> elsewhere)
    // so the relative target is computed from where the link really lives.
    const realParent = await realpath(dirname(linkPath))
    const isWin = platform() === "win32"
    const linkTarget = isWin ? resolve(target) : relative(realParent, resolve(target))
    await symlink(linkTarget, linkPath, isWin ? "junction" : undefined)
    return true
  } catch {
    return false
  }
}

async function copyInto(srcDir, destDir) {
  try {
    const st = await lstat(destDir)
    if (st.isSymbolicLink() || st.isDirectory()) await rm(destDir, { recursive: true, force: true })
  } catch { /* missing */ }
  await mkdir(dirname(destDir), { recursive: true })
  await cp(srcDir, destDir, { recursive: true })
}

// Write a skill's canonical global copy at ~/.agents/skills/<name>.
export async function writeCanonicalSkill(name, files) {
  const dir = join(CANONICAL_GLOBAL_DIR, name)
  // If an older install left a symlink here, replace it with a real dir.
  try {
    if ((await lstat(dir)).isSymbolicLink()) await rm(dir, { force: true })
  } catch { /* missing */ }
  await mkdir(dir, { recursive: true })
  for (const [file, content] of Object.entries(files)) {
    await writeFile(join(dir, file), content, "utf8")
  }
  return dir
}

// Expose the canonical copy of `name` to an agent's global skills dir.
// Returns { agent, path, mode: "canonical" | "symlink" | "copy" }.
export async function linkGlobalSkill(id, name, { copy = false } = {}) {
  const canonical = join(CANONICAL_GLOBAL_DIR, name)
  const dest = globalSkillDirFor(id, name)
  if (!dest || (await samePath(dest, canonical))) {
    return { agent: id, path: canonical, mode: "canonical" }
  }
  if (!copy && (await createSymlink(canonical, dest))) {
    return { agent: id, path: dest, mode: "symlink" }
  }
  await copyInto(canonical, dest)
  return { agent: id, path: dest, mode: "copy" }
}

// Copy a set of skill dirs into each agent's project skills dir inside `root`.
// Project installs always copy — vaults are git repos, and real files sync
// across machines where symlinks may not. Returns the list of dirs written.
export async function installProjectSkills(root, srcSkillsDir, skillNames, agents) {
  const srcResolved = resolve(srcSkillsDir)
  const targets = [...new Set(agents.map(id => AGENTS[id].skillsDir))]
  const written = []
  for (const rel of targets) {
    const destRoot = join(root, rel)
    if (resolve(destRoot) === srcResolved) continue
    for (const name of skillNames) {
      await copyInto(join(srcSkillsDir, name), join(destRoot, name))
    }
    written.push(rel)
  }
  return written
}

export function readSkillVersionSync(dir) {
  try {
    return JSON.parse(readFileSync(join(dir, ".csb-version"), "utf8")).version || null
  } catch {
    return null
  }
}
