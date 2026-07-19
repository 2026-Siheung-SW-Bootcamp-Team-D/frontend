# Frontend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create an extensible, dependency-free React/Vite source layout for future Spring Boot integration.

**Architecture:** Retain the generated Vite runtime and package set. Add empty ownership boundaries through tracked documentation files, and define the local API base URL in a Vite environment file so future shared HTTP code has one configuration source.

**Tech Stack:** React 19, JavaScript, Vite 8, ESLint 10, Prettier 3.

## Global Constraints

- Do not add npm dependencies.
- Do not implement routing, state management, or application features.
- Keep Spring Boot as the API server at `http://localhost:8080` during development.
- Verify with lint and production build when npm is available.

---

### Task 1: Establish frontend boundaries and API environment

**Files:**
- Create: `src/api/README.md`
- Create: `src/components/README.md`
- Create: `src/features/README.md`
- Create: `src/layouts/README.md`
- Create: `src/pages/README.md`
- Create: `src/styles/README.md`
- Create: `.env.development`

**Interfaces:**
- Consumes: Vite environment variable naming convention.
- Produces: `import.meta.env.VITE_API_BASE_URL` as the future API client configuration key.

- [ ] **Step 1: Add source-boundary documentation and local API configuration**

Write one concise README per source boundary explaining its ownership. Set `.env.development` to:

```env
VITE_API_BASE_URL=http://localhost:8080
```

- [ ] **Step 2: Verify configuration is discoverable**

Run: `rg -n "VITE_API_BASE_URL|feature|reusable" .env.development src/*/README.md`

Expected: the environment variable and each directory's responsibility are shown.

- [ ] **Step 3: Verify frontend quality gates**

Run: `npm run lint && npm run build`

Expected: both commands exit successfully and Vite creates `dist/`.
