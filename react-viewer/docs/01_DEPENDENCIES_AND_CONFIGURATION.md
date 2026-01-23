# Step 1: Dependencies & Configuration

This document details the first phase of migrating the "viewer" application to "react-viewer". The goal is to set up the environment to support the legacy logic while leveraging the modern toolchain.

## 1. Install Dependencies

The original application relied on a local copy of `KaTeX` (in `assets/katex`). In the new React application, we will manage this dependency via `npm` for better maintainability and updates.

### Required Packages

- **katex**: A fast, easy-to-use JavaScript library for TeX math rendering on the web.
- **@types/katex**: Type definitions for KaTeX to support TypeScript development.

### Installation Command

Run the following commands in your terminal from the `react-viewer` directory:

```bash
# Navigate to the project directory
cd react-viewer

# Install the core KaTeX library
pnpm add katex

# Install TypeScript definitions as a developer dependency
pnpm add -D @types/katex
```

> **Note**: The legacy project used `nodemon` for a simple server. Since we are using Vite, we do not need `nodemon`; Vite's development server (`pnpm dev`) handles hot module replacement (HMR) and serving.

## 2. Configure TypeScript

We are migrating a vanilla JavaScript codebase. To allow us to copy existing `.js` files directly into the project without immediate errors, we must configure TypeScript to accept JavaScript files. This enables an **incremental migration** strategy.

### Update `tsconfig.app.json`

Open the file `tsconfig.app.json` (or `tsconfig.json` if `app` specific config is not used, but Vite usually creates `tsconfig.app.json`) in the root of `react-viewer`.

Add or update the `compilerOptions` to include `"allowJs": true` and `"noImplicitAny": false` (temporarily, to reduce friction).

**File:** `tsconfig.app.json`

```json
{
  "compilerOptions": {
    "composite": true,
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    /* MIGRATION CONFIGURATION */
    "allowJs": true /* Allow JavaScript files to be compiled */,
    "checkJs": false /* Skip type checking of JS files for now */,
    "noImplicitAny": false /* Allow 'any' types implicitly to speed up porting */
  },
  "include": ["src"]
}
```

### Why these settings?

- **`allowJs: true`**: Allows us to drop `main.js` or feature files directly into `src` and have Vite build them.
- **`checkJs: false`**: Prevents TypeScript from complaining about code patterns in the old JS files immediately. We can enable this later as we refactor.
- **`noImplicitAny: false`**: The old code likely doesn't have type annotations. This prevents the compiler from erroring out on every variable that doesn't have a strict type.

## 3. Verify Setup

After installing dependencies and updating the configuration, verify that the project still runs:

```bash
pnpm dev
```

Open the local host URL (usually `http://localhost:5173`) to ensure the basic Vite + React app renders without errors.
