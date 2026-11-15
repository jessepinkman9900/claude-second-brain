import { test } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { spawnSync } from "node:child_process"

const cli = resolve("bin/create.js")

test("missing --brain values never silently use the default", () => {
  const home = mkdtempSync(join(tmpdir(), "csb-flag-"))
  try {
    const root = join(home, ".claude-second-brain")
    const vault = join(root, "demo")
    mkdirSync(vault, { recursive: true })
    writeFileSync(join(root, "config.toml"), `default = "demo"\n\n[[brains]]\nname = "demo"\npath = "${vault}"\nqmd_index = "${vault}/index.sqlite"\n`)
    const bin = join(home, "bin")
    mkdirSync(bin)
    const marker = join(home, "npx-ran")
    writeFileSync(join(bin, "npx"), '#!/bin/sh\ntouch "$MARKER"\n', { mode: 0o755 })
    const env = { ...process.env, HOME: home, PATH: `${bin}:/usr/bin:/bin`, MARKER: marker }
    for (const args of [["path", "--brain"], ["path", "--brain", "--qmd"], ["qmd", "--brain"], ["exec", "--brain", "--", "true"]]) {
      const run = spawnSync(process.execPath, [cli, ...args], { env, encoding: "utf8" })
      assert.notEqual(run.status, 0, args.join(" "))
      assert.match(run.stdout + run.stderr, /--brain requires a brain name/)
      assert.equal(existsSync(marker), false)
    }
    const valid = spawnSync(process.execPath, [cli, "path", "--brain", "demo"], { env, encoding: "utf8" })
    assert.equal(valid.status, 0, valid.stderr)
    assert.equal(valid.stdout.trim(), vault)
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})
