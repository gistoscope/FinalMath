# 07.B10-stepmaster-ui

This patch adds a small StepMaster debug UI to the MapMaster Introspect dev page (Variant B · B7 HTTP).

## Files in this package

- `viewer/introspect.html`
  - Adds CSS helpers and a new card **“StepMaster micro-steps (debug)”** with a container `<div id="stepmaster-steps">`.
- `viewer/app/introspect.js`
  - Adds `renderStepMaster()` which:
    - Reads `currentSummary.stepMaster.microSteps` from the HTTP response.
    - Renders a numbered list of micro-steps with:
      - scenario id and invariant id;
      - `fromLatex → toLatex` for each micro-step;
      - short student-friendly description.
  - Calls `renderStepMaster()`:
    - once on page load (shows a hint until HTTP data arrives);
    - after every successful HTTP introspect call.

## How to install

1. Unpack this ZIP into the root of `D:\07` (overwrite existing files):
   - `viewer/introspect.html`
   - `viewer/app/introspect.js`

You can do this directly in Total Commander by unpacking into `D:\07`.

## How to test

1. **Engine HTTP server (port 4101)**

   ```powershell
   cd D:
   pnpm -C engine-adapter-lite exec node engine-server.mjs
   ```

2. **MapMaster Introspect HTTP server (port 4201)**

   In a second PowerShell window:

   ```powershell
   cd D:
   pnpm -C viewer/display-engine-pipeline exec tsx src/dev/mapmaster-introspect-http-server.ts
   ```

3. **Open the dev page**

   - Open `D:\07\viewer\introspect.html` in your browser.

4. **Check StepMaster debug UI**

   - At the bottom of the page you should see the new card
     **“StepMaster micro-steps (debug)”**.
   - Before the HTTP call it should show a hint:
     > No StepMaster micro-steps yet. Call HTTP introspect.
   - Click **“Call HTTP introspect”** on the page.
   - After a successful HTTP response:
     - the JSON block on the right should include a `stepMaster` object;
     - the new card should show a numbered list of micro-steps
       for `frac.add.diff-den.v1`, each with:
       - kind label (e.g. `mul-by-one`, `one-to-n-over-n`, `mul-frac`, …);
       - `fromLatex → toLatex`;
       - short Russian student-facing description.

If anything in the UI looks broken (card not visible, list empty after HTTP),
send me the console output and we’ll treat that as the next bug-fix step.
