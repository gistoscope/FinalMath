# Report 7: Command List

## Safe Read-Only Commands for Verification

### Backend Tests

```powershell
# Run all integer-choice tests (current behavior)
cd D:\G\backend-api-v1.http-server
npx vitest run tests/integer-choice.test.ts tests/integer-choice-e2e.test.ts --reporter=verbose

# Run all backend tests
cd D:\G\backend-api-v1.http-server
npx vitest run --reporter=verbose

# Check TypeScript compilation (no emit)
cd D:\G\backend-api-v1.http-server
npx tsc --noEmit
```

### Viewer Runtime Checks

```powershell
# Start backend (must run first)
cd D:\G\backend-api-v1.http-server
npm run dev

# Start viewer (in separate terminal)
cd D:\G\viewer
npm run dev
```

### Manual Browser Test Steps

1. Open browser to viewer URL (typically `http://localhost:8000`)
2. Enter expression: `2+3`
3. Open browser DevTools Console (F12)
4. Click on the "2" number
5. Observe console logs for:
   - `[VIEWER-REQUEST] Sending to V5:`
   - `surfaceNodeKind: "Num"`
6. Verify popup appears with "Convert to fraction"
7. Click the popup button
8. Verify expression changes to `\frac{2}{1}+3`

### Search Commands (read-only)

```powershell
# Find all applyStep references
cd D:\G
rg "applyStep" --type js --type ts

# Find all choice-related code
cd D:\G
rg "status.*choice|choices" --type js --type ts

# Find double-click handlers
cd D:\G\viewer
rg "dblclick|doubleclick|clickCount" --type js --type ts

# Find surfaceNodeKind usage
cd D:\G
rg "surfaceNodeKind" --type js --type ts

# Find astNodeId assignment
cd D:\G\viewer
rg "astNodeId" --type js
```

### File Inspection Commands

```powershell
# View engine-adapter toEngineRequest function
cd D:\G\viewer\app
Get-Content engine-adapter.js | Select-Object -Skip 164 -First 60

# View orchestrator integer detection
cd D:\G\backend-api-v1.http-server\src\orchestrator
Get-Content step.orchestrator.ts | Select-Object -Skip 209 -First 60

# View surface-map classification
cd D:\G\viewer\app
Get-Content surface-map.js | Select-Object -Skip 49 -First 40
```

### Diff Commands (for comparing changes)

```powershell
# Show recent changes to key files
cd D:\G
git diff HEAD~5 -- viewer/app/engine-adapter.js
git diff HEAD~5 -- backend-api-v1.http-server/src/orchestrator/step.orchestrator.ts

# Show git log for relevant files
git log --oneline -10 -- viewer/app/main.js
git log --oneline -10 -- viewer/app/engine-adapter.js
```

---

## Commands NOT to Run (Write Operations)

```powershell
# DO NOT RUN THESE - They modify files/state

# npm install (modifies node_modules)
# npm run build (creates dist)
# npm run format (modifies sources)
# git commit, git push, git checkout
# Any command with > or >> (file redirection)
# rm, del, move, copy to project folders
```
