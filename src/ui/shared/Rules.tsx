export function Rules() {
  return (
    <div className="rules-copy">
      <p>
        You carry the last ember to the mountain beacon. Defeat its guardian to
        light it. If your shared health reaches zero, the journey ends.
      </p>
      <h3>One fellowship, one hand</h3>
      <p>
        Mara protects, Eryn creates openings, Aldren calls on dangerous fire.
        Their cards share 3 energy each turn. Click an attack, then an enemy.
        With only one living enemy, attacks target it automatically. Guard and
        skill cards play immediately. Escape cancels a selected attack.
      </p>
      <h3>Read the enemy</h3>
      <p>
        Intentions resolve left to right when you end your turn. Attack and
        Drain deal the displayed damage. Drain heals the enemy for health damage
        dealt. Guard grants block. Howl raises Dread. Boss attacks grow stronger
        at half health or below. Their exact rules appear on inspection.
      </p>
      <h3>Power has a voice</h3>
      <p>
        Dread stays between 0 and 10. New journeys check it every turn before
        enemies act. At 4–7, the frontmost living enemy gains +2 Attack/Drain
        for that phase. At 8–10, all living enemies gain +3 instead, then Dread
        falls by 4. Howls follow this check. Defiance rewards Dread 6+, while
        precision thrives at 3 or less.
      </p>
      <h3>Carry the Ember, complete the mission</h3>
      <p>
        Choose a bearer at the first battle of each Act, after drawing your
        opening hand. That bearer stays locked until you clear the Act,
        including across encounters and reloads. All heroes' cards remain
        playable. Mara adds 3 to the first card Block effect each turn. Eryn
        adds 2 reduction to the first Dread-lowering card. Aldren may add 1
        Dread for +5 damage to one Spell hit, once per turn.
      </p>
      <p>
        In Escape, Work costs 1 energy and discards a card without playing its
        effects. Work at most twice per turn. Reach the printed Progress target
        to win with enemies alive. When danger is gone and remaining Work is
        guaranteed, the encounter finishes automatically.
      </p>
      <h3>A few words worth knowing</h3>
      <dl>
        <dt>Block</dt>
        <dd>
          Absorbs damage before health. Your block clears at your next turn
          start. Enemy block clears at the start of the next enemy phase, before
          Dread consequences.
        </dd>
        <dt>Exhaust</dt>
        <dd>
          Played cards leave combat, then return to your permanent deck after
          the encounter.
        </dd>
        <dt>Retain</dt>
        <dd>
          Unplayed cards stay in your hand at turn end. The hand limit is 10.
        </dd>
        <dt>Weak</dt>
        <dd>Enemy attack and drain damage is reduced by 25%, rounded down.</dd>
        <dt>Vulnerable</dt>
        <dd>
          Enemy takes 50% more hit damage, rounded down. Both statuses lose 1
          after that enemy acts. A waiting reinforcement does not lose statuses.
        </dd>
      </dl>
      <h3>The road ahead</h3>
      <p>
        Choose one of three paths at each crossroads. Encounters stay hidden
        until you choose. Each Act has six stops and its own changing landscape.
        Every act guarantees a camp. Rest for 25% of maximum health or improve
        one card. A boss victory restores 20% before the next act. Rewards can
        be skipped to keep your deck focused. Shops sell cards, a relic,
        healing, and one card removal. Gold and health costs appear before you
        commit.
      </p>
      <p>
        Draw five each turn. When the draw pile empties, the discard is
        shuffled. A resolving card cannot draw itself. Relic damage bonuses
        apply before Vulnerable; block and healing bonuses apply to each effect.
        Combat resets Dread and temporary state, but keeps health.
      </p>
      <p className="muted">
        Progress saves after every action in this browser. Settings are
        separate. No account, cloud save, permanent stat bonuses, or internet
        connection is required after assets load.
      </p>
    </div>
  );
}
