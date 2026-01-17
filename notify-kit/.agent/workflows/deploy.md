---
description: Deployment workflow for NotifyKit
---

# Deploy Workflow

This workflow defines how to build and deploy NotifyKit components.

## Prerequisites

- Firebase CLI installed and authenticated
- Existing Firebase projects configured (production and staging)
- `gh` CLI installed

## Deployment Steps

// turbo

1. Create a GitHub issue for the work.

   ```bash
   gh issue create --title "Feature: Description" --body "..."
   ```

2. Create a feature branch.

   ```bash
   git checkout -b feature/XX-description
   ```

3. Bump version and Build.

   ```bash
   # Bump version in relevant package.json
   npm run build
   ```

4. Test locally.

   ```bash
   npm run test
   ```

5. Document changes (README, etc.) and Commit.

   ```bash
   git add .
   git commit -m "feat: #XX Description"
   ```

6. Merge to Staging & Verify.

   ```bash
   git fetch origin staging
   git checkout staging || git checkout -b staging origin/staging
   git merge feature/XX-description --no-edit
   npm run build
   git push origin staging
   ```

7. Publish to Main (PR).

   ```bash
   git checkout feature/XX-description
   git push -u origin feature/XX-description
   gh pr create --title "feat: Description" --body "Closes #XX"
   ```

8. Merge and Cleanup.

   ```bash
   gh pr merge --merge --delete-branch
   gh issue close XX
   ```

9. Sync local main.
   ```bash
   git checkout main && git pull origin main
   ```
