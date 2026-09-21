# The Last Ember: autonomous first-version build brief

## Read this first

Build a complete, polished, browser-playable solo deckbuilding adventure from this brief. The repository was empty except for Git metadata when this document was written. This is a specification, not a report of an existing implementation.

The owner is an experienced programmer who loves Pokémon, Magic: The Gathering, and Yu-Gi-Oh!, and chose a solo deckbuilding adventure rather than competitive multiplayer. They will be asleep while you work. Resolve ordinary product and implementation decisions yourself, build, playtest, and refine without waiting for answers. They explicitly want a fully working first version, not a tiny combat demo or an unfinished MVP.

This preparation task provides the handoff and a verified React/TypeScript/Vite/Bun starter with orb lifecycle scripts. The starter is not a playable game. The next building agent owns game implementation. Do the work yourself; delegate independently owned work only where it genuinely helps. Do not turn this into another planning-only handoff.

The intended release scope is a complete, replayable short adventure, not an endless campaign or commercial live service. Finish the whole journey and polish it before adding more systems.

## Decision record and priorities

Explicit owner choices:

- Playable on macOS. A browser app is acceptable and is the chosen starting platform.
- Solo deckbuilding adventure.
- An original fantasy world with the historical atmosphere of The Lord of the Rings: ancient forests, fallen kingdoms, perilous journeys, and fellowship. Do not use franchise characters, places, writing, logos, or artwork.
- Art direction C from the comparison: romantic wilderness, atmospheric painterly landscapes, luminous mist, immense ruins, small human figures, slate blue, muted gray-green, and pale amber light.
- Use `bun test`, not Vitest.
- Document the initial stack, but add or replace packages when justified by the implementation.
- Work autonomously, choose sensible defaults for unresolved questions, and deliver a complete first version.
- Give combat animation extra attention. The owner explicitly wants smooth, engaging battles, damage animation, and sound effects where possible, not static or dull combat.

Recommendations now adopted as defaults:

- Working title: **The Last Ember**. This is a provisional creative title, not a researched trademark claim.
- Three named companions, one shared deck, one energy pool, one fellowship health pool.
- Turn-based combat with visible enemy intentions and no positioning grid.
- Dread is the central power-versus-exposure mechanic.
- No server, accounts, online multiplayer, trading, or monetization in this version.
- A complete three-act run, with branching routes, battles, rewards, events, camps, merchants, relics, and a final ending.
- Local persistence, seeded randomness, sound controls, and a brief interactive introduction.

Earlier discussion proposed one fight and 12 cards to validate the mechanic. That remains a useful internal development checkpoint, but is explicitly superseded as the final deliverable by the owner's request for a complete first version.

Prioritize correct and interesting combat, a complete run, evocative art, readable interaction, and persistence in that order when tradeoffs arise. Do not use scope expansion as a reason to leave the game unfinished.

## Player experience and fiction

The fellowship carries the last living ember of an old sanctuary across a kingdom whose watchfires have gone dark. It must reach a mountain beacon before the pursuing host closes the passes. Ancient magic helps the travelers survive but reveals them to things listening in the wilderness.

The tone is melancholy, humane, and occasionally hopeful. The world must feel worth saving. Show shelter, warm food, repaired clothing, shared burdens, and small acts of courage alongside ruined halls and dangerous forests. Avoid relentless gray misery, comic fantasy, modern slang, and exposition dumps.

Provisional companions:

- **Mara, the guardian:** practical, scarred, protective. Block, retaliation, and holding danger at bay.
- **Eryn, the ranger:** observant and resourceful. Precision attacks, card flow, and concealment.
- **Aldren, the emberkeeper:** burdened by knowledge. Strong spells, Dread manipulation, and dangerous bursts of power.

Companions identify card families and appear in the presentation. They do not have separate health, equipment inventories, turns, or incapacitation rules in this version. Shared health represents the fellowship's ability to continue. Card use must not depend on a hidden companion state.

Win the run by defeating the final encounter and lighting the beacon. Lose when fellowship health reaches zero. Both outcomes get a deliberate ending screen with statistics and a clear way to start again.

## Core combat contract

Implement and explain these rules consistently. Numeric tuning is allowed; changing the fundamental contract should require a demonstrated playtest problem and a note in the final handoff.

### Turn and deck flow

- Start with 70 maximum health, 3 energy per turn, and a 12-card starter deck. Tune if needed.
- Shuffle the draw pile at combat start using the run's seeded random source. Start with no block and zero Dread.
- At player turn start, clear remaining player block, refill energy to 3, and draw five cards.
- If the draw pile empties during a draw, shuffle the discard pile into it and continue. Never duplicate, lose, or redraw an unresolved card.
- The player can play affordable legal cards in any order. A card needs a valid target if its text says so.
- Resolve a played card's effects in printed order, then move it to discard or exhaust. Exhausted cards stay out for that combat and return for the next encounter.
- Draw effects draw immediately. Default hand limit is 10; attempted draws at the cap do not remove cards from the draw pile.
- At end turn, discard unplayed cards unless explicitly retained. Unspent energy is lost.
- Resolve pending Dread threshold consequences, then the surviving enemies' intentions in stable visible order. Update next-turn intentions after the enemy phase.
- Block absorbs incoming damage before health. Block does not persist into the fellowship's next turn unless a stated effect says otherwise.
- Health persists between encounters. Combat block, energy, Dread, temporary modifiers, and exhausted state do not.
- Enemy deaths resolve immediately. Victory occurs after the current card/effect finishes if all enemies are dead; do not summon deferred reinforcements after the encounter is already won. Player death ends combat immediately. Do not permit further input after a terminal state.
- The interface must distinguish draw pile, discard pile, exhausted cards, and the permanent run deck.

### Dread

Use a visible integer meter from 0 to 10, clamped at both ends. It starts at zero each encounter and does not decay automatically.

- Ordinary cards cost energy. Some powerful cards also increase Dread as an explicit printed effect.
- Concealment cards lower Dread. Other cards reward fighting at high Dread.
- Each encounter defines two visible threshold consequences, initially at 4 and 8.
- At player turn end, each untriggered threshold at or below current Dread triggers once, in ascending order. If both are eligible, both trigger.
- Crossing a threshold during card play does not trigger it immediately. Lowering Dread before ending the turn can prevent it.
- After a threshold has triggered, reducing and raising Dread never triggers it again in that encounter.
- Dread remains meaningful after thresholds fire through enemy behavior or card conditions. Do not make every encounter equally punish high Dread forever; deliberate high-Dread builds need room to work.
- Preview the exact consequence and whether it will activate if the player ends their turn now. Never hide threshold rules in flavor text.
- A threshold-summoned enemy appears with a visible intent but does not act until the following enemy phase, giving the player a turn to respond. Track this explicitly, not through animation timing.

Encounter-specific reactions make Dread part of the world. Wolves may become stronger, soldiers may call a reinforcement, and a sentinel may awaken an additional attack. Prefer a small set of well-tested effect types reused with different values over bespoke scripting for every enemy.

The central balance requirement is that raising Dread is sometimes a good decision. If reducing Dread is always optimal, this is just a punishment meter. If all consequences are irrelevant, it is free power. Playtest both failure modes.

### Card language and initial examples

Use concise, literal rules text and optional separate flavor text. State target, magnitude, duration, and Dread changes. Provide tooltips for keywords and make the glossary accessible during combat.

These examples establish intent, not immutable balance:

| Card          | Initial effect                                                                 |
| ------------- | ------------------------------------------------------------------------------ |
| Ancient flame | Cost 2. Deal 14 damage to one enemy. Gain 3 Dread.                             |
| Walk unseen   | Cost 1. Gain 5 block. Lose 2 Dread.                                            |
| Defiance      | Cost 1. Deal 6 damage, or 12 if Dread is at least 6 when this effect resolves. |
| Hold the pass | Cost 1. Gain 10 block. Gain 1 Dread.                                           |

Target at least 30 distinct obtainable cards total, including starter cards, distributed across the three companions and a few neutral journey cards. Every card must have an implemented, tested effect and a meaningful role. Each has one upgrade, with a clearly previewed difference. Avoid filler cards that differ only by a name.

Support several coherent approaches through overlapping synergies: low-Dread precision, high-Dread defiance, defensive endurance, and an ember burst turn. A shared deck should allow mixing companions rather than require choosing a rigid class.

Keep the keyword set small. Block, exhaust, retain, temporary weakness, and vulnerability are enough if needed. If adding duration-based effects, document exactly when they decrement and test it. Do not add complicated reactions, a Magic-style stack, or enemy-turn interrupts.

## Complete adventure scope

Aim for a 25–45 minute run after the player learns the rules. This is a tuning target, not a claim until measured.

### Route and acts

- Three acts: a forest frontier, a ruined settlement and its roads, and the high mountain approach.
- Each act has five branching route rows followed by an act boss. The player visits one reachable node per row, giving 18 encounters or stops per completed run.
- Routes must have genuine choices and clearly drawn connections. Generate them from constrained templates if that is more reliable than fully procedural topology.
- Show node types before selection. Only reachable next nodes are interactive. Visited and rejected routes remain visually distinct.
- Guarantee access to recovery and deck improvement; prevent impossible paths or progression dead ends.
- Difficulty and rewards scale by act. Encounter selection can vary by seed without requiring procedural narrative.

### Node types and rewards

- **Battle:** fight, earn gold, then choose one of three cards or skip.
- **Elite:** optional harder fight with a relic reward and stronger gold reward.
- **Event:** short scene with two or three meaningful choices and fully implemented consequences. Display known costs before confirmation. Never charge an unaffordable cost.
- **Camp:** choose healing or upgrading one card. Default heal is 25% maximum health, rounded up and capped at maximum.
- **Merchant:** a small selection of cards, relics, healing, and paid card removal. Purchases are atomic, sold items stay sold, and gold cannot become negative.
- **Boss:** act-ending fight and a stronger reward before the next act. Final boss proceeds to victory rather than another map.

Content targets for the finished first version:

- At least 30 distinct cards, all upgradeable.
- At least 10 relics with functioning passive effects and explanatory tooltips.
- At least 8 written events with real choices and consequences.
- At least 8 normal enemy types, 3 elite encounter designs, and 3 distinct bosses. Encounter combinations can reuse normal enemies.
- Bosses should change a tactical decision, not merely have larger health pools. Telegraph phase changes and special Dread behavior.

Use modest, testable relic effects. Define hook order for effects that modify drawing, energy, damage, healing, or encounter setup. Do not introduce an overly generic plugin system for a small fixed content set.

### Progression and replay

- Save after committed actions and scene transitions. Reloading must not reroll rewards, enemy intentions, merchant stock, or event results.
- Include Continue, New Journey, settings, and rules from the title screen. Confirm before overwriting an existing active run.
- Store a schema version with saves. Recover gracefully from corrupt or unsupported saves without crashing the application. Do not silently erase a valid run.
- Persist settings separately from the active run.
- Show the seed and allow a custom seed when starting a run, tucked away from the main flow.
- Track local run results if inexpensive. No permanent stat grind, unlock gates, daily service, or cloud sync is needed.

## Visual and audio direction

The owner selected **C: Romantic wilderness**, not A's manuscript style or B's monochrome etching. The latest selection takes precedence over the earlier recommendation for A.

The comparison image is available at:

https://ampcode.com/user-content/attachments/fc822f415600cb2211a8334b8e5a902994d5814dd7d63951918bffbdddf5914f-file.png

Only the right-hand column is the selected direction. Download Amp attachments with `amp files get`, not unauthenticated curl. If unavailable, use the written direction rather than blocking.

### Art rules

- Atmospheric romantic oil-painting treatment, soft luminous mist, visible painterly texture, ancient stone, muted natural materials, restrained amber light.
- Large environments convey lost history and scale. Card paintings use close-up actions, faces, or objects with clear focal silhouettes.
- Warmth and recognizable human details keep the fellowship emotionally legible. Fix character clothing, faces, silhouettes, and signature objects across images.
- Magic is a deliberate bright accent in an otherwise restrained palette. Dread can use ember red with visible symbols and text; do not rely on color alone.
- Do not use emoji, random unrelated stock images, generic gradients, or blank art boxes as final game illustrations.
- Ornate framing should be restrained. Use readable serif display typography and highly legible body/rules text. Do not bake rules text or numbers into generated artwork.
- Background paintings must not compete with cards or enemy intents. Use composition, shading, and quiet panels rather than excessive blur everywhere.

Use Painter for initial combat-screen exploration and original assets when available. First make one coherent combat concept with a five-card hand, enemy intents, companions, health, energy, and Dread. Inspect it, select the strongest direction yourself, and implement without waiting for approval. Generated concepts are references, not verification of the running UI.

Build a consistent art set: title/journey scene, three act environments, companion portraits, enemy/boss illustrations, and card art. Reuse deliberate crops of appropriate original paintings where necessary, but distinct important cards and bosses must be recognizable. Generate a single image per Painter call, supplying reference images for consistency. Bundle production assets locally; the app must not depend on remote generated-image URLs at runtime.

Keep an asset provenance file for generated and third-party art, fonts, and sounds. Use original or appropriately licensed assets, not scraped franchise art. If Painter is unavailable, use lawful alternatives and an intentional consistent treatment; report the limitation honestly.

### Interaction and polish

- Desktop-first, comfortable at 1440×900 and 1280×720, without clipped hands or hidden controls. Adapt to smaller browser windows; mobile is secondary.
- Cards have clear hover/focus inspection, cost, owner identity, upgrade state, and valid/invalid play feedback.
- Click a card then a target. Clicking a non-targeted card can play it directly. Provide Escape to cancel targeting and obvious selected/valid-target states. Dragging may be optional, never required.
- Keyboard users can navigate controls and play the game. Use semantic buttons, focus indicators, and accessible names. Tooltips must also be available through focus or click.
- Provide compact combat feedback: damage, block, card draw, Dread changes, deaths, and a readable combat log. Animations illustrate resolved rules; they never determine them.
- Prevent double plays and repeated End Turn actions while a transition is resolving. Reduced-motion mode must remain fully functional.
- Show pile inspection, run deck, upgrades, relic descriptions, settings, and rules without losing game state.
- Use modest ambient audio and satisfying card/combat cues, with separate music and effects controls and a mute option. Handle browser autoplay restrictions by starting audio after user interaction. Missing audio must not break gameplay.
- Provide an optional short first-run tutorial explaining energy, targeting, enemy intent, and Dread. Let experienced players skip and revisit it.
- Include deliberate empty, loading, disabled, error, victory, defeat, and saved-run states. No dead buttons, fake shops, placeholder reward screens, or decorative controls without behavior.

### Combat animation and sound are part of the finished game

The owner specifically emphasized this after the initial brief. Treat combat feel as an acceptance criterion, not optional decoration to add if time remains. A technically complete fight with static cards and changing numbers is not the desired result.

- Give each attack a readable anticipation, travel or strike, impact, and short recovery. Coordinate the target reaction, health/bar change, floating damage, and sound at the impact moment.
- Distinguish physical attacks, arrows, ember magic, healing, block, blocked hits, enemy attacks, Dread activation, and death. Use purposeful motion and restrained particles that fit the painterly art rather than covering it with arcade effects.
- Cards should ease into the hand, lift on hover/focus, clearly enter targeting, travel or dissolve on play, and move naturally into discard or exhaust. Reflow the remaining hand without snapping or overlapping targets.
- Animate enemy intention changes and make the acting enemy unmistakable. Sequence multi-enemy attacks so players can attribute each hit, without turning every enemy phase into a long cutscene.
- Make Dread threshold activation a distinct, brief audiovisual event. The meter, the named consequence, and the affected enemy should tell one coherent story.
- Damage feedback must distinguish health loss from block absorption. Floating numbers should remain readable during multi-hit effects; avoid stacking them directly on top of each other.
- Use subtle hit flashes, recoil, and optional low-amplitude shake. Avoid repeated full-screen flashes and aggressive camera shake. Provide reduced motion and a screen-shake toggle.
- Prefer transform and opacity animation over repeated layout work. Use CSS, the Web Animations API, or an animation package where appropriate. Do not make React rerender the entire board for every particle or animation frame.
- Aim for stable 60 fps on an ordinary contemporary Mac at the target desktop sizes. This is a performance target, not a claim that an orb's Chromium proves Mac performance. Inspect actual frame timing or a performance trace during a busy sequence, and report the test environment.
- Start with roughly 120–200 ms hover/selection transitions and 250–500 ms individual strikes, then tune through play. Longer spells must earn their duration. Keep input feedback immediate and avoid accumulating a long animation backlog.
- Resolve authoritative rules independently of presentation. Use ordered presentation events or snapshots so visual health and deaths match the displayed impact rather than jumping to the final state before an attack begins. Reloading or skipping motion must settle to the correct committed state.
- Block incompatible inputs while effects resolve, but keep settings and inspection responsive where safe. Never lose the player's input silently or allow double-spending through rapid clicks.
- Include distinct card draw/play, blade or arrow, spell, impact, shield, heal, Dread, reward, victory, and defeat sound cues where feasible. Layer sparingly, vary repeated cues subtly, cap simultaneous voices, and prevent clipping or multi-hit noise bursts.
- Sound must begin only after a user gesture where browsers require it. Persist separate music/effects volume and mute. Gameplay remains understandable with audio off; audio failure never blocks an action.

Verify a normal attack, fully blocked hit, partial block, multi-hit or multi-target effect, killing blow, enemy phase, Dread activation, and a rapid card sequence in the running browser. Inspect a short recording with sound when capture supports it, and check frame timing separately. Also exercise reduced motion and muted audio. A screenshot cannot verify animation timing or sound; do not use it as that evidence.

## Starting technology and architecture

- **TypeScript** for game rules, content definitions, and UI.
- **React** for the board and application screens.
- **Vite** for development and production builds.
- **Bun** for dependency management and **`bun test`** for tests. Do not install Vitest.
- **CSS** for layout, theming, and simple animation. Add animation, icon, audio, schema-validation, or state libraries only where useful.
- **Local browser storage** for versioned saves and settings. No backend is required.

Commit the Bun lockfile if making a local implementation commit. Provide scripts for `dev`, `build`, `typecheck`, and `test`, and document exact commands in a README. Package additions are authorized within the build, but must earn their complexity.

Keep a pure deterministic rules engine separate from React. Model run scenes and combat phases explicitly so illegal transitions are difficult to represent. Parse external save data at the storage boundary. A reasonable starting shape is `src/game` for rules/content, `src/ui` for presentation, and `public/assets` for bundled media; adapt to actual needs.

The UI dispatches player actions; the engine validates and resolves them into the next state and presentation events. State changes must not depend on React rendering, timers, audio completion, or browser animation frames. Do not keep separate UI and engine copies of health, gold, deck contents, or Dread.

Use stable unique IDs for card instances, distinct from card definitions. Two copies of the same card can have different upgrades and zones. Store seeded PRNG state with the run and route all gameplay randomness through it. Do not use `Math.random()` inside rules or reward generation.

Derive displayed numbers and previews from authoritative rules/content where possible, while keeping tests' expected outcomes independently calculated. Avoid building a general-purpose collectible-card engine, custom scripting language, or backend for hypothetical future multiplayer.

## Build sequence and autonomous working method

1. Inspect the repository and applicable guidance. Establish package scripts, core types, save format, and deterministic tests.
2. Create the combat-screen concept and a small reference art set. Select the direction yourself within style C.
3. Implement one complete combat with Dread, targeting, deck zones, enemy intents, victory, defeat, and restart. This is an internal checkpoint, not the final product.
4. Build the run loop: map, rewards, events, camp, merchant, act progression, bosses, saving, and ending.
5. Fill the planned content and integrate consistent final art, sound, help, and settings.
6. Drive the actual app in the browser. Play entire runs, inspect non-default states, tune obvious dominant strategies or dead cards, and fix defects.
7. Run all checks, build production output, verify the production preview, and deliver a working portal with concise evidence and known limitations.

Keep a short record of consequential decisions and measured playtest findings, preferably in the project README or an existing development document rather than proliferating reports. Do not claim human-quality balance from automated simulation alone.

You may delegate disjoint assets/content or focused research if tools and budget permit. Keep rule integration and final verification owned by the building agent. Never assume another orb can see this orb's unpushed files or local commits.

Research is optional and should answer a concrete question. No external research was performed to establish novelty, balance, title availability, or browser compatibility in this handoff. Do not claim that it was. Avoid spending the overnight build on broad market research.

## Verification and definition of done

### Automated checks

Run `bun test`, TypeScript checking, and a production build. All must pass, or report the exact remaining failures rather than suppressing them.

Tests should reject plausible incorrect implementations, especially:

- Dread just below, exactly at, and above a threshold; crossing then lowering before End Turn; crossing both thresholds; no repeat activation; clamping at zero and ten.
- Deferred reinforcements, their delayed first action, and victory before threshold resolution.
- Exact block/health damage, lethal damage, overkill, phase ordering, duration expiry, and invalid actions.
- Duplicate card definitions with distinct instance IDs; upgrade/removal of only the selected instance; reshuffling mid-draw; exhaust and retain if present; hand-cap behavior.
- Rewards claimed once, purchases charged once, insufficient funds, skipped rewards, capped healing, and legal map transitions.
- Save/reload round trips during combat and at every scene type. Same state and seed must give the same future results.
- Corrupt/unsupported saves, independent settings persistence, and new-run overwrite behavior.
- Content integrity: valid IDs, references, upgrades, enemy intents, encounter definitions, reward pools, reachable routes, and working effect handlers.

Use table-driven or property-based tests where valuable, such as card-zone conservation and seeded state/action sequences. A library can be added while retaining Bun as the test runner. Do not merely test that functions return without throwing.

### Actual browser verification

Use the available browser tooling and its applicable skill. In an Amp orb, use `agent-browser` first. Render and inspect screenshots using `view_media`; taking screenshots without inspecting them is not visual verification.

Exercise:

- Fresh start, tutorial skip/completion, and an ordinary card/target interaction.
- Dread threshold prevention and triggering, including a reinforcement encounter.
- Pile and deck inspection, card upgrades, reward selection and skipping.
- Each noncombat scene, a merchant purchase and removal, route branching, act transition.
- Reload during combat and on the map, then Continue without rerolling state.
- Victory and defeat, restart, audio controls, keyboard interaction, and reduced motion.
- A complete run through all three acts using legal actions. Development shortcuts can test isolated states but do not substitute for a legal complete-run test.
- At least two desktop viewport sizes and a narrower window; inspect selected-card, tooltip, modal, long-text, and full-hand states for overlap or clipping.
- Production preview, not only the Vite dev server. Check browser console errors and missing asset requests.

Chromium in an orb is not macOS Safari. Use standard browser APIs and avoid unnecessary compatibility risks. If no Safari/macOS runner is available, explicitly report that limitation rather than claiming native macOS testing.

### Finish criteria

The first version is complete when a new player can open the browser app, understand the basic rules, play a full branching adventure, make meaningful deck choices, encounter escalating enemies, save and continue, win or lose, and start another run without development tools or broken transitions. The game must have coherent painterly art and readable, responsive interaction throughout, not only on its title screen.

Content counts are useful targets, not a substitute for this experience. Prefer fixing a broken journey over adding the thirty-first card. Report any shortfall explicitly.

## Orb setup, delivery, and permissions

- This document must be present in the destination orb. A new orb may start from the remote default branch and will not automatically inherit this file. Transfer it explicitly or use the normal authorized Git workflow. Do not assume a thread message transfers files.
- The owner authorized committing and pushing this preparation work, including the brief, starting packages, and orb setup/resume scripts. That publication makes the starter available to the next orb; it is not advance authorization to publish or deploy the future game.
- Read applicable orb setup skills before adding `.agents/setup` or resume scripts. Prepare repeatable dependency installation and normal service startup for future orbs.
- Prefer declaring the app in `.amp/services.yaml` and running `amp orb services ensure`. If using a one-off service, use supervised `amp orb service start ... --portal`, not `nohup`, shell backgrounding, or tmux for persistence.
- Configure the dev server to listen on the required interface and support the actual portal host without unnecessarily broad access settings.
- Share the exact returned Amp portal URL, never localhost or a direct sandbox host URL. Include it as a Markdown link with the title `amp-portal`.
- Save review-ready screenshots under `.amp/in/artifacts/`. Keep transient debug images and build artifacts elsewhere. Embed an inspected representative screenshot in the final response.
- Local implementation, dependencies, generated assets, tests, and reversible setup work are in scope. The owner's autonomy request does not authorize spending money on external services, publishing releases, production deployments, pushing to remotes, opening/merging PRs, or changing shared infrastructure. Finish everything possible locally and ask only if such an external action is actually necessary.
- Do not create overnight monitoring schedules merely because the build is lengthy. Continue the task in the active thread.

The final response should include the working portal, what is playable, exact verification commands and decisive results, an inspected screenshot, and any material limitations. Do not present the generated art concept as a screenshot of the implemented game. Leave the README sufficient for another programmer to run, test, and extend the project.
