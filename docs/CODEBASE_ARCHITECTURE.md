# Codebase Architecture

This document describes the current application structure. Historical audits, temporary implementation notes, and superseded file layouts belong in Git history and pull requests rather than the live code tree.

## 1. Runtime ownership

### `shared/`

Side-effect-free utilities that are genuinely identical across core, UI, and screen layers. Keep this directory small; feature logic and domain rules must remain in their owning layer.

- `valueUtilities.js`: cross-layer value cloning, numeric-presence checks, and finite-number coercion helpers.

### `core/`

Domain and deterministic interpretation logic only.

- `appCore.js`: public domain API used by screens and shared UI modules.
- `rofJCore.js`: protected ROF-J logic.
- `rofJConstants.js`: current ROF-J contract identifiers.
- `mobileWalkJogCore.js`: public boundary for the smartphone walk/jog reference model.
- `interpretationBase.js`: reusable persisted-result interpretation primitives.
- `interpretationCore.js`: current beginner-facing interpretation projection. It consumes persisted outputs and does not recalculate Primary Reference-100 or ROF-J.
- `internal/platformInfrastructure.js`: PWA registration, storage keys, and storage gateway.
- `internal/modelSupport.js`: shared model constants, persisted-model snapshot metadata, and numeric utilities.
- `internal/inputSupport.js`: input safety, personal context, and record validation.
- `internal/recordRepositories.js`: collection and running-record repositories.
- `internal/primaryModelEngine.js`: primary regional calculation engine, trace builder, and input adapter.
- `internal/surfacePresetCatalog.js`: current surface preset data used by the primary-model input adapter.
- `internal/primaryInputProcessing.js`: formal-input utilities, validation, normalization, and app/trace adapters.
- `internal/primaryModelResults.js`: primary region definitions, result construction, validation, and result repository.
- `internal/applicationDomain.js`: body-region taxonomy, subjective/safety rules, profile adjustment, and small domain repositories.
- `internal/courseRepository.js`: course preset normalization and persistence.
- `internal/restoreInspection.js`: restore-file inspection and current-contract validation.
- `internal/backupService.js`: backup creation and restore application.
- `internal/publicHelpGuidance.js`: deterministic public-help guidance data.
- `internal/recordWorkflow.js`: record-save workflow and model-result persistence.
- `internal/historyWorkflow.js`: current-schema history loading, deletion, and undo.
- `internal/planPreview.js`: deterministic plan-preview construction.
- `internal/planWorkflow.js`: plan creation and persistence workflow.
- `internal/evidenceData.js`: evidence metadata used by the reading layer.
- `internal/readingCatalog.js`: current reading article catalog and source associations.
- `internal/readingService.js`: reading lookup, recommendation, and related-content service.
- `internal/consultationReport.js`: consultation report data and text generation.
- `internal/bodyRegionTerminology.js`: formal and familiar body-region terminology.
- `internal/deterministicConsultation.js`: deterministic consultation-purpose and memo composition.
- `internal/applicationServices.js`: data-management service and composition root for storage, workflows, reading, and consultation services.
- `internal/modules.js`: private registry used only to connect the split core modules.

The former monolithic core bundle has been removed. New runtime code should import only from public `core/` boundaries such as `appCore.js`, `rofJCore.js`, `mobileWalkJogCore.js`, or the interpretation modules; screen/UI modules must not import `core/internal/*` directly.

Do not move presentation text, DOM logic, routing, or storage mutation into `core/`.

### `screens/`

One module per routed screen. A screen may compose shared UI helpers, but should not own global routing, shared storage infrastructure, or scientific calculation logic.

### `ui/`

Shared application-shell and browser presentation responsibilities:

- routing and screen architecture;
- shared presentation helpers;
- interaction binding;
- PWA/update UI;
- reusable body-region visuals;
- browser-only flow/session state;
- GPS measurement helpers, local route state, and map rendering that remain separate from scientific calculation logic.

Mobile Home interaction ownership is split by responsibility:

- `ui/mobileHomeGridUtilities.js`: mobile-only Home layout primitives shared by layout, drag/drop, capacity, and iOS edit-scroll modules.
- `ui/interactions/mobileHomeLayoutState.js`: Home catalog, persisted layout state, page/widget scaffold, and layout application.
- `ui/interactions/mobileHomeEditPresentation.js`: edit controls, add-item picker, and drag-ghost presentation helpers.
- `ui/interactions/mobileHomeInteractions.js`: pointer/gesture coordination, page navigation, edit actions, and event lifecycle only.

`ui/platformBootstrap.js` selects one platform at startup. It loads `ui/platformStyles.js`, then exactly one of `mobileRuntimeEntry.js` or `desktopRuntimeEntry.js`, before importing `app.js`. `app.js` likewise selects one platform application runtime and one platform screen registry. Opposite-platform runtime modules must not be fetched merely for compatibility.

Screen-specific logic should stay in `screens/` unless it is genuinely reused.

GPS measurement runtime responsibilities are documented in `docs/GPS_MEASUREMENT.md`. GPS-derived distance/time and saved route geometry must not be moved into the scientific calculation modules merely for UI convenience.

### `styles/`

`index.html` loads only shared styles. `ui/platformStyles.js` owns the platform-specific stylesheet lists and inserts only the selected platform's styles while preserving their intended cascade positions relative to shared layers.

Shared ownership:

- `tokens.css`, `base.css`, `layout.css`: global tokens and application baseline.
- `components.css`: reusable cross-screen components.
- `screens.css`: shared routed-screen base presentation.
- `responsive.css`: responsive rules that apply to both platforms.
- feature styles without a `mobile-` or `desktop-` prefix: shared feature presentation.

Platform ownership:

- `mobile-screen-layouts.css` and `mobile-*.css`: smartphone-only presentation.
- `desktop-foundation.css`, `desktop-screen-layouts.css`, and `desktop-*.css`: desktop-only presentation.
- `consultation-share-mobile.css`: smartphone-only consultation override.

Desktop must not load or cache mobile-only styles, and mobile must not load or cache desktop-only styles. Shared styles must not contain platform-only `.mobile-*`, `.desktop-*`, `.pc-*`, or platform data selectors. Platform-only runtime files must have explicit platform ownership in their filename or directory. `tests/codebaseArchitecture.test.mjs` enforces these boundaries in the loader, dependency graph, DOM/CSS ownership, and PWA cache lists.

Do not create numbered CSS generations such as `*-v2.css` or temporary `prototype-*.css`. Modify the owning layer instead.

## 2. Interpretation architecture

The current Interpretation flow has one canonical runtime path:

`screens/interpretationRoomScreen.js`
→ `core/interpretationCore.js`
→ `core/interpretationBase.js`
→ `ui/interpretationRoomPresentation.js`

Version identifiers may exist inside output schemas or scientific/model metadata when they carry semantic meaning. Runtime filenames, CSS classes, route parameters, and function names should not encode temporary implementation generations.

## 3. Navigation ownership

- `ui/appRouter.js`: hash route parsing and dispatch support.
- `ui/screenArchitecture.js`: screen hierarchy and contextual back-navigation.
- `ui/appShell.js`: platform-neutral navigation, contextual-help, and shell-layer primitives only.
- `ui/mobileAppShell.js` / `ui/desktopAppShell.js`: platform-owned headers, shell composition, and platform-only DOM selectors.
- `app.js`: application composition and platform selection; it delegates platform markup and selectors to the selected platform layer.

Context passed between derived screens should be limited to meaningful navigation state such as record, region, origin, and return location. Do not keep obsolete compatibility flags after a flow becomes canonical.

## 4. Naming rules

Use names based on responsibility, not development history.

Preferred:
- `bodyRegionVisuals.js`
- `mobile-topbar`
- `screen-layout--result`
- `data-result-region-list`

Avoid:
- `prototype-*`
- `candidate-*` when the value is not actually a domain candidate
- `hotfix-*`
- dated filenames
- `*-v1/v2/v3` for runtime implementation generations

Semantic model/schema versions are exempt when the version is part of the data contract.

The pre-release application accepts only the current storage and result contracts. Do not add migration aliases, retired storage keys, retired result versions, or compatibility readers for unpublished builds. Retired scientific model identifiers must not remain in active runtime or presentation paths. Regression tests may name retired identifiers only to verify that those paths stay absent.

## 5. Cleanup and deletion rules

A file may be deleted when all of the following are true:

1. no current runtime import or HTML/PWA reference reaches it;
2. no current test requires it as an active contract;
3. its behavior has a verified canonical replacement or is obsolete;
4. historical value is already preserved by Git history.

Do not keep old implementations hidden behind query flags or alternate route aliases after the canonical path is established.

## 6. Verification requirements

Before merging runtime changes:

- runtime implementation remains vanilla JavaScript, CSS, and HTML; Web Manifest and image files are deployment assets rather than implementation code;
- all JavaScript and MJS files pass syntax checking;
- runtime dependency reachability reports no unreachable runtime JS;
- runtime static imports report no unused bindings;
- runtime local function declarations report no unreferenced implementations;
- every CSS file is intentionally loaded;
- shared PWA precache and both explicit platform cache lists contain only existing paths, with no opposite-platform leakage;
- all test suites pass;
- protected scientific cores are compared against the intended scientific baseline when they are not part of the change.

Temporary audit workflows must be removed before merge.
