## /brain-refresh

Refresh the qmd index.

Re-scans all collections for new or changed files and regenerates vector embeddings. Run after a bulk ingest session or manual edits to the wiki.

Pass `force` to re-embed every chunk — useful after changing the embedding model.

Scope: global skill, installed once at `~/.agents/skills/brain-refresh/SKILL.md` and symlinked into each selected agent's global skills dir (e.g. `~/.claude/skills/brain-refresh`). Paths resolve at call time via `npx claude-second-brain path` and `npx claude-second-brain qmd` — both read `~/.claude-second-brain/config.toml` to find the default brain. Source: [template/.claude/skills/brain-refresh/SKILL.md](https://github.com/jessepinkman9900/claude-second-brain/blob/main/template/.claude/skills/brain-refresh/SKILL.md).
