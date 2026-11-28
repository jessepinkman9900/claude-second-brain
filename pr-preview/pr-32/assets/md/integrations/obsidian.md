# Obsidian

Every brain is an [Obsidian](https://obsidian.md) vault. There's nothing to import: open the folder and the wiki your agent maintains is there, with working links, backlinks and graph view.

## Open your brain

1. Find the brain's folder: `csb path` (for example `~/.claude-second-brain/my-brain`).
2. In Obsidian, choose **Open folder as vault** and pick that folder.
3. Trust the vault's plugins when Obsidian asks, so the bundled [obsidian-git](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/integrations/obsidian-git) plugin can run.

## What's preconfigured

The vault ships with a `.obsidian/` folder, so a fresh brain opens ready to use:

* **Core plugins on**: file explorer, search, quick switcher, graph view, backlinks, outgoing links, tags, properties, page preview, outline, daily notes, templates, bookmarks, canvas and file recovery.
* **Community plugin**: [obsidian-git](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/integrations/obsidian-git), set to commit, pull and push on its own.
* **Obsidian Sync and Publish off**: the brain syncs through git (and optionally [iCloud](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/integrations/icloud)).

## How the wiki looks in Obsidian

The schema in `CLAUDE.md` is written for Obsidian:

* Agents link pages with `[[wiki/page]]` wikilinks, so **backlinks** and **graph view** show how topics, entities and sources connect.
* Every wiki page has YAML frontmatter (`type`, `tags`, `sources`, `related`, `updated`), which shows up in the **properties** panel and the **tag pane**.
* Contradictions are `> [!WARNING] Contradiction` callouts, which Obsidian renders as warning boxes.

See [Wiki Folder Structure](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/concepts/schema) for the page types and frontmatter.

## Who edits what

* `wiki/` belongs to your agent. Read it in Obsidian, but let the agent write it, so the index, log and cross-links stay consistent.
* `raw-sources/` is where you drop articles, PDFs and notes for the agent to ingest. Agents never change it.
* Anything else you keep in the vault (daily notes, ideas, …) is yours. Agents never touch it.
