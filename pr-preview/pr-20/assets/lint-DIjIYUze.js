import{u as t,j as e}from"./index-BN3HN7wW.js";const r={title:"/lint",description:"undefined"};function i(s){const n={a:"a",code:"code",div:"div",h1:"h1",header:"header",li:"li",p:"p",strong:"strong",ul:"ul",...t(),...s.components};return e.jsxs(e.Fragment,{children:[e.jsx(n.header,{children:e.jsxs(n.h1,{id:"lint",children:["/lint",e.jsx(n.a,{"aria-hidden":"true",tabIndex:"-1",href:"#lint",children:e.jsx(n.div,{"data-autolink-icon":!0})})]})}),`
`,e.jsx(n.p,{children:"Health-check the wiki."}),`
`,e.jsx(n.p,{children:"Reports on:"}),`
`,e.jsxs(n.ul,{children:[`
`,e.jsxs(n.li,{children:[e.jsx(n.strong,{children:"Orphan pages"})," — wiki pages with no inbound ",e.jsx(n.code,{children:"[[links]]"}),"."]}),`
`,e.jsxs(n.li,{children:[e.jsx(n.strong,{children:"Unresolved contradictions"})," — pages with ",e.jsx(n.code,{children:"[!WARNING] Contradiction"})," callouts that haven't been resolved."]}),`
`,e.jsxs(n.li,{children:[e.jsx(n.strong,{children:"Stale claims"})," — claims superseded by newer sources."]}),`
`,e.jsxs(n.li,{children:[e.jsx(n.strong,{children:"Missing pages"})," — concepts/entities referenced by ",e.jsx(n.code,{children:"[[links]]"})," that lack their own page."]}),`
`,e.jsxs(n.li,{children:[e.jsx(n.strong,{children:"Broken links"})," — wikilinks pointing to files that don't exist."]}),`
`,e.jsxs(n.li,{children:[e.jsx(n.strong,{children:"Data gaps"})," — important topics that lack source coverage; suggests specific sources to investigate."]}),`
`]}),`
`,e.jsxs(n.p,{children:["Applies fixes where safe and flags everything else for your review. Appends a summary to ",e.jsx(n.code,{children:"wiki/log.md"}),"."]}),`
`,e.jsxs(n.p,{children:["Scope: vault-local, installed at ",e.jsx(n.code,{children:".claude/skills/lint/SKILL.md"}),". Source: ",e.jsx(n.a,{href:"https://github.com/jessepinkman9900/claude-second-brain/blob/main/template/.claude/skills/lint/SKILL.md",children:"template/.claude/skills/lint/SKILL.md"}),"."]})]})}function c(s={}){const{wrapper:n}={...t(),...s.components};return n?e.jsx(n,{...s,children:e.jsx(i,{...s})}):i(s)}export{c as default,r as frontmatter};
