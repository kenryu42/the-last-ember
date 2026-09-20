import { enemyDef } from "../../content/enemies";
import type { EnemyKind } from "../../content/enemies";
import type { Enemy, Run } from "../../model";
export function makeEnemy(run: Run, def: EnemyKind, joinsOn = 0): Enemy {
  const base = enemyDef(def),
    boss = ["roots", "marshal", "hollow"].includes(def);
  const hp = base.hp + (boss ? 0 : run.act * 6);
  return {
    uid: run.nextId++,
    def,
    hp,
    maxHp: hp,
    block: 0,
    strength: boss ? 0 : run.act * 2,
    weak: 0,
    vulnerable: 0,
    step: 0,
    joinsOn,
  };
}
