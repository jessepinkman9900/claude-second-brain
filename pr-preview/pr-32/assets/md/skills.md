# Skills

The wiki ships with a set of [Agent Skills](https://agentskills.io) that cover the full workflow, and they work in any agent that supports skills: Claude Code, Codex, Cursor, GitHub Copilot, Gemini CLI, OpenCode, Windsurf, Goose and more. No manual prompting, no copy-pasting.

## Daily workflow

* [**`/brain-ingest`**](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/skills/brain-ingest) — Drop a file into `raw-sources/`. Your agent summarizes the source, creates a `wiki/sources/` page, updates related topic pages, and flags contradictions.
* [**`/brain-search`**](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/skills/brain-search) — Ask anything. Your agent runs hybrid search, reads the most relevant pages, and writes an answer with inline `[[wiki/page]]` citations.
* [**`/lint`**](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/skills/lint) — Health-check the wiki. Surfaces orphan pages, broken links, unresolved contradictions, and data gaps.

## Maintenance

* [**`/brain-refresh`**](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/skills/brain-refresh) — Re-scan the vault and regenerate vector embeddings for new or changed files.
* [**`/brain-rebuild`**](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/skills/brain-rebuild) — **Destructive.** Redesigns the qmd schema, drops the old index, and rebuilds from scratch. Use only when the current structure no longer fits how you search.

## Install or update skills

The skills follow the [Agent Skills](https://agentskills.io/specification) format, so they work in Claude Code, Codex, Cursor, GitHub Copilot, Gemini CLI, OpenCode, Windsurf, Goose and more. `/brain-ingest`, `/brain-search`, and `/brain-refresh` install globally during setup — once to `~/.agents/skills/`, with symlinks from agent-specific folders like `~/.claude/skills/`. `/brain-rebuild` and `/lint` live inside the vault at `.claude/skills/` and are copied to `.agents/skills/` and other agents' folders for the agents you pick.

To install for more agents later, or after upgrading the CLI:

```bash
npx claude-second-brain skills --agent codex,cursor,github-copilot
```

See [Install skills for any agent](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/cli#install-skills-for-any-agent) for the full layout.

To pull in improvements from the latest template:

```bash
# Install or update all 5 wiki skills
npx skills add https://github.com/jessepinkman9900/claude-second-brain/tree/main/template/.claude/skills -a claude-code -y

# Or update a specific skill
npx skills add https://github.com/jessepinkman9900/claude-second-brain/tree/main/template/.claude/skills --skill brain-ingest -a claude-code -y
```

Once installed via `npx skills`, future updates are a single command:

```bash
npx skills update -a claude-code
```
