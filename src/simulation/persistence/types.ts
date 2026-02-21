import type { BlockLog } from '../../utils/types/block';
import type { SimulationVector3 } from '../contracts/simulation-bridge';
import type { SimulationDroppedItem, SimulationInventorySlot } from '../inventory';
import type { SimulationMonsterState } from '../monsters';
import type { SimulationNPCState } from '../npc-state';
import type { SimulationSurvivalState } from '../survival';

export const WORLD_PERSISTENCE_VERSION = 1;

export interface PersistedNPCState {
	id: string;
	position: SimulationVector3;
	inventory: SimulationInventorySlot[];
	survival: SimulationSurvivalState;
	thinkingState: SimulationNPCState['thinkingState'];
	isSleeping: boolean;
	lastTickAt: number;
	tickCount: number;
	lastAction: string;
}

export interface PersistedSinglePlayerWorld {
	version: number;
	savedAt: number;
	seed: number | null;
	cloudSeed: number | null;
	treeSeed: number | null;
	weather: number | null;
	playerPosition: SimulationVector3;
	blockLog: BlockLog[];
	npcs: PersistedNPCState[];
	playerSurvival: SimulationSurvivalState;
	worldDrops: SimulationDroppedItem[];
	monsters: SimulationMonsterState[];
}
