# The Last Ember art provenance

Generated on 2026-09-14 using Amp Painter for this project. All six production images are original generated artwork, with reference images generated in the same session. No third-party stock, franchise images, fonts, or sounds were imported by this art task. This is provenance documentation, not a legal opinion about generated-art copyright or exclusivity.

Source thread: https://ampcode.com/threads/T-01a0a0c3-3692-7658-8a4a-87cbbc7c07fa

## Production assets

All paths are workspace-relative. Runtime URLs begin `/assets/`. All images are opaque, with painted backgrounds, not transparent character cutouts. WebP files are locally bundled and need no remote service at runtime. Combined size is 2,611,752 bytes, about 2.49 MiB.

| Path | Dimensions | Purpose |
| --- | --- | --- |
| `public/assets/forest.webp` | 1536 × 1024 | Forest act, ruined aqueduct, misty river, sheltered fire; also suitable for title/journey crops |
| `public/assets/ruins.webp` | 1536 × 1024 | Ruined settlement act, cathedral and cobbled road |
| `public/assets/mountain.webp` | 1536 × 1024 | Mountain act, beacon above mist and snowy ridges |
| `public/assets/companions.webp` | 1536 × 1024 | Three companion portraits in one row |
| `public/assets/enemies.webp` | 1536 × 1023 | Four columns, three rows of enemy illustrations |
| `public/assets/cards.webp` | 1536 × 1023 | Four columns, three rows of card paintings |

## Exact sheet coordinates

Coordinates use a top-left origin and zero-based columns and rows. Rectangles are `x, y, width, height` in pixels. There are no gutters.

Companions have cells of 512 × 1024. Mara is `0, 0, 512, 1024`; Eryn is `512, 0, 512, 1024`; Aldren is `1024, 0, 512, 1024`. Mara has short brown hair, a cheek scar, gray cloak, and round shield. Eryn has a gray-green hood and bow. Aldren has a gray beard, brown robes, and amber lantern. For face avatars, crop toward the upper third of the individual portrait.

Enemies and cards have cells of 384 × 341. For column `c` and row `r`, crop `384*c, 341*r, 384, 341`. Columns start at x = 0, 384, 768, 1152. Rows start at y = 0, 341, 682.

| Row | Enemy column 0 | Enemy column 1 | Enemy column 2 | Enemy column 3 |
| --- | --- | --- | --- | --- |
| 0 | Wolf | Brigand | Soldier | Shade |
| 1 | Stone sentinel | Stag spirit | Crow | Ice wraith |
| 2 | Root king | Fallen marshal | Hollow beacon | Spare dire wolf |

| Row | Card column 0 | Card column 1 | Card column 2 | Card column 3 |
| --- | --- | --- | --- | --- |
| 0 | Blade | Shield | Arrow | Flame |
| 1 | Concealment | Shared bread/camp | Shield bash | Hidden trail |
| 2 | Bright ward | Old knowledge | Fellowship oath | Lantern |

For CSS background sprites, use `background-size: 400% 300%` with x positions 0%, 33.333333%, 66.666667%, 100% and y positions 0%, 50%, 100%. Companion sheets use `background-size: 300% 100%` and x positions 0%, 50%, 100%. Preserve the cell aspect ratio or use an overflow-hidden inner image before further cropping. Do not use `object-fit: cover` on the entire sheet as if it were a single portrait.

## Generation and processing

Each Painter call generated one image. The initial combat concept established muted slate blue/gray-green, luminous mist, immense ruined architecture, practical human clothing, and restrained pale amber. The forest artwork referenced the concept. Ruins, mountain, and enemies referenced the forest. Companions referenced the concept. Cards referenced the companions and forest.

Images were downloaded with `amp files get`, converted with ImageMagick, and stripped of metadata. Environments and companions use WebP quality 85; sheets use quality 87. Enemy sheet source was cropped from 1536 × 1024 to 1536 × 1023 for exact 341px rows. The card source had uneven row heights: source rows y=0..340, y=341..652, and y=653..1023 were separately resized to 341px tall and appended. Final sheet coordinates above describe the normalized output, not the raw source.

Source PNG attachment URLs, retained for regeneration rather than runtime loading:

| Image | Source |
| --- | --- |
| Combat concept | https://ampcode.com/user-content/attachments/97ffce9e0f28671941e7dd8bbbe26ce78d844077724bfeebbf7c84c9d0874e33-file.png |
| Forest | https://ampcode.com/user-content/attachments/517c1699caf9fcd08f7bdfb059f66492d06a0ea17599e8375f7a92f4b6f7d889-file.png |
| Ruins | https://ampcode.com/user-content/attachments/28db95a181a5a0d5854025b24d29f004a5e51fe04f8bed8019c3716ea2b98d01-file.png |
| Mountain | https://ampcode.com/user-content/attachments/d6fa1dfd0fa5669fbd5ceb2143c6a329fb6c89c9f779f8abcccaf5249a312514-file.png |
| Companions | https://ampcode.com/user-content/attachments/3d753b14134f28ca1440c72f7339805c5abd2be5d33340b576d501ccb6c9e732-file.png |
| Enemies | https://ampcode.com/user-content/attachments/64c53c9e8cb5b18f2a80d0c54be52644ef7a97d26f997d0f1ba87af61f773b40-file.png |
| Cards | https://ampcode.com/user-content/attachments/6408df58f02d51bec4dfba24b692bcf120a749334d465b3092a061f11e28745a-file.png |

## Inspection and limitations

The concept and every final production image were inspected with `view_media`. ImageMagick verified formats and dimensions. Production sheets contain all requested subjects in the documented order, without readable text or UI. The book contains non-readable painted page texture. All production images have opaque backgrounds.

Environment detail reads closer to cinematic digital oil illustration than heavy impasto. Some ruined architecture has ambiguous structural connections. The hidden-trail card has a somewhat symmetrical dark foreground shape. Bottom-row enemies extend close to their lower cell edges. These are artwork limitations, not missing assets or incorrect grid coordinates.

In the art-production thread, the reference-only concept is saved at `.amp/in/artifacts/combat-concept.webp`. It contains exactly five cards, visible enemy intentions, shared fellowship health, energy, and Dread. Its invented individual companion health, card costs, rule text, and keywords are NOT implementation requirements. It is not a screenshot of a running game. No game code, push, deployment, or browser UI verification was part of that art-only task.

## Fonts, icons, and sound

- Cormorant Garamond Variable (Catharsis Fonts / Christian Thalmann) and DM Sans Variable (Colophon Foundry) are bundled from their Fontsource packages under the SIL Open Font License 1.1. Local Latin WOFF2 subsets are served by Vite; there are no runtime Google Fonts requests. License copies are in `public/licenses/`.
- UI symbols are original simple inline SVG paths in `src/ui/components.tsx`; no icon-font service or franchise symbols are used.
- All audio is synthesized locally by `src/ui/audio.ts`: oscillators, filtered transients, envelopes, and a slow ambient chord. No sampled commercial music or third-party sound recording is included. Audio variations do not consume game randomness.
- All game writing and rules presentation were created for this implementation. Generated paintings are not screenshots of the implemented UI.
