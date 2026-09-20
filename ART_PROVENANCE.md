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

## Encounter bearer portraits

Generated with Amp Painter on 2026-09-17 for the full-page encounter bearer choice.
Each image references the corresponding character in `companions.webp`, retaining
Mara's shield and scar, Eryn's hood and bow, and Aldren's robes and lantern.
These are new full-figure square paintings, not enlarged avatar crops. All three
are opaque 1024 × 1024 WebP assets, resized and stripped with ImageMagick at quality 85.
The original companion sheet remains in use for compact in-combat portraits.

| Asset | Painter source |
| --- | --- |
| `public/assets/bearer-mara.webp` | https://ampcode.com/user-content/attachments/99119a2243ec40c7b31a5710ec983b065bd46dd271dc459be76afd24ef65fc26-file.png |
| `public/assets/bearer-eryn.webp` | https://ampcode.com/user-content/attachments/abf8a29efa409ce5c28340f000fd1989714ebb0ccdd43dcafa98cffaa0663923-file.png |
| `public/assets/bearer-aldren.webp` | https://ampcode.com/user-content/attachments/45bdd1315bb986f55e93958f7bc1ec2a05f87ccc6ee6cb04e98cf58a07fc3856-file.png |

In the art-production thread, the reference-only concept is saved at `.amp/in/artifacts/combat-concept.webp`. It contains exactly five cards, visible enemy intentions, shared fellowship health, energy, and Dread. Its invented individual companion health, card costs, rule text, and keywords are NOT implementation requirements. It is not a screenshot of a running game. No game code, push, deployment, or browser UI verification was part of that art-only task.

## Fonts, icons, and sound

- Cormorant Garamond Variable (Catharsis Fonts / Christian Thalmann) and DM Sans Variable (Colophon Foundry) are bundled from their Fontsource packages under the SIL Open Font License 1.1. Local Latin WOFF2 subsets are served by Vite; there are no runtime Google Fonts requests. License copies are in `public/licenses/`.
- UI symbols are original simple inline SVG paths in `src/ui/components.tsx`; no icon-font service or franchise symbols are used.
- All audio is synthesized locally by `src/ui/audio.ts`: oscillators, filtered transients, envelopes, and a slow ambient chord. No sampled commercial music or third-party sound recording is included. Audio variations do not consume game randomness.
- All game writing and rules presentation were created for this implementation. Generated paintings are not screenshots of the implemented UI.

## Wayfarer card materials

The owner selected concept C, Wayfarer, from the [front/back comparison](https://ampcode.com/user-content/attachments/1f85a001d1e59b7fba3ad6157fc9f20ccee66a2cb71fad1d9ae6b4229f6d0038-file.png).
Two original Painter assets were then generated in the implementation thread using
that concept as reference. They contain no baked card text, costs, rules or card
illustrations. The existing 64 card paintings are unchanged.

| Runtime asset | Purpose | Bytes | Generated source |
| --- | --- | --- | --- |
| `public/assets/wayfarer-face.webp` | Blank parchment with stitched leather binding, behind live card content | 344,088 | [PNG](https://ampcode.com/user-content/attachments/c92db592dc90ac5e6e17f56778558442a826c2b9718be51e70af7b84a52601ff-file.png) |
| `public/assets/wayfarer-back.webp` | Common bookcloth draw-pile back, with lantern and three region motifs | 136,580 | [PNG](https://ampcode.com/user-content/attachments/9c5bf54206200d6303dc85f38c02748c9e844eaa808a908397931a9373657a5b-file.png) |

Both opaque RGB sources were resized from 1024×1536 to 512×768 with ImageMagick
and initially encoded as WebP at quality 85. Total runtime size after the binding
correction below is 480,668 bytes. Both final
assets were inspected with `view_media`; dimensions were checked with ImageMagick.
The face has a quiet empty field for live text. The back is intentionally identical
for every card and reveals no draw order or identity. Its upright lantern and
regions are directional, matching the approved concept; this game has no reversed
cards or physical orientation mechanic. CSS supplies the wax energy seal,
clipped-corner art mount, card-stack edges, state borders and accessible live text.

The owner spotted an incomplete dark upper-left binding. A localized
[Painter correction](https://ampcode.com/user-content/attachments/93d7464b675b75721280e26f3da8d88b53413ae9a219ad1da97c02bc77fe6703-file.png)
replaces it with tan cord matching the other ties. Only a 32×32 patch at x62,y0
from the resized correction was composited onto the original decoded face.
The face was then encoded as lossless WebP so all pixels outside that patch remain
identical; ImageMagick's masked absolute-error comparison returned zero. The back
is unchanged. The corrected binding was inspected on the rendered Steady blade
card, including its material match and lack of a visible patch seam.

## Adventure crossroads, 2026-09-20

Eighteen original full-frame illustrations were generated with Amp Painter in
[the crossroads UI thread](https://ampcode.com/threads/T-01a0ba19-fbf9-77b5-bb1c-0f7b2e11ff4f).
Each stop has its own image, not a crop or color variant of another stop. The
existing forest, ruins and mountain art supplied style references for the forest,
the first three Avel scenes and the first mountain scene. Remaining compositions
were generated from descriptions to vary the locations. Mountain 3 received one
localized revision to make the left trail's foreground connection clearer.

All production files are 1536 × 1024 opaque WebP, encoded with ImageMagick at quality
82 with metadata stripped. They total approximately 7.3 MiB and load one crossroads
at a time from local assets. Source PNGs were downloaded using `amp files get`.
Every image was inspected in contact sheets; ambiguous mountain paths were also
inspected at full size, and the revised path was checked again. The rendered UI
was inspected on desktop and mobile. The first three Avel scenes share a skyline,
but have distinct causeway, plaza and bridge foregrounds. These are decorative
landscapes, not encounter previews. Generated architecture and geology are stylized.

Paths below are under `public/assets/journey/`.

| File | Location | Painter source |
| --- | --- | --- |
| `forest-1.webp` | The fern gate | [PNG](https://ampcode.com/user-content/attachments/d50096b5a7cd4347831ee872286f26f0f460bd3ffacd62be5833668f7ec36263-file.png) |
| `forest-2.webp` | The silver brook | [PNG](https://ampcode.com/user-content/attachments/0ae60caf2bd5c51400144407ef6f6b57cfc5109fd8bf432266c083e531a0111f-file.png) |
| `forest-3.webp` | The fallen giant | [PNG](https://ampcode.com/user-content/attachments/f5a8c87a1e426e8cc195164dc46e599c8c9e4776bc05ce7ae658c82e5b37ef4d-file.png) |
| `forest-4.webp` | The white stones | [PNG](https://ampcode.com/user-content/attachments/6c2168081f96e618b3b5443adac3aaadeac29a2437901fad44a7809aefc79df9-file.png) |
| `forest-5.webp` | The rain hollow | [PNG](https://ampcode.com/user-content/attachments/69b36c4fa081ea7e485b52a28e3e1d045583e49f4a3dd2591ca868f65bd41856-file.png) |
| `forest-6.webp` | The elder boughs | [PNG](https://ampcode.com/user-content/attachments/1a7ec05cad010ab8d34d84af9c7d5b546bd698ff79d20c0d33822dd3f90454d2-file.png) |
| `ruins-1.webp` | The reed causeway | [PNG](https://ampcode.com/user-content/attachments/24f129a8032781354f466a394feeac67a27e706ab915c75f41bed20a1f5fb278-file.png) |
| `ruins-2.webp` | The sunken square | [PNG](https://ampcode.com/user-content/attachments/9249def71fe7a2edc55bc22c39516a1473b5ea50829b2dad45c869ce5bc68117-file.png) |
| `ruins-3.webp` | The willow bridges | [PNG](https://ampcode.com/user-content/attachments/12dee9bf0f310752140f7fb35416f44e7d0ecacaaf3a0d00e74968a01a494581-file.png) |
| `ruins-4.webp` | The broken aqueduct | [PNG](https://ampcode.com/user-content/attachments/53da3390a233419df494664fc12024ff5d4e98095df677afaa32f222e4f45ea7-file.png) |
| `ruins-5.webp` | The drowned garden | [PNG](https://ampcode.com/user-content/attachments/185555ede866ee082a35783e38532efef4d6b011f458f3c0a303e2d03174a412-file.png) |
| `ruins-6.webp` | The quiet ramparts | [PNG](https://ampcode.com/user-content/attachments/1c808fb9364c055ed566a23bb5746463d868b80f53da911aa0e3fb28b267fede-file.png) |
| `mountain-1.webp` | The last pines | [PNG](https://ampcode.com/user-content/attachments/f72e309e4beaa395899ccfdc1ddd29c1feddf5254e60d2263e63f0eafd0bfd8e-file.png) |
| `mountain-2.webp` | The glass tarn | [PNG](https://ampcode.com/user-content/attachments/94b3c483312ac38ce1605386e2f62ee79206cc60926ccc6ef8c04d1e119e5482-file.png) |
| `mountain-3.webp` | The wind-carved pass | [Revised PNG](https://ampcode.com/user-content/attachments/7e5eddaa9dd17bc33debe2a2db3722708a1c0ea69ab1dae3d2b012d62a876dd2-file.png) |
| `mountain-4.webp` | The blue crevasse | [PNG](https://ampcode.com/user-content/attachments/f45ac22c2f5c8c587be97d6fdb0c8393fe4549bc56f9fbd8971bc114e2daed22-file.png) |
| `mountain-5.webp` | The cloud stair | [PNG](https://ampcode.com/user-content/attachments/1b716d67b9ec353f4928f7b97f5aeb358df8e5bfc8b77f997a37bc946e724251-file.png) |
| `mountain-6.webp` | The pale summit | [PNG](https://ampcode.com/user-content/attachments/a1349fc94d8c39a665edd3dccd3b7dfec84047e8a60346e33d89e739b89448e3-file.png) |

The superseded mountain-3 source is [here](https://ampcode.com/user-content/attachments/6bbdaf318b3737060aa9229c4f569f1efe8f11a19d3a2d13f521f01176af87b6-file.png).
The [layout comparison](https://ampcode.com/user-content/attachments/93c224a2e5b3e0be654e3d75e89f15b979c857e0dc5397122d7a64eaa83b0a25-file.png)
was a design reference only; it is not a shipped asset or verification screenshot.
