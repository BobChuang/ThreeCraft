'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.consumeItemFromInventory = void 0;
const normalizeItemType = itemType => itemType.toLowerCase();
const clearSlotIfEmpty = slot => {
	if (slot.quantity > 0) return;
	slot.type = null;
	slot.quantity = 0;
};
const consumeItemFromInventory = (inventory, itemType, quantity = 1) => {
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
exports.consumeItemFromInventory = consumeItemFromInventory;
