# iCloud sync

Obsidian on iPhone and iPad opens vaults stored in **iCloud Drive → Obsidian**. The reliable way to get your brain there is a **second clone** of its git repo in that folder, kept in sync by [obsidian-git](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-34/integrations/obsidian-git) on your Mac. Your phone reads it through iCloud and never runs git.

## Why not just move the brain into iCloud?

Putting the brain itself in iCloud Drive causes trouble:

* iCloud syncs `.git` file by file, and can leave conflicted copies inside it that corrupt the repo.
* `node_modules` and the qmd index (`.qmd/`) would be uploaded to iCloud and downloaded to your phone, which doesn't need them.
* obsidian-git's mobile support is described by its author as very unstable, and it can't use the `rebase` sync method the vault ships with.

A second clone avoids all three: its `.git` lives outside iCloud, it has no `node_modules` or index, and only your Mac runs git.

## How it fits together

* Your **agent** works in the brain as usual (`~/.claude-second-brain/<name>`) and pushes to the git remote.
* **Obsidian on your Mac** opens the iCloud clone. obsidian-git there pulls the agent's changes, and commits and pushes anything you edit, including edits made on your phone.
* **iCloud** copies the clone's notes to your iPhone and iPad.

## Set it up

On your Mac, with Obsidian installed on a device signed in to the same iCloud account (that creates the `iCloud~md~obsidian` folder):

```bash
ICLOUD=~/Library/Mobile\ Documents/iCloud~md~obsidian/Documents
BRAIN="$(csb path)"                                   # or: csb path --brain <name>
REMOTE="$(git -C "$BRAIN" remote get-url origin)"

# Clone into iCloud, but keep the .git folder outside it
git clone --separate-git-dir ~/.claude-second-brain/.icloud-git/my-brain "$REMOTE" "$ICLOUD/my-brain"
```

For a [Cloudflare Artifacts](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-34/remotes/cloudflare-artifacts) remote, the clone needs the brain's git token. Copy it from the brain's config before cloning, and save it in the clone afterwards:

```bash
HEADER="$(git -C "$BRAIN" config --get "http.$REMOTE.extraHeader")"
git -c http.extraHeader="$HEADER" clone --separate-git-dir ~/.claude-second-brain/.icloud-git/my-brain "$REMOTE" "$ICLOUD/my-brain"
git -C "$ICLOUD/my-brain" config "http.$REMOTE.extraHeader" "$HEADER"
```

When the token expires, run [`csb git-token`](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-34/cli/git-token) and copy the header again.

Then:

1. In Obsidian on your Mac, **Open folder as vault** and pick the clone in iCloud Drive → Obsidian. obsidian-git is already on.
2. On your iPhone or iPad, open Obsidian and choose the vault from the iCloud list.
3. On the phone, open **Settings → Git**, and under **Advanced** turn on **Disable on this device**. That setting is stored per device, so the Mac keeps syncing.

## Tips

* Edits on your phone reach git the next time your Mac is awake, iCloud has synced, and obsidian-git commits (5 minutes after the last change).
* In Finder, right-click the clone and choose **Keep Downloaded**, so "Optimize Mac Storage" doesn't offload notes.
* Don't turn on Obsidian Sync for this vault as well. Two sync systems on one vault fight over the same files.
* Not on Apple devices? Clone the repo on each device instead, or use obsidian-git's mobile support (switch its sync method to **Merge**, and expect rough edges).
