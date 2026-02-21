import type { BlockLog } from '../../utils/types/block';
import { PersistedSinglePlayerWorld, PersistedNPCState, WORLD_PERSISTENCE_VERSION } from './types';
import { readPersistedWorldSnapshot, writePersistedWorldSnapshot } from './snapshot-storage';

const AUTO_SAVE_INTERVAL_MS = 60_000;

export interface PersistenceWorldConfig {
	seed: number | null;
	cloudSeed: number | null;
	treeSeed: number | null;
	weather: number | null;
	playerPosition: { x: number; y: number; z: number };
	blockLog: BlockLog[];
}

export interface PersistenceWorldState {
	npcs: PersistedNPCState[];
	playerSurvival: PersistedSinglePlayerWorld['playerSurvival'];
	worldDrops: PersistedSinglePlayerWorld['worldDrops'];
	monsters: PersistedSinglePlayerWorld['monsters'];
}

export interface PersistenceAdapter {
	readWorldConfig(): PersistenceWorldConfig;
	readWorldState(): PersistenceWorldState;
	applySnapshot(snapshot: PersistedSinglePlayerWorld): void;
}

export class WorldPersistenceController {
	private readonly adapter: PersistenceAdapter;

	private autosaveHandle: ReturnType<typeof setInterval> | null = null;

	private readonly beforeUnloadHandler = (): void => {
		this.saveNow();
	};

	constructor(adapter: PersistenceAdapter) {
		this.adapter = adapter;
	}

	loadLatest(): PersistedSinglePlayerWorld | null {
		const snapshot = readPersistedWorldSnapshot();
		if (!snapshot) return null;
		this.adapter.applySnapshot(snapshot);
		return snapshot;
	}

	start(): void {
		if (this.autosaveHandle) return;
		this.autosaveHandle = setInterval(() => this.saveNow(), AUTO_SAVE_INTERVAL_MS);
		if (typeof window !== 'undefined') {
			window.addEventListener('beforeunload', this.beforeUnloadHandler);
			window.addEventListener('pagehide', this.beforeUnloadHandler);
		}
	}

	stop(): void {
		if (this.autosaveHandle) {
			clearInterval(this.autosaveHandle);
			this.autosaveHandle = null;
		}
		if (typeof window !== 'undefined') {
			window.removeEventListener('beforeunload', this.beforeUnloadHandler);
			window.removeEventListener('pagehide', this.beforeUnloadHandler);
		}
	}

	saveNow(): PersistedSinglePlayerWorld {
		const world = this.adapter.readWorldConfig();
		const state = this.adapter.readWorldState();
		const snapshot: PersistedSinglePlayerWorld = {
			version: WORLD_PERSISTENCE_VERSION,
			savedAt: Date.now(),
			seed: world.seed,
			cloudSeed: world.cloudSeed,
			treeSeed: world.treeSeed,
			weather: world.weather,
			playerPosition: {
				x: world.playerPosition.x,
				y: world.playerPosition.y,
				z: world.playerPosition.z,
			},
			blockLog: world.blockLog.map(item => ({ ...item })),
			npcs: state.npcs.map(npc => ({
				...npc,
				position: { ...npc.position },
				inventory: npc.inventory.map(slot => ({ ...slot })),
				survival: { ...npc.survival },
			})),
			playerSurvival: { ...state.playerSurvival },
			worldDrops: state.worldDrops.map(drop => ({ ...drop, position: { ...drop.position } })),
			monsters: state.monsters.map(monster => ({ ...monster, position: { ...monster.position }, wanderTarget: monster.wanderTarget ? { ...monster.wanderTarget } : null })),
		};
		writePersistedWorldSnapshot(snapshot);
		return snapshot;
	}
}
