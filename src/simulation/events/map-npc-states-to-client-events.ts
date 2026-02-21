import type { SimulationNPCState } from '../npc-state';
import { CLIENT_NPC_EVENT_TYPES, ClientNPCEvent } from './client-npc-event-types';

const cloneNPCState = (state: SimulationNPCState): SimulationNPCState => ({
	...state,
	position: { ...state.position },
	inventory: state.inventory.map(slot => ({ ...slot })),
	survival: { ...state.survival },
});

export const mapNPCStatesToClientEvents = (states: SimulationNPCState[], timestamp = Date.now()): ClientNPCEvent<'NPC_STATE_UPDATE'>[] =>
	states.map(state => ({
		type: CLIENT_NPC_EVENT_TYPES.NPC_STATE_UPDATE,
		timestamp,
		payload: {
			npcId: state.id,
			state: cloneNPCState(state),
		},
	}));
