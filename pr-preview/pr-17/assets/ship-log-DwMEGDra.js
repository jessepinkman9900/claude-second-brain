import{u as s,j as e}from"./index-C0YtSaFG.js";const l={title:"Ship log",description:"undefined"};function d(i){const n={a:"a",code:"code",div:"div",h1:"h1",h2:"h2",header:"header",li:"li",p:"p",strong:"strong",ul:"ul",...s(),...i.components};return e.jsxs(e.Fragment,{children:[e.jsx(n.header,{children:e.jsxs(n.h1,{id:"ship-log",children:["Ship log",e.jsx(n.a,{"aria-hidden":"true",tabIndex:"-1",href:"#ship-log",children:e.jsx(n.div,{"data-autolink-icon":!0})})]})}),`
`,e.jsxs(n.p,{children:["A running record of every released version of ",e.jsx(n.code,{children:"claude-second-brain"})," on npm. Newest releases first. For auto-generated notes and tags, see the ",e.jsx(n.a,{href:"https://github.com/jessepinkman9900/claude-second-brain/releases",children:"GitHub releases"})," page."]}),`
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
`]})]})}function a(i={}){const{wrapper:n}={...s(),...i.components};return n?e.jsx(n,{...i,children:e.jsx(d,{...i})}):d(i)}export{a as default,l as frontmatter};
