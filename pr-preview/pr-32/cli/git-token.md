# csb git-token

Renew the git token for a [Cloudflare Artifacts](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/remotes/cloudflare-artifacts) brain.

## Usage

```bash
csb git-token [<name>] [--ttl <duration>] [--read] [--print]
```

Artifacts git tokens expire. This mints a new repo-scoped token with your `wrangler` login (or `CLOUDFLARE_API_TOKEN`) and saves it as `http.<remote>.extraHeader` in the brain's `.git/config` (local only, never committed), so plain `git push` / `git pull` and obsidian-git work again. See [Renewing the git token](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/remotes/cloudflare-artifacts#renewing-the-git-token).

## Arguments

### name

`string`

Brain to renew. Defaults to the default brain. Same as `--brain`.

```bash
csb git-token my-brain
```

## Options

### --brain \<name>

`string`

Brain to renew, as a flag.

```bash
csb git-token --brain my-brain
```

### --ttl \<duration>

`string` (default: `90d`)

Token lifetime: seconds, or `12h`, `90d`, `1y`. Maximum 1 year.

```bash
csb git-token --ttl 1y
```

### --read

`boolean`

Mint a read-only token instead of a write token.

```bash
csb git-token --read
```

### --print

`boolean`

Print the token instead of saving it, for example to use on another machine.

```bash
git -c http.extraHeader="Authorization: Bearer $(csb git-token --print)" pull
```

### -h, --help

Displays help message.

```bash
csb git-token --help
```
