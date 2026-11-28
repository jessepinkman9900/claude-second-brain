# csb use

Set the default brain.

## Usage

```bash
csb use <name>
```

Aliases: `csb default`, `csb switch`.

Rewrites the `default = "…"` line in `~/.claude-second-brain/config.toml`. Every later command that resolves the default brain uses the new one: [`csb path`](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/cli/path), [`csb qmd`](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/cli/qmd), [`csb exec`](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/cli/exec), and the global skills (`/brain-ingest`, `/brain-search`, `/brain-refresh`).

## Arguments

### name

`string` (required)

A registered brain. Errors if the name isn't registered; run [`csb ls`](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/cli/ls) to see the available names.

```bash
csb use work
```

## Options

### -h, --help

Displays help message.

```bash
csb use --help
```
