import type { SimulationBridgeEvent } from '../contracts/simulation-bridge';
import type { NPCActionPayload, NPCDialoguePayload, SurvivalUpdatePayload, ThinkingStateChangePayload } from '../events';
import { CLIENT_NPC_EVENT_TYPES, ClientNPCEvent } from './client-npc-event-types';

const isObjectRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isNPCActionPayload = (payload: unknown): payload is NPCActionPayload =>
	isObjectRecord(payload) && typeof payload.npcId === 'string' && typeof payload.action === 'string' && typeof payload.position === 'object' && payload.position !== null;

const isNPCDialoguePayload = (payload: unknown): payload is NPCDialoguePayload => isObjectRecord(payload) && typeof payload.npcId === 'string' && typeof payload.dialogue === 'string';

const THINKING_STATE_SET = new Set(['idle', 'requesting', 'received', 'executing']);

const isThinkingStatePayload = (payload: unknown): payload is ThinkingStateChangePayload =>
	isObjectRecord(payload) && typeof payload.npcId === 'string' && typeof payload.state === 'string' && THINKING_STATE_SET.has(payload.state);

const isSurvivalUpdatePayload = (payload: unknown): payload is SurvivalUpdatePayload =>
	isObjectRecord(payload) && typeof payload.entityId === 'string' && typeof payload.hp === 'number' && typeof payload.hunger === 'number';

export const mapBridgeEventToClientNPCEvent = (event: SimulationBridgeEvent): ClientNPCEvent | null => {
	if (event.type === 'npc:action' && isNPCActionPayload(event.payload)) {
		return {
			type: CLIENT_NPC_EVENT_TYPES.NPC_ACTION,
			timestamp: event.timestamp,
			payload: event.payload,
			sourceEvent: event,
		};
	}
	if (event.type === 'npc:dialogue' && isNPCDialoguePayload(event.payload)) {
		return {
			type: CLIENT_NPC_EVENT_TYPES.NPC_DIALOGUE,
			timestamp: event.timestamp,
			payload: event.payload,
			sourceEvent: event,
		};
	}
	if (event.type === 'thinking:state' && isThinkingStatePayload(event.payload)) {
		return {
			type: CLIENT_NPC_EVENT_TYPES.NPC_THINKING_STATE,
			timestamp: event.timestamp,
			payload: event.payload,
			sourceEvent: event,
		};
	}
	if (event.type === 'simulation:lifecycle' && isObjectRecord(event.payload)) {
		const eventType = typeof event.payload.eventType === 'string' ? event.payload.eventType : event.payload.status;
		const { npcId } = event.payload;
		const { chunk } = event.payload;
		if (eventType === 'thinking-stream' && typeof npcId === 'string' && typeof chunk === 'string') {
			return {
				type: CLIENT_NPC_EVENT_TYPES.NPC_THINKING_STREAM,
				timestamp: event.timestamp,
				payload: {
					npcId,
					chunk,
					chunkIndex: typeof event.payload.chunkIndex === 'number' ? event.payload.chunkIndex : undefined,
				},
				sourceEvent: event,
			};
		}
	}
	if (event.type === 'survival:update' && isSurvivalUpdatePayload(event.payload)) {
		return {
			type: CLIENT_NPC_EVENT_TYPES.SURVIVAL_UPDATE,
			timestamp: event.timestamp,
			payload: event.payload,
			sourceEvent: event,
		};
	}
	return null;
};
