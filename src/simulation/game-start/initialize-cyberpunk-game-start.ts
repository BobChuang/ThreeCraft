import { NPC_REVIVAL_SPRING_POSITION } from '../death';
import { SimulationEngine } from '../simulation-engine';
import { createSettlementSpawnPositions } from './settlement-layout';
import { createRevivalSpringBlockLogs } from './revival-spring';
import { getProfessionLoadout } from './profession-loadout';

interface TerrainHeightResolver {
	getFloorHeight(x: number, z: number): number;
}

export interface InitializeCyberpunkGameStartParams {
	simulationEngine: SimulationEngine;
	terrain: TerrainHeightResolver;
	applySpringBlocks: (blocks: Array<{ type: string | null; posX: number; posY: number; posZ: number }>) => void;
	notifyHint: (message: string) => void;
	skipForPersistedWorld?: boolean;
}

const CYBERPUNK_FEATURE_HINT = 'Tab=附身, G=观察者, E=对话';

export const initializeCyberpunkGameStart = ({ simulationEngine, terrain, applySpringBlocks, notifyHint, skipForPersistedWorld = false }: InitializeCyberpunkGameStartParams): void => {
	if (skipForPersistedWorld) {
		notifyHint(CYBERPUNK_FEATURE_HINT);
		return;
	}
	const spawnPositions = createSettlementSpawnPositions((x, z) => terrain.getFloorHeight(x, z) + 1);
	const npcStates = simulationEngine.getNPCStates().filter(state => state.id.startsWith('npc-'));
	npcStates.slice(0, 10).forEach((npc, index) => {
		const spawn = spawnPositions[index];
		if (!spawn) return;
		simulationEngine.overrideNPCPosition(npc.id, spawn);
		getProfessionLoadout(npc.profession).forEach(item => {
			simulationEngine.addInventoryItem(npc.id, item.type, item.quantity);
		});
	});
	const revivalSurfaceY = terrain.getFloorHeight(0, 0) + 1;
	NPC_REVIVAL_SPRING_POSITION.x = 0;
	NPC_REVIVAL_SPRING_POSITION.y = revivalSurfaceY;
	NPC_REVIVAL_SPRING_POSITION.z = 0;
	applySpringBlocks(createRevivalSpringBlockLogs(revivalSurfaceY));
	notifyHint(CYBERPUNK_FEATURE_HINT);
};
