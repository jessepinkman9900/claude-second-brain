## CLI Reference

The `claude-second-brain` CLI creates and manages brains registered in `~/.claude-second-brain/config.toml`. Run it via `npx claude-second-brain`, `pnpm dlx claude-second-brain`, or — if installed globally with `npm i -g claude-second-brain` — the shorter `csb` alias.

All examples below use `csb`; substitute `npx claude-second-brain` if you haven't installed it globally.

### Commands

| Command                        | Description                                                              |
| ------------------------------ | ------------------------------------------------------------------------ |
| `csb`                          | Create a new brain (interactive).                                        |
| `csb <name>`                   | Create a new brain named `<name>`, skipping the name prompt.             |
| `csb ls`                       | List all registered brains. The default brain is marked with `*`.        |
| `csb use <name>`               | Set the default brain.                                                   |
| `csb rm [<name>…]`             | Delete one or more brains. Interactive multi-select if no name is given. |
| `csb path [qmd\|config\|root]` | Print a path for the default (or named) brain.                           |
| `csb qmd [flags] <qmd args…>`  | Run `qmd` against the default (or named) brain.                          |
| `csb exec [flags] -- <cmd…>`   | Run a command inside the default (or named) brain's directory.           |
| `csb doctor`                   | Verify your setup and suggest fixes.                                     |
| `csb help [<command>]`         | Show usage for a command.                                                |

`ls` is also available as `list`; `rm` as `remove`; `use` as `default` or `switch`.

Every subcommand accepts `--help` / `-h` for usage details:

```bash
csb path --help
csb rm --help
csb qmd --help
```

### Create a brain

```bash
csb                     # interactive — prompts for name + remote
csb my-brain            # skip the name prompt
```

Creates the brain at `~/.claude-second-brain/<name>/`, runs `mise install`, `pnpm install`, `pnpm qmd:setup`, `git init`, and registers it in `~/.claude-second-brain/config.toml`. The first brain created is set as the default.

During the interactive flow the CLI asks:

* **Brain name** — defaults to `my-brain`.
* **Git remote** — `GitHub`, `Cloudflare Artifacts`, or `Skip`. See [GitHub](/remotes/github) and [Cloudflare Artifacts](/remotes/cloudflare-artifacts).
* **Repo name** — only shown when a remote is selected; defaults to the brain name.
* **Artifacts namespace** — only shown for Cloudflare; defaults to `default`.
* **Register qmd collections now?** — confirms running `pnpm qmd:setup`.

### List brains

```bash
csb ls
```

Prints each registered brain with its path, creation date, and git remote. The default brain is shown in bold with a `*` marker.

### Set the default brain

```bash
csb use work            # switch default to `work`
csb default work        # alias
csb switch work         # alias
```

Rewrites the `default = "…"` line in `~/.claude-second-brain/config.toml`. Every subsequent command that resolves the default brain — `path`, `qmd`, `exec`, and the global skills (`/brain-ingest`, `/brain-search`, `/brain-refresh`) — uses the new default. Errors if the name isn't registered; run `csb ls` to see the available names.

### Remove a brain

```bash
csb rm my-brain                          # single brain, confirmation prompt
csb rm a b c                             # remove multiple by name
csb rm my-brain --yes                    # skip confirmation (remotes preserved)
csb rm a b --yes --delete-remote         # no prompts; also delete remotes
csb rm a b --yes --keep-remote           # no prompts; keep remotes
csb rm                                   # interactive multi-select picker
```

Deletes each brain's directory under `~/.claude-second-brain/` and removes its entry from `config.toml`. If you remove the default brain and others remain, the first remaining brain becomes the new default.

**Interactive picker.** When no name is passed, the CLI shows a multi-select list — press **space** to toggle a brain, **a** to toggle all, **enter** to confirm.

**Remote deletion.** For each brain with a registered `git_remote` the CLI can also delete the remote repo:

* **GitHub** — runs `gh repo delete <owner>/<repo> --yes` (requires `gh` CLI with `delete_repo` scope).
* **Cloudflare Artifacts** — calls `DELETE /v1/api/namespaces/<ns>/repos/<repo>` using `CLOUDFLARE_API_TOKEN` or a token fetched from `wrangler auth token`.

Behavior depends on the flags:

* **No flag + interactive** — prompts per brain.
* **`--keep-remote`** — never prompts, never deletes remotes.
* **`--delete-remote`** — never prompts, always deletes remotes.
* **`-y` / `--yes` with no remote flag** — remotes are preserved (safe default).

If a remote deletion fails (missing CLI, revoked token, etc.), the CLI prints the exact manual command and continues — the local directory and config entry are still removed.

Flags:

* `-y`, `--yes` — skip the bulk confirmation prompt.
* `--delete-remote` — also delete remotes, no prompting.
* `--keep-remote` — skip remote deletion, no prompting.

### Print a path

```bash
csb path                        # default brain root
csb path qmd                    # default brain's qmd index
csb path config                 # ~/.claude-second-brain/config.toml
csb path qmd --brain work       # a specific brain's qmd index
```

Positional:

* `root` *(default)* — the brain's directory (e.g. `~/.claude-second-brain/my-brain`).
* `qmd` — the brain's qmd SQLite index (e.g. `~/.claude-second-brain/my-brain/.qmd/index.sqlite`).
* `config` — the central config path. Ignores `--brain`.

Flags:

* `--brain <name>` — target a specific brain instead of the default.
* `--root` / `--qmd` / `--config` — **deprecated** flag form. Still supported; prints a warning to stderr.

Used by the global skills (`/brain-ingest`, `/brain-search`, `/brain-refresh`) to resolve paths at call time so they work from any working directory.

### Run qmd against a brain

```bash
csb qmd query -c wiki "distributed systems"
csb qmd --brain work search -c wiki "kafka"
csb qmd -- --brain literal-qmd-flag       # -- is optional; use to pass literal --brain to qmd
```

Forwards all non-`csb` arguments to `npx @tobilu/qmd`, with `INDEX_PATH` set to the resolved brain's qmd index and `cwd` set to the brain's root.

Flags:

* `--brain <name>` — target a specific brain instead of the default.
* `--` — optional separator; everything after it is passed to qmd verbatim. Use only when you need to pass a literal `--brain` (or other `csb`-reserved flag) through to qmd.

### Run a command inside a brain

```bash
csb exec -- pnpm qmd:reindex
csb exec --brain work -- git status
csb exec -- ls
```

Runs any command inside the resolved brain's directory with `INDEX_PATH` pre-set. Useful for vault-local scripts that assume you're cd'd into the brain root.

Flags:

* `--brain <name>` — target a specific brain instead of the default.
* `--` — required separator before the command to run.

### Verify your setup

```bash
csb doctor
```

Checks for:

* Installed tools: `gh` (+ auth status), `mise`, `wrangler` (optional).
* A parseable `~/.claude-second-brain/config.toml`.
* At least one registered brain.
* A resolvable default brain.
* For each brain: the `path` directory exists; the `qmd_index` file exists.

Each failed or warning check prints a `Fix:` hint with the exact command to run. Exits non-zero on failures.

### Exit status

Every command exits non-zero on failure (invalid brain name, missing config, failed doctor check, etc.) and writes the error to stderr.
