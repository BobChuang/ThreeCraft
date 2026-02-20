import { npcPersonas } from './personas';
import { SimulationVector3 } from './contracts/simulation-bridge';

export type SimulationThinkingState = 'idle' | 'requesting' | 'received' | 'executing';

export interface SimulationSurvivalState {
	hp: number;
	maxHp: number;
	hunger: number;
	maxHunger: number;
}

export interface SimulationInventoryItem {
	type: string;
	quantity: number;
}

export interface SimulationNPCState {
	id: string;
	name: string;
	profession: string;
	position: SimulationVector3;
	inventory: SimulationInventoryItem[];
	survival: SimulationSurvivalState;
	thinkingState: SimulationThinkingState;
	isSleeping: boolean;
	lastTickAt: number;
	tickCount: number;
	lastAction: string;
}

const npcSpawnOffsets: SimulationVector3[] = [
	{ x: -8, y: 1, z: -8 },
	{ x: -4, y: 1, z: -8 },
	{ x: 0, y: 1, z: -8 },
	{ x: 4, y: 1, z: -8 },
	{ x: 8, y: 1, z: -8 },
	{ x: -8, y: 1, z: -4 },
	{ x: -4, y: 1, z: -4 },
	{ x: 0, y: 1, z: -4 },
	{ x: 4, y: 1, z: -4 },
	{ x: 8, y: 1, z: -4 },
];

export const createInitialNPCRegistry = (): Map<string, SimulationNPCState> => {
	const registry = new Map<string, SimulationNPCState>();
	npcPersonas.slice(0, 10).forEach((persona, index) => {
		const id = `npc-${String(index + 1).padStart(2, '0')}`;
		const spawn = npcSpawnOffsets[index] ?? { x: 0, y: 1, z: 0 };
		registry.set(id, {
			id,
			name: persona.name,
			profession: persona.profession,
			position: { ...spawn },
			inventory: [],
			survival: {
				hp: 100,
				maxHp: 100,
				hunger: 100,
				maxHunger: 100,
			},
			thinkingState: 'idle',
			isSleeping: false,
			lastTickAt: 0,
			tickCount: 0,
			lastAction: 'idle',
		});
	});
	return registry;
};
