# Patch: Fix debug downloads + enforce preferredPrimitiveId

Date: 2025-12-13T20:17:11.260388Z

## What this ZIP changes

1) Viewer: debug-tool buttons **Download Step Snapshot / Download Session Log / Reset Session Log** were calling the backend at a hardcoded port `4101`.
   - Fixed: these buttons now derive the backend origin from `window.__v5EndpointUrl` (e.g. `http://localhost:4201/...`), with fallback to `http://localhost:4201`.

2) Backend: `preferredPrimitiveId` was **not enforced** in the orchestrator.
   - Symptom: Hint Apply for `P.INT_TO_FRAC` on `2+3` could apply a different best step (e.g. evaluate to `5`).
   - Fixed: when `preferredPrimitiveId` is present, we filter MapMaster candidates to those whose **primary** primitive matches it.

## Files in this ZIP

- `viewer/app/main.js`
- `backend-api-v1.http-server/src/orchestrator/step.orchestrator.ts`
- `README.P1.fix.downloads+preferredPrimitive.md`

## How to apply

Unzip into your project root (D:\G), overwriting existing files.

## Quick verification

1) Start backend on 4201 and viewer on 4002 as usual.
2) Open `http://localhost:4002/debug-tool.html`.
3) Try:
   - Click `Download Step Snapshot` (after any step) → should download JSON instead of "Failed to fetch".
   - Click `Download Session Log` → should download JSON.
4) For `2+3`:
   - Click `2` → pick Convert to fraction → Apply → should not auto-evaluate to `5` unless that primitive was requested.

