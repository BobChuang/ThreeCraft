import { SimulationVector3 } from '../contracts/simulation-bridge';
import { SimulationDroppedItem, SimulationInventorySlot } from './types';

const createDropId = (ownerId: string, itemType: string, timestamp: number): string => `drop-${ownerId}-${itemType}-${timestamp}-${Math.random().toString(36).slice(2, 8)}`;

const clearSlot = (slot: SimulationInventorySlot) => {
	slot.type = null;
	slot.quantity = 0;
};

export const dropItemFromSlot = (inventory: SimulationInventorySlot[], ownerId: string, slotIndex: number, quantity: number, position: SimulationVector3): SimulationDroppedItem | null => {
	const slot = inventory[slotIndex];
	if (!slot || slot.type === null || slot.quantity <= 0 || quantity <= 0) return null;
	const droppedQuantity = Math.min(slot.quantity, quantity);
	const droppedType = slot.type;
	slot.quantity -= droppedQuantity;
	if (slot.quantity <= 0) clearSlot(slot);
	const droppedAt = Date.now();
	return {
		id: createDropId(ownerId, droppedType, droppedAt),
		ownerId,
		type: droppedType,
		quantity: droppedQuantity,
		position: { ...position },
		droppedAt,
	};
};

export const dropAllInventoryItems = (inventory: SimulationInventorySlot[], ownerId: string, position: SimulationVector3): SimulationDroppedItem[] => {
	const drops: SimulationDroppedItem[] = [];
	for (let slotIndex = 0; slotIndex < inventory.length; slotIndex += 1) {
		const slot = inventory[slotIndex];
		if (slot.type !== null && slot.quantity > 0) {
			const drop = dropItemFromSlot(inventory, ownerId, slotIndex, slot.quantity, position);
			if (drop) drops.push(drop);
		}
	}
	return drops;
};
