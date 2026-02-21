import { SimulationVector3 } from '../contracts/simulation-bridge';
import { addItemToInventory } from './add-item';
import { consumeItemFromInventory } from './consume-item';
import { createInventorySlots } from './create-inventory';
import { dropAllInventoryItems, dropItemFromSlot } from './drop-items';
import { getInventoryItemDefinition } from './item-catalog';
import { SimulationDroppedItem, SimulationInventoryAddResult, SimulationInventorySlot } from './types';

const cloneInventory = (inventory: SimulationInventorySlot[]): SimulationInventorySlot[] => inventory.map(slot => ({ type: slot.type, quantity: slot.quantity, maxStack: slot.maxStack }));

export class SimulationInventoryManager {
	private readonly inventories = new Map<string, SimulationInventorySlot[]>();

	private readonly worldDrops: SimulationDroppedItem[] = [];

	registerEntity(entityId: string, slotCount = 20): SimulationInventorySlot[] {
		const existing = this.inventories.get(entityId);
		if (existing) return existing;
		const inventory = createInventorySlots(slotCount);
		this.inventories.set(entityId, inventory);
		return inventory;
	}

	getInventory(entityId: string): SimulationInventorySlot[] {
		const inventory = this.inventories.get(entityId) ?? this.registerEntity(entityId);
		return cloneInventory(inventory);
	}

	addItem(entityId: string, itemType: string, quantity: number, maxStack?: number): SimulationInventoryAddResult {
		const inventory = this.inventories.get(entityId) ?? this.registerEntity(entityId);
		const item = getInventoryItemDefinition(itemType);
		return addItemToInventory(inventory, item.type, quantity, maxStack ?? item.maxStack);
	}

	consumeItem(entityId: string, itemType: string, quantity = 1): number {
		const inventory = this.inventories.get(entityId) ?? this.registerEntity(entityId);
		return consumeItemFromInventory(inventory, itemType, quantity);
	}

	dropFromSlot(entityId: string, slotIndex: number, quantity: number, position: SimulationVector3): SimulationDroppedItem | null {
		const inventory = this.inventories.get(entityId) ?? this.registerEntity(entityId);
		const drop = dropItemFromSlot(inventory, entityId, slotIndex, quantity, position);
		if (!drop) return null;
		this.worldDrops.push(drop);
		return drop;
	}

	dropAllForDeath(entityId: string, position: SimulationVector3): SimulationDroppedItem[] {
		const inventory = this.inventories.get(entityId) ?? this.registerEntity(entityId);
		const drops = dropAllInventoryItems(inventory, entityId, position);
		this.worldDrops.push(...drops);
		return drops;
	}

	getWorldDrops(): SimulationDroppedItem[] {
		return this.worldDrops.map(drop => ({ ...drop, position: { ...drop.position } }));
	}

	createWorldDrop(ownerId: string, type: string, quantity: number, position: SimulationVector3): SimulationDroppedItem | null {
		if (quantity <= 0) return null;
		const droppedAt = Date.now();
		const normalizedType = getInventoryItemDefinition(type).type;
		const drop: SimulationDroppedItem = {
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
