# Step 3: Core Logic Migration (Revised)

You asked about "other files" like `ast-parser.js`, `core/`, etc. You are absolutely correct — the logic in `features` depends on these files. For example, `rendering/formula-render.js` imports `../../ast-parser.js`.

To ensure all logic migrates correctly and relative paths (like `../../`) remain valid, we must copy **all** the contents of the legacy `app` directory into our new `src` directory.

## 1. Copy All Source Logic

Instead of just `features`, we will copy the entire contents of `viewer/src/app` into `react-viewer/src`.

### Action Items

1.  **Execute Copy**:
    Run the following command from the `react-viewer` directory:

    ```bash
    # Assuming 'viewer' and 'react-viewer' are siblings
    # Copy all contents from src/app to src
    cp -r ../viewer/src/app/* ./src/
    ```

    _What this does_:
    - `viewer/src/app/features` -> `react-viewer/src/features`
    - `viewer/src/app/core` -> `react-viewer/src/core`
    - `viewer/src/app/ast-parser.js` -> `react-viewer/src/ast-parser.js`
    - ...and so on.

## 2. Verify Structure and Imports

After copying, the structure ensures that relative imports work without modification:

- **File**: `src/features/rendering/formula-render.js`
- **Import**: `import ... from "../../ast-parser.js"`
- **Resolution**: Goes up two levels (`rendering` -> `features` -> `src`) and finds `src/ast-parser.js`. **Success.**

### Resulting Structure

```
src/
├── features/
├── core/
├── ui/
├── modules/
├── ast-parser.js
├── surface-map.js
├── traceHub.js
├── operator-selection-context.js
├── introspect.js
├── main.js               <-- (Legacy entry point, see below)
├── App.tsx
└── main.tsx
```

## 3. Handling `main.js`

You will notice `src/main.js` is now copied.

- **Status**: This is the _legacy_ entry point. It will not run automatically in Vite.
- **Action**: In **Step 5 (Integration)**, we will open this file, read its logic, and port it into `App.tsx`.
- **Cleanup**: Once ported, you can delete `src/main.js`. For now, keep it as a reference.

## 4. Handling `tests` (Optional)

The legacy project has a `tests` folder. It is good practice to bring this over.

```bash
cp -r ../viewer/tests ./tests
```

## 5. Module Check

Ensure that the files you just copied are `ES Modules` (use `import`/`export`).

- Check `src/ast-parser.js`.
- If it uses `module.exports`, you might need to convert it to `export` syntax.
  - _Observation_: Most "frontend" files in `viewer` seemed to use ES modules (`import`/`export`), so you should be safe.

## 6. Execution Command

Run this to perform the migration of all logic files:

```bash
cp -r ../viewer/src/app/* ./src/
```
