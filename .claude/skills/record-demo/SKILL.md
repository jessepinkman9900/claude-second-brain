---
name: record-demo
description: "Re-record the terminal demo GIF at the top of the README (.github/assets/demo.gif) from .github/assets/demo.tape with vhs, check it frame by frame, and commit it. Use after the setup prompts or output of bin/create.js change, or when the demo looks stale. Trigger phrases: /record-demo, re-record the demo, regenerate the GIF, new demo video, update the README GIF."
argument-hint: "Optional: what changed (e.g. 'new prompt for X') so the tape can be updated first"
---

# Record Demo

Re-records `.github/assets/demo.gif`, the ~30 second terminal recording of `npx claude-second-brain` that the root README shows on its first screen. The source of truth is `.github/assets/demo.tape`, a [vhs](https://github.com/charmbracelet/vhs) script.

The tape is safe to run on a real machine. Its hidden setup `npm pack`s the current checkout, installs the tarball into a temp `HOME` with its own npm prefix, and sets a throwaway git identity, so it never touches the real `~/.claude-second-brain`, `~/.agents/skills` or `~/.claude/skills`. It records whatever is checked out, so pull the branch you want to show first.

## Step 1: Check the tools

```bash
vhs --version && ttyd --version && ffmpeg -version | head -1
```

If any are missing:

- **macOS:** `brew install vhs` (pulls in ttyd and ffmpeg).
- **Linux:** download the vhs and ttyd release binaries from GitHub (`charmbracelet/vhs`, `tsl0922/ttyd`), install ffmpeg from the package manager, and put them on `PATH`. vhs drives a headless Chromium. If it can't find one, symlink an existing Chrome or Chromium binary as `chromium` on `PATH`.

The repo's own dependencies must be installed too (`pnpm install`), since the tape runs `npm pack`.

## Step 2: Update the tape if the CLI changed

Read the prompts in `createBrain()` in `bin/create.js` and compare them with the keystrokes in `demo.tape`. Today the tape answers:

1. **Name of the brain?** types `my-brain`.
2. **Where to host the Git remote?** presses Down twice to reach "Skip".
3. **Register qmd collections?** presses Enter (Yes).
4. **Install skills for which agents?** presses Enter (keeps Claude Code preselected).

If a prompt was added, removed or reordered, change the keystrokes to match. Keep the remote on "Skip": GitHub and Cloudflare need real accounts and would make the recording interactive. If you pass the user's notes as an argument, start from what they say changed.

## Step 3: Record

From the repo root:

```bash
vhs .github/assets/demo.tape
```

It takes about 1 to 2 minutes, most of it the hidden install. Recording overwrites `.github/assets/demo.gif`.

## Step 4: Check the GIF frame by frame

Don't trust a recording you haven't looked at. Build a contact sheet and view it:

```bash
ffprobe -v error -show_entries format=duration -of csv=p=0 .github/assets/demo.gif
ffmpeg -y -v error -i .github/assets/demo.gif -vf "fps=1/3,scale=500:-1,tile=3x4" -frames:v 1 /tmp/demo-sheet.png
ffmpeg -y -v error -sseof -1 -i .github/assets/demo.gif -frames:v 1 /tmp/demo-last.png
```

Open both images and check:

| Check | What good looks like |
|---|---|
| Length | 25 to 35 seconds |
| Prompts | Each answer shows the expected value (my-brain, Skip, Yes, Claude Code) |
| Spinner | One line that updates in place, never a column of repeated "Installing vault dependencies" lines |
| Errors | No red ✗ steps, stack traces or "failed" messages |
| Ending | The last frame shows the full **Next steps** box and "Happy knowledge building!" |
| Size | Under about 2 MB (`ls -la .github/assets/demo.gif`) |

Fix and re-record when something is off:

- **Ends before Next steps:** raise the `Sleep` after the last Enter (install time varies with network and cache).
- **Long still tail:** lower that same `Sleep`.
- **Spinner prints a new line every tick:** a spinner message is wider than the terminal. Fix the message width in `bin/create.js` (see `runStep`) rather than widening the tape, because real users hit the same bug.
- **Hidden setup leaks into the recording:** raise the `Sleep` inside the `Hide` block.

## Step 5: Commit

```bash
git add .github/assets/demo.gif .github/assets/demo.tape
git commit -m "docs: re-record the README demo GIF"
```

Commit any `bin/create.js` fix as its own commit before the GIF. The README already points at `.github/assets/demo.gif`, so it needs no change unless the path moves.
