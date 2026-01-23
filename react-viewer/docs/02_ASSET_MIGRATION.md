# Step 2: Asset Migration

This document details the second phase of the migration: moving static assets and styles from the legacy `viewer` project to the new `react-viewer` application.

## 1. Migration Strategy

- **KaTeX**: We strictly switch from the local `src/assets/katex` folder to the npm package `@types/katex` and `katex`.
- **Custom CSS**: We will migrate the existing global styles into the React application's global CSS file.

## 2. Migrate Custom Styles

The legacy application uses a global stylesheet located at `viewer/src/assets/css/style.css`. We will copy these styles into `react-viewer/src/index.css`.

### Action Items

1.  **Read the source file**:
    Locate `viewer/src/assets/css/style.css`.

2.  **Update `react-viewer/src/index.css`**:
    Replace the contents of `react-viewer/src/index.css` with the contents of the legacy `style.css`.

    _Command to copy (run from project root):_

    ```bash
    cp ../viewer/src/assets/css/style.css ./src/index.css
    ```

    _(Assuming you are in `react-viewer` directory)_

3.  **Clean up CSS**:
    Open `react-viewer/src/index.css` and check for any `url()` references.
    - If there are references to local fonts or images (e.g., `../katex/fonts/...`), **remove or update them**. Since we are using the KaTeX npm package, we don't need manual font references in our custom CSS usually, as the library handles its own font loading via its own CSS.
    - If the legacy CSS imports the KaTeX CSS (e.g., `@import '../katex/katex.min.css';`), **remove that line**. We will import it via JavaScript.

## 3. Enable KaTeX Styles

In the React ecosystem, we import library styles directly in our entry point.

### Action Items

1.  Open `react-viewer/src/main.tsx`.
2.  Add the import for KaTeX CSS at the top of the file, before your local CSS.

    ```typescript
    import React from "react";
    import ReactDOM from "react-dom/client";
    // Import KaTeX CSS globally
    import "katex/dist/katex.min.css";
    import "./index.css";
    import App from "./App.tsx";

    // ... rest of the file
    ```

## 4. Verify

1.  Start the development server: `pnpm dev`.
2.  Inspect the page. Use the browser's developer tools to verify that:
    - The `katex.min.css` is loaded (you should see it in the `<head>` style tags).
    - Your custom styles from `index.css` are applied (e.g., background colors, layout classes).
