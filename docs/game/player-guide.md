# Player guide

## Play

Start a journey, choose a reachable road, and read enemy intentions before playing
cards. Click a targeted card, then an enemy; Escape cancels. With only one living
enemy, the card targets it automatically. Other cards play on click. Tab and
Enter/Space work throughout. The hand forms a shallow fan with adaptive overlap,
without horizontal scrolling or pagination. Hover or keyboard focus raises a
complete card; Left/Right arrows cycle through the hand, and Home/End jump to its
edges. On touch, tap to inspect, then use Play card or Choose target. Narrow screens
split larger hands into rows. Cards you cannot afford remain inspectable but cannot
be played. Inspection is available for every pile, the permanent deck,
enemies, relics, and upgrades.

Hover a card's artwork or focus the card with the keyboard
to see its full base or upgraded painting. You can move onto the preview to inspect
it; Escape dismisses it without closing the underlying dialog. Clicking the card
still performs its normal action.
The preview fits the viewport and uses the native browser Popover API.

Cards use the selected **Wayfarer** design: stitched leather, quiet parchment,
wax energy seals and mounted paintings. All names, costs, rules and keywords remain
live text. The draw pile is a face-down bookcloth stack; the discard pile is a
loose face-up stack showing the most recently discarded card, including upgrades.
Layered edges suggest thickness, capped at four extra layers while counts stay
exact. Empty piles show faint outlines rather than cards. Click either stack to
inspect it; draw order stays hidden. Played-card flights land on the discard stack
or the separate Exhausted control, with motion disabled in reduced-motion mode.
Upgraded art and the title's `+` remain distinct. Hand art popovers are suspended during target
selection and action resolution so they cannot cover combat targets. The two
locally bundled material images total 480,668 bytes; sources are in
`docs/art/README.md`. No rules, saves or acquisition behavior changed for this design.

The combat status strip shows only the Act's Ember bearer, their active ability,
and Ready / Used this turn status beside shared Fellowship health and Block.
Hover, focus, or tap the ability for its full wording. Aldren's optional Empower
action expands into explicit spell-and-target choices. End turn uses a dark
brass-edged Ember plaque; its resolving state stays readable and keeps the same
size. Ability activation highlights respect reduced motion.

Ending a turn sweeps unplayed cards into Discard while Retain cards stay in the
hand. After enemy actions, cards deal into their final fan positions with
overlapping 240 ms flights launched 80 ms apart at normal speed. Held cards slide
into place once per deal group rather than shifting after every arrival.
If Draw empties partway through a deal, Discard transfers face-down into Draw
before the remaining cards arrive. Mid-turn draw effects use the same animation;
the hand limit and empty piles never produce fake card flights. These animations
follow the already-resolved engine snapshots, respect gameplay speed and reduced
motion, and do not consume RNG or delay saving the resolved action.

New journeys use **recurring Dread**: at turn end, 4–7 temporarily strengthens
the front enemy by 2; 8–10 strengthens all enemies by 3 and then loses 4 Dread.
Howls happen afterward. The opening battle of act two is an Escape: spend 1 energy and
discard a card to Work toward 4 Progress, at most twice per turn. Choose an
Ember bearer after drawing the first encounter's opening hand in each Act. That
bearer stays locked through the Act's fights, camps, shops, and reloads. Choose
again after a boss reward advances the Act. There is no pass action, cost, or
control, and every hero's cards remain playable. Bearer passives still reset each
turn and at the start of each fight.
New journeys start without a relic or a build-selection step. Ancient
flame has two upgrades at camps and upgrade events: Veiled Flame for concealment
or Wildfire for groups. New rewards include Break formation, a zero-energy attack
that converts all remaining Block into damage instead of preserving it, and
Fading strike, which lowers Dread before checking its precision damage bonus.
CLI benchmarks can explicitly select original rules for comparison.
See [docs/laboratory/identity-experiment.md](../laboratory/identity-experiment.md) for paired results, limitations,
and the evidence behind these small card experiments.

Play the current rules autonomously with
`bun scripts/lab/lab.ts journey --rules recurring --prototype late-escape --relic shieldfire --progression exploratory --games 10 --bot search --seed demo`.
Record full paired campaigns with
`bun scripts/studies/identity-campaign.ts late-escape identity-v1 10 shieldfire exploratory`;
omit the prefix to generate and record fresh entropy seeds. Labels `baseline`,
`recurring`, `escape` (6 Progress), and `escape-v2` (4 Progress) isolate earlier stages.
The archived `bearer-v2` label added the earlier encounter-level bearer rules; an
optional relic argument adds the starting-relic stage. Its bearer and passing
measurements are historical, not evidence for the current Act-locked rule.
The default progression policy remains `static`. `build-aware` tests acquiring
existing support; it does not alter reward eligibility or combat rules.
`continuation` preserves those acquisition rankings but compares Flame branches
through sampled combat continuations. It is an experimental evaluator, not an
optimal policy. `branches` retains the earlier 30-design reward pool;
`conversion` adds Break formation for 31 reward designs; `concealment` adds
Fading strike for 32. `exploratory` samples reward choices, including skip, with
independent seeded randomness; other progression decisions use `build-aware`.
`late-escape` moves the single Escape to act two's opening, after card rewards,
without changing its formation or target.
`exploratory` tests acquisition blind spots, not optimal deckbuilding, and does not alter
the game's offer generation. Compare constructed cards separately with
`bun scripts/studies/block-study.ts <fresh-seed> concealment`.
`sampled` replaces only reward selection with four real combat trials per option,
including skip, using public deck/relic/health/act information and independent
fixed seeds. It requires recurring Dread and bearers. It costs up to 16 trial
fights per reward screen and is diagnostic, not the default policy. Trial outcomes
are recorded in `rewardEvaluations`; shop and camp rankings remain `build-aware`.

There are 18 stops over three acts: ordinary battles, optional elites, events,
merchants, camps, and three guardians. The game contains 34 base card designs,
two Ancient flame upgrade branches, 15 relics including three starter-only choices,
eight events, eight ordinary enemy types, three act-specific elite
formations, and three bosses with telegraphed phase changes. Victory lights the
beacon; defeat remembers the fellowship's attempt. Results and custom seeds support
replay without permanent stat grinding or unlock gates.

Each Act starts with choosing an Ember bearer, before the first path choice.
The bearer stays locked for the Act, including after reloading at the crossroads.
The adventure shows only the current crossroads, with three choices: left,
straight ahead, and right. Click or tap a region of the illustration to travel;
trail markers highlight on hover or keyboard focus. Tab between paths and use
Enter or Space to choose. Encounters are hidden until a path is chosen; no future
route or encounter icons are displayed. Each of the 18 stops has a unique local
illustration and location description: Briarwood forest, the flooded ruins of
Avel, and the alpine high watch. All three final approaches reach the Act's guardian.
Encounter pools and route RNG consumption are unchanged, but the new connections
can change seeded journey outcomes. Earlier measurements below describe their
historical topology. Current saves require three paths per crossroads; old
development routes are not migrated. See `docs/art/README.md` for the new artwork.

A short, skippable approach moves toward the chosen trail before revealing the
encounter. Gameplay speed scales the approach; reduced motion uses a brief fade
without zooming. Battles pause on a full-scene illustration until **Prepare for
battle**, before showing combat controls. The resolved
encounter and pending introduction save immediately, so reloading during travel
cannot reroll enemies or skip the introduction. Shops, camps, and story events
show their actual choices directly over their illustrations, without another
Continue screen. Combat paintings match the enemy formation and Act; shops and
camps have Act-specific art, and each story has its own painting. Sources are in
`docs/art/encounters.md`.

**Progress saves after every committed action.** Continue restores the exact draw
order, rewards, stock, and RNG state. Settings → Export journey makes a portable
JSON backup; Restore validates it and requires explicit replacement confirmation.
Settings persist independently. Corrupt saves are not silently erased. Saves belong
to the browser origin: changing portal URLs, browsers, or devices requires export
and import. Private browsing or clearing site data can remove local progress.
