import { SimulationInventorySlot } from './types';

const normalizeItemType = (itemType: string): string => itemType.toLowerCase();

const clearSlotIfEmpty = (slot: SimulationInventorySlot) => {
	if (slot.quantity > 0) return;
	slot.type = null;
	slot.quantity = 0;
};

export const consumeItemFromInventory = (inventory: SimulationInventorySlot[], itemType: string, quantity = 1): number => {
	if (quantity <= 0) return 0;
	const normalizedType = normalizeItemType(itemType);
	let remaining = quantity;
	for (let i = 0; i < inventory.length && remaining > 0; i += 1) {
		const slot = inventory[i];
		const slotType = slot.type;
		if (slotType !== null && slot.quantity > 0 && normalizeItemType(slotType) === normalizedType) {
			const consumed = Math.min(slot.quantity, remaining);
			slot.quantity -= consumed;
			remaining -= consumed;
			clearSlotIfEmpty(slot);
		}
	}
	return quantity - remaining;
};
