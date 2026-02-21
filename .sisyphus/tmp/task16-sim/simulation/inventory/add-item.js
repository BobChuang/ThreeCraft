'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.addItemToInventory = void 0;
const getExistingStackIndexes = (inventory, itemType, maxStack) =>
	inventory
		.map((slot, index) => ({ slot, index }))
		.filter(({ slot }) => slot.type === itemType && slot.quantity > 0 && slot.maxStack === maxStack && slot.quantity < slot.maxStack)
		.map(({ index }) => index);
const getEmptySlotIndexes = inventory =>
	inventory
		.map((slot, index) => ({ slot, index }))
		.filter(({ slot }) => slot.type === null || slot.quantity <= 0)
		.map(({ index }) => index);
const placeIntoSlot = (slot, itemType, quantity, maxStack) => {
	if (slot.type === null || slot.quantity <= 0) {
		slot.type = itemType;
		slot.quantity = 0;
		slot.maxStack = maxStack;
	}
	const availableSpace = slot.maxStack - slot.quantity;
	const moved = Math.min(availableSpace, quantity);
	slot.quantity += moved;
	return moved;
};
const addItemToInventory = (inventory, itemType, quantity, maxStack = 64) => {
	if (quantity <= 0) {
		return { accepted: 0, rejected: 0, isFull: inventory.every(slot => slot.type !== null && slot.quantity >= slot.maxStack) };
	}
	let remaining = quantity;
	const stackIndexes = getExistingStackIndexes(inventory, itemType, maxStack);
	for (let i = 0; i < stackIndexes.length && remaining > 0; i += 1) {
		const index = stackIndexes[i];
		remaining -= placeIntoSlot(inventory[index], itemType, remaining, maxStack);
	}
	const emptyIndexes = getEmptySlotIndexes(inventory);
	for (let i = 0; i < emptyIndexes.length && remaining > 0; i += 1) {
		const index = emptyIndexes[i];
		remaining -= placeIntoSlot(inventory[index], itemType, remaining, maxStack);
	}
	return {
		accepted: quantity - remaining,
		rejected: remaining,
		isFull: remaining > 0,
	};
};
exports.addItemToInventory = addItemToInventory;
