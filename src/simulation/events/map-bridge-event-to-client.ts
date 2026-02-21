import type { SimulationBridgeEvent } from '../contracts/simulation-bridge';
import type { NPCActionPayload, NPCDialoguePayload, SurvivalUpdatePayload } from '../events';
import { CLIENT_NPC_EVENT_TYPES, ClientNPCEvent } from './client-npc-event-types';

const isObjectRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isNPCActionPayload = (payload: unknown): payload is NPCActionPayload =>
	isObjectRecord(payload) && typeof payload.npcId === 'string' && typeof payload.action === 'string' && typeof payload.position === 'object' && payload.position !== null;

const isNPCDialoguePayload = (payload: unknown): payload is NPCDialoguePayload => isObjectRecord(payload) && typeof payload.npcId === 'string' && typeof payload.dialogue === 'string';

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
