# GitHub remote

GitHub is the default Git backend for claude-second-brain. Your vault is stored as a private GitHub repository — you get version history, access from any device, and Obsidian mobile sync via the bundled Git plugin.

## Prerequisites

* A [GitHub account](https://github.com/join)
* [`gh` CLI](https://cli.github.com/) — used for authentication and repo creation during setup

## Setup (automatic)

When you run `npx claude-second-brain` and select **GitHub** as your remote, the CLI handles everything:

1. Checks `gh auth status` — runs `gh auth login` if not authenticated
2. Creates a private repo: `gh repo create <name> --private --source=. --remote=origin --push`
3. Pushes the initial commit

## Manual setup

If you skipped GitHub during setup, or `gh` wasn't installed, connect it manually:

```bash
# With gh CLI
gh repo create my-brain --private --source=. --remote=origin --push

# Without gh CLI
git remote add origin https://github.com/you/my-brain.git
git push -u origin main
```

## Syncing from Obsidian

The vault ships with [obsidian-git](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-34/integrations/obsidian-git) enabled, so Obsidian commits, pulls and pushes on a schedule.

For iPhone and iPad, see [iCloud sync](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-34/integrations/icloud).
