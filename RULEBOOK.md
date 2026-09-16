# The Last Ember

## A visual rulebook for the current game

**One fellowship. One shared deck. One health pool. Magic that attracts the dark.**

You guide Mara, Eryn, and Aldren across a forest frontier, a fallen city, and a
mountain pass. They carry the last living ember to a beacon.

This is a **single-player deckbuilding adventure**. You control the whole
fellowship. Enemies follow visible, repeating intentions.

**Win:** defeat the Hollow Beacon and every remaining enemy in the final encounter.

**Lose:** the fellowship's shared health reaches zero.

This rulebook describes the normal adventure, not experimental laboratory variants.

## 1. The fellowship shares everything

```text
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ Mara          │ │ Eryn          │ │ Aldren        │
│ Defense       │ │ Precision     │ │ Powerful magic│
│ Retaliation   │ │ Draw / conceal│ │ Dread payoffs │
└───────┬───────┘ └───────┬───────┘ └───────┬───────┘
        └────────────────┼─────────────────┘
                         ▼
          ┌────────────────────────────┐
          │ One deck and one hand      │
          │ One energy pool            │
          │ One health pool            │
          │ One Block and Dread total  │
          └────────────────────────────┘
```

The names on cards describe their identity. They do **not** impose class
restrictions, separate turns, or separate health pools. Fellowship cards provide
shared support.

### Starting supplies

| Resource | Starting value |
| --- | ---: |
| Health / maximum health | 70 / 70 |
| Gold | 50 |
| Deck | 12 cards |
| Relics | None |
| Energy each turn | 3 |
| Cards drawn each turn | 5 |
| Maximum hand size | 10 |

Your starting deck contains:

| Copies | Card | Base effect |
| ---: | --- | --- |
| 2 | Steady blade | 1 energy: deal 7 damage |
| 2 | Shelter | 1 energy: gain 7 Block |
| 2 | True shot | 1 energy: deal 6 damage, then draw 1 |
| 2 | Walk unseen | 1 energy: gain 5 Block, then lose 2 Dread |
| 1 | Ancient flame | 2 energy: deal 18 damage, then gain 3 Dread |
| 1 | Defiance | 1 energy: deal 7 damage, or 14 at Dread 6+ |
| 1 | Hold the pass | 1 energy: gain 11 Block, then gain 1 Dread |
| 1 | Shared bread | 1 energy: restore 5 health, draw 1, Exhaust |

## 2. Travel through three acts

```text
┌──────────────────────┐
│ ACT I                │
│ Briarwood frontier   │
│ The Rootbound King   │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ ACT II               │
│ Fallen city of Avel  │
│ The Fallen Marshal   │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ ACT III              │
│ The high watch       │
│ The Hollow Beacon    │
└──────────┬───────────┘
           ▼
      Light the beacon
```

You visit **six stops per act, 18 in total**. Choose one reachable stop in each
successive map column. You cannot backtrack.

Every act begins with a battle, guarantees a camp, and ends with its guardian. The
intervening roads offer different combinations of encounters.

| Stop | What happens |
| --- | --- |
| Battle | Defeat a normal enemy formation for gold and a card offer |
| Elite | Fight a stronger formation for more gold and a relic offer |
| Event | Choose between two stated outcomes |
| Camp | Rest **or** improve one card |
| Merchant | Spend gold on cards, a relic, healing, or removal |
| Guardian | Defeat the act boss to advance or finish the journey |

Newly generated roads normally offer two onward connections until the final
approach to the guardian. Follow the connections shown on your map.

**Health persists between encounters.** Finishing an ordinary battle does not
automatically restore it.

## 3. Combat is a repeating player turn and enemy phase

At the beginning of each encounter:

- Shuffle the permanent deck.
- Reset Dread to 0 and clear its triggered thresholds.
- Begin with 3 energy and draw 5 cards.
- Start without Block, unless a relic grants it.
- Apply any other encounter-start relic bonuses.

You act first.

```text
┌─────────────────────────────────────────┐
│ YOUR TURN                               │
│ Read intentions                         │
│ Play affordable cards in any order      │
│ Choose targets where required           │
│ End your turn whenever you choose       │
└────────────────────┬────────────────────┘
                     ▼
┌─────────────────────────────────────────┐
│ END-TURN CHECK                          │
│ Discard unplayed cards except Retain    │
│ Lose unused energy                      │
│ Clear old enemy Block                   │
│ Resolve pending Dread thresholds        │
└────────────────────┬────────────────────┘
                     ▼
┌─────────────────────────────────────────┐
│ ENEMY PHASE                             │
│ Living enemies act from left to right   │
│ New reinforcements wait this phase      │
│ Status durations decrease after acting  │
└────────────────────┬────────────────────┘
                     ▼
┌─────────────────────────────────────────┐
│ NEXT PLAYER TURN                        │
│ Clear your remaining Block              │
│ Reset energy to 3                       │
│ Draw 5 more cards, up to the hand limit  │
└────────────────────┬────────────────────┘
                     └───────────▶ Repeat
```

### Playing cards

1. Pay the card's energy cost.
2. Choose a living enemy if the card requires a target.
3. Resolve its effects in printed order.
4. Put it in the discard pile, or the Exhaust pile if it has Exhaust.

You can play as many cards as your hand and energy allow. Zero-cost cards still
follow their printed effects and keywords.

When every enemy is dead after a card finishes resolving, combat ends. You do not
have to end your turn or suffer a final enemy phase.

## 4. Cards cycle; exhausted cards sit out one encounter

```text
┌───────────┐   draw   ┌───────────┐
│ Draw pile │ ───────▶ │ Your hand │
└─────▲─────┘          └─────┬─────┘
      │                     │
      │ reshuffle           ├── play ordinary card ──┐
      │ when empty          ├── unplayed at turn end ┤
      │                     │   except Retain       ▼
┌─────┴──────┐              │                 ┌─────────────┐
│ Discard    │ ◀────────────┼─────────────────│ To discard  │
└────────────┘              │                 └─────────────┘
                           │
                           └── play Exhaust card
                                       ▼
                                ┌─────────────┐
                                │ Exhaust pile│
                                └─────────────┘
```

- **An empty draw pile is not a loss.** Shuffle the discard pile and continue
  drawing.
- If both piles are empty, drawing simply stops.
- **Retain:** an unplayed card stays in your hand when you end the turn. Playing
  it still sends it to discard normally.
- **Exhaust:** after being played, the card cannot return during that encounter.
  It remains in your permanent deck for future encounters.
- A card currently resolving cannot draw itself.
- Retained cards occupy hand slots. The next turn draws five additional cards,
  but never beyond ten cards in hand.

There is no normal deck-exhaustion damage or turn-limit defeat.

## 5. Damage, Block, and enemy intentions

### Block absorbs damage before health

```text
Enemy attacks for 10
You have 7 Block

7 Block is consumed
3 health is lost
```

Block is a shared pool, not a separate shield for each enemy. Multiple attacks
consume it in order.

Your leftover Block disappears at your next turn's start. Enemy Block disappears
at the beginning of the next enemy phase, **before** Dread can grant new Block.

### Enemies show what they intend to do

| Intention | Effect |
| --- | --- |
| Attack | Deal the stated damage to the fellowship |
| Guard | Gain Block |
| Howl | Raise your Dread |
| Drain | Deal damage, then heal for the health actually lost |

A fully blocked Drain heals the enemy for **zero**.

Each enemy follows a repeating action pattern. Killing it before its action
prevents that action entirely.

Intentions can change as the state changes. Weak, boss health thresholds, Dread
consequences, and the Hollow Beacon's Dread bonus can affect damage. A Howl from an
earlier enemy can also affect a later enemy.

### Status effects

| Status | Rule |
| --- | --- |
| Weak | The enemy's Attack and Drain damage is reduced by 25%, rounded down |
| Vulnerable | Your hits against that enemy deal 50% more damage, rounded down |

Applying more of a status adds **duration**, not a stronger percentage.

Both statuses lose one duration after that enemy acts, including Guard or Howl. A
reinforcement that is still waiting does not lose duration.

Damage bonuses from relics apply **before** Vulnerable. Repeated hits calculate
bonuses, Vulnerable, and Block separately.

## 6. Dread is power now with consequences at turn end

Dread ranges from **0 to 10**. It persists across turns but resets between
encounters.

Some cards raise it. Other cards lower it. Enemy Howls can raise it too.

```text
Dread
0──────3──4────6───8────10
│         │    │   │
│         │    │   └─ Second consequence
│         │    └───── High-Dread card payoffs begin
│         └────────── First consequence
└─ Quiet precision works at 0–3
```

**Crossing a threshold during your turn does not immediately trigger it.**

When you end your turn, the game checks untriggered thresholds from low to high.
Lowering Dread beforehand can prevent them.

### Standard thresholds

Each encounter has one reaction type:

| Reaction | At Dread 4 | At Dread 8 |
| --- | --- | --- |
| Fury | All living enemies gain +2 attack damage | All living enemies gain another +3 |
| Reinforce | A new enemy joins | All living enemies gain +3 attack damage |
| Ward | All living enemies gain 10 Block | All living enemies gain +4 attack damage |

Important details:

- Each threshold triggers **once per encounter**.
- Ending at Dread 8 or more can trigger both at once.
- Reinforce calls a Briar wolf in Act I or an Ashbound soldier in later acts.
- A reinforcement skips the enemy phase in which it arrives. It becomes
  targetable on your next turn.
- Triggered attack bonuses persist even if you later lower Dread.
- Howl happens after the threshold check. Newly crossed thresholds wait until
  your **next** end turn.
- Quiet bell shifts thresholds to **5 and 9**. It does not move the card payoff
  boundaries at 3 and 6.

### Example: use the danger, then hide

Suppose you start with **3 energy and 3 Dread**, without relevant relics or enemy
damage modifiers, and Ancient flame does not end the encounter.

```text
Play Ancient flame
  Spend 2 energy
  Deal 18 damage
  Gain 3 Dread → now 6
  1 energy remains

Choose your follow-up:

A. Defiance
   Spend 1 energy
   Deal 14 damage because Dread is 6+
   If combat continues, end at 6 Dread
   First consequence triggers if unused

B. Quiet as snowfall
   Spend 1 energy
   Lose 4 Dread → now 2
   Draw 1
   End at 2 Dread → neither threshold triggers
```

That is the central combat tradeoff: **push for damage, or spend resources
controlling what happens next.**

## 7. Card order changes the result

Several cards reward building the right state before playing them.

| Card | Base effect | What matters |
| --- | --- | --- |
| Defiance | 7 damage, doubled at Dread 6+ | Raise Dread first |
| Through the leaves | 8 damage, +6 at Dread 3 or less | Lower Dread first |
| Iron answer | Damage equal to 3 + current Block | Build Block first; it does not consume Block |
| Face the darkness | Gain Block equal to 7 + current Dread | Higher Dread means more defense |
| A small opening | Apply 2 Vulnerable, then gain 1 Dread | Play before your attacks |
| Challenge | Apply 2 Weak, then gain 1 Dread | Weaken dangerous enemy actions |
| Twin arrows | Two separate hits of 4 | Per-hit bonuses apply twice |
| Borrowed fire | Gain 1 energy, gain 2 Dread, Exhaust | Extend the turn at an exposure cost |
| Shoulder the burden | Gain 3 Dread, gain 2 energy, Exhaust | More energy and more exposure |

For example, starting with no Block and no other modifiers:

```text
Shelter → Iron answer
  Gain 7 Block
  Deal 3 + 7 = 10 damage

Iron answer → Shelter
  Deal 3 damage
  Then gain 7 Block
```

Same cards. Same energy. Different result.

### Improving cards

Every card has one improved version, marked with `+`.

An improvement changes the printed effect values. It does not add another upgrade
tier or change the card's energy cost in the current card set.

For example:

- Steady blade improves from 7 to 10 damage.
- Shelter improves from 7 to 10 Block.
- Defiance improves from 7 / 14 to 10 / 20 damage.
- Borrowed fire improves from 1 to 2 energy while still adding 2 Dread.

Always read the improved text, especially on cards with several effects.

## 8. Build the deck between battles

### Combat rewards

After a nonfinal combat victory, you receive gold and may take **one of three
offered cards**, or skip all three.

| Encounter | Act I gold | Act II gold | Act III gold |
| --- | ---: | ---: | ---: |
| Normal battle | 25 | 33 | 41 |
| Elite | 45 | 53 | 61 |
| Guardian | 65 | 73 | Final victory |

Elite and nonfinal guardian rewards also offer an unowned relic when available.
You receive that relic when accepting the reward screen, even if you skip the
card.

Steady blade and Shelter are starter cards, not reward or merchant offers.

**Taking every card is optional.** A larger deck offers more tools but draws any
particular card less often.

### Camps

Choose exactly one:

- **Rest:** restore 25% of maximum health, rounded up.
- **Improve:** permanently upgrade one unupgraded card.

At 70 maximum health, resting restores **18 health**, before relic bonuses and the
maximum-health cap.

Advancing after either of the first two guardians restores **20% of maximum
health**, rounded up. At 70 maximum health, that is 14.

### Merchants

| Purchase | Cost | Limit |
| --- | ---: | --- |
| Offered card | 40 gold | Each offered copy once |
| Offered relic | 85 gold | Once |
| Restore 20 health | 30 gold | Once per merchant; cannot buy at full health |
| Permanently remove a chosen card | 45 gold | Once per merchant; cannot reduce the deck below five cards |

You may make several affordable purchases, then leave.

### Events

Choose one of two outcomes. They can exchange health or gold for cards, healing,
maximum health, relics, or an upgrade.

You must afford a gold cost. **Health costs can kill you.** Event damage is not a
combat attack and does not use Block.

A random-upgrade event chooses an unupgraded card. A generic relic reward chooses
an unowned relic; narrative wording does not guarantee a particular relic.

## 9. Relics change the rules in your favor

Relics persist for the rest of the journey. You do not acquire duplicate copies
of the same relic.

| Relic | Effect |
| --- | --- |
| Copper kettle | Restore 3 health after each combat victory |
| Mended ribbon | +10 maximum health; restore 10 health when acquired |
| Old watch badge | Begin combat with 8 Block |
| Ranger's lens | Each hit gains +2 damage at Dread 3 or less |
| Singing coal | Each hit gains +3 damage at Dread 6+ |
| White flint | +1 energy on the first turn of combat |
| Unfinished map | Draw +1 card at every turn start |
| Silver thread | Each Block effect grants +2 Block |
| Wooden bowl | Each healing effect restores +3 health |
| Quiet bell | Dread thresholds move to 5 and 9 |
| Roadwarden's purse | +12 gold from combat rewards |
| Grey feather | Begin each combat with one additional card |

Healing cannot exceed maximum health. Wooden bowl also improves healing from
camps, events, and other relics.

## 10. The guardians punish careless timing

| Guardian | Health | Repeating base intentions |
| --- | ---: | --- |
| The Rootbound King | 92 | Guard 10 → Attack 15 → Howl 2 → Attack 20 |
| The Fallen Marshal | 124 | Attack 15 → Guard 16 → Attack 22 |
| The Hollow Beacon | 166 | Howl 2 → Attack 21 → Drain 15 → Attack 26 |

All three gain **+3 Attack and Drain damage while at half health or below**.

The Hollow Beacon gains another **+4 Attack and Drain damage at Dread 6+**. These
modifiers can stack with Dread-threshold bonuses.

This makes timing important. Pushing a boss below half health without killing it
can strengthen its next attack.

Ordinary enemies also scale by act. Compared with Act I, they gain:

- Act II: +6 maximum health and +2 attack strength.
- Act III: +12 maximum health and +4 attack strength.

## 11. What persists and what resets

| Element | Next turn | Next encounter |
| --- | --- | --- |
| Health | Persists | Persists |
| Gold, permanent deck, upgrades, relics | Persist | Persist |
| Energy | Resets to 3, with applicable bonuses | Starts fresh |
| Your Block | Clears after the enemy phase | Starts fresh |
| Dread | Persists | Resets to 0 |
| Fired Dread thresholds | Stay fired | Reset |
| Unplayed Retain cards | Stay in hand | Rejoin the shuffled deck |
| Exhausted cards | Stay unavailable | Return |
| Enemy statuses and bonuses | Follow combat rules | Do not carry over |

The game saves after each committed action. Continuing restores the same state,
including draw order and offers. The same seed **and the same actions** reproduce
the same journey.

There are no permanent stat bonuses or unlock requirements between runs.

## The turn-by-turn reference

```text
1. Read every enemy intention, from left to right.
2. Check your energy, Block, Dread, and unused thresholds.
3. Decide which enemy actions you can prevent by killing their source.
4. Sequence setup cards before their payoffs.
5. Choose whether to accept or suppress Dread consequences.
6. End the turn.
```

The game asks you to manage two horizons at once:

**This turn:** how much damage can you deal without taking too much back?

**This journey:** how much health can you spend now to build a deck that survives
later?

Checked against the current [rules dialog](src/ui/components.tsx),
[rules engine](src/game/engine.ts), and
[card, relic, enemy, and event definitions](src/game/content.ts).
