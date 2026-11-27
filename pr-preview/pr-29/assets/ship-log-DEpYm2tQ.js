import{u as d,j as e}from"./index-9vrBt_O-.js";const l={title:"Ship log",description:"undefined"};function i(s){const n={a:"a",code:"code",div:"div",h1:"h1",h2:"h2",header:"header",li:"li",p:"p",strong:"strong",ul:"ul",...d(),...s.components};return e.jsxs(e.Fragment,{children:[e.jsx(n.header,{children:e.jsxs(n.h1,{id:"ship-log",children:["Ship log",e.jsx(n.a,{"aria-hidden":"true",tabIndex:"-1",href:"#ship-log",children:e.jsx(n.div,{"data-autolink-icon":!0})})]})}),`
`,e.jsxs(n.p,{children:["A running record of every released version of ",e.jsx(n.code,{children:"claude-second-brain"})," on npm. Newest releases first. For auto-generated notes and tags, see the ",e.jsx(n.a,{href:"https://github.com/jessepinkman9900/claude-second-brain/releases",children:"GitHub releases"})," page."]}),`
`,e.jsxs(n.h2,{id:"v122--2026-11-27",children:["v1.2.2 — 2026-11-27",e.jsx(n.a,{"aria-hidden":"true",tabIndex:"-1",href:"#v122--2026-11-27",children:e.jsx(n.div,{"data-autolink-icon":!0})})]}),`
`,e.jsx(n.p,{children:"npm package metadata only. No CLI or template changes."}),`
`,e.jsxs(n.ul,{children:[`
`,e.jsxs(n.li,{children:["Added npm ",e.jsx(n.code,{children:"keywords"})," matching the GitHub repo topics (",e.jsx(n.code,{children:"ai"}),", ",e.jsx(n.code,{children:"amp"}),", ",e.jsx(n.code,{children:"claude-code"}),", ",e.jsx(n.code,{children:"codex"}),", ",e.jsx(n.code,{children:"cursor"}),", ",e.jsx(n.code,{children:"github"}),", ",e.jsx(n.code,{children:"knowledge-base"}),", ",e.jsx(n.code,{children:"knowledge-graph"}),", ",e.jsx(n.code,{children:"knowledge-management"}),", ",e.jsx(n.code,{children:"llm"}),", ",e.jsx(n.code,{children:"obsidian"}),", ",e.jsx(n.code,{children:"obsidian-vault"}),", ",e.jsx(n.code,{children:"qmd"}),", ",e.jsx(n.code,{children:"second-brain"}),") so the package is searchable on npmjs.com."]}),`
`,e.jsxs(n.li,{children:["npm ",e.jsx(n.code,{children:"homepage"})," now points to the ",e.jsx(n.a,{href:"https://jessepinkman9900.github.io/claude-second-brain",children:"docs site"})," instead of the GitHub README, and ",e.jsx(n.code,{children:"bugs"})," links to GitHub issues."]}),`
`]}),`
`,e.jsxs(n.h2,{id:"v121--2026-11-27",children:["v1.2.1 — 2026-11-27",e.jsx(n.a,{"aria-hidden":"true",tabIndex:"-1",href:"#v121--2026-11-27",children:e.jsx(n.div,{"data-autolink-icon":!0})})]}),`
`,e.jsx(n.p,{children:"Maintenance release: security updates and a tokenless release pipeline. No CLI or template changes."}),`
`,e.jsx(n.strong,{children:"Security:"}),`
`,e.jsxs(n.ul,{children:[`
`,e.jsxs(n.li,{children:["Refreshed dependencies to clear all Dependabot alerts (",e.jsx(n.code,{children:"pnpm audit"}),": 106 → 0). ",e.jsx(n.code,{children:"@clack/prompts"})," is now ",e.jsx(n.code,{children:"^1.9.0"}),"; transitive docs-site deps (hono, vite, mermaid, dompurify, …) resolve to patched versions, with pnpm overrides for ",e.jsx(n.code,{children:"toml"}),", ",e.jsx(n.code,{children:"katex"})," and ",e.jsx(n.code,{children:"@hono/node-server"}),"."]}),`
`,e.jsxs(n.li,{children:["Removed the stale ",e.jsx(n.code,{children:"package-lock.json"}),"; the repo uses pnpm only."]}),`
`]}),`
`,e.jsx(n.strong,{children:"Release pipeline:"}),`
`,e.jsxs(n.ul,{children:[`
`,e.jsxs(n.li,{children:["npm releases use ",e.jsx(n.a,{href:"https://docs.npmjs.com/trusted-publishers",children:"trusted publishing"})," (OIDC) from ",e.jsx(n.code,{children:"release-publish.yml"})," with ",e.jsx(n.code,{children:"--provenance"}),", so no ",e.jsx(n.code,{children:"NPM_TOKEN"})," is stored in the repo. npm comes from ",e.jsx(n.code,{children:"mise.toml"})," (11.21.2; trusted publishing needs 11.5.1+). v1.2.0 was the first release published this way."]}),`
`]}),`
`,e.jsx(n.strong,{children:"CI:"}),`
`,e.jsxs(n.ul,{children:[`
`,e.jsx(n.li,{children:"Docs workflows install Playwright browsers from the locked version (1.65.1)."}),`
`]}),`
`,e.jsxs(n.h2,{id:"v120--2026-11-27",children:["v1.2.0 — 2026-11-27",e.jsx(n.a,{"aria-hidden":"true",tabIndex:"-1",href:"#v120--2026-11-27",children:e.jsx(n.div,{"data-autolink-icon":!0})})]}),`
`,e.jsxs(n.p,{children:["Works with any agent, not just Claude Code, plus a faster, unattended setup and first-class Cloudflare Artifacts git tokens. Existing installs: run ",e.jsx(n.code,{children:"csb skills"})," once to move global skills from ",e.jsx(n.code,{children:"~/.claude/skills"})," to ",e.jsx(n.code,{children:"~/.agents/skills"})," (the old copies become symlinks)."]}),`
`,e.jsx(n.strong,{children:"Agents:"}),`
`,e.jsxs(n.ul,{children:[`
`,e.jsxs(n.li,{children:["Skills install for any ",e.jsx(n.a,{href:"https://agentskills.io",children:"Agent Skills"})," agent, with the same layout as ",e.jsx(n.code,{children:"npx skills"}),": global skills are written once to ",e.jsx(n.code,{children:"~/.agents/skills/<name>"})," and symlinked into agent-specific dirs (",e.jsx(n.code,{children:"~/.claude/skills"}),", ",e.jsx(n.code,{children:"~/.codeium/windsurf/skills"}),", ",e.jsx(n.code,{children:"~/.config/goose/skills"}),", …). Supported: Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot, OpenCode, Amp, Cline, Windsurf, Goose, Kiro CLI, Roo Code, Continue, Junie, Augment."]}),`
`,e.jsxs(n.li,{children:["Vault-local skills (",e.jsx(n.code,{children:"brain-rebuild"}),", ",e.jsx(n.code,{children:"lint"}),") are copied into each selected agent's project skills dir (",e.jsx(n.code,{children:".agents/skills/"}),", ",e.jsx(n.code,{children:".windsurf/skills/"}),", …)."]}),`
`,e.jsxs(n.li,{children:["New ",e.jsx(n.code,{children:"--agent, -a <ids>"})," (comma-separated or ",e.jsx(n.code,{children:"all"}),") and ",e.jsx(n.code,{children:"CSB_AGENTS"})," to pick agents; ",e.jsx(n.code,{children:"--copy"})," to copy instead of symlink. Interactive setup preselects Claude Code plus every detected agent."]}),`
`,e.jsxs(n.li,{children:["New ",e.jsx(n.code,{children:"csb skills [--agent <ids>] [--copy] [--brain <name>]"})," to add agents or update skills later, and ",e.jsx(n.code,{children:"csb skills --list"})," to show supported agents and their skills dirs."]}),`
`,e.jsxs(n.li,{children:["New vaults ship an ",e.jsx(n.code,{children:"AGENTS.md"})," that points Codex, Cursor, Copilot and other agents at ",e.jsx(n.code,{children:"CLAUDE.md"}),"."]}),`
`,e.jsxs(n.li,{children:["The ",e.jsx(n.strong,{children:"Next steps"})," box shows how to open each agent you picked (",e.jsx(n.code,{children:"claude"}),", ",e.jsx(n.code,{children:"codex"}),", ",e.jsx(n.code,{children:"cursor ."}),", …)."]}),`
`]}),`
`,e.jsx(n.strong,{children:"Setup:"}),`
`,e.jsxs(n.ul,{children:[`
`,e.jsx(n.li,{children:"All prompts, including the qmd-registration question, are asked up front; the rest runs unattended."}),`
`,e.jsx(n.li,{children:"Long steps show a live spinner with elapsed time and the latest output line."}),`
`,e.jsxs(n.li,{children:["If ",e.jsx(n.code,{children:"pnpm"})," 10+ is on your ",e.jsx(n.code,{children:"PATH"}),", it's used directly; otherwise the CLI installs mise and fetches node + pnpm. ",e.jsx(n.code,{children:"CSB_USE_MISE=1"})," forces mise."]}),`
`,e.jsxs(n.li,{children:["The git-remote picker shows GitHub / Cloudflare logos as Nerd Font glyphs in Ghostty, WezTerm and kitty, emoji elsewhere. Override with ",e.jsx(n.code,{children:"CSB_ICONS=nerd|emoji|none"}),"."]}),`
`,e.jsxs(n.li,{children:["If the remote can't be created or pushed, the brain is still created locally, the problem and fix are listed in ",e.jsx(n.strong,{children:"Next steps"}),", and the CLI exits 1."]}),`
`]}),`
`,e.jsx(n.strong,{children:"Cloudflare Artifacts:"}),`
`,e.jsxs(n.ul,{children:[`
`,e.jsxs(n.li,{children:["Switched to the account-scoped REST API (",e.jsx(n.code,{children:"api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/artifacts/…"}),"); the old ",e.jsx(n.code,{children:"artifacts.cloudflare.net/v1/api"})," host is no longer used. Set ",e.jsx(n.code,{children:"CLOUDFLARE_ACCOUNT_ID"})," when your login can see more than one account."]}),`
`,e.jsx(n.li,{children:"A deleted or inactive namespace is recreated automatically before the repo is created."}),`
`,e.jsxs(n.li,{children:["Setup now saves a 90-day git token in the vault's ",e.jsx(n.code,{children:".git/config"})," (",e.jsx(n.code,{children:"http.<remote>.extraHeader"}),"), so ",e.jsx(n.code,{children:"git push"})," / ",e.jsx(n.code,{children:"git pull"})," and obsidian-git just work. No more 24-hour token to copy."]}),`
`,e.jsxs(n.li,{children:["New ",e.jsx(n.code,{children:"csb git-token [<name>] [--ttl <duration>] [--read] [--print]"})," renews it (default 90 days, max 1 year), replacing the manual ",e.jsx(n.code,{children:"curl"})," renewal."]}),`
`]}),`
`,e.jsx(n.strong,{children:"Other:"}),`
`,e.jsxs(n.ul,{children:[`
`,e.jsxs(n.li,{children:[e.jsx(n.code,{children:"csb doctor"})," accepts system pnpm 10+ in place of mise and checks that the global skills in ",e.jsx(n.code,{children:"~/.agents/skills"})," match the installed release."]}),`
`,e.jsx(n.li,{children:'README, docs and package description say "any agent" and "git" (GitHub, Cloudflare Artifacts, or any remote) instead of Claude Code and GitHub only.'}),`
`,e.jsx(n.li,{children:'"Claude reads it" and similar wording is now agent-neutral, and "Access from anywhere" covers any local or cloud agent and any git host.'}),`
`]}),`
`,e.jsxs(n.h2,{id:"v110--2026-04-19",children:["v1.1.0 — 2026-04-19",e.jsx(n.a,{"aria-hidden":"true",tabIndex:"-1",href:"#v110--2026-04-19",children:e.jsx(n.div,{"data-autolink-icon":!0})})]}),`
`,e.jsxs(n.p,{children:["CLI UX pass. Every addition is non-breaking — the ",e.jsx(n.code,{children:"--"})," in ",e.jsx(n.code,{children:"csb qmd -- …"})," and the ",e.jsx(n.code,{children:"path --qmd"})," / ",e.jsx(n.code,{children:"--config"})," / ",e.jsx(n.code,{children:"--root"})," flag form continue to work, with a stderr deprecation notice on the flag form."]}),`
`,e.jsx(n.strong,{children:"CLI:"}),`
`,e.jsxs(n.ul,{children:[`
`,e.jsxs(n.li,{children:["Added ",e.jsx(n.code,{children:"csb use <name>"})," (aliases ",e.jsx(n.code,{children:"default"}),", ",e.jsx(n.code,{children:"switch"}),") to set the default brain without editing ",e.jsx(n.code,{children:"~/.claude-second-brain/config.toml"}),". Runs the same header-rewrite path as ",e.jsx(n.code,{children:"csb rm"}),"."]}),`
`,e.jsxs(n.li,{children:["Added ",e.jsx(n.code,{children:"csb exec [--brain <name>] -- <cmd…>"})," — runs any command inside the resolved brain's directory with ",e.jsx(n.code,{children:"INDEX_PATH"})," pre-set. ",e.jsx(n.code,{children:"csb qmd"})," now delegates to the same helper."]}),`
`,e.jsxs(n.li,{children:["Added ",e.jsx(n.code,{children:"csb doctor"})," — checks for ",e.jsx(n.code,{children:"gh"})," (+ auth), ",e.jsx(n.code,{children:"mise"}),", ",e.jsx(n.code,{children:"wrangler"}),", the central config, each brain's ",e.jsx(n.code,{children:"path"})," and ",e.jsx(n.code,{children:"qmd_index"}),", and whether the default brain resolves. Prints a ",e.jsx(n.code,{children:"Fix:"})," hint under each failed check."]}),`
`,e.jsxs(n.li,{children:[e.jsx(n.code,{children:"csb path"})," now accepts positional subcommands: ",e.jsx(n.code,{children:"csb path [qmd|config|root]"}),". The ",e.jsx(n.code,{children:"--qmd"})," / ",e.jsx(n.code,{children:"--config"})," / ",e.jsx(n.code,{children:"--root"})," flag form still works with a stderr deprecation warning."]}),`
`,e.jsxs(n.li,{children:["Every subcommand routes ",e.jsx(n.code,{children:"--help"})," / ",e.jsx(n.code,{children:"-h"})," to its own topic help. ",e.jsx(n.code,{children:"csb help <command>"})," also prints per-command help. Top-level help shows the config path and current default brain."]}),`
`,e.jsxs(n.li,{children:[e.jsx(n.code,{children:"csb rm"})," gained ",e.jsx(n.code,{children:"--delete-remote"})," and ",e.jsx(n.code,{children:"--keep-remote"})," for scripting. Under ",e.jsx(n.code,{children:"-y"})," with neither flag, remotes are preserved (safe default)."]}),`
`,e.jsxs(n.li,{children:[e.jsx(n.code,{children:"resolveBrain()"})," error now points to ",e.jsx(n.code,{children:"csb use <name>"})," as the fix."]}),`
`]}),`
`,e.jsxs(n.h2,{id:"v100--2026-04-19",children:["v1.0.0 — 2026-04-19",e.jsx(n.a,{"aria-hidden":"true",tabIndex:"-1",href:"#v100--2026-04-19",children:e.jsx(n.div,{"data-autolink-icon":!0})})]}),`
`,e.jsxs(n.p,{children:["First major release. Brains now live at ",e.jsx(n.code,{children:"~/.claude-second-brain/<name>/"})," (not the repo root), and global skills resolve paths at call time via new CLI subcommands instead of baked-in paths. Existing single-brain installs: re-run ",e.jsx(n.code,{children:"npx claude-second-brain <name>"})," to migrate. Legacy ",e.jsx(n.code,{children:"active = …"})," in ",e.jsx(n.code,{children:"config.toml"})," is auto-rewritten to ",e.jsx(n.code,{children:"default = …"}),"."]}),`
`,e.jsx(n.strong,{children:"CLI:"}),`
`,e.jsxs(n.ul,{children:[`
`,e.jsxs(n.li,{children:["Added ",e.jsx(n.code,{children:"claude-second-brain path [--brain N] [--root|--qmd|--config]"})," and ",e.jsx(n.code,{children:"claude-second-brain qmd [--brain N] -- …"})," subcommands. The global skills now resolve paths at call time via these commands instead of having absolute paths baked in at scaffold time."]}),`
`,e.jsxs(n.li,{children:["Added ",e.jsx(n.code,{children:"claude-second-brain rm [<name>…]"})," with multi-select (space to toggle) and a follow-up prompt to delete the git remote."]}),`
`,e.jsxs(n.li,{children:[e.jsx(n.code,{children:"config.toml"}),"'s ",e.jsx(n.code,{children:"active"})," field renamed to ",e.jsx(n.code,{children:"default"}),". Existing configs with ",e.jsx(n.code,{children:"active = …"})," are still read transparently and rewritten to ",e.jsx(n.code,{children:"default = …"})," on the next write."]}),`
`,e.jsxs(n.li,{children:["Global skills (",e.jsx(n.code,{children:"brain-ingest"}),", ",e.jsx(n.code,{children:"brain-search"}),", ",e.jsx(n.code,{children:"brain-refresh"}),") now ship with a ",e.jsx(n.code,{children:".csb-version"})," sidecar file. Re-running ",e.jsx(n.code,{children:"npx claude-second-brain <name>"})," detects version mismatches and prompts before overwriting; ",e.jsx(n.code,{children:"CSB_SKIP_SKILL_UPDATES=1"})," disables the prompt."]}),`
`,e.jsxs(n.li,{children:[e.jsx(n.code,{children:"npx claude-second-brain"})," now auto-registers qmd collections during scaffold — no manual ",e.jsx(n.code,{children:"/setup"})," step needed afterwards."]}),`
`,e.jsxs(n.li,{children:["Added ",e.jsx(n.code,{children:"csb"})," as a bin alias. After ",e.jsx(n.code,{children:"npm i -g claude-second-brain"}),", both ",e.jsx(n.code,{children:"claude-second-brain"})," and ",e.jsx(n.code,{children:"csb"})," are available globally."]}),`
`]}),`
`,e.jsx(n.strong,{children:"Skills:"}),`
`,e.jsxs(n.ul,{children:[`
`,e.jsxs(n.li,{children:["Removed ",e.jsx(n.code,{children:"/setup"})," and ",e.jsx(n.code,{children:"/qmd-cli"})," — their responsibilities are absorbed by ",e.jsx(n.code,{children:"create.js"})," (auto-registration) and ",e.jsx(n.code,{children:"/brain-refresh"})," / the ",e.jsx(n.code,{children:"csb qmd"})," proxy respectively."]}),`
`,e.jsxs(n.li,{children:["Added ",e.jsx(n.code,{children:"/update-workflows"})," to audit ",e.jsx(n.code,{children:"pack-test.yml"})," drift against current repo state."]}),`
`,e.jsxs(n.li,{children:["Split ",e.jsx(n.code,{children:"/release"})," into ",e.jsx(n.code,{children:"/package-release"})," (version bump + PR) and an orchestrator ",e.jsx(n.code,{children:"/release"})," that additionally runs ",e.jsx(n.code,{children:"/update-workflows"})," and ",e.jsx(n.code,{children:"/update-docs"}),"."]}),`
`]}),`
`,e.jsx(n.strong,{children:"Refactors:"}),`
`,e.jsxs(n.ul,{children:[`
`,e.jsxs(n.li,{children:["Removed the ",e.jsx(n.code,{children:"__QMD_PATH__"})," and ",e.jsx(n.code,{children:"__CSB_CONFIG__"})," placeholder substitutions. ",e.jsx(n.code,{children:"scripts/qmd/{setup,reindex}.ts"})," now compute the index path from ",e.jsx(n.code,{children:"import.meta.url"}),"; CLAUDE.md and vault-local skills use a relative ",e.jsx(n.code,{children:".qmd/index.sqlite"})," path."]}),`
`,e.jsxs(n.li,{children:[e.jsx(n.code,{children:"patchVault()"})," now only substitutes ",e.jsx(n.code,{children:"__BRAIN_NAME__"})," in ",e.jsx(n.code,{children:"template/README.md"}),". Global skills ship unmodified from the template."]}),`
`]}),`
`,e.jsx(n.strong,{children:"Fixes:"}),`
`,e.jsxs(n.ul,{children:[`
`,e.jsxs(n.li,{children:[e.jsx(n.code,{children:"writeConfig()"})," now writes ",e.jsx(n.code,{children:"default = …"})," when upserting into a pre-existing empty or default-less ",e.jsx(n.code,{children:"config.toml"}),". Previously a zero-byte ",e.jsx(n.code,{children:"config.toml"})," blocked the field from being written and left CLI subcommands unable to resolve a default brain."]}),`
`,e.jsxs(n.li,{children:[e.jsx(n.code,{children:"pnpm qmd:setup"}),' failures during scaffolding now surface captured stderr (last ~10 lines) instead of a generic "failed" message.']}),`
`,e.jsxs(n.li,{children:[e.jsx(n.code,{children:"template/scripts/qmd/{setup,reindex}.ts"})," wrap their bodies in ",e.jsx(n.code,{children:"try/catch"})," that prints a tagged error with vault + db paths and exits 1, replacing silent unhandled rejections."]}),`
`,e.jsxs(n.li,{children:[e.jsx(n.code,{children:"resolveBrain()"})," errors now list available brain names and include a fix hint."]}),`
`]}),`
`,e.jsx(n.strong,{children:"Docs:"}),`
`,e.jsxs(n.ul,{children:[`
`,e.jsxs(n.li,{children:["Getting-started, per-skill docs, and vocs sidebar updated to reflect the 5-skill surface (",e.jsx(n.code,{children:"brain-ingest"}),", ",e.jsx(n.code,{children:"brain-search"}),", ",e.jsx(n.code,{children:"brain-refresh"}),", ",e.jsx(n.code,{children:"brain-rebuild"}),", ",e.jsx(n.code,{children:"lint"}),")."]}),`
`,e.jsxs(n.li,{children:["Documented ",e.jsx(n.code,{children:"rm"})," multi-select and remote-deletion prompts."]}),`
`,e.jsxs(n.li,{children:[e.jsx(n.code,{children:"/setup"})," skill reference removed from quick-start in favor of ",e.jsx(n.code,{children:"pnpm qmd:reindex"}),"."]}),`
`]}),`
`,e.jsxs(n.h2,{id:"v060--2026-04-17",children:["v0.6.0 — 2026-04-17",e.jsx(n.a,{"aria-hidden":"true",tabIndex:"-1",href:"#v060--2026-04-17",children:e.jsx(n.div,{"data-autolink-icon":!0})})]}),`
`,e.jsx(n.strong,{children:"Features:"}),`
`,e.jsxs(n.ul,{children:[`
`,e.jsxs(n.li,{children:["Added Cloudflare Artifacts as an alternate Git remote option during ",e.jsx(n.code,{children:"npx claude-second-brain"})," setup. The CLI authenticates via wrangler, creates a repo via the Artifacts API, and pushes the initial commit automatically."]}),`
`]}),`
`,e.jsx(n.strong,{children:"CLI UX:"}),`
`,e.jsxs(n.ul,{children:[`
`,e.jsx(n.li,{children:"qmd index path prompt now appears before the Git remote selection."}),`
`,e.jsxs(n.li,{children:["Global Claude skills are installed right after ",e.jsx(n.code,{children:"pnpm install"}),", before git init. Install path is shown with ",e.jsx(n.code,{children:"~/..."})," notation."]}),`
`,e.jsxs(n.li,{children:["qmd index prompt placeholder and default value display ",e.jsx(n.code,{children:"~/..."})," instead of the full home directory path."]}),`
`]}),`
`,e.jsx(n.strong,{children:"Docs:"}),`
`,e.jsxs(n.ul,{children:[`
`,e.jsxs(n.li,{children:["Added a ",e.jsx(n.strong,{children:"Git backends"})," section to the docs site covering GitHub and Cloudflare Artifacts setup."]}),`
`,e.jsxs(n.li,{children:["Added ",e.jsx(n.code,{children:"llms.txt"})," for LLM/AI crawler discoverability."]}),`
`,e.jsxs(n.li,{children:["Docs site now generates ",e.jsx(n.code,{children:".md"})," files alongside HTML pages."]}),`
`]}),`
`,e.jsxs(n.h2,{id:"v051--2026-04-14",children:["v0.5.1 — 2026-04-14",e.jsx(n.a,{"aria-hidden":"true",tabIndex:"-1",href:"#v051--2026-04-14",children:e.jsx(n.div,{"data-autolink-icon":!0})})]}),`
`,e.jsxs(n.ul,{children:[`
`,e.jsx(n.li,{children:"Maintenance release (version bump only)."}),`
`]}),`
`,e.jsxs(n.h2,{id:"v050--2026-04-14",children:["v0.5.0 — 2026-04-14",e.jsx(n.a,{"aria-hidden":"true",tabIndex:"-1",href:"#v050--2026-04-14",children:e.jsx(n.div,{"data-autolink-icon":!0})})]}),`
`,e.jsx(n.strong,{children:"Docs:"}),`
`,e.jsxs(n.ul,{children:[`
`,e.jsx(n.li,{children:"Added a vocs-powered documentation site, deployed to GitHub Pages."}),`
`,e.jsxs(n.li,{children:["Aligned the ",e.jsx(n.code,{children:"package.json"})," description with the README tagline."]}),`
`]}),`
`,e.jsxs(n.h2,{id:"v042--2026-04-14",children:["v0.4.2 — 2026-04-14",e.jsx(n.a,{"aria-hidden":"true",tabIndex:"-1",href:"#v042--2026-04-14",children:e.jsx(n.div,{"data-autolink-icon":!0})})]}),`
`,e.jsx(n.strong,{children:"Features:"}),`
`,e.jsxs(n.ul,{children:[`
`,e.jsxs(n.li,{children:["Added the ",e.jsx(n.code,{children:"/brain-refresh"})," and ",e.jsx(n.code,{children:"/brain-rebuild"})," skills for re-embedding and redesigning the qmd index."]}),`
`]}),`
`,e.jsx(n.strong,{children:"Refactors:"}),`
`,e.jsxs(n.ul,{children:[`
`,e.jsxs(n.li,{children:["Unified every qmd path reference behind the ",e.jsx(n.code,{children:"__QMD_PATH__"})," placeholder and parallelized file patching during scaffold."]}),`
`,e.jsxs(n.li,{children:["CLI version is now read from ",e.jsx(n.code,{children:"package.json"})," instead of being hardcoded."]}),`
`]}),`
`,e.jsx(n.strong,{children:"Fixes:"}),`
`,e.jsxs(n.ul,{children:[`
`,e.jsx(n.li,{children:"Resolved a batch of code smells and factual inconsistencies across the codebase."}),`
`,e.jsxs(n.li,{children:[e.jsx(n.code,{children:"patchVault"})," now surfaces non-",e.jsx(n.code,{children:"ENOENT"})," errors instead of swallowing them."]}),`
`,e.jsx(n.li,{children:"Fixed a failing CI job."}),`
`]}),`
`,e.jsx(n.strong,{children:"Docs:"}),`
`,e.jsxs(n.ul,{children:[`
`,e.jsx(n.li,{children:"Added a unified mermaid architecture diagram to both READMEs."}),`
`,e.jsx(n.li,{children:"Removed generic skills-marketplace boilerplate."}),`
`]}),`
`,e.jsxs(n.h2,{id:"v041--2026-04-14",children:["v0.4.1 — 2026-04-14",e.jsx(n.a,{"aria-hidden":"true",tabIndex:"-1",href:"#v041--2026-04-14",children:e.jsx(n.div,{"data-autolink-icon":!0})})]}),`
`,e.jsx(n.strong,{children:"Refactor:"}),`
`,e.jsxs(n.ul,{children:[`
`,e.jsxs(n.li,{children:["Renamed the ",e.jsx(n.code,{children:"sources/"})," directory to ",e.jsx(n.code,{children:"raw-sources/"})," to eliminate the naming collision with ",e.jsx(n.code,{children:"wiki/sources/"}),"."]}),`
`]}),`
`,e.jsxs(n.h2,{id:"v040--2026-04-14",children:["v0.4.0 — 2026-04-14",e.jsx(n.a,{"aria-hidden":"true",tabIndex:"-1",href:"#v040--2026-04-14",children:e.jsx(n.div,{"data-autolink-icon":!0})})]}),`
`,e.jsx(n.strong,{children:"Features:"}),`
`,e.jsxs(n.ul,{children:[`
`,e.jsxs(n.li,{children:["Renamed the core skills to ",e.jsx(n.code,{children:"brain-ingest"})," and ",e.jsx(n.code,{children:"brain-search"}),", and wired qmd path setup into scaffolding."]}),`
`,e.jsxs(n.li,{children:["Added a GitHub repo creation prompt during ",e.jsx(n.code,{children:"npx claude-second-brain"})," (with a private-repo notice and a fallback that removes the repo on failure)."]}),`
`,e.jsx(n.li,{children:"The generated README title now matches the brain folder name."}),`
`,e.jsxs(n.li,{children:["Polished the CLI UX with ",e.jsx(n.code,{children:"@clack/prompts"})," and now runs ",e.jsx(n.code,{children:"mise trust"})," before installing dependencies."]}),`
`]}),`
`,e.jsx(n.strong,{children:"Docs:"}),`
`,e.jsxs(n.ul,{children:[`
`,e.jsx(n.li,{children:"Updated READMEs to reflect the new CLI prompts and skill renames."}),`
`]}),`
`,e.jsx(n.strong,{children:"Chore:"}),`
`,e.jsxs(n.ul,{children:[`
`,e.jsxs(n.li,{children:["Removed template skills from ",e.jsx(n.code,{children:".claude/skills"}),"."]}),`
`,e.jsx(n.li,{children:"Changed the license badge color."}),`
`]}),`
`,e.jsxs(n.h2,{id:"v030--2026-04-12",children:["v0.3.0 — 2026-04-12",e.jsx(n.a,{"aria-hidden":"true",tabIndex:"-1",href:"#v030--2026-04-12",children:e.jsx(n.div,{"data-autolink-icon":!0})})]}),`
`,e.jsxs(n.ul,{children:[`
`,e.jsxs(n.li,{children:["Squashed release PR (",e.jsx(n.a,{href:"https://github.com/jessepinkman9900/claude-second-brain/pull/7",children:"#7"}),") bundling CLI refinements and template adjustments that followed the ",e.jsx(n.code,{children:"feat/npx"})," series."]}),`
`]}),`
`,e.jsxs(n.h2,{id:"v023--2026-04-11",children:["v0.2.3 — 2026-04-11",e.jsx(n.a,{"aria-hidden":"true",tabIndex:"-1",href:"#v023--2026-04-11",children:e.jsx(n.div,{"data-autolink-icon":!0})})]}),`
`,e.jsx(n.strong,{children:"Features:"}),`
`,e.jsxs(n.ul,{children:[`
`,e.jsxs(n.li,{children:["Shipped the missing ",e.jsx(n.code,{children:".obsidian/"})," folder inside the template so scaffolded vaults open directly in Obsidian."]}),`
`]}),`
`,e.jsx(n.strong,{children:"Docs:"}),`
`,e.jsxs(n.ul,{children:[`
`,e.jsx(n.li,{children:"Added the MIT License file."}),`
`]}),`
`,e.jsxs(n.h2,{id:"v022--2026-04-11",children:["v0.2.2 — 2026-04-11",e.jsx(n.a,{"aria-hidden":"true",tabIndex:"-1",href:"#v022--2026-04-11",children:e.jsx(n.div,{"data-autolink-icon":!0})})]}),`
`,e.jsx(n.strong,{children:"Docs:"}),`
`,e.jsxs(n.ul,{children:[`
`,e.jsx(n.li,{children:"Added a GitHub URL to the package metadata."}),`
`,e.jsx(n.li,{children:"Added the project image to the package so the npm card renders correctly."}),`
`]}),`
`,e.jsxs(n.h2,{id:"v021--2026-04-11",children:["v0.2.1 — 2026-04-11",e.jsx(n.a,{"aria-hidden":"true",tabIndex:"-1",href:"#v021--2026-04-11",children:e.jsx(n.div,{"data-autolink-icon":!0})})]}),`
`,e.jsx(n.strong,{children:"Chore:"}),`
`,e.jsxs(n.ul,{children:[`
`,e.jsxs(n.li,{children:["Merged the release and publish steps into a single ",e.jsx(n.code,{children:"release-publish.yml"})," workflow."]}),`
`,e.jsx(n.li,{children:"Hardened the CI pipeline."}),`
`]}),`
`,e.jsxs(n.h2,{id:"v020--2026-04-11",children:["v0.2.0 — 2026-04-11",e.jsx(n.a,{"aria-hidden":"true",tabIndex:"-1",href:"#v020--2026-04-11",children:e.jsx(n.div,{"data-autolink-icon":!0})})]}),`
`,e.jsxs(n.ul,{children:[`
`,e.jsx(n.li,{children:"First public release to npm."}),`
`,e.jsxs(n.li,{children:["Introduced the template scaffold and the ",e.jsx(n.code,{children:"npx claude-second-brain"})," flow."]}),`
`,e.jsxs(n.li,{children:["Added the initial README, the release workflow, and the ",e.jsx(n.code,{children:"/pack-test"})," skill."]}),`
`]})]})}function c(s={}){const{wrapper:n}={...d(),...s.components};return n?e.jsx(n,{...s,children:e.jsx(i,{...s})}):i(s)}export{c as default,l as frontmatter};
