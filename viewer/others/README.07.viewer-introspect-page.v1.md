# README.07.viewer-introspect-page.v1.md

Variant B — Step B5: Viewer Dev Page for MapMaster Introspect (browser)

This drop adds a simple dev HTML page that renders a *recorded* MapMaster
introspect session for the example `1/3 + 2/5` directly in the browser.

It does **not** yet call MapMaster or the engine live; instead, it uses the
same JSON that the Node E2E script (`itu-e2e-mapmaster-introspect.ts`) prints.
Later stages (B6/B7) will replace the static sample with live data.

## Files in this drop (relative to `D:\07`)

- `viewer/introspect.html`
- `viewer/app/introspect.js`
- `viewer/README.07.viewer-introspect-page.v1.md` (this file)

## How to apply

Unzip this archive **directly into `D:\07`** and allow adding the new files:

- `viewer/introspect.html`
- `viewer/app/introspect.js`

No existing files are overwritten.

## How to open the dev page

You can open the dev page in any of these ways:

1. **Directly from the filesystem**

   - Navigate to `D:\07\viewer`.
   - Open `introspect.html` in your browser (double-click or drag-and-drop).

   Since all scripts and styles are relative (`katex/...`, `app/...`), the page
   should load without any local server.

2. **Via your existing static server (if you already use one)**

   - Start whatever tiny/static server you normally use to serve `viewer/`.
   - Open `/introspect.html` in the browser.

## What you should see

- Left side:

  - The formula `1/3 + 2/5` rendered via KaTeX from the LaTeX string in the
    introspect summary.
  - Metadata cards showing `expressionId`, `invariantSetId`, `engineStage1`,
    and `candidateCount`.
  - Pills that show the chosen candidate id, invariant id, and engine operation.

- Right side:

  - Two JSON blocks:

    - A compact "fingerprint" of the `MapMasterRequest`.
    - The `MapMasterIntrospectSummary` object.

This page is intended as the **UI skeleton** for variant B:

- B6 will wire this UI to *live* MapMaster invocations based on real Viewer
  clicks.
- B7 will add an HTTP path where Viewer talks to a backend that runs Engine +
  MapMaster and returns introspect summaries.
