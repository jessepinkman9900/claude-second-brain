import { test } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { spawnSync } from "node:child_process"

const cli = resolve("bin/create.js")

test("exec forwards help after -- and preserves wrapper help", () => {
  const home = mkdtempSync(join(tmpdir(), "csb-help-"))
  try {
    const root = join(home, ".claude-second-brain")
    const vault = join(root, "demo")
    mkdirSync(vault, { recursive: true })
    writeFileSync(join(root, "config.toml"), `default = "demo"\n\n[[brains]]\nname = "demo"\npath = "${vault}"\nqmd_index = "${vault}/index.sqlite"\n`)
    const inner = join(home, "inner")
    writeFileSync(inner, '#!/bin/sh\nprintf "FORWARDED:%s\\n" "$1"\n', { mode: 0o755 })
    const bin = join(home, "bin")
    mkdirSync(bin)
    writeFileSync(join(bin, "npx"), '#!/bin/sh\nprintf "QMD:%s\\n" "$@"\n', { mode: 0o755 })
    const env = { ...process.env, HOME: home, PATH: `${bin}:/usr/bin:/bin` }
    for (const flag of ["--help", "-h"]) {
      const forwarded = spawnSync(process.execPath, [cli, "exec", "--", inner, flag], { env, encoding: "utf8" })
      assert.equal(forwarded.status, 0, forwarded.stderr)
      assert.match(forwarded.stdout, new RegExp(`FORWARDED:${flag}`))
      const own = spawnSync(process.execPath, [cli, "exec", flag], { env, encoding: "utf8" })
      assert.equal(own.status, 0, own.stderr)
      assert.doesNotMatch(own.stdout, /FORWARDED:/)
      assert.match(own.stdout, /csb exec/)
      const qmd = spawnSync(process.execPath, [cli, "qmd", "--", flag], { env, encoding: "utf8" })
      assert.equal(qmd.status, 0, qmd.stderr)
      assert.match(qmd.stdout, new RegExp(`QMD:${flag}`))
    }
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})
