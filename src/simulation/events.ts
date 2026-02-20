import { SimulationBridgeEvent } from './contracts/simulation-bridge';
import { SimulationNPCState, SimulationThinkingState } from './npc-state';

export interface ThinkingStateChangePayload {
	npcId: string;
	state: SimulationThinkingState;
}

export interface NPCActionPayload {
	npcId: string;
	action: string;
	position: SimulationNPCState['position'];
}

export interface SurvivalUpdatePayload {
	entityId: string;
	hp: number;
	hunger: number;
}

export interface NPCTickPayload {
	npcId: string;
	tickCount: number;
	sleeping: boolean;
}

export type SimulationEventType = 'thinking:state' | 'npc:action' | 'survival:update' | 'simulation:npc-tick' | 'simulation:lifecycle';

export type SimulationEventPayloadMap = {
	'thinking:state': ThinkingStateChangePayload;
	'npc:action': NPCActionPayload;
	'survival:update': SurvivalUpdatePayload;
	'simulation:npc-tick': NPCTickPayload;
	'simulation:lifecycle': Record<string, unknown>;
};

export type SimulationEvent<T extends SimulationEventType = SimulationEventType> = {
	type: T;
	timestamp: number;
	payload: SimulationEventPayloadMap[T];
};

export const toBridgeEvent = <T extends SimulationEventType>(event: SimulationEvent<T>): SimulationBridgeEvent => ({
	type: event.type,
	timestamp: event.timestamp,
	payload: event.payload as Record<string, unknown>,
});
