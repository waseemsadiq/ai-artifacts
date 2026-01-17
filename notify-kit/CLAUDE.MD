# CLAUDE.MD - NotifyKit

This document provides AI assistants with essential context about the NotifyKit codebase architecture, patterns, and development guidelines.

## Project Overview

**Type**: Notification System Framework (Monorepo)
**Purpose**: Production-ready, dual-path notification system for PWAs (FCM + Device Fallback).
**Stack**: TypeScript + React + Firebase Cloud Functions + Cloud Tasks.

## Project Structure

```
/
├── packages/
│   ├── core/           # Core utilities, types, and IndexedDB store
│   └── react/          # React hooks for PWA integration
├── templates/
│   ├── service-worker/ # Service worker templates with dual-path logic
│   ├── cloud-functions/# Firebase Cloud Functions templates
│   └── config/         # Configuration examples
├── examples/
│   └── basic-react/    # Reference implementation
├── scripts/            # Helper scripts
└── README.md           # Main documentation
```

## Core Principles

1. **Dual-path reliability**: FCM push + device notification fallback.
2. **iOS-safe patterns**: Battle-tested workarounds for Safari quirks (fetch heartbeat, registration.showNotification).
3. **Template-first**: Provide modular templates that users can copy and customize.
4. **Data-only FCM**: Use data-only payloads to allow Service Worker full control (prevents duplicate alerts).

## Development Workflow

### Git Flow: Feature Branch → Staging → Main

```
feature/XX-description  →  staging  →  main (production)
```

1. **Create Issue**: `gh issue create --title "Feature: Description" --body "..."`
2. **Feature Branch**: `git checkout -b feature/XX-description`
3. **Commit**: Use conventional format with issue reference: `#XX Description`.
4. **Pull Request**: `gh pr create --title "#XX Description" --body "Closes #XX"`
5. **Merge**: `gh pr merge --merge --delete-branch`

### Documentation-Only Workflow

For changes to `.cursorrules`, `CLAUDE.MD`, `README.md`, or `.agent/workflows/`:

- Branch: `docs/XX-description`
- Merge directly to `main` (skip staging).

## AI Assistant Coordination

This project uses multiple documentation files to coordinate between agents:

- **CLAUDE.MD**: Dev guidelines and architectural context (this file).
- **.cursorrules**: Shared knowledge base and critical lessons learned.
- **.agent/workflows/deploy.md**: Deployment-related procedures.

### Rules for Rules Files

- **Synchronization**: If you update one, check and update the others.
- **Commit Permission**: You MUST ask the user for permission before committing/pushing changes to these files.

## Critical Implementation Rules

1. **Always use `registration.showNotification()`**: Never use browser `Notification` API directly.
2. **Returns promises from SW handlers**: Required for iOS reliability.
3. **Data-only FCM payloads**: Remove `notification` object from FCM messages to prevent duplicate alerts.
4. **Action Buttons**: Always include "Open App" and "Dismiss" actions in notifications.
