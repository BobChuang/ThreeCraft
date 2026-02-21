import type { SimulationBridgeEvent } from '../contracts/simulation-bridge';
import type { NPCActionPayload, NPCDialoguePayload, SurvivalUpdatePayload } from '../events';
import type { SimulationNPCState, SimulationThinkingState } from '../npc-state';

export const CLIENT_NPC_EVENT_TYPES = {
	NPC_STATE_UPDATE: 'NPC_STATE_UPDATE',
	NPC_ACTION: 'NPC_ACTION',
	NPC_DIALOGUE: 'NPC_DIALOGUE',
	NPC_THINKING_STATE: 'NPC_THINKING_STATE',
	NPC_THINKING_STREAM: 'NPC_THINKING_STREAM',
	SURVIVAL_UPDATE: 'SURVIVAL_UPDATE',
} as const;

export type ClientNPCEventType = (typeof CLIENT_NPC_EVENT_TYPES)[keyof typeof CLIENT_NPC_EVENT_TYPES];

export interface NPCStateUpdatePayload {
	npcId: string;
	state: SimulationNPCState;
}

export interface NPCThinkingStatePayload {
	npcId: string;
	state: SimulationThinkingState;
}

export interface NPCThinkingStreamPayload {
	npcId: string;
	chunk: string;
	chunkIndex?: number;
}

export type ClientNPCEventPayloadMap = {
	NPC_STATE_UPDATE: NPCStateUpdatePayload;
	NPC_ACTION: NPCActionPayload;
	NPC_DIALOGUE: NPCDialoguePayload;
	NPC_THINKING_STATE: NPCThinkingStatePayload;
	NPC_THINKING_STREAM: NPCThinkingStreamPayload;
	SURVIVAL_UPDATE: SurvivalUpdatePayload;
};

export type ClientNPCEvent<T extends ClientNPCEventType = ClientNPCEventType> = {
	type: T;
	timestamp: number;
	payload: ClientNPCEventPayloadMap[T];
	sourceEvent?: SimulationBridgeEvent;
};

export type ClientNPCEventListener<T extends ClientNPCEventType = ClientNPCEventType> = (event: ClientNPCEvent<T>) => void;
