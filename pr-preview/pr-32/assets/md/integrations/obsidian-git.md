# obsidian-git

Every vault ships with the [obsidian-git](https://github.com/Vinzent03/obsidian-git) community plugin installed and enabled. While Obsidian is open, it commits your changes and syncs them with the brain's git remote ([GitHub](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/remotes/github) or [Cloudflare Artifacts](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/remotes/cloudflare-artifacts)). Changes your agent pushes from another machine show up in Obsidian without a manual `git pull`.

## Default settings

The plugin's settings live in `.obsidian/plugins/obsidian-git/data.json`:

| Setting | Value | What it does |
|---|---|---|
| Auto commit-and-sync interval | 5 minutes | Commits every change, then pulls and pushes |
| Auto commit after file change | on | The 5-minute timer starts after you stop editing |
| Auto pull interval | 5 minutes | Pulls from the remote |
| Pull on startup | on | Pulls when Obsidian opens the vault |
| Pull before push | on | Avoids rejected pushes |
| Sync method | rebase | Keeps history linear |
| Commit message | `vault backup: {{date}}` | Used for automatic commits |

Change any of these in **Settings → Community plugins → Git**.

## Authentication

obsidian-git uses the vault's own git config, so it works wherever `git push` works in a terminal:

* **GitHub**: your usual git credentials (`gh auth login` sets these up).
* **Cloudflare Artifacts**: the token setup saves in `.git/config`. It lasts 90 days. When pushes start failing, run [`csb git-token`](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/cli/git-token).

## Working alongside your agent

Your agent and obsidian-git commit to the same repository. That's fine as long as both pull before they push, which obsidian-git does by default.

* After an ingest, commit and push from the agent's session, or wait for obsidian-git's next sync.
* If a rebase stops on a conflict, obsidian-git shows an error notice. Fix it in a terminal (`git status`, resolve, `git rebase --continue`), or ask your agent to do it.

## Turn it off

To sync by hand instead, disable **Git** in **Settings → Community plugins**. Or keep it on and set the intervals to `0`, then use the command palette (**Git: Commit-and-sync**) when you want.
