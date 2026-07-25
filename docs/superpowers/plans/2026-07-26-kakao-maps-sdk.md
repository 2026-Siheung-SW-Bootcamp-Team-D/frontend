# Kakao Maps SDK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe Kakao Maps JavaScript SDK foundation that enhances existing mock-driven map screens without changing API or session behavior.

**Architecture:** A singleton script loader owns browser SDK loading. A reusable map component owns the Kakao lifecycle, markers, and map events; pages retain their existing state and receive plain `{ lat, lon }` callbacks. If the key or SDK is unavailable, the component renders an informational fallback while its surrounding page remains usable.

**Tech Stack:** React 19, Vite, JavaScript/JSX, Kakao Maps JavaScript SDK; no new npm packages.

## Global Constraints

- Use `https://dapi.kakao.com/v2/maps/sdk.js` with `autoload=false`.
- Resolve only after `kakao.maps.load(...)` completes.
- Use only `VITE_KAKAO_JAVASCRIPT_KEY`; never expose REST keys, ODSAY keys, or tokens.
- Do not modify `src/assets/logo.png`.
- Do not add API calls, localStorage, or page business rules to the map component.
- No test runner exists; validate with lint, build, and manual key-missing smoke checks.

---

### Task 1: SDK loader and reusable map boundary

**Files:**
- Create: `src/maps/loadKakaoMaps.js`
- Create: `src/maps/KakaoMap.jsx`

- [x] Implement a module-level Promise loader that reuses an existing script element, listens for its load/error outcome, and invokes `kakao.maps.load` before resolving.
- [x] Implement a map component that creates and cleans up the map, renders markers, emits marker/click/idle-center callbacks, and renders a key-safe fallback on SDK failure.
- [x] Verify key-missing fallback manually, then run `npm run lint` and `npm run build`.

### Task 2: Connect existing mock screens

**Files:**
- Modify: `src/pages/BoardPage.jsx`
- Modify: `src/pages/AddPlacePage.jsx`
- Modify: `src/pages/NearbyPage.jsx`

- [x] Replace only each static map placeholder with `KakaoMap`; retain all current mock state and navigation behavior.
- [x] Synchronize board card/focused-pin selection; map click updates manual-place fields and nearby search point; map idle updates nearby center.
- [x] Verify the key-missing fallback leaves cards, coordinate inputs, and nearby search controls usable, then run `npm run lint` and `npm run build`.

### Task 3: Public configuration guidance

**Files:**
- Modify: `.env.example`
- Modify: `README.md`

- [x] Document the public key and required Kakao Web platform domains: localhost, apex, www, and only approved previews.
- [x] State that Vercel must receive the public key separately and that missing keys intentionally show a non-blocking fallback.
