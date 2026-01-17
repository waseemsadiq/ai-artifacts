---
description: Deployment steps for NotifyKit
---

# Deployment Workflow

## Git Flow: Feature Branch → Staging → Main

1. **Create Issue**

   ```bash
   gh issue create --title "..." --body "..."
   ```

2. **Feature Development**
   - Branch: `feature/XX-description`
   - Commit: `#XX Description`

3. **Documentation-Only Workflow**
   - Branch: `docs/XX-description`
   - Applies to: `.cursorrules`, `CLAUDE.MD`, `README.md`, `.agent/workflows/`
   - Merge directly to `main` via PR.

4. **Pull Requests**
   ```bash
   gh pr create --title "#XX Description" --body "Closes #XX"
   gh pr merge --merge --delete-branch
   ```

## Rules for Rule Files

- **Documentation Sync**: If you update `CLAUDE.MD`, `.cursorrules`, or `.agent/workflows/deploy.md`, you MUST check and update the other two.
- **Commit Permission**: You MUST ask the user for permission before committing and pushing the changes to these files.
