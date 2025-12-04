# README.07.viewer-introspect-http.B7.v2.md

Variant B — Step B7: HTTP chain for MapMaster Introspect (refreshed zip)

This drop adds a small Node HTTP server and upgrades the Viewer dev page so
that the same MapMasterRequest used in the Node E2E can be sent from the
browser to a server which runs MapMaster + Engine and returns an introspect
summary.

## Files in this drop (relative to `D:\07`)

- `viewer/display-engine-pipeline/src/dev/mapmaster-introspect-http-server.ts`
- `viewer/introspect.html`
- `viewer/app/introspect.js`

## How to apply

Unzip into `D:\07`, allowing:

- new file: `viewer/display-engine-pipeline/src/dev/mapmaster-introspect-http-server.ts`
- overwrite: `viewer/introspect.html`, `viewer/app/introspect.js`

## How to run

1. Engine server (if not already running):

   ```powershell
   cd D:\07\viewer\display-engine-pipeline
   pnpm engine:server
   ```

2. MapMaster introspect HTTP server (B7):

   ```powershell
   cd D:\07\viewer\display-engine-pipeline
   pnpm tsx ./src/dev/mapmaster-introspect-http-server.ts
   ```

   It will listen on `http://localhost:4201/mapmaster-introspect`.

3. Open dev page:

   - Double-click `D:\07\viewer\introspect.html` in File Explorer.

4. Use buttons:

   - **Apply local candidate selection** – uses local demo summary.
   - **Call HTTP introspect** – sends the request to the Node server and shows
     the HTTP response JSON in the right panel, while highlighting the same
     surfaceRegionIds as before.
   - **Clear selection** – clears token highlight.
