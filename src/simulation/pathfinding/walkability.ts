import { GridPoint, BlockType, WorldQuery } from './types';

const AIR_STRINGS = new Set(['air', 'empty', 'none']);

export const defaultIsSolid = (block: BlockType): boolean => {
	if (block === null || block === undefined) {
		return false;
	}
	if (typeof block === 'boolean') {
		return block;
	}
	if (typeof block === 'number') {
		return block >= 0;
	}
	const normalized = block.trim().toLowerCase();
	if (AIR_STRINGS.has(normalized)) {
		return false;
	}
	return normalized.length > 0;
};

export const isWalkableCell = (point: GridPoint, worldQuery: WorldQuery, isSolid: (block: BlockType) => boolean): boolean => {
	const standingCell = worldQuery(point.x, point.y, point.z);
	if (isSolid(standingCell)) {
		return false;
	}
	const floorCell = worldQuery(point.x, point.y - 1, point.z);
	return isSolid(floorCell);
};

export const resolveWalkablePoint = (point: GridPoint, worldQuery: WorldQuery, isSolid: (block: BlockType) => boolean): GridPoint | null => {
	const candidates: GridPoint[] = [point, { x: point.x, y: point.y + 1, z: point.z }, { x: point.x, y: point.y - 1, z: point.z }];
	return candidates.find(candidate => isWalkableCell(candidate, worldQuery, isSolid)) ?? null;
};

export const getNeighborCandidates = (point: GridPoint): GridPoint[] => {
	const deltas = [
		{ x: 1, z: 0 },
		{ x: -1, z: 0 },
		{ x: 0, z: 1 },
		{ x: 0, z: -1 },
	];
	return deltas.reduce<GridPoint[]>((neighbors, delta) => {
		neighbors.push({ x: point.x + delta.x, y: point.y, z: point.z + delta.z });
		neighbors.push({ x: point.x + delta.x, y: point.y + 1, z: point.z + delta.z });
		neighbors.push({ x: point.x + delta.x, y: point.y - 1, z: point.z + delta.z });
		return neighbors;
	}, []);
};
