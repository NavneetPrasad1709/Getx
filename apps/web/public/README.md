# /public — static assets

Tracked subfolders:

- `logos/` — wordmark + mark in light/dark variants (SVG primary; PNG @1x/@2x exports for emails/social)
- `icons/` — `icon.svg` (Next.js auto icon), `apple-touch-icon.png` (180×180), feature glyphs
- `images/` — homepage hero, marketing photography, brand imagery
- `illustrations/` — empty states, error pages, onboarding art
- `og/` — Open Graph cards (1200×630). `og-default.svg` is the fallback; page-specific OG generated dynamically via `app/opengraph-image.tsx` where needed

## Replacing placeholders

The SVGs shipped here are **typographic placeholders**. To swap in final brand art:

1. Replace `logos/getx-logo.svg` + `logos/getx-mark.svg` (same viewBox preferred).
2. Export PNG @1x and @2x for each (used by emails / non-SVG contexts).
3. Generate `icons/apple-touch-icon.png` at 180×180 from the mark.
4. Regenerate `favicon.ico` (multi-size: 16/32/48) and place at `apps/web/public/favicon.ico`.
5. Replace `og/og-default.svg` with `og/og-default.png` (1200×630) and update `app/layout.tsx` metadata if extension changes.

See `apps/web/docs/asset-inventory.csv` for the full asset list and status.
