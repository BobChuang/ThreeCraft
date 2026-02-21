'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.dropAllInventoryItems = exports.dropItemFromSlot = void 0;
const createDropId = (ownerId, itemType, timestamp) => `drop-${ownerId}-${itemType}-${timestamp}-${Math.random().toString(36).slice(2, 8)}`;
const clearSlot = slot => {
	slot.type = null;
	slot.quantity = 0;
};
const dropItemFromSlot = (inventory, ownerId, slotIndex, quantity, position) => {
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
exports.dropItemFromSlot = dropItemFromSlot;
const dropAllInventoryItems = (inventory, ownerId, position) => {
	const drops = [];
	for (let slotIndex = 0; slotIndex < inventory.length; slotIndex += 1) {
		const slot = inventory[slotIndex];
		if (slot.type !== null && slot.quantity > 0) {
			const drop = (0, exports.dropItemFromSlot)(inventory, ownerId, slotIndex, slot.quantity, position);
			if (drop) drops.push(drop);
		}
	}
	return drops;
};
exports.dropAllInventoryItems = dropAllInventoryItems;
