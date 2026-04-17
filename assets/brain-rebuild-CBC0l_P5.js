import{u as s,j as e}from"./index-BOJ80bdz.js";const d={title:"/brain-rebuild",description:"undefined"};function i(r){const n={a:"a",code:"code",div:"div",h1:"h1",header:"header",li:"li",ol:"ol",p:"p",strong:"strong",...s(),...r.components};return e.jsxs(e.Fragment,{children:[e.jsx(n.header,{children:e.jsxs(n.h1,{id:"brain-rebuild",children:["/brain-rebuild",e.jsx(n.a,{"aria-hidden":"true",tabIndex:"-1",href:"#brain-rebuild",children:e.jsx(n.div,{"data-autolink-icon":!0})})]})}),`
`,e.jsxs(n.p,{children:[e.jsx(n.strong,{children:"Destructive."})," Redesign the qmd schema from scratch."]}),`
`,e.jsx(n.p,{children:"Use only when the current collection/context structure no longer fits how you search — for example, when the wiki has grown into new domains that deserve their own collections."}),`
`,e.jsx(n.p,{children:"What it does:"}),`
`,e.jsxs(n.ol,{children:[`
`,e.jsx(n.li,{children:"Analyzes the current wiki."}),`
`,e.jsx(n.li,{children:"Proposes new collections and contexts."}),`
`,e.jsxs(n.li,{children:[e.jsx(n.strong,{children:"Waits for your approval"})," before any destructive action."]}),`
`,e.jsxs(n.li,{children:["Patches ",e.jsx(n.code,{children:"scripts/qmd/setup.ts"}),", drops the old index, and rebuilds embeddings from scratch."]}),`
`]}),`
`,e.jsxs(n.p,{children:["Scope: vault-local, installed at ",e.jsx(n.code,{children:".claude/skills/brain-rebuild/SKILL.md"}),". Source: ",e.jsx(n.a,{href:"https://github.com/jessepinkman9900/claude-second-brain/blob/main/template/.claude/skills/brain-rebuild/SKILL.md",children:"template/.claude/skills/brain-rebuild/SKILL.md"}),"."]})]})}function l(r={}){const{wrapper:n}={...s(),...r.components};return n?e.jsx(n,{...r,children:e.jsx(i,{...r})}):i(r)}export{l as default,d as frontmatter};
