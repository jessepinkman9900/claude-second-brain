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

// Resolve the `cf` CLI as either an installed binary or `npx cf` fallback.
function resolveCfCli() {
  if (commandExists("cf")) return { cmd: "cf", prefix: [] }
  return { cmd: "npx", prefix: ["cf"] }
}

// Look up the Artifacts permission group ID via the cf CLI.
// Filters by name "Artifacts" and picks the Edit/Write scoped group.
function lookupArtifactsEditPermissionGroup(cfCli) {
  const result = spawnSync(
    cfCli.cmd,
    [...cfCli.prefix, "accounts", "tokens", "permission-groups-list", "--name", "Artifacts", "--ndjson"],
    { stdio: "pipe" }
  )
  if (result.status !== 0) return null
  const lines = result.stdout.toString().trim().split("\n").filter(Boolean)
  for (const line of lines) {
    try {
      const group = JSON.parse(line)
      const name = (group.name || "").toLowerCase()
      if (name.includes("write") || name.includes("edit")) return group.id
    } catch {
      // skip malformed lines
    }
  }
  return null
}

// End-to-end Cloudflare Artifacts setup: auth, mint API token, create repo, set remote, push.
async function setupCloudflareRemote({ targetDir, repoName, namespace, spin }) {
  let cfApiToken = process.env.CLOUDFLARE_API_TOKEN
  let tokenWasMinted = false

  if (!cfApiToken) {
    const cfCli = resolveCfCli()

    const authCheck = spawnSync(cfCli.cmd, [...cfCli.prefix, "auth", "whoami"], { stdio: "pipe" })
    let loggedIn = authCheck.status === 0

    if (!loggedIn) {
      p.log.info("Not logged in to Cloudflare. Starting OAuth login...")
      loggedIn = spawnSync(cfCli.cmd, [...cfCli.prefix, "auth", "login"], { stdio: "inherit" }).status === 0
    }

    if (!loggedIn) {
      p.log.warn("Cloudflare login failed — set CLOUDFLARE_API_TOKEN and re-run, or run `cf auth login` manually.")
      return null
    }

    spin.start("Looking up Artifacts permission group")
    const permissionGroupId = lookupArtifactsEditPermissionGroup(cfCli)
    if (!permissionGroupId) {
      spin.stop("Could not find Artifacts permission group", 1)
      return null
    }
    spin.stop(`Permission group: ${pc.dim(permissionGroupId)}`)

    spin.start("Minting scoped Cloudflare API token")
    const tokenName = `claude-second-brain-${repoName}`
    const tokenBody = JSON.stringify({
      name: tokenName,
      policies: [{
        effect: "allow",
        resources: { "com.cloudflare.api.account.*": "*" },
        permission_groups: [{ id: permissionGroupId }],
      }],
    })
    const mintResult = spawnSync(
      cfCli.cmd,
      [...cfCli.prefix, "accounts", "tokens", "create", "--name", tokenName, "--body", tokenBody, "--ndjson"],
      { stdio: "pipe" }
    )
    if (mintResult.status !== 0) {
      spin.stop(`Failed to mint API token: ${mintResult.stderr.toString().trim() || "unknown error"}`, 1)
      return null
    }
    try {
      const parsed = JSON.parse(mintResult.stdout.toString().trim().split("\n")[0])
      cfApiToken = parsed.value || parsed.result?.value
    } catch (err) {
      spin.stop(`Failed to parse token response: ${err.message}`, 1)
      return null
    }
    if (!cfApiToken) {
      spin.stop("Mint succeeded but token value missing from response", 1)
      return null
    }
    tokenWasMinted = true
    spin.stop("Scoped API token minted")
  }

  spin.start(`Creating Cloudflare Artifact ${pc.dim(repoName)}`)
  let createData
  try {
    const baseUrl = `https://artifacts.cloudflare.net/v1/api/namespaces/${namespace}`
    const res = await fetch(`${baseUrl}/repos`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cfApiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: repoName, default_branch: "main" }),
    })
    createData = await res.json()
  } catch (err) {
    spin.stop(`Network error creating artifact: ${err.message}`, 1)
    return { cfApiToken, tokenWasMinted }
  }

  if (!createData?.success) {
    const errMsg = createData?.errors?.[0]?.message || "unknown error"
    spin.stop(`Failed to create artifact: ${errMsg}`, 1)
    return { cfApiToken, tokenWasMinted }
  }

  const { remote, token: repoToken } = createData.result
  run(["git", "remote", "add", "origin", remote], targetDir)
  const pushOk = run(
    ["git", "-c", `http.extraHeader=Authorization: Bearer ${repoToken}`, "push", "-u", "origin", "main"],
    targetDir
  )
  if (pushOk) {
    spin.stop(`Cloudflare Artifact created: ${pc.cyan(repoName)}`)
    p.log.info(`Remote: ${pc.dim(remote)}`)
  } else {
    spin.stop("Push to Cloudflare Artifact failed", 1)
  }
  return { cfApiToken, tokenWasMinted, repoToken, remote }
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
      p.log.warn(`Save your Artifacts repo token (used for git push/pull):\n  ${result.repoToken}`)
    }
    if (result?.cfApiToken && result.tokenWasMinted) {
      p.log.warn(`Save your scoped Cloudflare API token (used to mint future repo tokens):\n  ${result.cfApiToken}`)
    }
  }

  // Install global skills
  spin.start("Installing global Claude skills")
  await installGlobalSkills(qmdPath)
  spin.stop("Global skills installed")

  // Next steps
  const remoteSteps = remoteProvider === "cloudflare"
    ? [
        `${pc.dim("# Mint a fresh git push/pull token when needed:")}`,
        `${pc.cyan(`curl -X POST https://artifacts.cloudflare.net/v1/api/namespaces/${cfNamespace}/tokens \\`)}`,
        `${pc.cyan(`  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \\`)}`,
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
