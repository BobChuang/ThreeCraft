'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.SimulationInventoryManager = void 0;
const add_item_1 = require('./add-item');
const consume_item_1 = require('./consume-item');
const create_inventory_1 = require('./create-inventory');
const drop_items_1 = require('./drop-items');
const item_catalog_1 = require('./item-catalog');
const cloneInventory = inventory => inventory.map(slot => ({ type: slot.type, quantity: slot.quantity, maxStack: slot.maxStack }));
class SimulationInventoryManager {
	constructor() {
		this.inventories = new Map();
		this.worldDrops = [];
	}
	registerEntity(entityId, slotCount = 20) {
		const existing = this.inventories.get(entityId);
		if (existing) return existing;
		const inventory = (0, create_inventory_1.createInventorySlots)(slotCount);
		this.inventories.set(entityId, inventory);
		return inventory;
	}
	getInventory(entityId) {
		const inventory = this.inventories.get(entityId) ?? this.registerEntity(entityId);
		return cloneInventory(inventory);
	}
	addItem(entityId, itemType, quantity, maxStack) {
		const inventory = this.inventories.get(entityId) ?? this.registerEntity(entityId);
		const item = (0, item_catalog_1.getInventoryItemDefinition)(itemType);
		return (0, add_item_1.addItemToInventory)(inventory, item.type, quantity, maxStack ?? item.maxStack);
	}
	consumeItem(entityId, itemType, quantity = 1) {
		const inventory = this.inventories.get(entityId) ?? this.registerEntity(entityId);
		return (0, consume_item_1.consumeItemFromInventory)(inventory, itemType, quantity);
	}
	dropFromSlot(entityId, slotIndex, quantity, position) {
		const inventory = this.inventories.get(entityId) ?? this.registerEntity(entityId);
		const drop = (0, drop_items_1.dropItemFromSlot)(inventory, entityId, slotIndex, quantity, position);
		if (!drop) return null;
		this.worldDrops.push(drop);
		return drop;
	}
	dropAllForDeath(entityId, position) {
		const inventory = this.inventories.get(entityId) ?? this.registerEntity(entityId);
		const drops = (0, drop_items_1.dropAllInventoryItems)(inventory, entityId, position);
		this.worldDrops.push(...drops);
		return drops;
	}
	getWorldDrops() {
		return this.worldDrops.map(drop => ({ ...drop, position: { ...drop.position } }));
	}
	createWorldDrop(ownerId, type, quantity, position) {
		if (quantity <= 0) return null;
		const droppedAt = Date.now();
		const normalizedType = (0, item_catalog_1.getInventoryItemDefinition)(type).type;
		const drop = {
			id: `drop-${ownerId}-${normalizedType}-${droppedAt}-${Math.random().toString(36).slice(2, 8)}`,
			ownerId,
			type: normalizedType,
			quantity,
			position: { ...position },
			droppedAt,
		};
		this.worldDrops.push(drop);
		return drop;
	}
}
exports.SimulationInventoryManager = SimulationInventoryManager;
