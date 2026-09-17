# Card base and upgrade artwork

This art-only pass supplies 32 matched base/upgraded pairs, 64 original illustrations, in 16 locally bundled WebP sheets. Amp Painter generated one image per call. No third-party artwork was downloaded. The existing companion portraits and card art were references for the same project's character identities and romantic wilderness style. This records generation sources, not a legal claim of copyright exclusivity.

The original production history below is preserved. The **Upgrade-strength revision** section at the end records the current replacements and supersedes the original upgraded cells for those cards.

Source thread: https://ampcode.com/threads/T-01a0a0c3-3692-7658-8a4a-87cbbc7c07fa

The authoritative content input was the uploaded `card-content.ts`, SHA-256 `c9e3f1cdab2694c5d8078a5599752ec1e0c775fcacd9d96b4f11a6739e654a48`. Its 32 card IDs, names, owners, base effects, and single upgrades informed the paintings. No game code, existing assets, or existing provenance was changed by this pass.

## Files and exact geometry

Files are `public/assets/card-pairs-01.webp` through `public/assets/card-pairs-16.webp`, inclusive. Runtime URLs are `/assets/card-pairs-01.webp` through `/assets/card-pairs-16.webp`.

Every sheet is exactly **1536 × 1024**, with **2 columns × 2 rows**. Every illustration is **768 × 512**, aspect ratio **3:2**. There are no gutters, frames, baked labels, rules, or readable text. The images are opaque RGB paintings, not transparent sprites.

Each row holds a matched pair. Base is always column 0, upgraded is always column 1. Coordinates have a top-left origin and use zero-based rows and columns.

| Cell index | Version | Row | Crop rectangle x, y, width, height |
| --- | --- | --- | --- |
| 0 | Base | 0 | `0, 0, 768, 512` |
| 1 | Upgraded | 0 | `768, 0, 768, 512` |
| 2 | Base | 1 | `0, 512, 768, 512` |
| 3 | Upgraded | 1 | `768, 512, 768, 512` |

For CSS background sprites, use `background-size: 200% 200%`. Horizontal position is `0%` for base and `100%` for upgraded. Vertical position is `0%` for row 0 and `100%` for row 1. Keep the art area at 3:2, or crop an already isolated cell. Do not apply `object-fit: cover` to the whole sheet as if it were one illustration. Two neighboring paintings may have similar foliage at their seam; the exact midpoint remains the crop boundary.

## Authoritative card-ID mapping

The sheet column below is the numeric suffix in `card-pairs-NN.webp`. Cell indices are row-major. Distinct artwork is provided for every listed base and upgrade.

| ID | Name | Owner | Sheet | Base cell | Upgrade cell | Visible upgrade |
| --- | --- | --- | --- | --- | --- | --- |
| strike | Steady blade | Mara | 01 | 0 | 1 | Guarded blade becomes advancing riposte |
| flame | Ancient flame | Aldren | 01 | 2 | 3 | Small flame becomes directed torrent |
| guard | Shelter | Mara | 02 | 0 | 1 | Crouched shield becomes standing arrow deflection |
| arrow | True shot | Eryn | 02 | 2 | 3 | Measured aim becomes confident release into exposed armor |
| unseen | Walk unseen | Eryn | 03 | 0 | 1 | Concealment alone becomes guiding the fellowship beneath patrol |
| defiance | Defiance | Mara | 03 | 2 | 3 | Kneeling resistance becomes rising counterstrike |
| pass | Hold the pass | Mara | 04 | 0 | 1 | Braced bottleneck becomes driving an entire spear line backward |
| bash | Shield-bearer | Mara | 04 | 2 | 3 | Intercepted sword becomes direct shield bash |
| shield | Iron answer | Mara | 05 | 0 | 1 | Close shield catch becomes lunging shield counter that splinters a buckler |
| stand | Last stand | Mara | 05 | 2 | 3 | Sheltering in rubble becomes defending the raised broken gate |
| challenge | Challenge | Mara | 06 | 0 | 1 | Shouted challenge becomes calm sword-point command |
| oath | An unbroken oath | Mara | 06 | 2 | 3 | Tying the oath cloth becomes keeping the oath under attack |
| rally | Rally together | Mara | 07 | 0 | 1 | Helping one companion becomes a coordinated chain up the ledge |
| needle | Through the leaves | Eryn | 07 | 2 | 3 | Concealed sighting becomes an arrow threaded through foliage |
| volley | Rain of arrows | Eryn | 08 | 0 | 1 | Small arc becomes broad volley over the enemy line |
| scout | Higher ground | Eryn | 08 | 2 | 3 | Lookout becomes directing routes from a watchtower |
| feint | A small opening | Eryn | 09 | 0 | 1 | Hooking a shield strap becomes pulling the defense fully aside |
| silence | Quiet as snowfall | Eryn | 09 | 2 | 3 | Sweeping tracks becomes leading an untracked snowy crossing |
| double | Twin arrows | Eryn | 10 | 0 | 1 | Preparation becomes extended rapid release with two arrow impacts |
| trail | Hidden trail | Eryn | 10 | 2 | 3 | Parting ferns becomes a sheltered root-tunnel bypass |
| spark | Borrowed fire | Aldren | 11 | 0 | 1 | Taking a coal becomes channeling its energy to companions |
| inferno | Light the dark | Aldren | 11 | 2 | 3 | Small ground ring becomes standing radial waves against shades |
| cinder | Cinder lance | Aldren | 12 | 0 | 1 | Thin cinder becomes a heavier braided lance with braced two-handed casting |
| resolve | Face the darkness | Aldren | 12 | 2 | 3 | Facing a shade becomes advancing into darkness with raised lantern |
| ward | Ember ward | Aldren | 13 | 0 | 1 | Small arc becomes interlocking dome over the fellowship |
| remember | Old knowledge | Aldren | 13 | 2 | 3 | Reading a diagram becomes assembling a beacon model from several sources |
| sunrise | One more dawn | Aldren | 14 | 0 | 1 | Tending a hand becomes restoring a companion to her feet |
| bread | Shared bread | Fellowship | 14 | 2 | 3 | Breaking a loaf becomes sharing a full warm meal |
| courage | Small courage | Fellowship | 15 | 0 | 1 | Steadied hand becomes taking the first brave step |
| lantern | Keep the lantern | Fellowship | 15 | 2 | 3 | Protecting one light becomes coordinated upkeep and scouting |
| sacrifice | Shoulder the burden | Fellowship | 16 | 0 | 1 | Struggling under packs becomes using a shared carrying pole |
| home | A promise of home | Fellowship | 16 | 2 | 3 | Remembering shelter becomes actively restoring a cottage |

## Source provenance

The initial Steady blade and Ancient flame sheet was generated and inspected first. It used local `public/assets/companions.webp` for identities and `public/assets/cards.webp` for palette and rendering. All subsequent first-generation sheets used the local companion sheet plus that approved anchor. No remote asset is required at runtime.

Fixed identities are Mara, a scarred short-brown-haired woman in gray cloak and chainmail with round shield; Eryn, a youthful gray-green-hooded ranger with bow; and Aldren, an older gray-bearded keeper in brown wool robes with an iron ember lantern. Scenes use slate blue, muted gray-green, luminous mist, monumental ruins, practical worn materials, and pale amber fire. Upgrades change gesture, action, scale, cooperation, or mastery rather than applying a filter to the base image. Fellowship additions are intentional, not separate health/turn mechanics.

Final PNG sources for each optimized sheet:

| Sheet | Source URL |
| --- | --- |
| 01 | https://ampcode.com/user-content/attachments/8bebb381e8f07081709b72e40d5595948edf3ca15450e1075cd5593ec5a7e236-file.png |
| 02 | https://ampcode.com/user-content/attachments/2e627f0ca2d5bca3df37c12248a93035f3d3711a645cd1248cc1995cb9889b0a-file.png |
| 03 | https://ampcode.com/user-content/attachments/cca50aa66d2b072f5226557e3c8d55866a867db550b684c5e83373f548b9fc7f-file.png |
| 04 | https://ampcode.com/user-content/attachments/3ad943919d885bbf7642bd2561c1402328d5520326037fcf9a3dffb59cd53d3a-file.png |
| 05 | https://ampcode.com/user-content/attachments/dddfd0b6c9b1de6e36171e95850dd24e57914e24ffd6d596bb15c5d80f7f3932-file.png |
| 06 | https://ampcode.com/user-content/attachments/6712cc47ec3413f2fd5f21d748f8b78f74cab87eb1c8be4ede13b21fb875bfce-file.png |
| 07 | https://ampcode.com/user-content/attachments/80131d292bc5cf40235128480ce00024836d76c0d92362de8e90f29faf60105a-file.png |
| 08 | https://ampcode.com/user-content/attachments/d183a197eac1efac0e89b2f66039d0d2f13e9a0dda31b4096da56892503ef582-file.png |
| 09 | https://ampcode.com/user-content/attachments/485a50a50b48d29c83ee4d2f846d93f8a27f4a594351e93732d6906d50c2d55e-file.png |
| 10 | https://ampcode.com/user-content/attachments/5f3b0300ace3e759680aebd39f685d94e3b747a6583660afa052c554508a8bbb-file.png |
| 11 | https://ampcode.com/user-content/attachments/03f2ccfe75c5e724c1e2c85e759485548180b31026fa99c95b6b4c52479e3b16-file.png |
| 12 | https://ampcode.com/user-content/attachments/0b27264f2e00a99d22099f599e21cf4af31830eb35962d85cdf8aaf56f1bf57c-file.png |
| 13 | https://ampcode.com/user-content/attachments/bbfdaf273f26dcbaafd47bcf148f094b9ca5191586a2ba83052432d6870255e3-file.png |
| 14 | https://ampcode.com/user-content/attachments/f7a43e53ae2bd8b0f4ff737df90aecadec555ab81b894d74437f7990eb449ab6-file.png |
| 15 | https://ampcode.com/user-content/attachments/fdbc36dbf1205cef0112ef1a1efa163d25e468563ccad90b1de8a1d2e6dcde2b-file.png |
| 16 | https://ampcode.com/user-content/attachments/34a1cf6d01d1fcd3acb992e7118aac8fbe41fe999531df48021c05b57e94bf65-file.png |

Revision references, all generated in this same thread:

- Sheet 02 began at `9ea61c398a05296b791c1ae79a7994e9ea0e0d1bc61549779fbf3ea03e360809-file.png`; its True shot upgrade was revised to remove excessive foreground blur.
- Sheet 04 began at `769c5c8ac2da184be7af8185ccec210b730be58ccbc8d402e2a411941256e9f0-file.png`; both upgrades were revised to show unmistakable shield impact and leverage.
- Sheet 10 began at `7f46a6212e83959de6cd2f4b63670d8461db08690a017b65e50ba0fd6f5f6224-file.png`. Revisions `68cb7899d4f2531ffa00f4c7e9dd3599f1849dbc540e5a41bac313ea2fc941ea-file.png` and `5f3b0300ace3e759680aebd39f685d94e3b747a6583660afa052c554508a8bbb-file.png` restored a missing bow and removed an extra arrow.

Revision filenames above use the prefix `https://ampcode.com/user-content/attachments/`. Final revision calls referenced the preceding generated sheet and retained its unaffected panels as closely as generation permits.

Additional silhouette alternatives for sheets 05, 10, 12, and 13 were generated during thumbnail review. The integration thread independently inspected and approved the already downloaded versions, so those alternatives were not adopted. The source table and byte total here describe the approved integrated set, not the unused alternatives.

## Processing, inspection, and delivery

PNG sources were downloaded with `amp files get`. ImageMagick normalized output to 1536 × 1024, stripped metadata, and encoded WebP at quality 86. All source images already had the intended 2 × 2 geometry; no uneven-row slicing was needed. The 16 production WebPs total **7,055,310 bytes**, about **6.73 MiB**.

Every final optimized sheet was inspected with `view_media`, including all adopted final revisions. Pair recognition was additionally checked in contact sheets at 192 × 128 per illustration. The final drawings provide all 64 distinct cells and all 32 matched pairs. `magick identify` verified every sheet's dimensions and opaque RGB channels. The mapping was compared against the authoritative 32-card input.

Remaining visual limitations are deliberate cinematic foreground occlusion in some base combat scenes, dense dark foliage in stealth paintings, and small secondary hand/tool details that soften at thumbnail size. Iron answer, Twin arrows, Cinder lance, and Old knowledge have closer base/upgrade silhouettes at 192 × 128, though their action or mastery details differ and the integration thread approved their readability. Companion faces vary slightly with angle and scene scale. Some arrow trajectories and ruined architecture are illustrative rather than physical simulations. No readable generated text, card rules, or UI is baked into the assets. Old knowledge uses pictorial diagrams only. Adding companions or depicting a wider action in an upgrade illustrates mastery, not an additional gameplay effect.

The integration thread has already downloaded all 16 sheets. Only `CARD_ART_PROVENANCE.md` remains to transfer. The archive request was withdrawn, so no archive is needed. No push, deployment, or UI implementation was performed by this art task.

## Upgrade-strength revision

The user approved the new True shot direction and requested a review of every pair. This pass replaces 17 upgraded illustrations and retains 15. All 32 base illustrations remain unchanged. The goal is a visible increase in equipment, protection, mastery, or effects, rather than the next frame of the base scene. These are illustrations, not changes to card mechanics.

Source thread: https://ampcode.com/threads/T-01a0a448-8f31-72b6-8985-43bd1fdd4ca5

Each replacement was generated as an individual 1536 × 1024 PNG using its base illustration as a reference. The approved True shot also supplied equipment/style guidance for selected ranger paintings and Steady blade. Download sources with `amp files get`. Resize to 768 × 512 for the existing cell geometry; do not crop these standalone sources into four cells.

| ID | Replacement filename | Upgrade decision | Standalone PNG source |
| --- | --- | --- | --- |
| strike | steady-blade-upgraded.png | Reinforced plate accents, gauntlet, shield and etched longsword; clearer equipment tier. | https://ampcode.com/user-content/attachments/56e57f23635648724f1f30e284cfca7cd007eacfa9fec30ebb9071590e1b1611-file.png |
| arrow | true-shot-upgraded.png | User-approved reinforced ranger gear, ornate bow and charged arrow. | https://ampcode.com/user-content/attachments/f1bf89033324f6bcfe26ce9de9918eed0a2fd5109277415fbe39606eb4e8586a-file.png |
| unseen | walk-unseen-upgraded.png | Leaf-like concealment veil visibly covers the fellowship. | https://ampcode.com/user-content/attachments/9af3b0a9910c783c76852b0dd0bc71d5abcd89939e1d1b13a9ad468a504d1b3d-file.png |
| defiance | defiance-upgraded.png | Reinforced armor, empowered shield and resolute stance amid recoiling foes. | https://ampcode.com/user-content/attachments/42c1b72a9d3186db5fb9f728b7c59bb4400b2090b4fe674af65ee683d2831e6c-file.png |
| challenge | challenge-upgraded.png | Strong shield emblem and broad challenge effect against surrounding enemies. | https://ampcode.com/user-content/attachments/68713007ebbf27af8b4847994352f663287fd8d57e397cf4319a7fb2c34e002f-file.png |
| oath | an-unbroken-oath-upgraded.png | Luminous oath ribbon links and protects the three companions. | https://ampcode.com/user-content/attachments/450e2ed4350e627a12e80acba65c3747bec1f0e143eeb733c5ccb27849ef5eb1-file.png |
| rally | rally-together-upgraded.png | Armored coordinated advance with shared light linking the fellowship. | https://ampcode.com/user-content/attachments/5f03fa9102b3e16d76399ee54e721e06b3daa70675b2c965a50f7fdc74e55f9a-file.png |
| needle | through-the-leaves-upgraded.png | Upgraded bow and bracers; wind parts foliage around a precise shot. | https://ampcode.com/user-content/attachments/23785d2bdbf3a6d5b27b1e3fbe26fcafd55148da05e77aee4799970e160f1a32-file.png |
| scout | higher-ground-upgraded.png | Spyglass, improved equipment and a detailed illuminated tactical terrain model. | https://ampcode.com/user-content/attachments/ad1b24b6c8648af39c9ebc3a6c9c7747570975a474a65fc8f13a53db87341d45-file.png |
| feint | a-small-opening-upgraded.png | Reinforced bracers, paired close-combat blades and highlighted armor weakness. | https://ampcode.com/user-content/attachments/50338ac8fb03603132dd35797c24a0d0bd6722e5c4b2a60b9c15cbfc26b9fc83-file.png |
| silence | quiet-as-snowfall-upgraded.png | Winter camouflage equipment and a visible silence veil through snow. | https://ampcode.com/user-content/attachments/d5ed8100e08ee426579b2b40a9827234d365bcace9335f4c968709dc11baf93d-file.png |
| trail | hidden-trail-upgraded.png | Improved ranger gear and a luminous sheltered root path across a ravine. | https://ampcode.com/user-content/attachments/6dbb0e595db6feab2977ed73836ecad51c9bd0274c713a520428531ac208047a-file.png |
| resolve | face-the-darkness-upgraded.png | Stronger lantern rays visibly part the surrounding shades. | https://ampcode.com/user-content/attachments/0c79caa7d8215178e5798199077a1cb6da7c159d009dfffe858adafc25c0fba1-file.png |
| remember | old-knowledge-upgraded.png | A luminous beacon reconstruction rises from the ancient tome. | https://ampcode.com/user-content/attachments/688366ab3e963e7a0465438b4c277ea8b916514def6b208f5c92320a13c3a8cc-file.png |
| sunrise | one-more-dawn-upgraded.png | Restorative light reaches all companions, with fresh growth among the stones. | https://ampcode.com/user-content/attachments/3a9c87765aa4e435f36356bd6f6b83049db3c02e9f6d0385e3c548c10704c791-file.png |
| courage | small-courage-upgraded.png | A small charm expresses shared courage through three protective silhouettes. | https://ampcode.com/user-content/attachments/f2d1c458f8420d34c60385dfb64e8429f9130319544a6780d0a1c490825b79ec-file.png |
| lantern | keep-the-lantern-upgraded.png | Reinforced lantern cage and a storm-deflecting lattice of light. | https://ampcode.com/user-content/attachments/2067e6907abc75da298c453516af5aa5129c9565233564595f8e866e40ef1cc4-file.png |

Retained upgrades, reviewed individually:

- Ancient flame: the small flame already becomes a large fire vortex.
- Shelter: the raised shield withstands a broader arrow barrage while protecting companions.
- Hold the pass: the fighter visibly drives back a massed spear line at a bottleneck.
- Shield-bearer: the shield bash visibly throws an armored opponent off balance.
- Iron answer: the impact splinters the enemy's buckler, showing stronger force.
- Last stand: the low rubble shelter becomes a commanding defensive position above the fallen gate.
- Rain of arrows: the upgraded volley visibly covers a broader area with more arrows.
- Twin arrows: two simultaneous arrows make the increased attack readable.
- Borrowed fire: a single coal becomes energy distributed between companions.
- Light the dark: a small ring becomes broad radiating flame waves.
- Cinder lance: the narrow beam becomes a thicker braided impact blast.
- Ember ward: the partial arc becomes a full protective dome over the fellowship.
- Shared bread: a small piece of bread becomes a full hot communal meal.
- Shoulder the burden: individual struggling packs become a shared carrying pole.
- A promise of home: the imagined cottage becomes active restoration of a real shelter.

Integration replaces only the selected right-column cells in 12 sheets. Modified sheets use lossless WebP to preserve all other decoded cells exactly; the four untouched sheets retain their original bytes. The current 16 sheets total 27,492,214 bytes, about 26.22 MiB. This increases download size relative to the initial lossy set, but avoids another compression pass on retained artwork. The 17 standalone full-resolution PNG sources are also exported separately for video generation, alongside a refreshed 64-image export at 768 × 512.

Verification: 17 replacement cells match their resized sources, and the remaining 47 cells match the prior runtime images pixel-for-pixel. All 16 sheets decode at 1536 × 1024 in Chromium. The production build and 95 tests pass. The existing card-layout check covers all 32 base/upgrade pairs in camp and inspection views at 390 and 1280 CSS pixels. New True shot, Old knowledge, and Quiet as snowfall comparisons were inspected in the running game; narrow-view scrolling was also checked. Three labelled base/old/new contact sheets cover every replacement. The PNG ZIPs contain 64 current card crops and 17 new full-resolution upgrades respectively, with archive integrity checks passing.

## Gameplay prototype reuse

Break formation temporarily reuses Iron answer's base/upgrade pair, art index 8.
Fading strike temporarily reuses Through the leaves' base/upgrade pair, art index 13.
Veiled Flame and Wildfire reuse Ancient flame's pair, art index 1. These prototypes
add no image files and make no changes to the original paintings or their sources.
