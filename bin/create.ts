#!/usr/bin/env bun
import { cp, rename, access } from "fs/promises"
import { join } from "path"

const TEMPLATE = join(import.meta.dir, "../template")

async function run(cmd: string[], cwd?: string): Promise<boolean> {
  const proc = Bun.spawn(cmd, { cwd, stdout: "inherit", stderr: "inherit" })
  return (await proc.exited) === 0
}

async function commandExists(cmd: string): Promise<boolean> {
  const proc = Bun.spawn(["which", cmd], { stdout: "pipe", stderr: "pipe" })
  return (await proc.exited) === 0
}

async function main() {
  // Accept dir name as CLI arg or prompt interactively
  let targetName = process.argv[2]

  if (!targetName) {
    const answer = prompt("Where to create your wiki? (my-wiki) ›") ?? ""
    targetName = answer.trim() || "my-wiki"
  }

  const targetDir = join(process.cwd(), targetName)

  // Fail fast if target already exists
  try {
    await access(targetDir)
    console.error(`\nError: "${targetName}" already exists. Choose a different name or delete it first.`)
    process.exit(1)
  } catch {
    // Directory doesn't exist — good to go
  }

  // 1. Scaffold
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

  // 2. Install mise if not present
  if (!(await commandExists("mise"))) {
    console.log("\nInstalling mise...")
    const ok = await run(["npm", "install", "-g", "@jdxcode/mise"])
    if (ok) {
      console.log("✓ Installed mise")
    } else {
      console.error("  Failed to install mise — install manually: npm install -g @jdxcode/mise")
    }
  }

  // 3. Run mise install inside the new vault to install bun
  console.log("\nInstalling bun via mise...")
  const miseOk = await run(["mise", "install"], targetDir)
  if (miseOk) {
    console.log("✓ Installed bun")
  } else {
    console.error("  mise install failed — run it manually inside your vault")
  }

  // 4. Git init
  console.log("\nInitializing git repo...")
  const gitOk = await run(["git", "init"], targetDir)
  if (gitOk) {
    await run(["git", "add", "."], targetDir)
    await run(["git", "commit", "-m", "initial commit"], targetDir)
    console.log("✓ Git repo initialized")
  } else {
    console.error("  git init failed — run it manually inside your vault")
  }

  console.log(`\n✓ Done! Your wiki is ready.\n`)
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
