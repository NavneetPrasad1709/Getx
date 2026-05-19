# Hero image

Drop a file at exactly this path to make the homepage hero use a real image instead of the SVG controller mascot:

```
apps/web/public/hero/main.webp
```

If the file is missing or fails to load, the hero gracefully falls back to the animated SVG controller. No code change needed.

## Specs

- **Format:** WebP (preferred) or PNG
- **Aspect ratio:** Square (1:1) — gets `object-contain`'d into a max 480×480 frame
- **Dimensions:** 960×960 or 1080×1080 ideal
- **Transparent background** preferred so the dark hero atmosphere shows through
- **Subject:** Centered, cinematic — controller/character/3D mascot
- **Filesize:** < 200 KB (use Squoosh or `cwebp -q 82`)

## Sourcing (legal)

- **Your own logo:** `apps/web/public/logos/getx-logo.png` already exists — copy + rename to `hero/main.webp` (convert via [squoosh.app](https://squoosh.app))
- **AI generated:** Midjourney prompt — *"3D rendered gaming controller floating, cyan neon glow, dramatic studio lighting, octane render, transparent background"*
- **Stock:** [unsplash.com/s/photos/gaming-controller](https://unsplash.com/s/photos/gaming-controller) (free license)

## NOT allowed

- Copyrighted game art (Pokémon, Valorant, etc.) without a license
- Niantic/Riot/Roblox assets pulled from the internet — use official press kits or commercial licenses
