# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Snippai is an AI-powered desktop snipping tool built with Electron + React. Users press `Ctrl+Shift+A` to capture a screen region, which is sent to an AI model (Gemini, GPT-4o, etc.) for analysis: OCR, LaTeX formula recognition, table extraction, code explanation, problem solving, and translation.

## Commands

- `npm run start` — Launch Electron app in dev mode
- `npm run start:web` — Run renderer as standalone web app (no Electron)
- `npm run lint` — ESLint on `.ts/.tsx` files
- `npm run package` — Package app for distribution
- `npm run make` — Build platform installers (.exe, .deb, .rpm, .zip)
- `npm run docs:dev` / `npm run docs:build` — VitePress documentation site

There is no test framework configured. Pre-merge validation relies on `npm run lint` and manual testing of core flows.

## Architecture

Standard Electron 3-process model:

- **Main process** (`src/main.ts`): BrowserWindow lifecycle, global shortcut `Ctrl+Shift+A`, screenshot capture via `electron-screenshots`, IPC via `screenshot-result` channel.
- **Preload** (`src/preload.ts`): Exposes `window.electronAPI` via `contextBridge` (whitelist mode, no `nodeIntegration`).
- **Renderer** (`src/renderer/`): React 18 SPA — receives screenshot base64, routes to AI provider, displays results.

### Model Provider System

Two API styles in `src/renderer/models/`:
- **`openai-style.ts`**: OpenAI-compatible `/chat/completions` (OpenAI, DeepSeek, SiliconFlow, Qwen, Claude via OpenRouter, custom providers)
- **`gemini-style.ts`**: Google `generateContent` endpoint (direct or via Fastly proxy — no API key needed for default)

Model adapters follow `src/renderer/models/model-<name>.ts`. Adding a new model requires updating:
1. `src/renderer/models/model-<name>.ts` — implement call function
2. `src/renderer/lib/models.ts` — add metadata and prompt options
3. `src/renderer/models/index.ts` — ensure dynamic loader resolves it

### Web Search (Solve Mode)

The "Solve" prompt can use tool-calling: model requests `web_search`, app executes via Tavily (`src/renderer/web-search/tavily.ts`), feeds results back. Factory pattern in `src/renderer/web-search/factory.ts`.

### Key Directories

- `src/renderer/components/` — Business components (model select, prompt select, API key input, result display)
- `src/renderer/components/ui/` — shadcn/ui primitives (Radix-based, 14 components)
- `src/renderer/lib/` — Model registry, search client registry, AES-GCM encrypted storage, `cn()` utility
- `docs/` — VitePress documentation site

## Development Rules

### Electron Security

- Keep `contextBridge` in whitelist mode. Never enable `nodeIntegration`.
- IPC channels must be semantic; update both preload exposure and cleanup when adding channels.
- Screenshots and API keys must not be logged or sent to error platforms.
- All network requests must use HTTPS.

### TypeScript

- `noImplicitAny` is enabled. Avoid unnecessary `any`; if required for legacy, add a comment explaining why.
- Public functions, component props, and model I/O types must be explicitly declared.
- Use the `@/` path alias (maps to `src/`) instead of deep relative paths.

### File Conventions

- Business components use `lowerCamelCase` filenames (e.g., `displayTextResult.tsx`). Component names use `PascalCase`.
- Model files: `src/renderer/models/model-<name>.ts`.
- UI primitives go in `components/ui/`, business logic in `components/`.
- Import order: third-party first, then internal modules.

### UI

- Reuse `cn()` helper and `components/ui` primitives.
- Tailwind utility classes for styling; CSS variable theme system in `src/renderer/index.css`.
- Async actions must include loading and error states (toast-based feedback standard).
- New interactive elements need labels or `aria-*` attributes.

### localStorage

- Existing keys (`model`, `apiKeyMap`, `${model}_baseURL`) must not be renamed without a migration path.
- Define new keys centrally with a prefix to avoid collisions.
- Handle empty values, invalid JSON, and version compatibility on read.

### Commits and Branches

- Branch prefixes: `feat/*`, `fix/*`, `chore/*`, `docs/*`
- Commit format: `type(scope): summary`
- PRs must include: change goal, manual verification steps, and screenshots for UI changes.

### Pre-Merge Checklist

1. `npm run lint` passes
2. If docs changed: `npm run docs:build` passes
3. Manual test of: screenshot capture, model/prompt switching, API key persistence, result rendering/copying
4. No unrelated files or build artifacts included
