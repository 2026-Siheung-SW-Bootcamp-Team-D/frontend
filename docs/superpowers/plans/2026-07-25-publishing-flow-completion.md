# Publishing Flow Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish all P0 publishing flows that do not require live map or search APIs.

**Architecture:** Keep a deterministic in-memory meeting store, make route IDs authoritative, and model remote-looking results as local UI states. Page components consume store actions rather than owning duplicated data.

**Tech Stack:** React 19, Vite, Tailwind CSS v4, custom hash routing.

## Global Constraints

- No new dependency, API call, TypeScript, or router package.
- Service copy uses `연당`; user-facing copy does not use `보드`, `후보`, or `콕`.
- `.legacy-backup/` is excluded from this work and commits.
- Verify with `npm run lint` and `npm run build`.

### Task 1: Model complete mock meeting state

- [ ] Add meeting lookup, invite validation, join, origin update, selection audit, and duplicate-safe place actions to `src/store/BoardProvider.jsx`.
- [ ] Make all page navigation use the active route ID.

### Task 2: Complete entry and sharing

- [ ] Add recent meetings, dynamic invite validation, creation copy feedback, sharing sheet, and joining error states.

### Task 3: Complete discovery and place entry

- [ ] Add deterministic search states, external-source validation, manual pin input, origin search, and free-coordinate exploration.

### Task 4: Complete collaboration and responsive layout

- [ ] Synchronize map pins/cards, expose selection history and external links, add region-proposal failure states, and make desktop panels responsive.

### Task 5: Verify and release

- [ ] Run lint, build, browser flow checks, inspect the staged diff, commit by concern, and push `main`.
