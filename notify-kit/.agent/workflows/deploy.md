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

3. Bump version if necessary.

   ```bash
   node scripts/bump.js X.X.X
   ```

4. Build the project.

   ```bash
   npm run build
   ```

5. Test locally.

   ```bash
   npm run test
   ```

6. Commit and push.

   ```bash
   git add .
   git commit -m "#XX Description"
   git push -u origin feature/XX-description
   ```

7. Merge to staging and deploy.

   ```bash
   git checkout staging && git pull origin staging
   git merge feature/XX-description --no-edit
   git push origin staging
   firebase deploy --only functions
   firebase hosting:channel:deploy staging
   ```

8. After testing on staging, merge to main and deploy to production.

   ```bash
   # Merge on GitHub
   firebase deploy --only hosting
   ```

9. Sync local main.
   ```bash
   git checkout main && git pull origin main
   ```
