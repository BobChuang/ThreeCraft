import { NPCAction } from '../../../utils/types/npc';
import { SimulationVector3 } from '../../contracts/simulation-bridge';
import { SimulationNPCState } from '../../npc-state';
import { NPCObservation } from '../observe';

export interface NPCActionExecutionResult {
	action: NPCAction['action'];
	applied: boolean;
	position: SimulationVector3;
	details: Record<string, unknown>;
}

export interface NPCBehaviorExecutionContext {
	npc: SimulationNPCState;
	action: NPCAction;
	observation: NPCObservation;
	onActionState?: (action: NPCAction['action'], position: SimulationVector3, details?: Record<string, unknown>) => void;
	addInventoryItem?: (npcId: string, itemType: string, quantity: number) => { accepted: number; rejected: number; isFull: boolean };
	consumeInventoryItem?: (npcId: string, itemType: string, quantity: number) => number;
}
