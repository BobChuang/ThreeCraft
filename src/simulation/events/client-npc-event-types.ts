import type { SimulationBridgeEvent } from '../contracts/simulation-bridge';
import type { NPCActionPayload, NPCDialoguePayload, SurvivalUpdatePayload } from '../events';
import type { SimulationNPCState } from '../npc-state';

export const CLIENT_NPC_EVENT_TYPES = {
	NPC_STATE_UPDATE: 'NPC_STATE_UPDATE',
	NPC_ACTION: 'NPC_ACTION',
	NPC_DIALOGUE: 'NPC_DIALOGUE',
	SURVIVAL_UPDATE: 'SURVIVAL_UPDATE',
} as const;

export type ClientNPCEventType = (typeof CLIENT_NPC_EVENT_TYPES)[keyof typeof CLIENT_NPC_EVENT_TYPES];

export interface NPCStateUpdatePayload {
	npcId: string;
	state: SimulationNPCState;
}

export type ClientNPCEventPayloadMap = {
	NPC_STATE_UPDATE: NPCStateUpdatePayload;
	NPC_ACTION: NPCActionPayload;
	NPC_DIALOGUE: NPCDialoguePayload;
	SURVIVAL_UPDATE: SurvivalUpdatePayload;
};

export type ClientNPCEvent<T extends ClientNPCEventType = ClientNPCEventType> = {
	type: T;
	timestamp: number;
	payload: ClientNPCEventPayloadMap[T];
	sourceEvent?: SimulationBridgeEvent;
};

export type ClientNPCEventListener<T extends ClientNPCEventType = ClientNPCEventType> = (event: ClientNPCEvent<T>) => void;
