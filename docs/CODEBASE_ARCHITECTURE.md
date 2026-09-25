# Codebase Architecture

This document describes the current application structure. Historical audits, temporary implementation notes, and superseded file layouts belong in Git history and pull requests rather than the live code tree.

## 1. Runtime ownership

### `core/`

Domain and deterministic interpretation logic only.

- `appCore.js`: public domain API used by screens and shared UI modules.
- `rofJCore.js`: protected ROF-J logic.
- `rofJConstants.js`: current ROF-J contract identifiers.
- `legacyCompatibility.js`: old storage/cache/schema identifiers required only to read or clean up data created by earlier releases.
- `interpretationBase.js`: reusable persisted-result interpretation primitives.
- `interpretationCore.js`: current beginner-facing interpretation projection. It consumes persisted outputs and does not recalculate Primary Reference-100 or ROF-J.
- `internal/platformInfrastructure.js`: PWA registration, storage keys, and storage gateway.
- `internal/modelSupport.js`: shared model constants, persisted-model snapshot metadata, and numeric utilities.
- `internal/inputSupport.js`: input safety, personal context, RPE provenance, and record validation.
- `internal/recordRepositories.js`: collection and running-record repositories.
- `internal/modelV27.js`: V2.7 model constants and its stored-result repository.
- `internal/primaryModelEngine.js`: primary regional calculation engine, trace builder, and input adapter.
- `internal/primaryInputCatalog.js`: formal primary-input catalog and metadata.
- `internal/primaryInputProcessing.js`: formal-input utilities, validation, normalization, and app/trace adapters.
- `internal/primaryModelResults.js`: primary region definitions, result construction, validation, and result repository.
- `internal/applicationDomain.js`: body-region taxonomy, subjective/safety rules, profile adjustment, and small domain repositories.
- `internal/v27ApplicationModel.js`: V2.7 application-level math and model calculation.
- `internal/applicationStorage.js`: course storage, restore inspection, backup, and public-help data boundaries.
- `internal/v27ApplicationServices.js`: V2.7 personal/input adaptation and stored-result services.
- `internal/recordWorkflow.js`: record-save workflow and model-result persistence.
- `internal/historyWorkflow.js`: history loading, deletion, undo, and compatibility handling.
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

The former monolithic core bundle has been removed. New runtime code should import only from `appCore.js`, `rofJCore.js`, or the interpretation modules; screen/UI modules must not import `core/internal/*` directly.

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

Screen-specific logic should stay in `screens/` unless it is genuinely reused.

GPS measurement runtime responsibilities are documented in `docs/GPS_MEASUREMENT.md`. GPS-derived distance/time and saved route geometry must not be moved into the scientific calculation modules merely for UI convenience.

### `styles/`

Styles are loaded in this order:

1. `tokens.css` — theme/design tokens.
2. `base.css` — element defaults and global baseline.
3. `layout.css` — application frame and shared geometry.
4. `components.css` — reusable component styling.
5. `screens.css` — screen-level base styling.
6. `responsive.css` — shared responsive behavior.
7. `mobile.css` — mobile-specific layout and interaction geometry.
8. `desktop-foundation.css` — desktop-wide foundation and workspace geometry.
9. `interpretation-room.css` — Interpretation-specific presentation.
10. `desktop.css` — final desktop screen refinements.
11. `run-measurement.css` — GPS measurement-specific presentation.

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
- `ui/appShell.js`: primary navigation and shell/header presentation.
- `app.js`: application composition and screen registration.

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

Legacy product names or retired implementation labels must not be introduced into new runtime names, UI text, or new storage contracts. If an old literal is required to read existing data or remove an old browser cache, keep it inside `legacyCompatibility.js` where the ES-module runtime can share it. Service Worker cache cleanup may keep a local legacy prefix because the worker is intentionally loaded as a classic script. Historical scientific model identifiers may remain where exact comparison with saved results is required; presentation code must not expose those identifiers as interface labels.

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
- every CSS file is intentionally loaded;
- PWA precache paths all exist;
- all test suites pass;
- protected scientific cores are compared against the intended scientific baseline when they are not part of the change.

Temporary audit workflows must be removed before merge.
