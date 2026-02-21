import { MonsterDefinition } from './types';

export const MAX_ACTIVE_MONSTERS = 20;
export const MONSTER_AGGRO_RANGE = 12;
export const MONSTER_DISENGAGE_RANGE = 20;
export const MONSTER_ATTACK_RANGE = 2;
export const MONSTER_ATTACK_COOLDOWN_MS = 2_000;
export const MONSTER_SPAWN_INTERVAL_MS = 2_000;

export const MONSTER_DEFINITIONS: MonsterDefinition[] = [
	{
		type: 'mutant',
		label: 'Mutant',
		maxHp: 50,
		damage: 10,
		speedMultiplier: 0.8,
	},
	{
		type: 'corrupted-bot',
		label: 'Corrupted Bot',
		maxHp: 80,
		damage: 15,
		speedMultiplier: 0.6,
	},
];
