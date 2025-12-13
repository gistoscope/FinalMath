README.integer-click-context-menu.bundle.md
Generated: 2025-12-12T20:14:31.620640

How to apply
1) Unzip this archive into D:\G (the folder that contains backend-api-v1.http-server and viewer).
2) Overwrite files when prompted.
3) Restart both dev servers.

Backend quick check
- cd D:\G\backend-api-v1.http-server
- npx vitest run tests/integer-choice.test.ts

Viewer manual check
- Open the app in the browser
- Click on an integer like 5
- Expect a popup with choices (Convert to fraction)
