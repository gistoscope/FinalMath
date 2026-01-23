# Migration Plan: Viewer to React-Viewer

## 1. Dependencies & Configuration

Since the original project used a local `katex` library, we should use the npm package for the new project.

- **Install Dependencies**:
  ```bash
  cd react-viewer
  pnpm add katex
  pnpm add -D @types/katex
  ```
- **Configure TypeScript**: Ensure `tsconfig.app.json` allows JS files if you don't plan to fully type everything immediately.
  - Add `"allowJs": true` to `compilerOptions`.

## 2. Asset Migration

Move static assets and global styles.

- **Copy Styles**:
  - Copy content from `viewer/src/assets/css/style.css` to `react-viewer/src/index.css` (or `App.css`).
  - _Note_: Remove any direct references to `./src/assets/katex/...` in CSS since we are installing it via npm.
- **Import Styles**: In `react-viewer/src/main.tsx`, import the KaTeX CSS:
  ```typescript
  import "katex/dist/katex.min.css";
  ```

## 3. Core Logic Migration

The old app uses a feature-based architecture in `src/app/features`. We will port this directly.

- **Copy Source Code**:
  - Copy the entire `viewer/src/app/features` folder into `react-viewer/src/features`.
- **Rename Files**: Change extensions from `.js` to `.ts` (or `.tsx` if they contain JSX).
  - _Tip_: You can keep them as `.js` initially if `allowJs` is enabled, but renaming to `.ts` helps identify type issues.
- **Fix Imports**: Update import paths in the moved files to match the new structure if necessary.

## 4. Component Implementation

Recreate the `index.html` structure as React components.

- **Create Main Layout**: In `App.tsx`, reconstruct the HTML layout from `viewer/index.html`.
  - Convert `class` to `className`.
  - Ensure IDs (`formula-container`, `drag-rect`, etc.) are preserved or replaced with `useRef`.
- **Example Structure (`App.tsx`)**:

  ```tsx
  export default function App() {
    // Refs for DOM elements used by legacy logic
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      // Initialization logic will go here
    }, []);

    return (
      <div className="page">
        {/* Copy header, layout, control panels from index.html */}
        <div id="formula-container" ref={containerRef}></div>
        {/* ... */}
      </div>
    );
  }
  ```

## 5. Integration (The "Glue")

Wire the existing logic into the React lifecycle.

- **Initialize Logic**: Port the code from `viewer/src/app/main.js` into a `useEffect` hook in `App.tsx`.
  - Import your features: `import { renderFormula, buildAndShowMap } from './features/rendering';` etc.
  - Replace `document.addEventListener("DOMContentLoaded", ...)` with `useEffect(() => { ... }, [])`.
  - **Important**: Where `main.js` passed `container` or DOM elements, pass `ref.current`.
- **Expose Globals (Optional)**: If you need `window.runP1SelfTest`, add it inside `useEffect`.

## 6. Verification

- Run `pnpm dev`.
- Check browser console for import errors or missing elements.
- Test `Render Formula` and interactive features.

---

**Summary of file movements:**

- `viewer/src/assets/css` -> `react-viewer/src/index.css`
- `viewer/src/app/features` -> `react-viewer/src/features`
- `viewer/index.html` (body) -> `react-viewer/src/App.tsx` (JSX)
- `viewer/src/app/main.js` -> `react-viewer/src/App.tsx` (useEffect)
