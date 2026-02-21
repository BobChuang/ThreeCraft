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

	setInventory(entityId: string, slots: SimulationInventorySlot[]): void {
		const inventory = this.inventories.get(entityId) ?? this.registerEntity(entityId, slots.length || 20);
		inventory.length = 0;
		slots.forEach(slot => {
			inventory.push({
				type: slot.type,
				quantity: slot.quantity,
				maxStack: slot.maxStack,
			});
		});
	}

	setWorldDrops(drops: SimulationDroppedItem[]): void {
		this.worldDrops.length = 0;
		drops.forEach(drop => {
			this.worldDrops.push({
				id: drop.id,
				ownerId: drop.ownerId,
				type: drop.type,
				quantity: drop.quantity,
				position: { ...drop.position },
				droppedAt: drop.droppedAt,
			});
		});
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

	clearInventory(entityId: string): void {
		const inventory = this.inventories.get(entityId) ?? this.registerEntity(entityId);
		inventory.forEach(slot => {
			slot.type = null;
			slot.quantity = 0;
		});
	}

	purgeExpiredDrops(maxAgeMs: number, now = Date.now()): SimulationDroppedItem[] {
		if (maxAgeMs <= 0 || this.worldDrops.length === 0) return [];
		const expired: SimulationDroppedItem[] = [];
		for (let index = this.worldDrops.length - 1; index >= 0; index -= 1) {
			const drop = this.worldDrops[index];
			if (now - drop.droppedAt >= maxAgeMs) {
				expired.push(this.worldDrops[index]);
				this.worldDrops.splice(index, 1);
			}
		}
		return expired;
	}

	collectDrop(dropId: string, collectorId: string): SimulationDroppedItem | null {
		const dropIndex = this.worldDrops.findIndex(drop => drop.id === dropId);
		if (dropIndex < 0) return null;
		const drop = this.worldDrops[dropIndex];
		const addResult = this.addItem(collectorId, drop.type, drop.quantity);
		if (addResult.accepted <= 0) return null;
		if (addResult.accepted >= drop.quantity) {
			this.worldDrops.splice(dropIndex, 1);
			return {
				...drop,
				position: { ...drop.position },
			};
		}
		drop.quantity -= addResult.accepted;
		return {
			...drop,
			quantity: addResult.accepted,
			position: { ...drop.position },
		};
	}
}
