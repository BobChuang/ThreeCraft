'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.createInitialNPCRegistry = void 0;
const personas_1 = require('./personas');
const inventory_1 = require('./inventory');
const survival_1 = require('./survival');
const npcSpawnOffsets = [
	{ x: -8, y: 1, z: -8 },
	{ x: -4, y: 1, z: -8 },
	{ x: 0, y: 1, z: -8 },
	{ x: 4, y: 1, z: -8 },
	{ x: 8, y: 1, z: -8 },
	{ x: -8, y: 1, z: -4 },
	{ x: -4, y: 1, z: -4 },
	{ x: 0, y: 1, z: -4 },
	{ x: 4, y: 1, z: -4 },
	{ x: 8, y: 1, z: -4 },
];
const createInitialNPCRegistry = () => {
	const registry = new Map();
	personas_1.npcPersonas.slice(0, 10).forEach((persona, index) => {
		const id = `npc-${String(index + 1).padStart(2, '0')}`;
		const spawn = npcSpawnOffsets[index] ?? { x: 0, y: 1, z: 0 };
		registry.set(id, {
			id,
			name: persona.name,
			profession: persona.profession,
			position: { ...spawn },
			inventory: (0, inventory_1.createInventorySlots)(),
			survival: (0, survival_1.createDefaultSurvivalState)(),
			thinkingState: 'idle',
			isSleeping: false,
			lastTickAt: 0,
			tickCount: 0,
			lastAction: 'idle',
		});
	});
	return registry;
};
exports.createInitialNPCRegistry = createInitialNPCRegistry;
