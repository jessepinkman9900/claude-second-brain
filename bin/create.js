#!/usr/bin/env node
import { cp, rename, access, readFile, writeFile, mkdir } from "fs/promises"
import { readdirSync, readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { spawnSync } from "child_process"
import { homedir } from "os"
import * as p from "@clack/prompts"
import pc from "picocolors"

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATE = join(__dirname, "../template")
const { version } = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf8"))

// Non-interactive commands — output piped (won't corrupt spinner)
function run(cmd, cwd) {
  const result = spawnSync(cmd[0], cmd.slice(1), { cwd, stdio: "pipe" })
  return result.status === 0
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

async function patchVault(targetDir, qmdPath, brainName) {
  const filesToPatch = [
    join(targetDir, "scripts/qmd/setup.ts"),
    join(targetDir, "scripts/qmd/reindex.ts"),
    join(targetDir, "CLAUDE.md"),
  ]

  const skillsDir = join(targetDir, ".claude/skills")
  try {
    for (const skill of readdirSync(skillsDir)) {
      filesToPatch.push(join(skillsDir, skill, "SKILL.md"))
    }
  } catch (err) {
    if (err.code !== "ENOENT") throw err
  }

  await Promise.all(filesToPatch.map(async file => {
    try {
      let content = await readFile(file, "utf8")
      content = content.replaceAll("__QMD_PATH__", qmdPath)
      await writeFile(file, content, "utf8")
    } catch (err) {
      if (err.code !== "ENOENT") throw err
    }
  }))

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
    let loggedIn = authCheck.status === 0
    if (!loggedIn) {
      const stderr = authCheck.stderr?.toString().trim()
      p.log.info(`wrangler whoami exited ${authCheck.status}${stderr ? ` (${truncate(stderr, 160)})` : ""}`)
    }

    if (!loggedIn) {
      p.log.info("Starting wrangler login (grants artifacts:write scope)...")
      const loginResult = spawnSync(wrangler.cmd, [...wrangler.prefix, "login"], { stdio: "inherit" })
      loggedIn = loginResult.status === 0
      if (!loggedIn) {
        p.log.warn(`wrangler login exited ${loginResult.status} — set CLOUDFLARE_API_TOKEN and re-run.`)
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

async function installGlobalSkills(qmdPath) {
  const globalSkillsDir = join(homedir(), ".claude", "skills")

  await Promise.all(["brain-ingest", "brain-search", "brain-refresh"].map(async skillName => {
    const srcFile = join(TEMPLATE, ".claude/skills", skillName, "SKILL.md")
    const destDir = join(globalSkillsDir, skillName)

    let content = await readFile(srcFile, "utf8")
    content = content.replaceAll("__QMD_PATH__", qmdPath)

    await mkdir(destDir, { recursive: true })
    await writeFile(join(destDir, "SKILL.md"), content, "utf8")
  }))
}

async function main() {
  const isInteractive = Boolean(process.stdin.isTTY)

  p.intro(`${pc.bgCyan(pc.black(" claude-second-brain "))} v${version}`)

  let targetName = process.argv[2]
  if (!targetName) {
    const answer = await p.text({
      message: "Where to create your brain?",
      placeholder: "my-brain",
      defaultValue: "my-brain",
    })
    if (p.isCancel(answer)) { p.cancel("Setup cancelled."); process.exit(0) }
    targetName = answer
  }

  const defaultQmdPath = join(
    process.env.XDG_CACHE_HOME || join(homedir(), ".cache"),
    "qmd", "index.sqlite"
  )
  let qmdPath
  if (isInteractive) {
    const answer = await p.text({
      message: "Where to store the qmd index?",
      placeholder: defaultQmdPath,
      defaultValue: defaultQmdPath,
    })
    if (p.isCancel(answer)) { p.cancel("Setup cancelled."); process.exit(0) }
    qmdPath = answer
  } else {
    qmdPath = defaultQmdPath
  }

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

  const targetDir = join(process.cwd(), targetName)

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
  spin.stop(`${targetName}/ created`)

  // Patch vault files with chosen qmd path
  spin.start("Configuring qmd index path")
  await patchVault(targetDir, qmdPath, targetName)
  spin.stop(`qmd index → ${pc.dim(qmdPath)}`)

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
  if (remoteProvider === "cloudflare") {
    const result = await setupCloudflareRemote({ targetDir, repoName, namespace: cfNamespace, spin })
    if (result?.repoToken) {
      p.log.warn(`Save your Artifacts repo token — it expires and you'll need to mint a new one:\n  ${result.repoToken}`)
    }
  }

  // Install global skills
  spin.start("Installing global Claude skills")
  await installGlobalSkills(qmdPath)
  spin.stop("Global skills installed")

  // Next steps
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
    `${pc.cyan(`cd ${targetName}`)}`,
    `${pc.cyan("claude")}          open Claude Code, then run ${pc.bold("/setup")}`,
    ...remoteSteps,
  ].join("\n")

  p.note(nextSteps, "Next steps")
  p.outro("Happy knowledge building!")
}

main().catch(err => {
  p.cancel(err.message)
  process.exit(1)
})
