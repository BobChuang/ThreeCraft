'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.createInventorySlots = exports.createEmptyInventorySlot = exports.DEFAULT_INVENTORY_SLOTS = void 0;
exports.DEFAULT_INVENTORY_SLOTS = 20;
const createEmptyInventorySlot = (defaultMaxStack = 64) => ({
	type: null,
	quantity: 0,
	maxStack: defaultMaxStack,
});
exports.createEmptyInventorySlot = createEmptyInventorySlot;
const createInventorySlots = (slotCount = exports.DEFAULT_INVENTORY_SLOTS, defaultMaxStack = 64) => Array.from({ length: slotCount }, () => (0, exports.createEmptyInventorySlot)(defaultMaxStack));
exports.createInventorySlots = createInventorySlots;
