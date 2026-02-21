'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.getInventoryItemDefinition = void 0;
const FOOD_ITEMS = [
	{ type: 'synth-ration', maxStack: 16, hungerRestore: 30 },
	{ type: 'energy-bar', maxStack: 32, hungerRestore: 15 },
];
const FOOD_MAP = new Map(FOOD_ITEMS.map(item => [item.type, item]));
const getInventoryItemDefinition = itemType => {
	const normalized = itemType.toLowerCase();
	return FOOD_MAP.get(normalized) ?? { type: itemType, maxStack: 64 };
};
exports.getInventoryItemDefinition = getInventoryItemDefinition;
