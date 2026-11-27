## /brain-rebuild

**Destructive.** Redesign the qmd schema from scratch.

Use only when the current collection/context structure no longer fits how you search — for example, when the wiki has grown into new domains that deserve their own collections.

What it does:

1. Analyzes the current wiki.
2. Proposes new collections and contexts.
3. **Waits for your approval** before any destructive action.
4. Patches `scripts/qmd/setup.ts`, drops the old index, and rebuilds embeddings from scratch.

Scope: vault-local, installed at `.claude/skills/brain-rebuild/SKILL.md`. Source: [template/.claude/skills/brain-rebuild/SKILL.md](https://github.com/jessepinkman9900/claude-second-brain/blob/main/template/.claude/skills/brain-rebuild/SKILL.md).
