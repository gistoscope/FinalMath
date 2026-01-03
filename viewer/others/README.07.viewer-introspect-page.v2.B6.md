# README.07.viewer-introspect-page.v2.B6.md

Variant B — Step B6: Interactive selection view on the Introspect dev page

This drop upgrades the Viewer dev page created in B5 so that it now shows
a **simple interactive mapping** from a chosen MapMaster candidate to
`surfaceRegionIds` that can be highlighted in UI.

It still uses the recorded example `1/3 + 2/5` from the Node E2E script,
but now you can:

- Click tokens representing `surfaceRegionIds`.
- Apply the candidate's selection with one button.
- Clear or adjust the selection, and see the current set of region ids.

This is the "Click → MapMaster → Introspect → Highlight" skeleton, built on
top of the introspection JSON.

## Files in this drop (relative to `D:\07`)

- `viewer/introspect.html`
- `viewer/app/introspect.js`
- `viewer/README.07.viewer-introspect-page.v2.B6.md` (this file)

These files **replace** the earlier B5 versions of `introspect.html` and
`introspect.js` with the interactive variant.

## How to apply

Unzip this archive **directly into `D:\07`**, allowing overwrite for:

- `viewer/introspect.html`
- `viewer/app/introspect.js`

No other files are changed.

## How to use the dev page

1. Open the page in your browser:

   - Either open `D:\07\viewer\introspect.html` directly, or
   - Serve the `viewer/` folder with your tiny server and open `/introspect.html`.

2. On the left side you will see:

   - The formula `1/3 + 2/5` rendered via KaTeX.
   - Metadata and pills showing expression id, invariant set, stage1, and the chosen candidate.

3. Under the metadata there is now a **token strip**:

   - Each token corresponds to a `surfaceRegionId`:

     - `surf-frac-1` → token “1/3”
     - `surf-plus` → token “+”
     - `surf-frac-2` → token “2/5”

   - Clicking a token toggles its selection (visual highlight).

4. Buttons:

   - **Apply candidate selection** — applies the candidate's surface selection,
     conceptually equivalent to "MapMaster chose this step", i.e. the union of
     the two fractions and the plus sign.
   - **Clear selection** — clears all token highlights.

5. At the bottom of the left card you will see a line:

   - `Current selection: surf-frac-1, surf-plus, surf-frac-2` (or similar),
   - which shows the current set of selected `surfaceRegionIds` as a comma-separated list.

On the right side the JSON panels still show:

- A compact fingerprint of the `MapMasterRequest` (mode, expression, policy,
  engineView, tsaSelection).
- The `MapMasterIntrospectSummary` object for the same example.

## Purpose in the Variant B roadmap

This step B6 does **not** yet call MapMaster in the browser or over HTTP.
Instead, it solidifies the **UI contract**:

- We now have a concrete visual representation of `surfaceRegionIds`,
- A way to show which regions are involved in the chosen candidate,
- And a direct link between this selection and the introspect summary JSON.

In later steps (B7 and beyond), real Viewer clicks and live MapMaster calls
will populate the same structures instead of the recorded sample.
