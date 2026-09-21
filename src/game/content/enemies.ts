export type EnemyKind =
  | "wolf"
  | "raider"
  | "soldier"
  | "shade"
  | "sentinel"
  | "stag"
  | "crow"
  | "wraith"
  | "roots"
  | "marshal"
  | "hollow";
export type Intent = {
  kind: "attack" | "guard" | "howl" | "drain";
  amount: number;
};
export interface EnemyDef {
  id: EnemyKind;
  name: string;
  hp: number;
  art: number;
  pattern: Intent[];
  special: string;
}
const attack = (amount: number): Intent => ({ kind: "attack", amount });
export const ENEMIES: EnemyDef[] = [
  {
    id: "wolf",
    name: "Briar wolf",
    hp: 24,
    art: 0,
    pattern: [attack(7), attack(10), { kind: "howl", amount: 2 }],
    special: "Hunts in a repeating rhythm.",
  },
  {
    id: "raider",
    name: "Roadless brigand",
    hp: 30,
    art: 1,
    pattern: [attack(8), { kind: "guard", amount: 9 }, attack(13)],
    special: "Raises a shield before a heavy strike.",
  },
  {
    id: "soldier",
    name: "Ashbound soldier",
    hp: 32,
    art: 2,
    pattern: [{ kind: "guard", amount: 8 }, attack(10), attack(12)],
    special: "Disciplined, even in death.",
  },
  {
    id: "shade",
    name: "Lantern shade",
    hp: 23,
    art: 3,
    pattern: [{ kind: "drain", amount: 6 }, attack(9)],
    special: "Drain heals for health damage dealt.",
  },
  {
    id: "sentinel",
    name: "Gate sentinel",
    hp: 40,
    art: 4,
    pattern: [attack(11), { kind: "guard", amount: 12 }, attack(15)],
    special: "Its shelter lasts until broken or it acts again.",
  },
  {
    id: "stag",
    name: "Thorn-crowned stag",
    hp: 34,
    art: 5,
    pattern: [{ kind: "howl", amount: 2 }, attack(12), attack(9)],
    special: "Its cry raises Dread.",
  },
  {
    id: "crow",
    name: "Carrion watcher",
    hp: 18,
    art: 6,
    pattern: [attack(5), { kind: "howl", amount: 1 }],
    special: "A fragile scout for the pursuing host.",
  },
  {
    id: "wraith",
    name: "Rime wanderer",
    hp: 29,
    art: 7,
    pattern: [attack(9), { kind: "drain", amount: 10 }],
    special: "Drain heals for health damage dealt.",
  },
  {
    id: "roots",
    name: "The Rootbound King",
    hp: 92,
    art: 8,
    pattern: [{ kind: "guard", amount: 10 }, attack(15), { kind: "howl", amount: 2 }, attack(20)],
    special: "At half health or below, attacks gain 3 damage. Dread calls a wolf.",
  },
  {
    id: "marshal",
    name: "The Fallen Marshal",
    hp: 124,
    art: 9,
    pattern: [attack(15), { kind: "guard", amount: 16 }, attack(22)],
    special: "At half health or below, attacks gain 3 damage. The host answers Dread.",
  },
  {
    id: "hollow",
    name: "The Hollow Beacon",
    hp: 166,
    art: 10,
    pattern: [{ kind: "howl", amount: 2 }, attack(21), { kind: "drain", amount: 15 }, attack(26)],
    special: "At Dread 6+, attacks gain 4 damage. At half health or below, attacks gain 3.",
  },
];
export function enemyDef(id: EnemyKind): EnemyDef {
  const enemy = ENEMIES.find((e) => e.id === id);
  if (!enemy) throw new Error(`Unknown enemy ${id}`);
  return enemy;
}
