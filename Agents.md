# Snippai Development Guidelines (Agent)

This document is generated from the current `develop` branch code and configuration. It applies to future feature development, refactoring, and fixes in this repository.

## 1. Scope and Goals

- Target branch: `develop` (the current default development branch).
- Target directories: `src/`, `docs/`, and build-related files in the repository root.
- Goal: continuously improve maintainability, type safety, and release stability without breaking existing behavior.

## 2. Tech Stack and Common Commands

- Core stack: `Electron Forge` + `Vite` + `React 18` + `TypeScript` + `TailwindCSS` + `shadcn/ui` (Radix).
- Documentation stack: `VitePress` (`docs/`).
- Quality tools: `ESLint` (configured) and `Husky` (integrated, with an empty `pre-commit` hook at the moment).

Development commands from `package.json`:

- `npm run start`: start Electron locally.
- `npm run start:web`: start the frontend only with Vite.
- `npm run lint`: run ESLint across the repository for `.ts/.tsx` files.
- `npm run package` / `npm run make`: build desktop packages.
- `npm run docs:dev` / `npm run docs:build`: develop and build the documentation site.

## 3. Directory Responsibilities (Mandatory)

- `src/main.ts`: Electron main process, including window lifecycle, global shortcuts, screenshot capabilities, and IPC events.
- `src/preload.ts`: exposes a whitelist of APIs through `contextBridge` for renderer-to-Electron bridging.
- `src/renderer/`: React renderer process, including UI, state, model calls, and components.
- `src/renderer/models/`: model adapter layer organized by `model-*.ts` files.
- `src/renderer/components/ui/`: reusable base UI components in the shadcn style.
- `docs/`: VitePress documentation site.

Direct cross-layer calls are prohibited:

- The renderer must not depend directly on Electron main-process APIs.
- Main-process capabilities must be exposed explicitly through `preload` before the renderer can use them.

## 4. Electron and Security Rules (Mandatory)

- Keep `contextBridge` in whitelist mode. Do not add blanket pass-through APIs.
- Do not enable `nodeIntegration` in the renderer process.
- IPC channel names must be semantic. When adding a channel, update both the `preload` exposure and any cleanup logic.
- Sensitive information such as screenshots and API keys must not be logged to the console or reported to error platforms.
- Network requests must use `https`. Never hardcode private secrets.

## 5. TypeScript and Code Style

### 5.1 Type Rules (Mandatory)

- New code must not use unnecessary `any`. `tsconfig` already enables `noImplicitAny`.
- If `any` is required for legacy compatibility, add a brief nearby comment explaining why and the follow-up replacement plan.
- Public functions, component props, and model input/output types must be declared explicitly.

### 5.2 Naming and File Organization (Recommended + Gradual Constraints)

- Existing business component files mainly use `lowerCamelCase` (for example `displayTextResult.tsx`). Keep that convention for compatibility and avoid broad renames for now.
- For new components:
  - Reuse the existing directory convention for filenames. Business components may continue to use `lowerCamelCase`.
  - Use `PascalCase` for component names.
- Model files should follow `src/renderer/models/model-<name>.ts`.
- Constants should use semantic names. Avoid scattering magic strings such as storage keys or IPC channel names.

### 5.3 Imports and Dependencies (Recommended)

- Import order: third-party dependencies first, then internal project modules.
- Prefer the `@/` alias that is already configured in Vite and TypeScript to reduce deep relative paths.
- Keep `components/ui` limited to shared base components. Put business logic in `components/`.

### 5.4 Comments and Logging (Mandatory)

- Comments should explain why, not obvious implementation details.
- Remove debug logs like `console.log` before submitting changes. Any retained logs must have a clear purpose, such as essential error context.
- Use UTF-8 file encoding consistently and avoid garbled comments.

## 6. UI and Interaction Rules

- Reuse `components/ui` primitives and the `cn()` helper whenever possible to keep visuals and interactions consistent.
- Prefer Tailwind utility classes for styling, and keep using the CSS variable theme system defined in `src/renderer/index.css`.
- New interactive buttons and forms must include recognizable labels or accessibility attributes such as `aria-*`.
- Async actions that affect user feedback must include loading and error states. The project standard is toast-based feedback.

## 7. Model Integration Rules

When adding a new model, update all of the following:

1. `src/renderer/models/model-<name>.ts`: implement the model call function.
2. `src/renderer/lib/models.ts`: add model metadata (`value/label/requireApiKey/requireBaseURL/modelScript`) and prompt options.
3. `src/renderer/models/index.ts`: ensure the dynamic loader can resolve the model file.
4. UI interactions: verify model switching, API key input, and retry behavior.

Requirements:

- Use a consistent error format so UI toasts can display useful messages.
- Do not log sensitive request fields such as full API keys.

## 8. Local Storage and Configuration Rules

- Existing keys such as `model`, `apiKeyMap`, and `${model}_baseURL` must not be renamed casually. Any change requires a migration path.
- Define new local storage keys centrally and add a prefix to avoid collisions.
- Handle empty values, invalid JSON, and version compatibility whenever reading from local storage.

## 9. Commit and Branch Rules

- Recommended branch prefixes: `feat/*`, `fix/*`, `chore/*`, `docs/*`.
- Recommended commit format: `type(scope): summary`, consistent with historical `chore:` and `fix:` commits.
- Every PR should include at least:
  - the change goal and scope;
  - manual verification steps and results;
  - screenshots or recordings for UI changes.

## 10. Pre-Merge Checklist (Mandatory)

- `npm run lint` has been executed and passes.
- If documentation site content changed, `npm run docs:build` has been executed and passes.
- At least one manual test run has covered the core flow:
  - screenshot trigger and result delivery;
  - model switching and prompt switching;
  - API key input and persistence;
  - result rendering and copying.
- No unrelated file changes are included, especially build artifacts or temporary files.

## 11. CI/CD Alignment

- The current GitHub Actions workflow builds and deploys documentation on `develop` branch pushes and pull requests using Azure Static Web Apps.
- Changes involving `docs/`, navigation, or example content must keep `docs:build` passing so CI is not blocked.

---

If the project later adopts a test framework such as unit tests or E2E tests, add a new section that defines test layering and coverage requirements, and include it in the mandatory pre-merge checklist.
