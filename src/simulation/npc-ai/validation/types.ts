import { NPCAction } from '../../../utils/types/npc';
import { SimulationNPCState } from '../../npc-state';
import { NPCObservation } from '../observe';

export interface NPCActionValidationContext {
	npc: SimulationNPCState;
	observation: NPCObservation;
	rawContent: string;
}

export interface NPCActionValidationSuccess {
	valid: true;
	action: NPCAction;
}

export interface NPCActionValidationFailure {
	valid: false;
	reason: string;
	warning: string;
	correctiveContext: string;
}

export type NPCActionValidationResult = NPCActionValidationSuccess | NPCActionValidationFailure;
