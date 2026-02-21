'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.MONSTER_DEFINITIONS =
	exports.MONSTER_SPAWN_INTERVAL_MS =
	exports.MONSTER_ATTACK_COOLDOWN_MS =
	exports.MONSTER_ATTACK_RANGE =
	exports.MONSTER_DISENGAGE_RANGE =
	exports.MONSTER_AGGRO_RANGE =
	exports.MAX_ACTIVE_MONSTERS =
		void 0;
exports.MAX_ACTIVE_MONSTERS = 20;
exports.MONSTER_AGGRO_RANGE = 12;
exports.MONSTER_DISENGAGE_RANGE = 20;
exports.MONSTER_ATTACK_RANGE = 2;
exports.MONSTER_ATTACK_COOLDOWN_MS = 2000;
exports.MONSTER_SPAWN_INTERVAL_MS = 2000;
exports.MONSTER_DEFINITIONS = [
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
