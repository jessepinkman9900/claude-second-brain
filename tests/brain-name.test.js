import { test } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { spawnSync } from "node:child_process"

const cli = resolve("bin/create.js")

test("creation rejects names that escape the root or corrupt config", () => {
  const home = mkdtempSync(join(tmpdir(), "csb-name-"))
  try {
    for (const name of ["..", "../outside", "a/b", "a\\b", 'a"b', "a\nb", "   "]) {
      const run = spawnSync(process.execPath, [cli, name], { env: { ...process.env, HOME: home }, encoding: "utf8" })
      assert.notEqual(run.status, 0, name)
      assert.match(run.stdout + run.stderr, /single directory name/, name)
      assert.equal(existsSync(join(home, ".claude-second-brain")), false, name)
    }
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

test("ordinary names with spaces can still be scaffolded", () => {
  const home = mkdtempSync(join(tmpdir(), "csb-valid-"))
  const bin = join(home, "bin")
  try {
    mkdirSync(bin)
    for (const name of ["mise", "git"]) {
      writeFileSync(join(bin, name), "#!/bin/sh\nexit 1\n", { mode: 0o755 })
    }
    const run = spawnSync(process.execPath, [cli, "work notes"], {
      env: { ...process.env, HOME: home, PATH: `${bin}:/usr/bin:/bin` }, encoding: "utf8",
    })
    assert.equal(run.status, 0, run.stderr)
    assert.ok(existsSync(join(home, ".claude-second-brain", "work notes", "wiki")))
    assert.match(readFileSync(join(home, ".claude-second-brain", "config.toml"), "utf8"), /name = "work notes"/)
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})
