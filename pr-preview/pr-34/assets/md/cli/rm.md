# csb rm

Remove one or more brains.

## Usage

```bash
csb rm [<name>…] [-y] [--delete-remote | --keep-remote]
```

Alias: `csb remove`.

Deletes each brain's directory under `~/.claude-second-brain/` and removes its entry from `config.toml`. If you remove the default brain and others remain, the first remaining brain becomes the new default.

## Arguments

### name

`string[]`

One or more brains to remove. Without a name, the CLI shows a multi-select picker: press **space** to toggle a brain, **a** to toggle all, **enter** to confirm.

```bash
csb rm a b c
```

## Options

### -y, --yes

`boolean`

Skip the confirmation prompt. On its own it keeps remotes (safe default).

```bash
csb rm my-brain --yes
```

### --delete-remote

`boolean`

Also delete each brain's remote, without prompting. Can't be combined with `--keep-remote`.

```bash
csb rm a b --yes --delete-remote
```

### --keep-remote

`boolean`

Keep each brain's remote, without prompting.

```bash
csb rm a b --yes --keep-remote
```

### -h, --help

Displays help message.

```bash
csb rm --help
```

## Remote deletion

For each brain with a registered `git_remote`, the CLI can also delete the remote repo:

* **GitHub**: runs `gh repo delete <owner>/<repo> --yes` (needs the `gh` CLI with the `delete_repo` scope).
* **Cloudflare Artifacts**: calls `DELETE https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/artifacts/namespaces/<ns>/repos/<repo>` with `CLOUDFLARE_API_TOKEN` or a token from `wrangler auth token`.

| Flags | Remotes |
|---|---|
| none (interactive) | Prompts per brain |
| `--keep-remote` | Kept, no prompt |
| `--delete-remote` | Deleted, no prompt |
| `-y` without a remote flag | Kept |

If a remote deletion fails (missing CLI, revoked token, …), the CLI prints the exact manual command and continues. The local directory and config entry are still removed.
