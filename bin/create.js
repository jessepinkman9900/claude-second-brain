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
  } catch { /* no skills dir */ }

  await Promise.all(filesToPatch.map(async file => {
    try {
      let content = await readFile(file, "utf8")
      content = content.replaceAll('"__QMD_PATH__"', `"${qmdPath}"`)
      content = content.replaceAll("INDEX_PATH=qmd.sqlite", `INDEX_PATH=${qmdPath}`)
      await writeFile(file, content, "utf8")
    } catch { /* file may not exist */ }
  }))

  const readmePath = join(targetDir, "README.md")
  try {
    let readme = await readFile(readmePath, "utf8")
    readme = readme.replaceAll("__BRAIN_NAME__", brainName)
    await writeFile(readmePath, readme, "utf8")
  } catch { /* README may not exist */ }
}

async function installGlobalSkills(qmdPath) {
  const globalSkillsDir = join(homedir(), ".claude", "skills")

  await Promise.all(["brain-ingest", "brain-search"].map(async skillName => {
    const srcFile = join(TEMPLATE, ".claude/skills", skillName, "SKILL.md")
    const destDir = join(globalSkillsDir, skillName)

    let content = await readFile(srcFile, "utf8")
    content = content.replaceAll("INDEX_PATH=qmd.sqlite", `INDEX_PATH=${qmdPath}`)

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

  let createGhRepo = false
  let ghRepoName = null
  if (isInteractive) {
    const confirm = await p.confirm({
      message: "Create a private GitHub repo?",
      initialValue: false,
    })
    if (p.isCancel(confirm)) { p.cancel("Setup cancelled."); process.exit(0) }
    createGhRepo = confirm

    if (createGhRepo) {
      const answer = await p.text({
        message: "GitHub repo name?",
        placeholder: targetName,
        defaultValue: targetName,
      })
      if (p.isCancel(answer)) { p.cancel("Setup cancelled."); process.exit(0) }
      ghRepoName = answer
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

  // Run mise install inside the new vault to install bun
  spin.start("Installing bun via mise")
  run(["mise", "trust"], targetDir)
  const miseOk = run(["mise", "install"], targetDir)
  if (miseOk) spin.stop("bun installed")
  else spin.stop("mise install failed — run it manually inside your vault", 1)

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
  if (createGhRepo) {
    if (!commandExists("gh")) {
      p.log.warn(`gh CLI not found — install from https://cli.github.com, then run:\n  gh repo create ${ghRepoName} --private --source=. --remote=origin --push`)
    } else {
      const authCheck = spawnSync("gh", ["auth", "status"], { stdio: "pipe" })
      let loggedIn = authCheck.status === 0

      if (!loggedIn) {
        p.log.info("Not logged in to GitHub. Starting login...")
        loggedIn = runInteractive(["gh", "auth", "login"], targetDir)
      }

      if (loggedIn) {
        spin.start(`Creating GitHub repo ${pc.dim(ghRepoName)}`)
        const ghOk = run(
          ["gh", "repo", "create", ghRepoName, "--private", "--source=.", "--remote=origin", "--push"],
          targetDir
        )
        if (ghOk) {
          spin.stop(`GitHub repo created (private): ${pc.cyan(ghRepoName)}`)
        } else {
          spin.stop(`gh repo create failed — run: gh repo create ${ghRepoName} --private --source=. --remote=origin --push`, 1)
        }
      }
    }
  }

  // Install global skills
  spin.start("Installing global Claude skills")
  await installGlobalSkills(qmdPath)
  spin.stop("Global skills installed")

  // Next steps
  const nextSteps = [
    `${pc.cyan(`cd ${targetName}`)}`,
    `${pc.cyan("claude")}          open Claude Code, then run ${pc.bold("/setup")}`,
    ...(!createGhRepo ? [
      `${pc.cyan("git remote add origin <url>")}  connect to GitHub for sync`,
      `${pc.cyan("git push -u origin main")}`,
    ] : []),
  ].join("\n")

  p.note(nextSteps, "Next steps")
  p.outro("Happy knowledge building!")
}

main().catch(err => {
  p.cancel(err.message)
  process.exit(1)
})
