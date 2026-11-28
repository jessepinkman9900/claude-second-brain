// The vault's .gitignore must keep machine-local files out of git, because
// obsidian-git commits every change in the vault.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function ignored(dir, path) {
  return spawnSync('git', ['check-ignore', '-q', '--no-index', path], { cwd: dir }).status === 0
}

describe('template .gitignore', () => {
  const dir = mkdtempSync(join(tmpdir(), 'csb-gitignore-'))
  spawnSync('git', ['init', '-q'], { cwd: dir })
  copyFileSync(join(root, 'template', '.gitignore.template'), join(dir, '.gitignore'))

  it('ignores the qmd index, node_modules and per-device Obsidian state', () => {
    try {
      for (const p of ['.qmd/index.sqlite', 'node_modules/x/index.js', '.obsidian/workspace.json', '.obsidian/workspace-mobile.json'])
        assert.ok(ignored(dir, p), `${p} should be ignored`)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('keeps notes, the wiki and shared Obsidian config tracked', () => {
    const d = mkdtempSync(join(tmpdir(), 'csb-gitignore-'))
    try {
      spawnSync('git', ['init', '-q'], { cwd: d })
      copyFileSync(join(root, 'template', '.gitignore.template'), join(d, '.gitignore'))
      for (const p of ['wiki/index.md', 'raw-sources/articles/a.md', '.obsidian/app.json', '.obsidian/plugins/obsidian-git/data.json'])
        assert.ok(!ignored(d, p), `${p} should be tracked`)
    } finally {
      rmSync(d, { recursive: true, force: true })
    }
  })
})
