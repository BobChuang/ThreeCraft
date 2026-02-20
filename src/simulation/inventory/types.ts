import { SimulationVector3 } from '../contracts/simulation-bridge';

export interface SimulationInventorySlot {
	type: string | null;
	quantity: number;
	maxStack: number;
}

export interface SimulationInventoryAddResult {
	accepted: number;
	rejected: number;
	isFull: boolean;
}

export interface SimulationDroppedItem {
	id: string;
	ownerId: string;
	type: string;
	quantity: number;
	position: SimulationVector3;
	droppedAt: number;
}
