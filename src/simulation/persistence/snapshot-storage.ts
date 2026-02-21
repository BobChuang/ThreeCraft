import { PersistedSinglePlayerWorld, WORLD_PERSISTENCE_VERSION } from './types';

const STORAGE_KEY = 'threecraft:singleplayer-world';

const hasNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const hasPosition = (value: unknown): boolean => {
	if (!value || typeof value !== 'object') return false;
	const data = value as Record<string, unknown>;
	return hasNumber(data.x) && hasNumber(data.y) && hasNumber(data.z);
};

const isSnapshotShape = (value: unknown): value is PersistedSinglePlayerWorld => {
	if (!value || typeof value !== 'object') return false;
	const data = value as Record<string, unknown>;
	if (!hasNumber(data.version) || !hasNumber(data.savedAt)) return false;
	if (!hasPosition(data.playerPosition)) return false;
	if (!Array.isArray(data.blockLog) || !Array.isArray(data.npcs) || !Array.isArray(data.worldDrops) || !Array.isArray(data.monsters)) return false;
	return data.playerSurvival !== null && typeof data.playerSurvival === 'object';
};

export const readPersistedWorldSnapshot = (): PersistedSinglePlayerWorld | null => {
	if (typeof window === 'undefined') return null;
	const raw = window.localStorage.getItem(STORAGE_KEY);
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!isSnapshotShape(parsed)) return null;
		if (parsed.version !== WORLD_PERSISTENCE_VERSION) return null;
		return parsed;
	} catch {
		return null;
	}
};

export const writePersistedWorldSnapshot = (snapshot: PersistedSinglePlayerWorld): void => {
	if (typeof window === 'undefined') return;
	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
};
