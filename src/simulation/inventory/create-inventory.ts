import { SimulationInventorySlot } from './types';

export const DEFAULT_INVENTORY_SLOTS = 20;

export const createEmptyInventorySlot = (defaultMaxStack = 64): SimulationInventorySlot => ({
	type: null,
	quantity: 0,
	maxStack: defaultMaxStack,
});

export const createInventorySlots = (slotCount = DEFAULT_INVENTORY_SLOTS, defaultMaxStack = 64): SimulationInventorySlot[] =>
	Array.from({ length: slotCount }, () => createEmptyInventorySlot(defaultMaxStack));
