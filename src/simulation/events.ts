import { SimulationBridgeEvent } from './contracts/simulation-bridge';
import { SimulationNPCState, SimulationThinkingState } from './npc-state';
import { SimulationDroppedItem } from './inventory';
import { MonsterAttackEvent, SimulationMonsterState } from './monsters';

export interface ThinkingStateChangePayload {
	npcId: string;
	state: SimulationThinkingState;
}

export interface NPCActionPayload {
	npcId: string;
	action: string;
	position: SimulationNPCState['position'];
	reasoning?: string;
	nextGoal?: string;
}

export interface NPCDialoguePayload {
	npcId: string;
	dialogue: string;
	targetNpcId?: string;
	sourceNpcId?: string;
	sourceType?: 'npc' | 'player';
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

export type InventoryDropPayload = SimulationDroppedItem;

export interface MonsterStatePayload {
	monsterId: string;
	type: SimulationMonsterState['type'];
	position: SimulationMonsterState['position'];
	hp: number;
	phase: SimulationMonsterState['phase'];
}

export type MonsterAttackPayload = MonsterAttackEvent;

export type SimulationEventType =
	| 'thinking:state'
	| 'npc:action'
	| 'npc:dialogue'
	| 'survival:update'
	| 'simulation:npc-tick'
	| 'simulation:lifecycle'
	| 'inventory:drop'
	| 'monster:state'
	| 'monster:attack';

export type SimulationEventPayloadMap = {
	'thinking:state': ThinkingStateChangePayload;
	'npc:action': NPCActionPayload;
	'npc:dialogue': NPCDialoguePayload;
	'survival:update': SurvivalUpdatePayload;
	'simulation:npc-tick': NPCTickPayload;
	'simulation:lifecycle': Record<string, unknown>;
	'inventory:drop': InventoryDropPayload;
	'monster:state': MonsterStatePayload;
	'monster:attack': MonsterAttackPayload;
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
