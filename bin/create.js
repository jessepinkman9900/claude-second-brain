#!/usr/bin/env node
import { cp, rename, access, readFile, writeFile, mkdir, rm } from "fs/promises"
import { readFileSync, readdirSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { spawn, spawnSync } from "child_process"
import { homedir } from "os"
import * as p from "@clack/prompts"
import pc from "picocolors"
import {
  AGENTS, AGENT_IDS, CANONICAL_GLOBAL_DIR, detectAgents,
  installProjectSkills, linkGlobalSkill, parseAgentFlags, resolveAgents, writeCanonicalSkill,
} from "./agents.js"

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

// Async variant for long-running steps: doesn't block the event loop, so the
// spinner keeps animating. `onLine` receives each non-empty output line.
function runAsync(cmd, cwd, { onLine } = {}) {
  return new Promise(resolve => {
    let stdout = ""
    let stderr = ""
    let child
    try {
      child = spawn(cmd[0], cmd.slice(1), { cwd, stdio: ["ignore", "pipe", "pipe"] })
    } catch (err) {
      resolve({ ok: false, stdout, stderr: err.message })
      return
    }
    const feed = chunk => {
      if (!onLine) return
      for (const line of chunk.split(/\r?\n|\r/)) {
        const clean = stripAnsi(line).trim()
        if (clean) onLine(clean)
      }
    }
    child.stdout.on("data", d => { const t = d.toString(); stdout += t; feed(t) })
    child.stderr.on("data", d => { const t = d.toString(); stderr += t; feed(t) })
    child.on("error", err => resolve({ ok: false, stdout, stderr: stderr + err.message }))
    child.on("close", code => resolve({ ok: code === 0, stdout, stderr }))
  })
}

// Run a long step under the spinner, showing elapsed time and the latest
// line of output so it's obvious the CLI isn't stuck.
async function runStep(spin, label, cmd, cwd) {
  const started = Date.now()
  let last = ""
  const render = () => {
    const secs = Math.round((Date.now() - started) / 1000)
    const detail = last ? `  ${pc.dim(truncate(last, 60))}` : ""
    spin.message(`${label} ${pc.dim(`(${secs}s)`)}${detail}`)
  }
  spin.start(label)
  const timer = setInterval(render, 1000)
  try {
    const res = await runAsync(cmd, cwd, { onLine: l => { last = l } })
    return { ...res, seconds: Math.round((Date.now() - started) / 1000) }
  } finally {
    clearInterval(timer)
  }
}

// Use the pnpm already on PATH when it's recent enough (the CLI itself runs on
// Node >= 22), so a fresh scaffold doesn't download node + pnpm through mise.
function systemPnpmUsable() {
  const r = spawnSync("pnpm", ["--version"], { stdio: "pipe", encoding: "utf8" })
  if (r.status !== 0) return false
  const major = parseInt((r.stdout || "").trim().split(".")[0], 10)
  return major >= 10 && parseInt(process.versions.node.split(".")[0], 10) >= 22
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

// Spinner wrapper: clack redraws the spinner line in place, which breaks into
// one new line per frame if the message wraps past the terminal width. Clamp
// every start/message to a single line that fits.
function fitLine(msg) {
  const max = Math.max(20, (process.stdout.columns || 80) - 6)
  const oneLine = String(msg).replace(/\s*\n\s*/g, " ")
  const plain = stripAnsi(oneLine)
  return plain.length > max ? plain.slice(0, max - 1) + "…" : oneLine
}
function makeSpinner() {
  const spin = p.spinner()
  return {
    start: msg => spin.start(fitLine(msg)),
    message: msg => spin.message(fitLine(msg)),
    stop: (msg, code) => spin.stop(msg, code),
  }
}

function truncate(s, n = 80) {
  if (!s) return ""
  return s.length > n ? s.slice(0, n) + "…" : s
}

// End-to-end Cloudflare Artifacts setup: auth, create repo, set remote, push.
// Every failure logs the exact step, exit codes, stderr, and HTTP bodies so the
// user can see where in the flow the break happened.
// Artifacts REST API: https://developers.cloudflare.com/artifacts/api/rest-api/
// Routes are account-scoped under the standard Cloudflare v4 API. (The
// artifacts.cloudflare.net/v1/api host from the beta announcement rejects
// wrangler OAuth tokens with 403 / code 10002.)
const CF_API = "https://api.cloudflare.com/client/v4"
function artifactsBase(accountId, namespace) {
  return `${CF_API}/accounts/${accountId}/artifacts/namespaces/${namespace}`
}

// Account ID from a repo remote like https://<ACCOUNT_ID>.artifacts.cloudflare.net/git/<ns>/<repo>.git
function accountIdFromRemote(url) {
  const m = (url || "").match(/^https?:\/\/([0-9a-f]{32})\.artifacts\.cloudflare\.net\//i)
  return m ? m[1] : null
}

// Resolve the Cloudflare account to create the repo in:
// CLOUDFLARE_ACCOUNT_ID, else the token's only account, else ask.
async function resolveCloudflareAccountId(token, { interactive = false } = {}) {
  const fromEnv = process.env.CLOUDFLARE_ACCOUNT_ID?.trim()
  if (fromEnv) return { id: fromEnv }
  let data
  try {
    const res = await fetch(`${CF_API}/accounts?per_page=50`, { headers: { Authorization: `Bearer ${token}` } })
    data = await res.json()
    if (!res.ok || !data?.success) {
      return { error: `listing accounts failed (HTTP ${res.status}): ${data?.errors?.[0]?.message || "unknown error"}` }
    }
  } catch (err) {
    return { error: `listing accounts failed: ${err.message}` }
  }
  const accounts = data.result || []
  if (accounts.length === 0) return { error: "this token can't see any Cloudflare accounts" }
  if (accounts.length === 1) return { id: accounts[0].id, name: accounts[0].name }
  if (!interactive) {
    return { error: `token can access ${accounts.length} accounts — set CLOUDFLARE_ACCOUNT_ID to pick one` }
  }
  const picked = await p.select({
    message: "Which Cloudflare account?",
    options: accounts.map(a => ({ value: a.id, label: a.name, hint: a.id })),
  })
  if (p.isCancel(picked)) return { error: "no account selected" }
  return { id: picked, name: accounts.find(a => a.id === picked)?.name }
}

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

  const account = await resolveCloudflareAccountId(cfApiToken, { interactive: Boolean(process.stdin.isTTY) })
  if (!account.id) {
    p.log.warn(`Could not determine your Cloudflare account: ${account.error}`)
    return null
  }
  const baseUrl = artifactsBase(account.id, namespace)
  p.log.info(`Artifacts API: ${pc.dim(baseUrl)}`)
  spin.start(`Creating Cloudflare Artifact ${pc.dim(repoName)}`)

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
    if (res.status === 401 || res.status === 403) {
      p.log.warn([
        "Check that:",
        `  • Artifacts is enabled for account ${account.name ? `"${account.name}" ` : ""}(${account.id}) — it needs the Workers Paid plan`,
        "  • your token has Artifacts > Edit (API token) or the artifacts:write scope (wrangler login)",
        "  • CLOUDFLARE_ACCOUNT_ID points at the right account, if you set it",
      ].join("\n"))
    }
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
    return { repoToken, remote, accountId: account.id, pushed: false }
  }

  spin.stop(`Cloudflare Artifact created: ${pc.cyan(repoName)}`)
  p.log.info(`Remote: ${pc.dim(remote)}`)
  return { repoToken, remote, accountId: account.id, pushed: true }
}

function parseGithubRepo(url) {
  if (!url) return null
  const m = url.match(/github\.com[:/]([^/\s]+)\/([^/\s.]+)/)
  return m ? `${m[1]}/${m[2]}` : null
}

function parseCloudflareArtifact(url) {
  if (!url || !/artifacts\.cloudflare/.test(url)) return null
  const accountId = accountIdFromRemote(url)
  const explicit = url.match(/namespaces\/([^/]+)\/repos\/([^/.]+)/)
  if (explicit) return { namespace: explicit[1], repo: explicit[2], accountId }
  const parts = url.replace(/\.git$/, "").split("/").filter(Boolean)
  if (parts.length >= 2) return { namespace: parts[parts.length - 2], repo: parts[parts.length - 1], accountId }
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

async function deleteCloudflareArtifact({ namespace, repo, accountId }) {
  const auth = await resolveCloudflareToken()
  if (!auth) return { ok: false, error: "no Cloudflare API token (set CLOUDFLARE_API_TOKEN or run `wrangler login`)" }
  if (!accountId) {
    const account = await resolveCloudflareAccountId(auth.token, { interactive: Boolean(process.stdin.isTTY) })
    if (!account.id) return { ok: false, error: account.error }
    accountId = account.id
  }
  try {
    const res = await fetch(`${artifactsBase(accountId, namespace)}/repos/${repo}`, {
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
// Vault-local skills: every template skill that isn't global.
const LOCAL_SKILLS = readdirSync(join(TEMPLATE, ".claude", "skills"), { withFileTypes: true })
  .filter(d => d.isDirectory() && !GLOBAL_SKILLS.includes(d.name))
  .map(d => d.name)
const CANONICAL_PROJECT_DIR_LABEL = ".agents/skills (project) and ~/.agents/skills (global)"

async function readSkillVersion(skillDir) {
  try {
    const raw = await readFile(join(skillDir, ".csb-version"), "utf8")
    return JSON.parse(raw).version || null
  } catch {
    return null
  }
}

// Installed version of a global skill: the canonical ~/.agents/skills copy,
// falling back to a legacy ~/.claude/skills copy from releases before
// multi-agent install.
async function readInstalledGlobalVersion(name) {
  return (await readSkillVersion(join(CANONICAL_GLOBAL_DIR, name)))
    || (await readSkillVersion(join(homedir(), ".claude", "skills", name)))
}

// Decide whether to (re)install each global skill. Returns a map name→"install"|"skip".
// Interactive mismatch prompts once per run with update-all / skip-all / ask-per-skill.
async function planGlobalSkillInstall({ isInteractive }) {
  const decisions = {}
  const mismatches = []

  for (const name of GLOBAL_SKILLS) {
    const installed = await readInstalledGlobalVersion(name)
    const hasCanonical = await readSkillVersion(join(CANONICAL_GLOBAL_DIR, name))
    if (!installed) {
      decisions[name] = "install"
    } else if (installed === version) {
      // Same version but only a legacy copy exists: migrate to the canonical dir.
      decisions[name] = hasCanonical ? "skip" : "install"
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

// Install the global skills for each selected agent, the way `npx skills` does:
// one real copy in ~/.agents/skills/<name>, then a symlink (or copy, with
// --copy or when symlinks fail) in every agent's own global skills dir.
// Universal agents (Codex, Cursor, Copilot, …) read ~/.agents/skills directly.
async function installGlobalSkills({ isInteractive, agents, copy = false }) {
  const decisions = await planGlobalSkillInstall({ isInteractive })

  const installed = []
  const skipped = []
  const sameVersion = []
  const links = []

  for (const name of GLOBAL_SKILLS) {
    const decision = decisions[name]
    const canonical = join(CANONICAL_GLOBAL_DIR, name)

    if (decision === "skip") {
      // Differentiate "already at this version" from "user declined update" for logging.
      const current = await readInstalledGlobalVersion(name)
      if (current === version) sameVersion.push(name)
      else skipped.push(name)
      // A declined update with only a legacy copy: leave everything untouched.
      if (!(await readSkillVersion(canonical))) continue
    } else {
      const content = await readFile(join(TEMPLATE, ".claude/skills", name, "SKILL.md"), "utf8")
      await writeCanonicalSkill(name, {
        "SKILL.md": content,
        ".csb-version": JSON.stringify({ version, installed: new Date().toISOString() }, null, 2) + "\n",
      })
      installed.push(name)
    }

    // (Re)link for every selected agent — idempotent, so newly added agents
    // pick up skills even when the canonical copy is already current.
    for (const id of agents) {
      links.push({ name, ...(await linkGlobalSkill(id, name, { copy })) })
    }
  }

  return { installed, skipped, sameVersion, links }
}

function summarizeAgentInstall(agents, links, toDisplayPath) {
  return agents.map(id => {
    const own = links.filter(l => l.agent === id)
    const mode = own.some(l => l.mode === "copy") ? "copy"
      : own.some(l => l.mode === "symlink") ? "symlink" : "canonical"
    const where = mode === "canonical"
      ? toDisplayPath(CANONICAL_GLOBAL_DIR)
      : toDisplayPath(dirname(own[0]?.path || ""))
    return `  ${AGENTS[id].displayName.padEnd(15)} ${pc.dim(`${where}${mode === "canonical" ? "" : ` (${mode})`}`)}`
  }).join("\n")
}

// "Next steps" lines for the agents the user picked: how to open each one in
// the vault. Agents without a CLI get an "open this folder in …" hint.
function agentLaunchSteps(agents) {
  const lines = agents.map(id => {
    const { launch, displayName } = AGENTS[id]
    return launch?.cmd
      ? `${pc.cyan(launch.cmd.padEnd(16))}  open ${displayName} and start ingesting sources`
      : `${pc.dim("# ")}open this folder in ${launch?.app || displayName}${displayName !== launch?.app && launch?.app ? ` (${displayName})` : ""}`
  })
  return lines.length ? lines : [`${pc.cyan("claude".padEnd(16))}  open Claude Code and start ingesting sources`]
}

// Mint a repo-scoped Artifacts git token and store it as an http.extraHeader
// for that remote in the brain's .git/config (local only, never committed),
// so plain `git push` / `git pull` work until it expires.
async function mintArtifactsGitToken({ remote, cwd, ttl = 86400, scope = "write", interactive = false }) {
  const parsed = parseCloudflareArtifact(remote)
  if (!parsed) return { ok: false, error: `not a Cloudflare Artifacts remote: ${remote || "(none)"}` }
  const auth = await resolveCloudflareToken()
  if (!auth) return { ok: false, error: "no Cloudflare credentials — run `wrangler login` or set CLOUDFLARE_API_TOKEN" }
  let accountId = parsed.accountId
  if (!accountId) {
    const account = await resolveCloudflareAccountId(auth.token, { interactive })
    if (!account.id) return { ok: false, error: account.error }
    accountId = account.id
  }
  let data
  try {
    const res = await fetch(`${artifactsBase(accountId, parsed.namespace)}/tokens`, {
      method: "POST",
      headers: { Authorization: `Bearer ${auth.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ repo: parsed.repo, scope, ttl }),
    })
    data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.success) {
      return { ok: false, error: `Artifacts API (HTTP ${res.status}): ${data?.errors?.[0]?.message || "unknown error"}` }
    }
  } catch (err) {
    return { ok: false, error: err.message }
  }
  const token = data.result?.plaintext || data.result?.token
  if (!token) return { ok: false, error: "Artifacts API response had no token" }
  const expiresAt = data.result?.expires_at || null
  if (cwd) setGitAuthHeader(cwd, remote, token)
  return { ok: true, token, expiresAt, ...parsed, accountId }
}

function setGitAuthHeader(cwd, remote, token) {
  const key = `http.${remote}.extraHeader`
  spawnSync("git", ["config", "--local", "--unset-all", key], { cwd, stdio: "pipe" })
  const r = spawnSync("git", ["config", "--local", "--add", key, `Authorization: Bearer ${token}`], { cwd, stdio: "pipe" })
  return r.status === 0
}

// `csb git-token [--brain <name>] [--ttl <seconds>] [--read] [--print]`
async function cmdGitToken(args) {
  let brainName = null
  let ttl = 86400
  let scope = "write"
  let printOnly = false
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === "--brain") brainName = args[++i]
    else if (a === "--ttl") ttl = parseInt(args[++i], 10)
    else if (a === "--read") scope = "read"
    else if (a === "--print") printOnly = true
    else if (!a.startsWith("-") && !brainName) brainName = a
    else throw new Error(`Unknown option: ${a}. Run \`csb git-token --help\`.`)
  }
  if (!Number.isFinite(ttl) || ttl <= 0) throw new Error("--ttl must be a positive number of seconds")
  const brain = await resolveBrain(brainName)
  let remote = brain.git_remote
  if (!remote) {
    const r = spawnSync("git", ["remote", "get-url", "origin"], { cwd: brain.path, stdio: "pipe", encoding: "utf8" })
    remote = r.status === 0 ? r.stdout.trim() : ""
  }
  const result = await mintArtifactsGitToken({
    remote, cwd: printOnly ? null : brain.path, ttl, scope, interactive: Boolean(process.stdin.isTTY),
  })
  if (!result.ok) throw new Error(`Could not mint a git token for "${brain.name}": ${result.error}`)
  if (printOnly) {
    process.stdout.write(result.token + "\n")
    return
  }
  const until = result.expiresAt ? new Date(result.expiresAt).toLocaleString() : `${Math.round(ttl / 3600)}h from now`
  console.log(`${pc.green("✓")} ${scope} token for ${pc.cyan(`${result.namespace}/${result.repo}`)} saved to ${pc.dim(`${brain.path}/.git/config`)} — git push/pull work until ${until}.`)
}

function globalSkillSummary({ installed, skipped }) {
  return [
    installed.length > 0 ? `installed ${installed.length}` : null,
    skipped.length > 0 ? `kept ${skipped.length}` : null,
  ].filter(Boolean).join(", ") || "already up to date"
}

// `csb skills [--agent <ids>] [--copy] [--brain <name>] [--list]`
// Install / update the global skills for more agents without creating a brain,
// and copy the vault-local skills into the brain for agents that need them.
async function cmdSkills(args) {
  const { agents: explicit, copy, rest } = parseAgentFlags(args)
  const toDisplayPath = p => p && p.startsWith(homedir()) ? "~" + p.slice(homedir().length) : p

  if (rest.includes("--list") || rest[0] === "ls" || rest[0] === "list") {
    const detected = detectAgents()
    const lines = AGENT_IDS.map(id => {
      const a = AGENTS[id]
      const global = a.globalSkillsDir ? toDisplayPath(a.globalSkillsDir) : `${toDisplayPath(CANONICAL_GLOBAL_DIR)} (shared)`
      const mark = detected.includes(id) ? pc.green("●") : pc.dim("○")
      return `${mark} ${id.padEnd(15)} ${pc.dim(`project: ${a.skillsDir.padEnd(17)} global: ${global}`)}`
    })
    console.log(lines.join("\n"))
    console.log(pc.dim(`\n● detected on this machine. Universal agents read ${CANONICAL_PROJECT_DIR_LABEL} directly.`))
    return
  }

  let brainName = null
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "--brain") brainName = rest[++i]
  }

  const isInteractive = Boolean(process.stdin.isTTY)
  p.intro(`${pc.bgCyan(pc.black(" csb skills "))} v${version}`)
  const agents = await resolveAgents({ explicit, isInteractive, prompts: p })
  if (!agents) { p.cancel("Cancelled."); process.exit(0) }

  const spin = makeSpinner()
  spin.start("Installing global skills")
  const result = await installGlobalSkills({ isInteractive, agents, copy })
  spin.stop(`Global skills ${globalSkillSummary(result)}`)
  p.log.message(summarizeAgentInstall(agents, result.links, toDisplayPath))

  let brain = null
  try { brain = await resolveBrain(brainName) } catch (err) {
    if (brainName) throw err
  }
  if (brain) {
    try {
      await access(join(brain.path, ".claude", "skills"))
      const dirs = await installProjectSkills(brain.path, join(brain.path, ".claude", "skills"), LOCAL_SKILLS, agents)
      if (dirs.length > 0) {
        p.log.step(`Vault skills for ${pc.cyan(brain.name)} copied to ${dirs.map(d => pc.dim(d)).join(", ")} — commit them in the vault to sync.`)
      }
    } catch {
      p.log.warn(`No .claude/skills in ${toDisplayPath(brain.path)} — skipped vault skills.`)
    }
  }
  p.outro("done")
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

function hasHelpFlag(args) {
  return args.some(a => a === "--help" || a === "-h")
}

async function readConfigStatus() {
  try {
    const content = await readFile(CSB_CONFIG, "utf8")
    const { defaultBrain, brains } = parseConfig(content)
    return { defaultBrain, brains }
  } catch {
    return { defaultBrain: null, brains: [] }
  }
}

function printHelp(topic = "top") {
  const c = pc.cyan
  const topics = {
    top: async () => {
      const { defaultBrain, brains } = await readConfigStatus()
      const lines = [
        `${pc.bold("claude-second-brain")} v${version}  ${pc.dim("(alias: csb)")}`,
        "",
        "Usage:",
        `  ${c("csb")}                              create a new brain (interactive)`,
        `  ${c("csb <name>")}                       create a new brain named <name>`,
        `  ${c("csb ls")}                           list all brains (default marked with *)`,
        `  ${c("csb use <name>")}                   set the default brain`,
        `  ${c("csb rm [<name>…]")}                 remove brains + their folders`,
        `  ${c("csb path [qmd|config|root]")}       print a path (default: root)`,
        `  ${c("csb qmd [--brain N] <qmd args…>")}  run qmd against the resolved brain`,
        `  ${c("csb exec [--brain N] -- <cmd…>")}   run a command inside the resolved brain`,
        `  ${c("csb skills [--agent <ids>]")}       install/update skills for more agents`,
        `  ${c("csb git-token [<name>]")}           renew a Cloudflare Artifacts git token`,
        `  ${c("csb doctor")}                       verify your setup and suggest fixes`,
        `  ${c("csb help [<command>]")}             show help for a command`,
        "",
        "Create options:",
        `  ${c("--agent <ids>")}   agents to install skills for (comma-separated, or \`all\`)`,
        `  ${c("--copy")}          copy skills into each agent dir instead of symlinking`,
        "",
        "Examples:",
        `  ${c('csb qmd query -c wiki "distributed systems"')}`,
        `  ${c("csb path qmd")}`,
        `  ${c("csb use work")}`,
        `  ${c("csb exec -- pnpm qmd:reindex")}`,
        "",
        `Config: ${pc.dim(CSB_CONFIG)}`,
        brains.length === 0
          ? pc.dim("No brains registered yet.")
          : `Default brain: ${defaultBrain ? pc.cyan(defaultBrain) : pc.yellow("(none set — run `csb use <name>`)")}  ${pc.dim(`(${brains.length} registered)`)}`,
      ]
      console.log(lines.join("\n"))
    },
    path: () => console.log([
      `${pc.bold("csb path")} — print a path for the default (or named) brain`,
      "",
      "Usage:",
      `  ${c("csb path [qmd|config|root] [--brain <name>]")}`,
      "",
      "Positional (canonical):",
      `  ${c("root")}    the brain's directory (default)`,
      `  ${c("qmd")}     the brain's qmd SQLite index`,
      `  ${c("config")}  the central config.toml`,
      "",
      "Flags:",
      `  ${c("--brain <name>")}  target a specific brain instead of the default`,
      `  ${c("--root | --qmd | --config")}  ${pc.dim("(deprecated — use positional form)")}`,
    ].join("\n")),
    qmd: () => console.log([
      `${pc.bold("csb qmd")} — run qmd against the default (or named) brain`,
      "",
      "Usage:",
      `  ${c("csb qmd [--brain <name>] [--] <qmd args…>")}`,
      "",
      `${pc.dim("`--` is optional; use it only to pass a literal `--brain` through to qmd.")}`,
      "",
      "Examples:",
      `  ${c('csb qmd query -c wiki "kafka"')}`,
      `  ${c("csb qmd --brain work search -c wiki kafka")}`,
    ].join("\n")),
    exec: () => console.log([
      `${pc.bold("csb exec")} — run a command inside the resolved brain's directory`,
      "",
      "Usage:",
      `  ${c("csb exec [--brain <name>] -- <cmd…>")}`,
      "",
      `Sets ${c("INDEX_PATH")} to the brain's qmd index and ${c("cwd")} to the brain's root.`,
      "",
      "Examples:",
      `  ${c("csb exec -- pnpm qmd:reindex")}`,
      `  ${c("csb exec --brain work -- git status")}`,
    ].join("\n")),
    use: () => console.log([
      `${pc.bold("csb use")} — set the default brain`,
      "",
      "Usage:",
      `  ${c("csb use <name>")}           ${pc.dim("(aliases: default, switch)")}`,
      "",
      "Rewrites the `default = …` line in config.toml. Affects every command that resolves the default brain (path, qmd, exec, global skills).",
    ].join("\n")),
    rm: () => console.log([
      `${pc.bold("csb rm")} — remove one or more brains`,
      "",
      "Usage:",
      `  ${c("csb rm [<name>…] [-y|--yes] [--delete-remote|--keep-remote]")}  ${pc.dim("(alias: remove)")}`,
      "",
      "Flags:",
      `  ${c("-y, --yes")}         skip the confirmation prompt`,
      `  ${c("--delete-remote")}   also delete GitHub/Cloudflare remotes (no prompt)`,
      `  ${c("--keep-remote")}     keep remotes (no prompt)`,
      "",
      `${pc.dim("With -y and no remote flag, remotes are preserved (safe default).")}`,
      `${pc.dim("Without -y and no remote flag, you'll be prompted per brain.")}`,
    ].join("\n")),
    ls: () => console.log([
      `${pc.bold("csb ls")} — list all brains  ${pc.dim("(alias: list)")}`,
      "",
      "Prints each registered brain with its path, creation date, and remote.",
      "The default brain is shown in bold with a `*` marker.",
    ].join("\n")),
    skills: () => console.log([
      `${pc.bold("csb skills")} — install or update the wiki skills for any agent`,
      "",
      "Usage:",
      `  ${c("csb skills [--agent <ids>] [--copy] [--brain <name>]")}`,
      `  ${c("csb skills --list")}   list supported agents and their skills dirs`,
      "",
      "Global skills (brain-ingest, brain-search, brain-refresh) are written once to",
      `${pc.dim("~/.agents/skills/<name>")} and symlinked into each agent's own global skills dir`,
      `(e.g. ${pc.dim("~/.claude/skills")}). Codex, Cursor, Copilot, Gemini CLI, OpenCode, Amp and Cline`,
      `read ${pc.dim("~/.agents/skills")} directly. Vault-local skills (lint, brain-rebuild) are copied`,
      "into the default brain's per-agent skills dir (e.g. .agents/skills).",
      "",
      "Options:",
      `  ${c("--agent, -a <ids>")}  agents to install for, comma-separated, or \`all\``,
      `                      ${pc.dim(`(default: claude-code + detected; env: CSB_AGENTS)`)}`,
      `  ${c("--copy")}             copy instead of symlink`,
      `  ${c("--brain <name>")}     brain whose vault-local skills to update (default brain otherwise)`,
      "",
      `Agents: ${pc.dim(AGENT_IDS.join(", "))}`,
    ].join("\n")),
    "git-token": () => console.log([
      `${pc.bold("csb git-token")} — renew the git token for a Cloudflare Artifacts brain`,
      "",
      "Usage:",
      `  ${c("csb git-token [<name>] [--ttl <seconds>] [--read] [--print]")}`,
      "",
      "Artifacts git tokens are short-lived (24h by default). This mints a new one with",
      "your wrangler login (or CLOUDFLARE_API_TOKEN) and stores it as an http.extraHeader",
      "for the brain's remote in its .git/config, so plain `git push` / `git pull` work.",
      "",
      "Options:",
      `  ${c("--brain <name>")}   brain to renew (default: the default brain; also positional)`,
      `  ${c("--ttl <seconds>")}  token lifetime (default 86400)`,
      `  ${c("--read")}           read-only token instead of write`,
      `  ${c("--print")}          print the token instead of saving it to .git/config`,
    ].join("\n")),
    doctor: () => console.log([
      `${pc.bold("csb doctor")} — verify your setup and suggest fixes`,
      "",
      "Checks required and optional tools (gh, mise, pnpm, wrangler),",
      "the central config, each registered brain's path, and its qmd index.",
      "Prints a `Fix:` hint under each failing check.",
    ].join("\n")),
  }
  const renderer = topics[topic] || topics.top
  const out = renderer()
  if (out && typeof out.then === "function") return out
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
      ? `Quick fix: \`csb use <name>\` (available: ${available}), or pass --brain <name>.`
      : `Run \`csb <name>\` to create your first brain.`
    throw new Error(`No default brain set in config.toml. ${hint}`)
  }
  const entry = brains.find(b => b.name === target)
  if (!entry) {
    const available = brains.map(b => b.name).join(", ") || "(none)"
    throw new Error(`No brain named "${target}". Available: ${available}. Run \`claude-second-brain ls\` to list brains.`)
  }
  return entry
}

// Rewrites config.toml so `name` is the new default. Returns {previous, current}.
// Strips any existing `active = …` / `default = …` line from the header first.
async function setDefaultBrain(name) {
  let content
  try {
    content = await readFile(CSB_CONFIG, "utf8")
  } catch {
    throw new Error(`No config at ${CSB_CONFIG}. Run \`csb <name>\` to create your first brain.`)
  }
  const { defaultBrain, brains, header } = parseConfig(content)
  if (!brains.find(b => b.name === name)) {
    const available = brains.map(b => b.name).join(", ") || "(none)"
    throw new Error(`No brain named "${name}". Available: ${available}.`)
  }
  if (defaultBrain === name) {
    return { previous: name, current: name, changed: false }
  }
  const blocks = content.split(/\n(?=\[\[brains\]\])/)
  let newHeader = (blocks[0] || "")
    .replace(/^active\s*=\s*"[^"]*"\s*\n?/m, "")
    .replace(/^default\s*=\s*"[^"]*"\s*\n?/m, "")
    .replace(/^\s+|\s+$/g, "")
  newHeader = `default = "${name}"${newHeader ? "\n" + newHeader : ""}`
  const entries = blocks.slice(1).map(b => b.replace(/^\s+|\s+$/g, ""))
  const out = [newHeader, ...entries].filter(Boolean).join("\n\n").trimEnd() + "\n"
  await writeFile(CSB_CONFIG, out, "utf8")
  return { previous: defaultBrain, current: name, changed: true }
}

async function cmdUse(args) {
  const name = args.find(a => !a.startsWith("-"))
  if (!name) {
    throw new Error("Usage: csb use <name>")
  }
  const { previous, current, changed } = await setDefaultBrain(name)
  if (!changed) {
    console.log(`default is already ${pc.cyan(current)}`)
    return
  }
  if (previous) {
    console.log(`default: ${pc.dim(previous)} → ${pc.cyan(current)}`)
  } else {
    console.log(`default set to ${pc.cyan(current)}`)
  }
}

async function cmdPath(args) {
  // Canonical:  csb path [qmd|config|root] [--brain <name>]
  // Deprecated: csb path --qmd | --config | --root
  let name = null
  let mode = null
  let sawLegacyFlag = false
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === "--brain") { name = args[++i]; continue }
    if (a === "--root")   { mode = "root";   sawLegacyFlag = true; continue }
    if (a === "--qmd")    { mode = "qmd";    sawLegacyFlag = true; continue }
    if (a === "--config") { mode = "config"; sawLegacyFlag = true; continue }
    if (a === "root" || a === "qmd" || a === "config") { mode = a; continue }
    throw new Error(`Unknown path arg: ${a}. Run \`csb help path\` for usage.`)
  }
  if (!mode) mode = "root"
  if (sawLegacyFlag) {
    process.stderr.write(`${pc.yellow("warning:")} \`--${mode}\` is deprecated — use \`csb path ${mode}\` instead.\n`)
  }
  if (mode === "config") {
    process.stdout.write(CSB_CONFIG + "\n")
    return
  }
  const brain = await resolveBrain(name)
  const out = mode === "qmd" ? brain.qmd_index : brain.path
  process.stdout.write(out + "\n")
}

// Parse [--brain <name>] [--] <rest…>. `--` is optional; use it only to pass a
// literal `--brain` through to the inner command.
function parseBrainAndRest(args) {
  let name = null
  const rest = []
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === "--brain") { name = args[++i]; continue }
    if (a === "--") { rest.push(...args.slice(i + 1)); break }
    rest.push(a)
  }
  return { name, rest }
}

async function runInBrain(brain, cmd) {
  if (cmd.length === 0) {
    throw new Error("No command to run. Usage: csb exec [--brain <name>] -- <cmd…>")
  }
  const result = spawnSync(cmd[0], cmd.slice(1), {
    cwd: brain.path,
    stdio: "inherit",
    env: { ...process.env, INDEX_PATH: brain.qmd_index },
  })
  process.exit(result.status ?? 1)
}

async function cmdQmd(args) {
  const { name, rest } = parseBrainAndRest(args)
  const brain = await resolveBrain(name)
  await runInBrain(brain, ["npx", "-y", "@tobilu/qmd", ...rest])
}

async function cmdExec(args) {
  const { name, rest } = parseBrainAndRest(args)
  const brain = await resolveBrain(name)
  await runInBrain(brain, rest)
}

async function cmdDoctor() {
  const toDisplayPath = p => p && p.startsWith(homedir()) ? "~" + p.slice(homedir().length) : p
  const ok = s => `  ${pc.green("✓")} ${s}`
  const warn = (s, fix) => `  ${pc.yellow("⚠")} ${s}${fix ? `\n    ${pc.dim("Fix:")} ${fix}` : ""}`
  const fail = (s, fix) => `  ${pc.red("✗")} ${s}${fix ? `\n    ${pc.dim("Fix:")} ${fix}` : ""}`
  const lines = []
  let failures = 0
  let warnings = 0

  p.intro(`${pc.bgCyan(pc.black(" csb doctor "))} v${version}`)

  // Tools
  lines.push(pc.bold("Tools"))
  lines.push(commandExists("gh")
    ? ok("gh (GitHub CLI) installed")
    : (warnings++, warn("gh (GitHub CLI) not installed — required for GitHub remotes", "brew install gh  |  https://cli.github.com")))
  if (commandExists("gh")) {
    const auth = spawnSync("gh", ["auth", "status"], { stdio: "pipe" })
    lines.push(auth.status === 0
      ? ok("gh authenticated")
      : (warnings++, warn("gh is installed but not authenticated", "gh auth login")))
  }
  lines.push(commandExists("mise")
    ? ok("mise installed")
    : systemPnpmUsable()
      ? ok("mise not installed — using system node + pnpm instead")
      : (failures++, fail("neither mise nor pnpm >= 10 installed — one is required for scaffolded vaults", "npm install -g pnpm  |  npm install -g @jdxcode/mise")))
  lines.push(commandExists("wrangler") || commandExists("npx")
    ? ok(commandExists("wrangler") ? "wrangler installed" : "wrangler available via npx (optional — for Cloudflare Artifacts)")
    : (warnings++, warn("wrangler not installed — required only for Cloudflare Artifacts remotes", "npm install -g wrangler")))

  // Config
  lines.push("")
  lines.push(pc.bold("Config"))
  let parsed = null
  try {
    const content = await readFile(CSB_CONFIG, "utf8")
    parsed = parseConfig(content)
    lines.push(ok(`config readable at ${pc.dim(toDisplayPath(CSB_CONFIG))}`))
  } catch {
    failures++
    lines.push(fail(`no config at ${toDisplayPath(CSB_CONFIG)}`, "csb <name>  # create your first brain"))
  }

  if (parsed) {
    if (parsed.brains.length === 0) {
      warnings++
      lines.push(warn("no brains registered", "csb <name>  # create your first brain"))
    } else {
      lines.push(ok(`${parsed.brains.length} brain${parsed.brains.length === 1 ? "" : "s"} registered`))
      if (parsed.defaultBrain) {
        const entry = parsed.brains.find(b => b.name === parsed.defaultBrain)
        if (entry) {
          lines.push(ok(`default brain: ${pc.cyan(parsed.defaultBrain)}`))
        } else {
          failures++
          lines.push(fail(`default brain "${parsed.defaultBrain}" is not registered`, `csb use <name>  # pick one of: ${parsed.brains.map(b => b.name).join(", ")}`))
        }
      } else {
        warnings++
        lines.push(warn("no default brain set", `csb use <name>  # pick one of: ${parsed.brains.map(b => b.name).join(", ")}`))
      }
    }

    // Per-brain checks
    if (parsed.brains.length > 0) {
      lines.push("")
      lines.push(pc.bold("Brains"))
      for (const b of parsed.brains) {
        lines.push(pc.cyan(b.name))
        try {
          await access(b.path)
          lines.push(ok(`path exists: ${pc.dim(toDisplayPath(b.path))}`))
        } catch {
          failures++
          lines.push(fail(`path missing: ${toDisplayPath(b.path)}`, `csb rm ${b.name}  # drop the dead entry, then recreate`))
        }
        try {
          await access(b.qmd_index)
          lines.push(ok(`qmd index exists: ${pc.dim(toDisplayPath(b.qmd_index))}`))
        } catch {
          warnings++
          lines.push(warn(`qmd index missing: ${toDisplayPath(b.qmd_index)}`, `csb exec --brain ${b.name} -- pnpm qmd:reindex`))
        }
      }
    }
  }

  // Global skills
  lines.push("")
  lines.push(pc.bold("Skills"))
  for (const name of GLOBAL_SKILLS) {
    const canonical = join(CANONICAL_GLOBAL_DIR, name)
    const v = await readSkillVersion(canonical)
    if (!v) {
      const legacy = await readSkillVersion(join(homedir(), ".claude", "skills", name))
      warnings++
      lines.push(legacy
        ? warn(`${name} only in ~/.claude/skills (v${legacy}) — other agents can't see it`, "csb skills")
        : warn(`${name} not installed in ${toDisplayPath(CANONICAL_GLOBAL_DIR)}`, "csb skills"))
    } else if (v !== version) {
      warnings++
      lines.push(warn(`${name} is v${v} (this release is v${version})`, "csb skills"))
    } else {
      lines.push(ok(`${name} v${v} ${pc.dim(toDisplayPath(canonical))}`))
    }
  }

  p.note(lines.join("\n"), "Checks")

  if (failures > 0) {
    p.outro(`${pc.red(`${failures} failure${failures === 1 ? "" : "s"}`)}${warnings > 0 ? `, ${pc.yellow(`${warnings} warning${warnings === 1 ? "" : "s"}`)}` : ""}`)
    process.exit(1)
  }
  if (warnings > 0) {
    p.outro(`${pc.yellow(`${warnings} warning${warnings === 1 ? "" : "s"}`)}`)
    return
  }
  p.outro(pc.green("all checks passed"))
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

async function removeBrain(names, { yes = false, remoteMode = "ask" } = {}) {
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

  // Decide per-target whether to also delete the remote.
  //   remoteMode === "keep"    → never delete remotes
  //   remoteMode === "delete"  → always delete remotes (no prompt)
  //   remoteMode === "ask"     → default: prompt unless -y (then keep)
  const remoteDecisions = new Map()
  const resolvedRemoteMode =
    remoteMode === "keep" ? "keep"
      : remoteMode === "delete" ? "delete"
        : yes ? "keep" : "ask"

  if (resolvedRemoteMode !== "keep") {
    for (const target of targets) {
      const gh = parseGithubRepo(target.git_remote)
      const cf = parseCloudflareArtifact(target.git_remote)
      if (!gh && !cf) continue
      if (resolvedRemoteMode === "delete") {
        remoteDecisions.set(target.name, gh
          ? { kind: "github", slug: gh }
          : { kind: "cloudflare", namespace: cf.namespace, repo: cf.repo })
        continue
      }
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

  const spin = makeSpinner()

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
        p.log.warn(`Delete it manually:\n  ${pc.cyan(`TOKEN=$(wrangler auth token)`)}\n  ${pc.cyan(`curl -X DELETE https://api.cloudflare.com/client/v4/accounts/${decision.accountId || "<ACCOUNT_ID>"}/artifacts/namespaces/${decision.namespace}/repos/${decision.repo} \\`)}\n  ${pc.cyan(`  -H "Authorization: Bearer $TOKEN"`)}`)
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

async function createBrain(initialName, { agents: explicitAgents = null, copy = false } = {}) {
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
        { value: "github", label: "🐱  GitHub", hint: "private repo via gh · default" },
        { value: "cloudflare", label: "⛅  Cloudflare Artifacts", hint: "git remote via wrangler" },
        { value: "none", label: "📁  Skip — I'll add a remote later", hint: "local git only" },
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

  // Ask every question before the slow steps, so setup can run unattended.
  let doQmdSetup = true
  if (isInteractive) {
    const ok = await p.confirm({
      message: "Register qmd collections after install? (wiki + raw-sources)",
      initialValue: true,
    })
    if (p.isCancel(ok)) { p.cancel("Setup cancelled."); process.exit(0) }
    doQmdSetup = ok
  }

  const agents = await resolveAgents({ explicit: explicitAgents, isInteractive, prompts: p })
  if (!agents) { p.cancel("Setup cancelled."); process.exit(0) }
  if (!isInteractive || explicitAgents) {
    p.log.step(`Install skills for which agents?\n${pc.dim(agents.map(id => AGENTS[id].displayName).join(", "))}`)
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

  // Toolchain: reuse a system pnpm (>= 10) when there is one; otherwise let
  // mise install node + pnpm from the vault's mise.toml.
  const useSystemPnpm = process.env.CSB_USE_MISE !== "1" && systemPnpmUsable()
  const pnpmCmd = useSystemPnpm ? ["pnpm"] : ["mise", "exec", "--", "pnpm"]
  const fmt = secs => pc.dim(`(${secs}s)`)

  if (useSystemPnpm) {
    p.log.step(`Using system node ${process.versions.node} + pnpm ${pc.dim("(set CSB_USE_MISE=1 to use mise instead)")}`)
  } else {
    if (!commandExists("mise")) {
      const r = await runStep(spin, "Installing mise", ["npm", "install", "-g", "@jdxcode/mise"])
      if (r.ok) spin.stop(`mise installed ${fmt(r.seconds)}`)
      else spin.stop("Failed to install mise — run: npm install -g @jdxcode/mise", 1)
    }
    run(["mise", "trust"], targetDir)
    const r = await runStep(spin, "Installing node + pnpm via mise", ["mise", "install"], targetDir)
    if (r.ok) spin.stop(`node + pnpm installed ${fmt(r.seconds)}`)
    else spin.stop("mise install failed — run it manually inside your vault", 1)
  }

  // Install vault dependencies via pnpm
  const install = await runStep(spin, "Installing vault dependencies", [...pnpmCmd, "install", "--prefer-offline"], targetDir)
  const pnpmOk = install.ok
  if (pnpmOk) spin.stop(`dependencies installed ${fmt(install.seconds)}`)
  else {
    spin.stop("pnpm install failed — run it manually inside your vault", 1)
    const tail = tailForError(install)
    if (tail) p.log.warn(`pnpm install output:\n${tail}`)
  }

  // Register qmd collections + contexts. Skip reindex — first reindex downloads
  // ~2GB of GGUF models; user runs it explicitly when ready.
  if (pnpmOk) {
    if (doQmdSetup) {
      const qmdRes = await runStep(spin, "Registering qmd collections (wiki, raw-sources)", [...pnpmCmd, "qmd:setup"], targetDir)
      if (qmdRes.ok) {
        spin.stop(`qmd collections registered ${fmt(qmdRes.seconds)}`)
      } else {
        spin.stop("pnpm qmd:setup failed — run it manually inside your vault", 1)
        const tail = tailForError(qmdRes)
        if (tail) p.log.warn(`qmd:setup output:\n${tail}`)
      }
    } else {
      p.log.info("Skipped qmd:setup — run `pnpm qmd:setup` from the vault root when ready.")
    }
  }

  // Vault-local skills for agents that don't read .claude/skills
  const projectDirs = await installProjectSkills(targetDir, join(targetDir, ".claude", "skills"), LOCAL_SKILLS, agents)
  if (projectDirs.length > 0) {
    p.log.step(`Vault skills copied to ${projectDirs.map(d => pc.dim(d)).join(", ")}`)
  }

  // Install global skills (version-aware — prompts to update when versions differ)
  spin.start("Installing global skills")
  const skillResult = await installGlobalSkills({ isInteractive, agents, copy })
  spin.stop(`Global skills ${globalSkillSummary(skillResult)}`)
  p.log.message(summarizeAgentInstall(agents, skillResult.links, toDisplayPath))

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

  // Remote setup outcome, surfaced in Next steps / outro instead of a silent
  // success-looking finish. null = no remote requested.
  let remoteProblem = null

  // GitHub repo (optional)
  if (remoteProvider === "github") {
    if (!commandExists("gh")) {
      p.log.warn(`gh CLI not found — install from https://cli.github.com, then run:\n  gh repo create ${repoName} --private --source=. --remote=origin --push`)
      remoteProblem = "GitHub repo not created (gh CLI not found)"
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
          remoteProblem = "GitHub repo not created (gh repo create failed)"
        }
      } else {
        remoteProblem = "GitHub repo not created (not logged in to gh)"
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
  let cfAccountId = null
  if (remoteProvider === "cloudflare") {
    const result = await setupCloudflareRemote({ targetDir, repoName, namespace: cfNamespace, spin })
    if (result?.repoToken) {
      p.log.info(`Git token saved to the vault's .git/config — push/pull work for 24h; renew with ${pc.cyan("csb git-token")}`)
    }
    gitRemote = result?.remote || ""
    cfAccountId = result?.accountId || null
    if (result?.remote && result?.repoToken) setGitAuthHeader(targetDir, result.remote, result.repoToken)
    if (!result) remoteProblem = "Cloudflare Artifact not created (see the error above)"
    else if (!result.pushed) remoteProblem = "Cloudflare Artifact created, but the initial push failed (see the error above)"
  }

  // Write central config
  spin.start("Registering brain in config")
  await writeConfig(targetName, targetDir, qmdPath, gitRemote)
  spin.stop(`Config updated → ${pc.dim(toDisplayPath(CSB_CONFIG))}`)

  // Next steps
  const brainDisplayPath = toDisplayPath(targetDir)
  const remoteSteps = remoteProblem
    ? [
        `${pc.yellow("⚠")}  ${pc.yellow(remoteProblem)}`,
        ...(remoteProvider === "github"
          ? [`${pc.cyan(`gh repo create ${repoName} --private --source=. --remote=origin --push`)}  retry`]
          : [
              `${pc.dim("# fix the error above, then delete this brain and re-run, or add any git remote:")}`,
              `${pc.cyan(`csb rm ${targetName} && csb ${targetName}`)}`,
            ]),
        `${pc.cyan("git remote add origin <url> && git push -u origin main")}  any other remote`,
      ]
    : remoteProvider === "cloudflare"
    ? [
        `${pc.cyan(`csb git-token${targetName ? ` ${targetName}` : ""}`)}  ${pc.dim("# renew the git push/pull token (expires every 24h)")}`,
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
    ...agentLaunchSteps(agents),
    ...remoteSteps,
  ].join("\n")

  p.note(nextSteps, "Next steps")
  if (remoteProblem) {
    p.outro(pc.yellow(`Brain created, but the git remote isn't set up: ${remoteProblem}.`))
    process.exitCode = 1
  } else {
    p.outro("Happy knowledge building!")
  }
}

const SUBCOMMANDS = new Set([
  "help", "--help", "-h",
  "ls", "list",
  "rm", "remove",
  "path",
  "qmd",
  "exec",
  "use", "default", "switch",
  "doctor",
  "skills",
  "git-token",
])

async function main() {
  const [, , cmd, ...rest] = process.argv

  if (cmd === "help" || cmd === "--help" || cmd === "-h") {
    // `csb help <topic>` or `csb help`
    const topic = rest[0]
    await printHelp(topic || "top")
    return
  }

  // Per-subcommand --help / -h — intercept before any prompts run.
  if (SUBCOMMANDS.has(cmd) && hasHelpFlag(rest)) {
    const topicMap = { list: "ls", remove: "rm", default: "use", switch: "use" }
    await printHelp(topicMap[cmd] || cmd)
    return
  }

  if (cmd === "ls" || cmd === "list") {
    await listBrains()
    return
  }
  if (cmd === "rm" || cmd === "remove") {
    const names = rest.filter(a => !a.startsWith("-"))
    const yes = rest.some(a => a === "-y" || a === "--yes")
    const deleteRemote = rest.some(a => a === "--delete-remote")
    const keepRemote = rest.some(a => a === "--keep-remote")
    if (deleteRemote && keepRemote) {
      throw new Error("Cannot use --delete-remote and --keep-remote together.")
    }
    const remoteMode = deleteRemote ? "delete" : keepRemote ? "keep" : "ask"
    await removeBrain(names, { yes, remoteMode })
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
  if (cmd === "exec") {
    await cmdExec(rest)
    return
  }
  if (cmd === "use" || cmd === "default" || cmd === "switch") {
    await cmdUse(rest)
    return
  }
  if (cmd === "git-token") {
    await cmdGitToken(rest)
    return
  }
  if (cmd === "doctor") {
    await cmdDoctor()
    return
  }
  if (cmd === "skills") {
    await cmdSkills(rest)
    return
  }
  // `csb [<name>] [--agent <ids>] [--copy]`
  const createArgs = cmd === undefined ? rest : [cmd, ...rest]
  const { agents, copy, rest: positional } = parseAgentFlags(createArgs)
  const unknownFlag = positional.find(a => a.startsWith("-"))
  if (unknownFlag) throw new Error(`Unknown option: ${unknownFlag}. Run \`csb help\`.`)
  await createBrain(positional[0], { agents, copy })
}

main().catch(err => {
  p.cancel(err.message)
  process.exit(1)
})
