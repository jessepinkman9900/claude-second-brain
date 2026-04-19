#!/usr/bin/env node
import { cp, rename, access, readFile, writeFile, mkdir, rm } from "fs/promises"
import { readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { spawnSync } from "child_process"
import { homedir } from "os"
import * as p from "@clack/prompts"
import pc from "picocolors"

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATE = join(__dirname, "../template")
const { version } = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf8"))
const CSB_ROOT   = join(homedir(), ".claude-second-brain")
const CSB_CONFIG = join(CSB_ROOT, "config.toml")

// Non-interactive commands — output piped (won't corrupt spinner)
function run(cmd, cwd) {
  const result = spawnSync(cmd[0], cmd.slice(1), { cwd, stdio: "pipe" })
  return result.status === 0
}

// Like `run`, but returns captured stdout/stderr so callers can surface the
// real failure to the user instead of a generic "failed" message.
function runCapture(cmd, cwd) {
  const result = spawnSync(cmd[0], cmd.slice(1), { cwd, stdio: "pipe", encoding: "utf8" })
  return {
    ok: result.status === 0,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  }
}

// Pick the most informative tail of a child process's output for an error message.
function tailForError({ stdout, stderr }, lines = 10) {
  const source = (stderr && stderr.trim()) ? stderr : stdout
  const trimmed = (source || "").trim()
  if (!trimmed) return ""
  return trimmed.split("\n").slice(-lines).join("\n")
}

// Interactive commands (e.g. gh auth login) — must inherit stdio; call outside spinner
function runInteractive(cmd, cwd) {
  const result = spawnSync(cmd[0], cmd.slice(1), { cwd, stdio: "inherit" })
  return result.status === 0
}

function commandExists(cmd) {
  const result = spawnSync("which", [cmd], { stdio: "pipe" })
  return result.status === 0
}

async function patchVault(targetDir, brainName) {
  // Only __BRAIN_NAME__ is substituted — all path resolution happens at
  // invocation time via the `claude-second-brain` CLI subcommands.
  const readmePath = join(targetDir, "README.md")
  try {
    let readme = await readFile(readmePath, "utf8")
    readme = readme.replaceAll("__BRAIN_NAME__", brainName)
    await writeFile(readmePath, readme, "utf8")
  } catch (err) {
    if (err.code !== "ENOENT") throw err
  }
}

// Resolve the `wrangler` CLI as either an installed binary or `npx wrangler` fallback.
function resolveWranglerCli() {
  if (commandExists("wrangler")) return { cmd: "wrangler", prefix: [] }
  return { cmd: "npx", prefix: ["wrangler"] }
}

// Strip ANSI escape sequences that wrangler injects into stdout.
function stripAnsi(s) {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1B\[[0-9;]*[A-Za-z]/g, "")
}

// Wrangler prints a decorative banner (⛅, ❅, etc.) alongside the token.
// Find the actual token line — a long run of Bearer-safe ASCII chars — and ignore the rest.
function extractBearerToken(stdout) {
  const lines = stripAnsi(stdout).split(/\r?\n/)
  const candidates = lines
    .map(l => l.trim())
    .filter(l => /^[A-Za-z0-9._~+/=-]{20,}$/.test(l))
  // Prefer the longest candidate (real tokens are longer than any accidental match).
  candidates.sort((a, b) => b.length - a.length)
  return candidates[0] || null
}

function truncate(s, n = 80) {
  if (!s) return ""
  return s.length > n ? s.slice(0, n) + "…" : s
}

// End-to-end Cloudflare Artifacts setup: auth, create repo, set remote, push.
// Every failure logs the exact step, exit codes, stderr, and HTTP bodies so the
// user can see where in the flow the break happened.
async function setupCloudflareRemote({ targetDir, repoName, namespace, spin }) {
  // Honor an existing API token as a shortcut — skip wrangler entirely.
  let cfApiToken = process.env.CLOUDFLARE_API_TOKEN
  let tokenSource = "CLOUDFLARE_API_TOKEN env"

  if (!cfApiToken) {
    // wrangler login requests artifacts:write by default — use it for auth.
    const wrangler = resolveWranglerCli()
    const wranglerLabel = [wrangler.cmd, ...wrangler.prefix].join(" ")

    p.log.info(`Checking Cloudflare auth via \`${wranglerLabel} whoami\`...`)
    const authCheck = spawnSync(wrangler.cmd, [...wrangler.prefix, "whoami"], { stdio: "pipe" })
    const whoamiOut = stripAnsi(authCheck.stdout?.toString() || "") + "\n" + stripAnsi(authCheck.stderr?.toString() || "")
    let loggedIn = authCheck.status === 0
    // Wrangler's existing session may predate Artifacts — it warns "missing some expected Oauth scopes"
    // and lists "artifacts:write". Detect that and force a re-login.
    const hasArtifactsScope = /^\s*-\s*artifacts\s*\(write\)/im.test(whoamiOut)
    const missingArtifactsScope = /missing some expected Oauth scopes/i.test(whoamiOut)
      && /artifacts:write/i.test(whoamiOut)
    const needsRelogin = loggedIn && (!hasArtifactsScope || missingArtifactsScope)

    if (!loggedIn) {
      const stderr = authCheck.stderr?.toString().trim()
      p.log.info(`wrangler whoami exited ${authCheck.status}${stderr ? ` (${truncate(stderr, 160)})` : ""}`)
    } else if (needsRelogin) {
      p.log.info("Your wrangler session is missing the artifacts:write scope — re-login required.")
    }

    if (!loggedIn || needsRelogin) {
      p.log.info("Starting wrangler login (grants artifacts:write scope)...")
      const loginResult = spawnSync(wrangler.cmd, [...wrangler.prefix, "login"], { stdio: "inherit" })
      loggedIn = loginResult.status === 0
      if (!loggedIn) {
        p.log.warn(`wrangler login exited ${loginResult.status} — set CLOUDFLARE_API_TOKEN and re-run.`)
        return null
      }

      // Verify the new session actually has artifacts:write before proceeding.
      const verify = spawnSync(wrangler.cmd, [...wrangler.prefix, "whoami"], { stdio: "pipe" })
      const verifyOut = stripAnsi(verify.stdout?.toString() || "") + "\n" + stripAnsi(verify.stderr?.toString() || "")
      if (!/^\s*-\s*artifacts\s*\(write\)/im.test(verifyOut)) {
        p.log.warn("wrangler login completed but artifacts:write scope is still missing.")
        p.log.warn("Upgrade wrangler (npm i -g wrangler@latest) or set CLOUDFLARE_API_TOKEN manually.")
        return null
      }
    }

    // Retrieve the OAuth token wrangler stored; it refreshes automatically if expired.
    p.log.info(`Fetching OAuth token via \`${wranglerLabel} auth token\`...`)
    const tokenResult = spawnSync(wrangler.cmd, [...wrangler.prefix, "auth", "token"], { stdio: "pipe" })
    const rawStdout = tokenResult.stdout?.toString() || ""
    const rawStderr = tokenResult.stderr?.toString() || ""

    if (tokenResult.status !== 0) {
      p.log.warn(`wrangler auth token exited ${tokenResult.status}`)
      if (rawStderr.trim()) p.log.warn(`stderr: ${truncate(rawStderr.trim(), 400)}`)
      if (rawStdout.trim()) p.log.warn(`stdout: ${truncate(rawStdout.trim(), 400)}`)
      return null
    }

    cfApiToken = extractBearerToken(rawStdout)
    if (!cfApiToken) {
      p.log.warn("Could not parse a Bearer-safe token from wrangler output.")
      p.log.warn(`raw stdout: ${truncate(rawStdout.trim(), 400)}`)
      if (rawStderr.trim()) p.log.warn(`raw stderr: ${truncate(rawStderr.trim(), 400)}`)
      return null
    }
    tokenSource = "wrangler auth token"
  }

  // Guard against tokens that contain non-ASCII (which would crash fetch's header encoder).
  if (!/^[\x20-\x7E]+$/.test(cfApiToken)) {
    p.log.warn(`Token from ${tokenSource} contains non-ASCII characters — refusing to use it.`)
    p.log.warn(`token preview: ${truncate(cfApiToken, 60)}`)
    return null
  }

  p.log.info(`Using token from ${tokenSource} (length ${cfApiToken.length}, prefix ${cfApiToken.slice(0, 8)}…)`)

  const baseUrl = `https://artifacts.cloudflare.net/v1/api/namespaces/${namespace}`
  spin.start(`Creating Cloudflare Artifact ${pc.dim(repoName)} at ${pc.dim(baseUrl)}`)

  let res
  let rawBody = ""
  try {
    res = await fetch(`${baseUrl}/repos`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cfApiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: repoName, default_branch: "main" }),
    })
    rawBody = await res.text()
  } catch (err) {
    spin.stop(`Network error calling Artifacts API: ${err.message}`, 1)
    return null
  }

  let createData
  try {
    createData = rawBody ? JSON.parse(rawBody) : {}
  } catch {
    spin.stop(`Artifacts API returned non-JSON (HTTP ${res.status})`, 1)
    p.log.warn(`body: ${truncate(rawBody, 400)}`)
    return null
  }

  if (!res.ok || !createData?.success) {
    const errMsg = createData?.errors?.[0]?.message || createData?.message || "unknown error"
    spin.stop(`Artifacts API failed (HTTP ${res.status}): ${errMsg}`, 1)
    p.log.warn(`full response: ${truncate(rawBody, 400)}`)
    return null
  }

  const { remote, token: repoToken } = createData.result
  if (!remote || !repoToken) {
    spin.stop("Artifacts API succeeded but response is missing remote/token", 1)
    p.log.warn(`response: ${truncate(rawBody, 400)}`)
    return null
  }

  const remoteAddResult = spawnSync("git", ["remote", "add", "origin", remote], { cwd: targetDir, stdio: "pipe" })
  if (remoteAddResult.status !== 0) {
    spin.stop(`git remote add failed (exit ${remoteAddResult.status})`, 1)
    const stderr = remoteAddResult.stderr?.toString().trim()
    if (stderr) p.log.warn(`git stderr: ${truncate(stderr, 400)}`)
    return null
  }

  const pushResult = spawnSync(
    "git",
    ["-c", `http.extraHeader=Authorization: Bearer ${repoToken}`, "push", "-u", "origin", "main"],
    { cwd: targetDir, stdio: "pipe" }
  )
  if (pushResult.status !== 0) {
    spin.stop(`git push to Cloudflare Artifact failed (exit ${pushResult.status})`, 1)
    const stderr = pushResult.stderr?.toString().trim()
    const stdout = pushResult.stdout?.toString().trim()
    if (stderr) p.log.warn(`git stderr: ${truncate(stderr, 400)}`)
    if (stdout) p.log.warn(`git stdout: ${truncate(stdout, 400)}`)
    return { repoToken, remote }
  }

  spin.stop(`Cloudflare Artifact created: ${pc.cyan(repoName)}`)
  p.log.info(`Remote: ${pc.dim(remote)}`)
  return { repoToken, remote }
}

function parseGithubRepo(url) {
  if (!url) return null
  const m = url.match(/github\.com[:/]([^/\s]+)\/([^/\s.]+)/)
  return m ? `${m[1]}/${m[2]}` : null
}

function parseCloudflareArtifact(url) {
  if (!url || !/artifacts\.cloudflare/.test(url)) return null
  const explicit = url.match(/namespaces\/([^/]+)\/repos\/([^/.]+)/)
  if (explicit) return { namespace: explicit[1], repo: explicit[2] }
  const parts = url.replace(/\.git$/, "").split("/").filter(Boolean)
  if (parts.length >= 2) return { namespace: parts[parts.length - 2], repo: parts[parts.length - 1] }
  return null
}

async function resolveCloudflareToken() {
  if (process.env.CLOUDFLARE_API_TOKEN) {
    return { token: process.env.CLOUDFLARE_API_TOKEN, source: "CLOUDFLARE_API_TOKEN env" }
  }
  const wrangler = resolveWranglerCli()
  const tokenResult = spawnSync(wrangler.cmd, [...wrangler.prefix, "auth", "token"], { stdio: "pipe" })
  if (tokenResult.status !== 0) return null
  const token = extractBearerToken(tokenResult.stdout?.toString() || "")
  if (!token || !/^[\x20-\x7E]+$/.test(token)) return null
  return { token, source: "wrangler auth token" }
}

function deleteGithubRepo(slug) {
  if (!commandExists("gh")) return { ok: false, error: "gh CLI not installed" }
  const r = spawnSync("gh", ["repo", "delete", slug, "--yes"], { stdio: "pipe" })
  if (r.status !== 0) {
    const stderr = r.stderr?.toString().trim() || `exit ${r.status}`
    return { ok: false, error: truncate(stderr, 200) }
  }
  return { ok: true }
}

async function deleteCloudflareArtifact({ namespace, repo }) {
  const auth = await resolveCloudflareToken()
  if (!auth) return { ok: false, error: "no Cloudflare API token (set CLOUDFLARE_API_TOKEN or run `wrangler login`)" }
  try {
    const res = await fetch(`https://artifacts.cloudflare.net/v1/api/namespaces/${namespace}/repos/${repo}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    if (!res.ok) {
      const body = await res.text()
      return { ok: false, error: `HTTP ${res.status}: ${truncate(body, 200)}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

const GLOBAL_SKILLS = ["brain-ingest", "brain-search", "brain-refresh"]

async function readSkillVersion(skillDir) {
  try {
    const raw = await readFile(join(skillDir, ".csb-version"), "utf8")
    return JSON.parse(raw).version || null
  } catch {
    return null
  }
}

// Decide whether to (re)install each global skill. Returns a map name→"install"|"skip".
// Interactive mismatch prompts once per run with update-all / skip-all / ask-per-skill.
async function planGlobalSkillInstall({ isInteractive }) {
  const decisions = {}
  const mismatches = []

  for (const name of GLOBAL_SKILLS) {
    const destDir = join(homedir(), ".claude", "skills", name)
    const installed = await readSkillVersion(destDir)
    if (!installed) {
      decisions[name] = "install"
    } else if (installed === version) {
      decisions[name] = "skip"
    } else {
      mismatches.push({ name, installed })
    }
  }

  if (mismatches.length === 0) return decisions

  // CI / non-interactive / opt-out: silently update.
  if (!isInteractive || process.env.CSB_SKIP_SKILL_UPDATES === "1") {
    for (const m of mismatches) decisions[m.name] = "install"
    return decisions
  }

  const mode = await p.select({
    message: `${mismatches.length} global skill${mismatches.length === 1 ? "" : "s"} at a different version than this release (v${version}). Update?`,
    options: [
      { value: "update-all", label: "Update all" },
      { value: "skip-all", label: "Keep existing (skip all)" },
      { value: "ask", label: "Ask per skill" },
    ],
    initialValue: "update-all",
  })
  if (p.isCancel(mode)) {
    for (const m of mismatches) decisions[m.name] = "skip"
    return decisions
  }

  if (mode === "update-all") {
    for (const m of mismatches) decisions[m.name] = "install"
  } else if (mode === "skip-all") {
    for (const m of mismatches) decisions[m.name] = "skip"
  } else {
    for (const m of mismatches) {
      const ok = await p.confirm({
        message: `Update "${m.name}" from v${m.installed} → v${version}?`,
        initialValue: true,
      })
      decisions[m.name] = p.isCancel(ok) || !ok ? "skip" : "install"
    }
  }
  return decisions
}

async function installGlobalSkills({ isInteractive }) {
  const globalSkillsDir = join(homedir(), ".claude", "skills")
  const decisions = await planGlobalSkillInstall({ isInteractive })

  const installed = []
  const skipped = []
  const sameVersion = []

  await Promise.all(GLOBAL_SKILLS.map(async name => {
    const destDir = join(globalSkillsDir, name)
    const decision = decisions[name]

    if (decision === "skip") {
      // Differentiate "already at this version" from "user declined update" for logging.
      const current = await readSkillVersion(destDir)
      if (current === version) sameVersion.push(name)
      else skipped.push(name)
      return
    }

    const srcFile = join(TEMPLATE, ".claude/skills", name, "SKILL.md")
    const content = await readFile(srcFile, "utf8")

    await mkdir(destDir, { recursive: true })
    await writeFile(join(destDir, "SKILL.md"), content, "utf8")
    await writeFile(
      join(destDir, ".csb-version"),
      JSON.stringify({ version, installed: new Date().toISOString() }, null, 2) + "\n",
      "utf8",
    )
    installed.push(name)
  }))

  return { installed, skipped, sameVersion }
}

function parseConfig(content) {
  if (!content) return { defaultBrain: null, brains: [], header: "" }
  const blocks = content.split(/\n(?=\[\[brains\]\])/)
  const header = blocks[0] || ""
  // Prefer `default = …` over legacy `active = …` so existing configs upgrade
  // transparently on the next write.
  const defaultMatch =
    header.match(/^default\s*=\s*"([^"]+)"/m) ||
    header.match(/^active\s*=\s*"([^"]+)"/m)
  const brains = blocks.slice(1).map(block => {
    const get = re => (block.match(re) || [])[1] || ""
    return {
      raw: block,
      name: get(/^name\s*=\s*"([^"]+)"/m),
      path: get(/^path\s*=\s*"([^"]+)"/m),
      qmd_index: get(/^qmd_index\s*=\s*"([^"]*)"/m),
      created: get(/^created\s*=\s*"([^"]*)"/m),
      git_remote: get(/^git_remote\s*=\s*"([^"]*)"/m),
    }
  }).filter(b => b.name)
  return { defaultBrain: defaultMatch ? defaultMatch[1] : null, brains, header }
}

function printHelp() {
  const lines = [
    `${pc.bold("claude-second-brain")} v${version}`,
    "",
    "Usage:",
    `  ${pc.cyan("claude-second-brain")}                         create a new brain (interactive)`,
    `  ${pc.cyan("claude-second-brain <name>")}                  create a new brain named <name>`,
    `  ${pc.cyan("claude-second-brain ls")}                      list all brains`,
    `  ${pc.cyan("claude-second-brain rm [<name>…]")}            remove one or more brains (space to multi-select)`,
    `  ${pc.cyan("claude-second-brain path [--brain N] [flag]")} print a path (flags: --root, --qmd, --config)`,
    `  ${pc.cyan("claude-second-brain qmd [--brain N] -- …")}    run qmd against the resolved brain`,
    `  ${pc.cyan("claude-second-brain help")}                    show this message`,
  ]
  console.log(lines.join("\n"))
}

// Resolve a brain entry from config. Name defaults to the `default` field.
async function resolveBrain(name) {
  let content
  try {
    content = await readFile(CSB_CONFIG, "utf8")
  } catch {
    throw new Error(`No config at ${CSB_CONFIG}. Run \`claude-second-brain <name>\` to create your first brain.`)
  }
  const { defaultBrain, brains } = parseConfig(content)
  const target = name || defaultBrain
  if (!target) {
    const available = brains.map(b => b.name).join(", ")
    const hint = available
      ? `Pass --brain <name> (available: ${available}), or edit ${CSB_CONFIG} and set \`default = "<name>"\`.`
      : `Run \`claude-second-brain <name>\` to create your first brain.`
    throw new Error(`No default brain set in config.toml. ${hint}`)
  }
  const entry = brains.find(b => b.name === target)
  if (!entry) {
    const available = brains.map(b => b.name).join(", ") || "(none)"
    throw new Error(`No brain named "${target}". Available: ${available}. Run \`claude-second-brain ls\` to list brains.`)
  }
  return entry
}

async function cmdPath(args) {
  // Parse flags: --brain <name>, --root | --qmd | --config (default: --root)
  let name = null
  let mode = "root"
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === "--brain") { name = args[++i]; continue }
    if (a === "--root")   { mode = "root"; continue }
    if (a === "--qmd")    { mode = "qmd"; continue }
    if (a === "--config") { mode = "config"; continue }
    throw new Error(`Unknown path arg: ${a}`)
  }
  if (mode === "config") {
    process.stdout.write(CSB_CONFIG + "\n")
    return
  }
  const brain = await resolveBrain(name)
  const out = mode === "qmd" ? brain.qmd_index : brain.path
  process.stdout.write(out + "\n")
}

async function cmdQmd(args) {
  // `claude-second-brain qmd [--brain N] [--] <qmd args…>`
  let name = null
  const rest = []
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === "--brain") { name = args[++i]; continue }
    if (a === "--") { rest.push(...args.slice(i + 1)); break }
    rest.push(a)
  }
  const brain = await resolveBrain(name)
  const result = spawnSync("npx", ["-y", "@tobilu/qmd", ...rest], {
    stdio: "inherit",
    env: { ...process.env, INDEX_PATH: brain.qmd_index },
  })
  process.exit(result.status ?? 1)
}

async function listBrains() {
  const toDisplayPath = p => p && p.startsWith(homedir()) ? "~" + p.slice(homedir().length) : p
  let content
  try {
    content = await readFile(CSB_CONFIG, "utf8")
  } catch {
    p.intro(`${pc.bgCyan(pc.black(" claude-second-brain "))} v${version}`)
    p.log.info("No brains yet. Run `claude-second-brain <name>` to create one.")
    p.outro("")
    return
  }

  const { defaultBrain, brains } = parseConfig(content)
  p.intro(`${pc.bgCyan(pc.black(" claude-second-brain "))} v${version}`)

  if (brains.length === 0) {
    p.log.info("No brains registered in config.toml.")
    p.outro("")
    return
  }

  const rows = brains.map(b => {
    const marker = b.name === defaultBrain ? pc.green("*") : " "
    const name = b.name === defaultBrain ? pc.bold(b.name) : b.name
    const remote = b.git_remote || pc.dim("—")
    return `${marker} ${name}\n  path:    ${pc.dim(toDisplayPath(b.path))}\n  created: ${pc.dim(b.created || "—")}\n  remote:  ${pc.dim(remote)}`
  })

  p.note(rows.join("\n\n"), `${brains.length} brain${brains.length === 1 ? "" : "s"}`)
  p.outro(defaultBrain ? `default: ${pc.cyan(defaultBrain)}` : "no default brain")
}

async function removeBrain(names, { yes = false } = {}) {
  p.intro(`${pc.bgCyan(pc.black(" claude-second-brain "))} v${version}`)

  let content
  try {
    content = await readFile(CSB_CONFIG, "utf8")
  } catch {
    p.cancel(`No config at ${CSB_CONFIG} — nothing to remove.`)
    process.exit(1)
  }

  const { defaultBrain, brains, header } = parseConfig(content)

  if (brains.length === 0) {
    p.cancel("No brains registered in config.toml.")
    process.exit(1)
  }

  const toDisplayPath = p => p && p.startsWith(homedir()) ? "~" + p.slice(homedir().length) : p

  if (!names || names.length === 0) {
    const pick = await p.multiselect({
      message: "Which brain(s) to remove? (space to toggle, enter to confirm)",
      options: brains.map(b => ({
        value: b.name,
        label: b.name === defaultBrain ? `${b.name} ${pc.dim("(default)")}` : b.name,
        hint: toDisplayPath(b.path),
      })),
      required: true,
    })
    if (p.isCancel(pick)) { p.cancel("Cancelled."); process.exit(0) }
    names = pick
  }

  const targets = names.map(n => {
    const t = brains.find(b => b.name === n)
    if (!t) {
      p.cancel(`No brain named "${n}". Run \`claude-second-brain ls\` to see registered brains.`)
      process.exit(1)
    }
    return t
  })

  if (!yes) {
    const list = targets.map(t => `  • ${t.name} ${pc.dim(toDisplayPath(t.path))}`).join("\n")
    const ok = await p.confirm({
      message: `Remove ${targets.length} brain${targets.length === 1 ? "" : "s"}? This deletes the ${targets.length === 1 ? "directory" : "directories"} and config ${targets.length === 1 ? "entry" : "entries"}.\n${list}`,
      initialValue: false,
    })
    if (p.isCancel(ok) || !ok) {
      p.cancel("Cancelled.")
      process.exit(0)
    }
  }

  // Ask per-target whether to also delete the remote. Skip in -y mode — remote
  // deletion is destructive beyond the local vault and requires explicit opt-in.
  const remoteDecisions = new Map()
  if (!yes) {
    for (const target of targets) {
      const gh = parseGithubRepo(target.git_remote)
      const cf = parseCloudflareArtifact(target.git_remote)
      if (!gh && !cf) continue
      const label = gh ? `GitHub repo ${pc.cyan(gh)}` : `Cloudflare Artifact ${pc.cyan(`${cf.namespace}/${cf.repo}`)}`
      const ok = await p.confirm({
        message: `Also delete ${label} for "${target.name}"?`,
        initialValue: false,
      })
      if (p.isCancel(ok)) { p.cancel("Cancelled."); process.exit(0) }
      if (ok) {
        remoteDecisions.set(target.name, gh
          ? { kind: "github", slug: gh }
          : { kind: "cloudflare", namespace: cf.namespace, repo: cf.repo })
      }
    }
  }

  const spin = p.spinner()

  for (const target of targets) {
    spin.start(`Deleting ${toDisplayPath(target.path)}`)
    if (target.path) {
      try {
        await rm(target.path, { recursive: true, force: true })
        spin.stop(`Removed ${pc.dim(toDisplayPath(target.path))}`)
      } catch (err) {
        spin.stop(`Failed to remove ${target.name}: ${err.message}`, 1)
      }
    } else {
      spin.stop(`${target.name}: no path on config entry — skipping directory removal`, 1)
    }
  }

  for (const [name, decision] of remoteDecisions) {
    if (decision.kind === "github") {
      spin.start(`Deleting GitHub repo ${decision.slug}`)
      const result = deleteGithubRepo(decision.slug)
      if (result.ok) {
        spin.stop(`Removed GitHub repo ${pc.dim(decision.slug)}`)
      } else {
        spin.stop(`Failed to delete GitHub repo ${decision.slug}: ${result.error}`, 1)
        p.log.warn(`Delete it manually: ${pc.cyan(`gh repo delete ${decision.slug} --yes`)} (or via https://github.com/${decision.slug}/settings)`)
      }
    } else {
      spin.start(`Deleting Cloudflare Artifact ${decision.namespace}/${decision.repo}`)
      const result = await deleteCloudflareArtifact(decision)
      if (result.ok) {
        spin.stop(`Removed Cloudflare Artifact ${pc.dim(`${decision.namespace}/${decision.repo}`)}`)
      } else {
        spin.stop(`Failed to delete Cloudflare Artifact for ${name}: ${result.error}`, 1)
        p.log.warn(`Delete it manually:\n  ${pc.cyan(`TOKEN=$(wrangler auth token)`)}\n  ${pc.cyan(`curl -X DELETE https://artifacts.cloudflare.net/v1/api/namespaces/${decision.namespace}/repos/${decision.repo} \\`)}\n  ${pc.cyan(`  -H "Authorization: Bearer $TOKEN"`)}`)
      }
    }
  }

  // Rewrite config.toml without the removed brains.
  const removedSet = new Set(names)
  const remaining = brains.filter(b => !removedSet.has(b.name))
  const removedDefault = removedSet.has(defaultBrain)
  // Strip both legacy `active = …` and current `default = …` from the header;
  // we rewrite it from scratch below.
  let newHeader = header
    .replace(/^active\s*=\s*"[^"]*"\s*\n?/m, "")
    .replace(/^default\s*=\s*"[^"]*"\s*\n?/m, "")
    .replace(/^\s+|\s+$/g, "")
  if (removedDefault) {
    if (remaining.length > 0) {
      newHeader = `default = "${remaining[0].name}"${newHeader ? "\n" + newHeader : ""}`
    }
  } else if (defaultBrain) {
    newHeader = `default = "${defaultBrain}"${newHeader ? "\n" + newHeader : ""}`
  }

  const entries = remaining.map(b => b.raw.replace(/^\s+|\s+$/g, ""))
  const out = [newHeader, ...entries].filter(Boolean).join("\n\n").trimEnd() + "\n"
  await writeFile(CSB_CONFIG, out, "utf8")

  const defaultNow = parseConfig(out).defaultBrain
  const n = targets.length
  const removedMsg = `Removed ${n} brain${n === 1 ? "" : "s"}.`
  p.outro(
    removedDefault
      ? (defaultNow ? `${removedMsg} Default brain is now ${pc.cyan(defaultNow)}.` : `${removedMsg} No brains left.`)
      : removedMsg
  )
}

async function writeConfig(brainName, brainPath, qmdPath, gitRemote) {
  const entry = [
    `[[brains]]`,
    `name = "${brainName}"`,
    `path = "${brainPath}"`,
    `qmd_index = "${qmdPath}"`,
    `created = "${new Date().toISOString().slice(0, 10)}"`,
    `git_remote = "${gitRemote}"`,
  ].join("\n")

  let existing = null
  try {
    existing = await readFile(CSB_CONFIG, "utf8")
  } catch {
    // Config doesn't exist yet — create fresh
  }

  if (!existing || !existing.trim()) {
    await writeFile(CSB_CONFIG, `default = "${brainName}"\n\n${entry}\n`, "utf8")
    return
  }

  // Upsert: remove existing entry for this brain name, then append updated entry.
  // Also migrate legacy `active = …` to `default = …` on any write.
  // If the header lacks any default/active key (e.g. user hand-edited an empty
  // file, or earlier versions of this CLI wrote entries without one), inject
  // `default = "${brainName}"` so CLI subcommands can resolve a default.
  const blocks = existing.split(/\n(?=\[\[brains\]\])/)
  let header = blocks[0].replace(/^active\s*=/m, "default =")
  if (!/^default\s*=/m.test(header)) {
    header = `default = "${brainName}"\n\n${header.trimStart()}`
  }
  const otherBrains = blocks.slice(1).filter(b => !b.includes(`name = "${brainName}"`))
  await writeFile(CSB_CONFIG, [header, ...otherBrains, entry].join("\n").trimEnd() + "\n", "utf8")
}

async function createBrain(initialName) {
  const isInteractive = Boolean(process.stdin.isTTY)

  p.intro(`${pc.bgCyan(pc.black(" claude-second-brain "))} v${version}`)

  let targetName = initialName
  if (!targetName) {
    const answer = await p.text({
      message: "Name of the brain?",
      placeholder: "my-brain",
      defaultValue: "my-brain",
    })
    if (p.isCancel(answer)) { p.cancel("Setup cancelled."); process.exit(0) }
    targetName = answer
  } else {
    p.log.step(`Name of the brain?\n${pc.dim(targetName)}`)
  }

  const toDisplayPath = p => p.startsWith(homedir()) ? "~" + p.slice(homedir().length) : p
  const qmdPath = join(CSB_ROOT, targetName, ".qmd", "index.sqlite")

  let remoteProvider = "none"
  let repoName = null
  let cfNamespace = "default"
  if (isInteractive) {
    const provider = await p.select({
      message: "Where to host the Git remote?",
      options: [
        { value: "github", label: "GitHub", hint: "default" },
        { value: "cloudflare", label: "Cloudflare Artifacts" },
        { value: "none", label: "Skip — I'll add a remote later" },
      ],
      initialValue: "github",
    })
    if (p.isCancel(provider)) { p.cancel("Setup cancelled."); process.exit(0) }
    remoteProvider = provider

    if (remoteProvider !== "none") {
      const answer = await p.text({
        message: "Repo name?",
        placeholder: targetName,
        defaultValue: targetName,
      })
      if (p.isCancel(answer)) { p.cancel("Setup cancelled."); process.exit(0) }
      repoName = answer
    }

    if (remoteProvider === "cloudflare") {
      const ns = await p.text({
        message: "Artifacts namespace?",
        placeholder: "default",
        defaultValue: "default",
      })
      if (p.isCancel(ns)) { p.cancel("Setup cancelled."); process.exit(0) }
      cfNamespace = ns
    }
  }

  await mkdir(CSB_ROOT, { recursive: true })
  const targetDir = join(CSB_ROOT, targetName)

  // Fail fast if target already exists
  try {
    await access(targetDir)
    p.cancel(`"${targetName}" already exists. Choose a different name or delete it first.`)
    process.exit(1)
  } catch {
    // Directory doesn't exist — good to go
  }

  const spin = p.spinner()

  // Scaffold
  spin.start("Scaffolding project")
  await cp(TEMPLATE, targetDir, { recursive: true })
  try {
    await rename(
      join(targetDir, ".gitignore.template"),
      join(targetDir, ".gitignore")
    )
  } catch {
    // .gitignore.template not present (e.g. running locally where npm didn't strip it)
  }
  spin.stop(`${pc.dim(toDisplayPath(targetDir))} created`)

  // Patch vault README (__BRAIN_NAME__). All other paths are resolved at
  // runtime via `claude-second-brain path` / `claude-second-brain qmd`.
  spin.start("Patching README")
  await patchVault(targetDir, targetName)
  spin.stop("README patched")

  // Install mise if not present
  if (!commandExists("mise")) {
    spin.start("Installing mise")
    const ok = run(["npm", "install", "-g", "@jdxcode/mise"])
    if (ok) spin.stop("mise installed")
    else spin.stop("Failed to install mise — run: npm install -g @jdxcode/mise", 1)
  }

  // Run mise install inside the new vault to install node + pnpm
  spin.start("Installing node + pnpm via mise")
  run(["mise", "trust"], targetDir)
  const miseOk = run(["mise", "install"], targetDir)
  if (miseOk) spin.stop("node + pnpm installed")
  else spin.stop("mise install failed — run it manually inside your vault", 1)

  // Install vault dependencies via pnpm
  spin.start("Installing vault dependencies")
  const pnpmOk = run(["mise", "exec", "--", "pnpm", "install"], targetDir)
  if (pnpmOk) spin.stop("dependencies installed")
  else spin.stop("pnpm install failed — run it manually inside your vault", 1)

  // Register qmd collections + contexts. Skip reindex — first reindex downloads
  // ~2GB of GGUF models; user runs it explicitly when ready.
  if (pnpmOk) {
    let doQmdSetup = true
    if (isInteractive) {
      const ok = await p.confirm({
        message: "Register qmd collections now? (wiki + raw-sources)",
        initialValue: true,
      })
      if (p.isCancel(ok)) { p.cancel("Setup cancelled."); process.exit(0) }
      doQmdSetup = ok
    }
    if (doQmdSetup) {
      spin.start("Registering qmd collections (wiki, raw-sources)")
      const qmdRes = runCapture(["mise", "exec", "--", "pnpm", "qmd:setup"], targetDir)
      if (qmdRes.ok) {
        spin.stop("qmd collections registered")
      } else {
        spin.stop("pnpm qmd:setup failed — run it manually inside your vault", 1)
        const tail = tailForError(qmdRes)
        if (tail) p.log.warn(`qmd:setup output:\n${tail}`)
      }
    } else {
      p.log.info("Skipped qmd:setup — run `pnpm qmd:setup` from the vault root when ready.")
    }
  }

  // Install global skills (version-aware — prompts to update when versions differ)
  spin.start("Installing global Claude skills")
  const skillResult = await installGlobalSkills({ isInteractive })
  const installedCount = skillResult.installed.length
  const skippedCount = skillResult.skipped.length
  const summary = [
    installedCount > 0 ? `installed ${installedCount}` : null,
    skippedCount > 0 ? `kept ${skippedCount}` : null,
  ].filter(Boolean).join(", ") || "already up to date"
  spin.stop(`Global skills ${summary} → ${pc.dim(toDisplayPath(join(homedir(), ".claude", "skills")))}`)

  // Git init
  spin.start("Initializing git repo")
  const gitOk = run(["git", "init"], targetDir)
  if (gitOk) {
    run(["git", "add", "."], targetDir)
    run(["git", "commit", "-m", "initial commit"], targetDir)
    spin.stop("git repo initialized")
  } else {
    spin.stop("git init failed — run it manually inside your vault", 1)
  }

  // GitHub repo (optional)
  if (remoteProvider === "github") {
    if (!commandExists("gh")) {
      p.log.warn(`gh CLI not found — install from https://cli.github.com, then run:\n  gh repo create ${repoName} --private --source=. --remote=origin --push`)
    } else {
      const authCheck = spawnSync("gh", ["auth", "status"], { stdio: "pipe" })
      let loggedIn = authCheck.status === 0

      if (!loggedIn) {
        p.log.info("Not logged in to GitHub. Starting login...")
        loggedIn = runInteractive(["gh", "auth", "login"], targetDir)
      }

      if (loggedIn) {
        spin.start(`Creating GitHub repo ${pc.dim(repoName)}`)
        const ghOk = run(
          ["gh", "repo", "create", repoName, "--private", "--source=.", "--remote=origin", "--push"],
          targetDir
        )
        if (ghOk) {
          spin.stop(`GitHub repo created (private): ${pc.cyan(repoName)}`)
        } else {
          spin.stop(`gh repo create failed — run: gh repo create ${repoName} --private --source=. --remote=origin --push`, 1)
        }
      }
    }
  }

  // Cloudflare Artifacts repo (optional)
  let gitRemote = remoteProvider === "github"
    ? (() => {
        const r = spawnSync("git", ["remote", "get-url", "origin"], { cwd: targetDir, stdio: "pipe" })
        return r.status === 0 ? r.stdout.toString().trim() : ""
      })()
    : ""
  if (remoteProvider === "cloudflare") {
    const result = await setupCloudflareRemote({ targetDir, repoName, namespace: cfNamespace, spin })
    if (result?.repoToken) {
      p.log.warn(`Save your Artifacts repo token — it expires and you'll need to mint a new one:\n  ${result.repoToken}`)
    }
    gitRemote = result?.remote || ""
  }

  // Write central config
  spin.start("Registering brain in config")
  await writeConfig(targetName, targetDir, qmdPath, gitRemote)
  spin.stop(`Config updated → ${pc.dim(toDisplayPath(CSB_CONFIG))}`)

  // Next steps
  const brainDisplayPath = toDisplayPath(targetDir)
  const remoteSteps = remoteProvider === "cloudflare"
    ? [
        `${pc.dim("# Mint a fresh git push/pull token when the current one expires:")}`,
        `${pc.cyan(`TOKEN=$(wrangler auth token)`)}`,
        `${pc.cyan(`curl -X POST https://artifacts.cloudflare.net/v1/api/namespaces/${cfNamespace}/tokens \\`)}`,
        `${pc.cyan(`  -H "Authorization: Bearer $TOKEN" \\`)}`,
        `${pc.cyan(`  -H "Content-Type: application/json" \\`)}`,
        `${pc.cyan(`  -d '{"repo":"${repoName}","scope":"write","ttl":86400}'`)}`,
      ]
    : remoteProvider === "none"
      ? [
          `${pc.cyan("git remote add origin <url>")}  connect to a remote for sync`,
          `${pc.cyan("git push -u origin main")}`,
        ]
      : []

  const nextSteps = [
    `${pc.cyan(`cd ${brainDisplayPath}`)}`,
    `${pc.cyan("pnpm qmd:reindex")}  ${pc.dim("# first run downloads ~2GB of embedding models")}`,
    `${pc.cyan("claude")}            open Claude Code and start ingesting sources`,
    ...remoteSteps,
  ].join("\n")

  p.note(nextSteps, "Next steps")
  p.outro("Happy knowledge building!")
}

async function main() {
  const [, , cmd, ...rest] = process.argv

  if (cmd === "help" || cmd === "--help" || cmd === "-h") {
    printHelp()
    return
  }
  if (cmd === "ls" || cmd === "list") {
    await listBrains()
    return
  }
  if (cmd === "rm" || cmd === "remove") {
    const names = rest.filter(a => !a.startsWith("-"))
    const yes = rest.some(a => a === "-y" || a === "--yes")
    await removeBrain(names, { yes })
    return
  }
  if (cmd === "path") {
    await cmdPath(rest)
    return
  }
  if (cmd === "qmd") {
    await cmdQmd(rest)
    return
  }
  await createBrain(cmd)
}

main().catch(err => {
  p.cancel(err.message)
  process.exit(1)
})
