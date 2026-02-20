import { ISimulationBridge, SimulationWorldState } from '../contracts/simulation-bridge';
import { SimulationNPCState } from '../npc-state';

export interface NPCObservation {
	worldState: SimulationWorldState;
	nearbyNPCs: Array<Pick<SimulationNPCState, 'id' | 'name' | 'profession' | 'position' | 'lastAction'>>;
}

const distanceBetween = (a: SimulationNPCState['position'], b: SimulationNPCState['position']): number => {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

export const observeNPCContext = async (bridge: ISimulationBridge, npc: SimulationNPCState, allNPCs: SimulationNPCState[], radius: number): Promise<NPCObservation> => {
	const worldState = await bridge.getWorldState(npc.position, radius);
	const nearbyNPCs = allNPCs
		.filter(candidate => candidate.id !== npc.id)
		.filter(candidate => distanceBetween(candidate.position, npc.position) <= radius)
		.map(candidate => ({
			id: candidate.id,
			name: candidate.name,
			profession: candidate.profession,
			position: { ...candidate.position },
			lastAction: candidate.lastAction,
		}));
	return { worldState, nearbyNPCs };
};
