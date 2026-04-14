import{u as i,j as e}from"./index-WJj6QxFg.js";const c={title:"/setup",description:"undefined"};function t(s){const n={a:"a",code:"code",div:"div",h1:"h1",header:"header",li:"li",ol:"ol",p:"p",...i(),...s.components};return e.jsxs(e.Fragment,{children:[e.jsx(n.header,{children:e.jsxs(n.h1,{id:"setup",children:["/setup",e.jsx(n.a,{"aria-hidden":"true",tabIndex:"-1",href:"#setup",children:e.jsx(n.div,{"data-autolink-icon":!0})})]})}),`
`,e.jsx(n.p,{children:"First-time initialization. Run this once, right after scaffolding the vault."}),`
`,e.jsx(n.p,{children:"What it does:"}),`
`,e.jsxs(n.ol,{children:[`
`,e.jsxs(n.li,{children:["Registers the qmd collections and contexts (",e.jsx(n.code,{children:"wiki"}),", ",e.jsx(n.code,{children:"raw-sources"}),", ",e.jsx(n.code,{children:"human"}),", ",e.jsx(n.code,{children:"daily-notes"}),")."]}),`
`,e.jsx(n.li,{children:"Generates local vector embeddings for every markdown file."}),`
`,e.jsxs(n.li,{children:["Writes the index to the path you chose during scaffolding (default ",e.jsx(n.code,{children:"~/.cache/qmd/index.sqlite"}),")."]}),`
`]}),`
`,e.jsx(n.p,{children:"The first run downloads ~2 GB of GGUF embedding models — this happens once, then is cached across vaults."}),`
`,e.jsxs(n.p,{children:["Scope: vault-local, installed at ",e.jsx(n.code,{children:".claude/skills/setup/SKILL.md"}),". Source: ",e.jsx(n.a,{href:"https://github.com/jessepinkman9900/claude-second-brain/blob/main/template/.claude/skills/setup/SKILL.md",children:"template/.claude/skills/setup/SKILL.md"}),"."]})]})}function l(s={}){const{wrapper:n}={...i(),...s.components};return n?e.jsx(n,{...s,children:e.jsx(t,{...s})}):t(s)}export{l as default,c as frontmatter};
