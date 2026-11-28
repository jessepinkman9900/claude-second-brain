import"./index-AUAnyavW.js";var e={accentColor:`light-dark(black, white)`,basePath:`/claude-second-brain`,baseUrl:`https://jessepinkman9900.github.io/claude-second-brain`,codeHighlight:{langAlias:{sol:`solidity`,bash:`shellscript`,sh:`shellscript`,shell:`shellscript`,zsh:`shellscript`,md:`markdown`,js:`javascript`,cjs:`javascript`,mjs:`javascript`,rs:`rust`,ts:`typescript`,cts:`typescript`,mts:`typescript`,yml:`yaml`},themes:{light:`github-light`,dark:`github-dark-dimmed`}},colorScheme:`light dark`,description:`The fastest way to start your personal knowledge base powered by Obsidian, your AI coding agent (Claude Code, Codex, Cursor, Copilot, and more), qmd, and git.`,feedback:!1,head:`_vocs-fn_function anonymous(path,context
) {
const d = {"site":"https://jessepinkman9900.github.io/claude-second-brain","keywords":"claude-second-brain, personal knowledge base, cross-linked wiki, Obsidian, Claude Code, Codex, Cursor, agent skills, qmd, semantic search, git","jsonLd":{"@context":"https://schema.org","@type":"SoftwareApplication","name":"claude-second-brain","alternateName":"csb","description":"The fastest way to start your personal knowledge base powered by Obsidian, your AI coding agent (Claude Code, Codex, Cursor, Copilot, and more), qmd, and git.","url":"https://jessepinkman9900.github.io/claude-second-brain/","applicationCategory":"DeveloperApplication","applicationSubCategory":"Command-line tool","operatingSystem":"macOS, Linux, Windows","softwareVersion":"1.2.3","softwareRequirements":"Node.js 22 or later","downloadUrl":"https://www.npmjs.com/package/claude-second-brain","installUrl":"https://jessepinkman9900.github.io/claude-second-brain/getting-started","codeRepository":"https://github.com/jessepinkman9900/claude-second-brain","license":"https://opensource.org/licenses/MIT","isAccessibleForFree":true,"keywords":"claude-second-brain, personal knowledge base, cross-linked wiki, Obsidian, Claude Code, Codex, Cursor, agent skills, qmd, semantic search, git","offers":{"@type":"Offer","price":"0","priceCurrency":"USD"},"author":{"@type":"Person","name":"jessepinkman9900","url":"https://github.com/jessepinkman9900"},"sameAs":["https://github.com/jessepinkman9900/claude-second-brain","https://www.npmjs.com/package/claude-second-brain"]}};
const route = !path || path === '/' ? '/' : path.replace(/\\/$/, '');
const url = route === '/' ? d.site + '/' : d.site + route;
const tags = {
  base: false,
  canonical: url,
  meta: { ogUrl: url, keywords: d.keywords },
  link: [{ rel: 'alternate', type: 'text/markdown', href: d.site + (route === '/' ? '/index' : route) + '.md' }],
};
const fm = context && context.frontmatter;
// Vocs also calls head() once without page frontmatter; only the page call adds JSON-LD.
if (route !== '/' || !d.jsonLd || !fm) return tags;
const jsonLd = Object.assign({}, d.jsonLd, fm.description ? { description: fm.description } : {});
tags.script = [{ type: 'application/ld+json', key: 'software-application', innerHTML: jsonLd }];
return tags;
}`,iconUrl:`/claude-second-brain/favicon.svg`,jsonLd:!0,logoUrl:`/claude-second-brain/favicon.svg`,renderStrategy:`full-static`,search:{query:{boostDocument:`_vocs-fn_(_id, _term, storedFields) => {
                    const priority = storedFields?.['searchPriority'] ?? 1;
                    const href = storedFields?.['href'];
                    const isDocsPath = href?.startsWith('/docs/');
                    // Treat /docs/ as root for depth calculation (subtract 1)
                    const segments = href ? href.split('/').filter(Boolean).length : 1;
                    const depth = isDocsPath ? Math.max(segments - 1, 1) : segments;
                    const depthBoost = 1 / Math.max(depth, 1);
                    const docsBoost = isDocsPath ? 1.5 : 1;
                    return priority * depthBoost * docsBoost;
                }`,combineWith:`AND`,fuzzy:.2,prefix:!0,boost:{title:4,subtitle:3,text:2,category:1,titles:1}},boostDocument:`_vocs-fn_(_id, _term, storedFields) => {
                    const priority = storedFields?.['searchPriority'] ?? 1;
                    const href = storedFields?.['href'];
                    const isDocsPath = href?.startsWith('/docs/');
                    // Treat /docs/ as root for depth calculation (subtract 1)
                    const segments = href ? href.split('/').filter(Boolean).length : 1;
                    const depth = isDocsPath ? Math.max(segments - 1, 1) : segments;
                    const depthBoost = 1 / Math.max(depth, 1);
                    const docsBoost = isDocsPath ? 1.5 : 1;
                    return priority * depthBoost * docsBoost;
                }`,combineWith:`AND`,fuzzy:.2,prefix:!0,boost:{title:4,subtitle:3,text:2,category:1,titles:1}},sidebar:[{text:`Introduction`,link:`/`},{text:`Getting Started`,link:`/getting-started`},{text:`CLI Reference`,collapsed:!1,items:[{text:`Commands`,link:`/cli`},{text:`csb`,link:`/cli/create`},{text:`ls`,link:`/cli/ls`},{text:`use`,link:`/cli/use`},{text:`rm`,link:`/cli/rm`},{text:`path`,link:`/cli/path`},{text:`qmd`,link:`/cli/qmd`},{text:`exec`,link:`/cli/exec`},{text:`skills`,link:`/cli/skills`},{text:`git-token`,link:`/cli/git-token`},{text:`doctor`,link:`/cli/doctor`}]},{text:`Concepts`,items:[{text:`How it works`,link:`/concepts/how-it-works`},{text:`Wiki Folder Structure`,link:`/concepts/schema`}]},{text:`Git backends`,items:[{text:`GitHub`,link:`/remotes/github`},{text:`Cloudflare Artifacts`,link:`/remotes/cloudflare-artifacts`}]},{text:`Integrations`,items:[{text:`Obsidian`,link:`/integrations/obsidian`},{text:`obsidian-git`,link:`/integrations/obsidian-git`},{text:`iCloud sync`,link:`/integrations/icloud`}]},{text:`Skills`,items:[{text:`Overview`,link:`/skills`},{text:`/brain-ingest`,link:`/skills/brain-ingest`},{text:`/brain-search`,link:`/skills/brain-search`},{text:`/brain-refresh`,link:`/skills/brain-refresh`},{text:`/brain-rebuild`,link:`/skills/brain-rebuild`},{text:`/lint`,link:`/skills/lint`}]},{text:`Ship log`,link:`/ship-log`}],socials:[{icon:`github`,link:`https://github.com/jessepinkman9900/claude-second-brain`},{icon:`x`,link:`https://x.com/jessepinkman9900`}],title:`claude-second-brain`,titleTemplate:`%s – claude-second-brain`,topNav:[{text:`Getting Started`,link:`/getting-started`},{text:`GitHub`,link:`https://github.com/jessepinkman9900/claude-second-brain`},{text:`npm`,link:`https://www.npmjs.com/package/claude-second-brain`}]};export{e as t};