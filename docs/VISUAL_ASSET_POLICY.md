# Visual Asset Policy

## Scope

This policy applies to visual assets newly added to the application, including app icons, illustrations, photographs, raster images, and illustrative SVG assets.

## Allowed sources

- Unicode emoji rendered by the user's operating system.
- Visual assets created by the user.
- Third-party free assets whose license clearly permits the intended use. The source and license must be recorded before the asset is added.
- Photographs or images explicitly selected or captured by the user at runtime, such as Photo Memo content. These are user content and are not bundled application assets.

## Not allowed

- AI-generated images or illustrations.
- Images or illustrations with unknown provenance or unclear usage rights.
- Images copied from websites, search results, social media, or other sources without confirmed permission.
- A new bundled image file without a recorded source/license or user-creation note.

## Smartphone launcher icons

Smartphone Home launcher icons use Unicode emoji. New optional smartphone apps should follow the same rule unless the user supplies an original asset or approves a clearly licensed free asset.

## Current bundled image files

The repository currently contains only these bundled raster image files:

- `icons/icon-192.png`
- `icons/icon-512.png`

These PWA icons were inherited from the pre-release application. Their provenance is not documented in the current repository. They are therefore treated as legacy-only assets: do not reuse them for new UI or derive new artwork from them. Replace them only with a user-created asset or a free asset with documented licensing.

## Existing code-drawn visuals

Existing functional diagrams drawn from source-code geometry, such as the body-region display, are legacy UI components rather than newly bundled illustration files. Do not add new illustrative artwork in code as a way to bypass this policy.

## Change rule

When adding a new bundled visual asset, update this policy with its path, source, license, and whether it was created by the user before merging the change.
