# CLAUDE.MD - NotifyKit

This document provides AI assistants with essential context about the codebase architecture, patterns, and development guidelines.

## Project Overview

**Type**: Library / Toolkit for dual-path notifications in PWAs
**Purpose**: Infrastructure for combining FCM push with IndexedDB-based device fallback notifications.
**Stack**: TypeScript + React 18+ + Firebase Functions v2 + Cloud Tasks

## Project Structure

```
/
├── packages/           # Monorepo packages
│   ├── core/           # Core logic, types, and IndexedDB store
│   └── react/          # React hooks and components
│
├── templates/          # Templates for integration
│   ├── service-worker/ # Service worker templates
│   ├── cloud-functions/# Firebase Cloud Functions templates
│   └── config/         # Example configuration files
│
├── scripts/            # Build and utility scripts
├── examples/           # Working examples of integration
└── .agent/workflows/   # AI agent workflow definitions
```

## Core Architecture

### Dual Notification System

NotifyKit implements a **dual-path architecture** for maximum reliability:

1.  **Primary Path (FCM)**: Server-triggered push notifications via Firebase Cloud Messaging.
    - **Architecture Decision**: FCM messages MUST use **data-only payloads** (no `notification` field). This gives the Service Worker full control.
2.  **Fallback Path (Device)**: IndexedDB-based local notifications that fire if push fails or the device is offline.
    - Service Worker monitors the IndexedDB store and displays notifications.

### Critical Implementation Rules (DO NOT BREAK)

- **ALWAYS use `registration.showNotification()`**: Never use the browser `Notification` API directly in service workers or hooks.
- **Service Worker Templates**: Always edit `.template.js` files in `templates/`, never generated files. Environment variables are injected at build time.
- **FCM Data Payloads**: From v1.1.0, FCM messages use data-only payloads. Moving `title` and `body` into the `data` object prevents duplicates and allows custom actions.

## Development Workflow

### Git Flow (Standard)

```
feature/XX-description  →  staging  →  main (production)
```

1.  **Step 0: Create Issue**: `gh issue create --title "Feature: X" --body "..."`
2.  **Step 1: Feature Branch**: `git checkout -b feature/XX-description`
3.  **Step 2: Build & Test**: Run `npm run build` and `npm run test` across workspaces.
4.  **Step 3: Document**: Update `README.md`, `CLAUDE.MD`, and `.cursorrules` as needed.
5.  **Step 4: Commit**: Use conventional commits (e.g., `feat: #XX Add xyz`).
    - Add `Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>` to commits.
6.  **Step 5: PR to Staging**: Push to origin and create PR. Merge to `staging` for testing.
7.  **Step 6: Merge to Main**: After verification, merge to `main`.
    ```bash
    # Merge PR on GitHub (merges feature → main)
    # Sync local main
    git checkout main && git pull origin main
    ```

### GitHub CLI (gh) Commands

```bash
gh auth login -h github.com      # Authenticate
gh pr create --title "Title"     # Create PR
gh pr merge XX --merge           # Merge PR
gh issue close XX                # Close issue
```

### Documentation-Only Workflow (Skip Staging)

For changes to documentation, config files, or other non-app files:

**Applies to:** `.cursorrules`, `CLAUDE.MD`, `README.md`, `.gitignore`, `.env.example`, `.agent/workflows/*.md`

**Does NOT apply to:** Source code, build config, service worker templates, Cloud Functions

**Key differences:** No version bump, build, testing, staging, or Firebase deployment.

1.  **Step 1**: Create feature branch (e.g., `docs/XX-update-rules`).
2.  **Step 2**: Make changes, commit, and push.
3.  **Step 3**: Create PR and merge directly to `main` (skip staging).
    ```bash
    gh pr create --title "#XX Description" --body "Closes #XX"
    gh pr merge --merge --delete-branch
    ```

## Cross-Agent Coordination

This project uses multiple AI assistants (**Claude Code** and **Antigravity**).

- **Rule**: If you update `CLAUDE.MD`, `.cursorrules`, or `.agent/workflows/deploy.md`, you **MUST** sync the changes across all three files.
- **Rule**: Always ask the user for permission before committing and pushing changes to rules files.

## AI Automation Rules

### Pull Request Summaries

- **Trigger**: User asks for "pr summary" or "pull request summary".
- **Action**: Return markdown code block directly in the reply (do not create a file).
- **Template**:

  ```markdown
  ## 🎨 [Title]

  ### Summary

  Description...

  ### Changes

  - **`path/to/file`**: Change description.

  ### Technical Details

  ...

  ### Testing

  - ✅ Test 1
  ```
