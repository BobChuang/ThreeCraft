'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.SimulationInventoryManager =
	exports.getInventoryItemDefinition =
	exports.dropItemFromSlot =
	exports.dropAllInventoryItems =
	exports.consumeItemFromInventory =
	exports.addItemToInventory =
	exports.createInventorySlots =
	exports.DEFAULT_INVENTORY_SLOTS =
		void 0;
var create_inventory_1 = require('./create-inventory');
Object.defineProperty(exports, 'DEFAULT_INVENTORY_SLOTS', {
	enumerable: true,
	get: function () {
		return create_inventory_1.DEFAULT_INVENTORY_SLOTS;
	},
});
Object.defineProperty(exports, 'createInventorySlots', {
	enumerable: true,
	get: function () {
		return create_inventory_1.createInventorySlots;
	},
});
var add_item_1 = require('./add-item');
Object.defineProperty(exports, 'addItemToInventory', {
	enumerable: true,
	get: function () {
		return add_item_1.addItemToInventory;
	},
});
var consume_item_1 = require('./consume-item');
Object.defineProperty(exports, 'consumeItemFromInventory', {
	enumerable: true,
	get: function () {
		return consume_item_1.consumeItemFromInventory;
	},
});
var drop_items_1 = require('./drop-items');
Object.defineProperty(exports, 'dropAllInventoryItems', {
	enumerable: true,
	get: function () {
		return drop_items_1.dropAllInventoryItems;
	},
});
Object.defineProperty(exports, 'dropItemFromSlot', {
	enumerable: true,
	get: function () {
		return drop_items_1.dropItemFromSlot;
	},
});
var item_catalog_1 = require('./item-catalog');
Object.defineProperty(exports, 'getInventoryItemDefinition', {
	enumerable: true,
	get: function () {
		return item_catalog_1.getInventoryItemDefinition;
	},
});
var inventory_manager_1 = require('./inventory-manager');
Object.defineProperty(exports, 'SimulationInventoryManager', {
	enumerable: true,
	get: function () {
		return inventory_manager_1.SimulationInventoryManager;
	},
});
