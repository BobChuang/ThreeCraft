export interface SimulationInventoryItemDefinition {
	type: string;
	maxStack: number;
	hungerRestore?: number;
}

const FOOD_ITEMS: SimulationInventoryItemDefinition[] = [
	{ type: 'synth-ration', maxStack: 16, hungerRestore: 30 },
	{ type: 'energy-bar', maxStack: 32, hungerRestore: 15 },
];

const FOOD_MAP = new Map<string, SimulationInventoryItemDefinition>(FOOD_ITEMS.map(item => [item.type, item]));

export const getInventoryItemDefinition = (itemType: string): SimulationInventoryItemDefinition => {
	const normalized = itemType.toLowerCase();
	return FOOD_MAP.get(normalized) ?? { type: itemType, maxStack: 64 };
};
