#!/usr/bin/env node
import { cp, rename, access, readFile, writeFile, mkdir } from "fs/promises"
import { readdirSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { spawnSync } from "child_process"
import { createInterface } from "readline/promises"
import { homedir } from "os"

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATE = join(__dirname, "../template")

function run(cmd, cwd) {
  const result = spawnSync(cmd[0], cmd.slice(1), { cwd, stdio: "inherit" })
  return result.status === 0
}

function commandExists(cmd) {
  const result = spawnSync("which", [cmd], { stdio: "pipe" })
  return result.status === 0
}

async function patchVault(targetDir, qmdPath) {
  const filesToPatch = [
    join(targetDir, "scripts/qmd/setup.ts"),
    join(targetDir, "scripts/qmd/reindex.ts"),
    join(targetDir, "CLAUDE.md"),
  ]

  // Add all skill SKILL.md files
  const skillsDir = join(targetDir, ".claude/skills")
  try {
    for (const skill of readdirSync(skillsDir)) {
      filesToPatch.push(join(skillsDir, skill, "SKILL.md"))
    }
  } catch { /* no skills dir */ }

  for (const file of filesToPatch) {
    try {
      let content = await readFile(file, "utf8")
      content = content.replaceAll('const DB = join(VAULT, "qmd.sqlite")', `const DB = "${qmdPath}"`)
      content = content.replaceAll("INDEX_PATH=qmd.sqlite", `INDEX_PATH=${qmdPath}`)
      await writeFile(file, content, "utf8")
    } catch { /* file may not exist */ }
  }
}

async function installGlobalSkills(qmdPath) {
  const globalSkillsDir = join(homedir(), ".claude", "skills")

  for (const skillName of ["brain-ingest", "brain-search"]) {
    const srcFile = join(TEMPLATE, ".claude/skills", skillName, "SKILL.md")
    const destDir = join(globalSkillsDir, skillName)

    let content = await readFile(srcFile, "utf8")
    content = content.replaceAll("INDEX_PATH=qmd.sqlite", `INDEX_PATH=${qmdPath}`)

    await mkdir(destDir, { recursive: true })
    await writeFile(join(destDir, "SKILL.md"), content, "utf8")
    console.log(`  ✓ ~/.claude/skills/${skillName}/SKILL.md`)
  }
}

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout })

  // 1. Folder name
  let targetName = process.argv[2]
  if (!targetName) {
    const answer = await rl.question("Where to create your brain? (my-brain) › ")
    targetName = answer.trim() || "my-brain"
  }

  // 2. qmd path
  const defaultQmdPath = join(
    process.env.XDG_CACHE_HOME || join(homedir(), ".cache"),
    "qmd", "index.sqlite"
  )
  const qmdAnswer = await rl.question(`Where to store the qmd index? (${defaultQmdPath}) › `)
  const qmdPath = qmdAnswer.trim() || defaultQmdPath

  rl.close()

  const targetDir = join(process.cwd(), targetName)

  // Fail fast if target already exists
  try {
    await access(targetDir)
    console.error(`\nError: "${targetName}" already exists. Choose a different name or delete it first.`)
    process.exit(1)
  } catch {
    // Directory doesn't exist — good to go
  }

  // 3. Scaffold
  console.log(`\nCreating ${targetName}...`)
  await cp(TEMPLATE, targetDir, { recursive: true })

  // npm strips .gitignore from published packages — rename the template copy back
  try {
    await rename(
      join(targetDir, ".gitignore.template"),
      join(targetDir, ".gitignore")
    )
  } catch {
    // .gitignore.template not present (e.g. running locally where npm didn't strip it)
  }

  console.log(`✓ Created ${targetName}/`)

  // 4. Patch vault files with chosen qmd path
  await patchVault(targetDir, qmdPath)
  console.log(`✓ Configured qmd path: ${qmdPath}`)

  // 5. Install mise if not present
  if (!commandExists("mise")) {
    console.log("\nInstalling mise...")
    const ok = run(["npm", "install", "-g", "@jdxcode/mise"])
    if (ok) {
      console.log("✓ Installed mise")
    } else {
      console.error("  Failed to install mise — install manually: npm install -g @jdxcode/mise")
    }
  }

  // 6. Run mise install inside the new vault to install bun
  console.log("\nInstalling bun via mise...")
  const miseOk = run(["mise", "install"], targetDir)
  if (miseOk) {
    console.log("✓ Installed bun")
  } else {
    console.error("  mise install failed — run it manually inside your vault")
  }

  // 7. Git init
  console.log("\nInitializing git repo...")
  const gitOk = run(["git", "init"], targetDir)
  if (gitOk) {
    run(["git", "add", "."], targetDir)
    run(["git", "commit", "-m", "initial commit"], targetDir)
    console.log("✓ Git repo initialized")
  } else {
    console.error("  git init failed — run it manually inside your vault")
  }

  // 8. Install global skills
  console.log("\nInstalling global skills...")
  await installGlobalSkills(qmdPath)

  console.log(`\n✓ Done! Your brain is ready.\n`)
  console.log("Next steps:")
  console.log(`  cd ${targetName}`)
  console.log("  claude                      # open Claude Code, then run /setup")
  console.log("  git remote add origin <url> # connect to GitHub for sync + Obsidian Mobile")
  console.log("  git push -u origin main")
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})
