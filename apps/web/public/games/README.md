# Per-game key art

Drop a file at exactly this path for each game's showcase card to use a real image instead of the animated gradient blob:

```
apps/web/public/games/pokemon-go/hero.webp
apps/web/public/games/roblox/hero.webp
apps/web/public/games/valorant/hero.webp
```

If a file is missing or fails to load, that game's card falls back to the animated gradient blob mascot. No code change needed.

## Specs

- **Format:** WebP (preferred) or PNG/JPG
- **Aspect ratio:** Landscape, roughly **3:2** (e.g. 1500×1000) — gets `object-cover`'d into the right panel
- **Dimensions:** 1500×1000 ideal, max 1920 wide
- **Subject:** Game characters, environment, key art — full-bleed, cinematic
- **Filesize:** < 350 KB each (use Squoosh / `cwebp -q 80`)

## Pokémon GO — sourcing

- ✅ **Niantic press kit:** https://www.pokemongolive.com/press-kit (editorial use, attribute Niantic)
- ✅ **AI generated:** Midjourney prompt — *"Pokémon trainer with cute creatures on floating gaming island, 3D rendered, vibrant colors, dramatic lighting, octane render"*
- ❌ **NOT** screenshots / fan-art / wallpapers from random sites

## Roblox / Valorant

- ✅ **Roblox developer brand assets:** https://corp.roblox.com/newsroom/
- ✅ **Valorant brand kit (Riot):** https://www.riotgames.com/en/press (limited)
- ✅ **AI generated:** safest path for marketing pages

## NOT allowed

- Random Google Images results
- Wallpaper / fan-art sites
- Reddit / Discord screenshots
- Anything copyrighted without a license
