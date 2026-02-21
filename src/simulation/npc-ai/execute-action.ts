import { NPCAction } from '../../utils/types/npc';
import { ISimulationBridge, SimulationVector3 } from '../contracts/simulation-bridge';
import { SimulationNPCState } from '../npc-state';
import { executeBuildBehavior, executeGatherBehavior, executeMoveBehavior } from './behaviors';
import type { NPCBehaviorExecutionContext } from './behaviors';
import { NPCObservation } from './observe';

export interface NPCActionExecutionResult {
	action: NPCAction['action'];
	applied: boolean;
	position: SimulationVector3;
	details: Record<string, unknown>;
}

export interface NPCActionExecutionContext {
	onActionState?: (action: NPCAction['action'], position: SimulationVector3, details?: Record<string, unknown>) => void;
	addInventoryItem?: (npcId: string, itemType: string, quantity: number) => { accepted: number; rejected: number; isFull: boolean };
	consumeInventoryItem?: (npcId: string, itemType: string, quantity: number) => number;
}

export const executeNPCAction = async (
	bridge: ISimulationBridge,
	npc: SimulationNPCState,
	action: NPCAction,
	observation: NPCObservation,
	context: NPCActionExecutionContext = {}
): Promise<NPCActionExecutionResult> => {
	const behaviorContext: NPCBehaviorExecutionContext = {
		npc,
		action,
		observation,
		onActionState: context.onActionState,
		addInventoryItem: context.addInventoryItem,
		consumeInventoryItem: context.consumeInventoryItem,
	};

	if (action.action === 'idle') {
		return { action: 'idle', applied: true, position: { ...npc.position }, details: {} };
	}

	if (action.action === 'dialogue') {
		return {
			action: 'dialogue',
			applied: true,
			position: { ...npc.position },
			details: { dialogue: action.dialogue ?? '' },
		};
	}

	if (action.action === 'move') {
		return executeMoveBehavior(behaviorContext);
	}

	if (action.action === 'build') {
		return executeBuildBehavior(bridge, behaviorContext);
	}

	return executeGatherBehavior(bridge, behaviorContext);
};
