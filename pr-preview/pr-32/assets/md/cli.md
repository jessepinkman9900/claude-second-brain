# Commands

The `claude-second-brain` CLI creates and manages brains registered in `~/.claude-second-brain/config.toml`.

## Usage

Run it without installing anything:

:::code-group
```bash [npm]
npx claude-second-brain
```

```bash [pnpm]
pnpm dlx claude-second-brain
```

```bash [bun]
bunx claude-second-brain
```
:::

### Global install

Install it globally to get the shorter `csb` alias. Every page in this reference uses `csb`; substitute `npx claude-second-brain` if you haven't installed it.

:::code-group
```bash [npm]
npm install -g claude-second-brain
csb ls
```

```bash [pnpm]
pnpm add -g claude-second-brain
csb ls
```

```bash [bun]
bun add -g claude-second-brain
csb ls
```
:::

## Available commands

* [`csb [<name>]`](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/cli/create): Create a new brain. Interactive unless you pass a name and flags.
* [`csb ls`](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/cli/ls): List all registered brains. The default brain is marked with `*`.
* [`csb use <name>`](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/cli/use): Set the default brain.
* [`csb rm [<name>…]`](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/cli/rm): Delete one or more brains, and optionally their remotes.
* [`csb path [qmd|config|root]`](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/cli/path): Print a path for the default (or named) brain.
* [`csb qmd <qmd args…>`](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/cli/qmd): Run `qmd` against the default (or named) brain.
* [`csb exec -- <cmd…>`](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/cli/exec): Run a command inside the default (or named) brain's directory.
* [`csb skills`](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/cli/skills): Install or update the wiki skills for any agent (Claude Code, Codex, Cursor, Copilot, …).
* [`csb git-token [<name>]`](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/cli/git-token): Renew the git push/pull token for a [Cloudflare Artifacts](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/remotes/cloudflare-artifacts) brain.
* [`csb doctor`](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/cli/doctor): Verify your setup and suggest fixes.

`ls` is also available as `list`, `rm` as `remove`, and `use` as `default` or `switch`.

## Display info

### `-h`, `--help`

Show usage. Works on its own, after any command, or as `csb help <command>`.

```bash
csb --help
csb rm --help
csb help qmd
```

## Environment variables

| Variable | Description |
|---|---|
| `CSB_AGENTS` | Agents to install skills for, comma-separated or `all`. Used by [`csb`](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/cli/create) and [`csb skills`](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/cli/skills) when `--agent` is not passed. |
| `CSB_USE_MISE` | Set to `1` to always fetch node and pnpm with mise, even if pnpm 10+ is on your `PATH`. |
| `CSB_ICONS` | `nerd`, `emoji` or `none`: icons in the git-remote picker. Nerd Font logos are on by default in Ghostty, WezTerm and kitty. |
| `CSB_SKIP_SKILL_UPDATES` | Set to `1` to update outdated global skills without prompting. |
| `CLOUDFLARE_API_TOKEN` | API token with Artifacts Read and Edit. Used instead of your `wrangler` login. |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account to use when your login can see more than one. |
| `CLAUDE_CONFIG_DIR` | Where Claude Code reads its config. Skills for Claude Code go in its `skills/` folder. |

## Exit status

Every command exits non-zero on failure (an unknown brain name, a missing config, a failed `doctor` check, a remote that could not be created) and writes the error to stderr.
