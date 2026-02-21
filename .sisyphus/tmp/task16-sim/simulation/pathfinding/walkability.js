'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.getNeighborCandidates = exports.resolveWalkablePoint = exports.isWalkableCell = exports.defaultIsSolid = void 0;
const AIR_STRINGS = new Set(['air', 'empty', 'none']);
const defaultIsSolid = block => {
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
exports.defaultIsSolid = defaultIsSolid;
const isWalkableCell = (point, worldQuery, isSolid) => {
	const standingCell = worldQuery(point.x, point.y, point.z);
	if (isSolid(standingCell)) {
		return false;
	}
	const floorCell = worldQuery(point.x, point.y - 1, point.z);
	return isSolid(floorCell);
};
exports.isWalkableCell = isWalkableCell;
const resolveWalkablePoint = (point, worldQuery, isSolid) => {
	const candidates = [point, { x: point.x, y: point.y + 1, z: point.z }, { x: point.x, y: point.y - 1, z: point.z }];
	return candidates.find(candidate => (0, exports.isWalkableCell)(candidate, worldQuery, isSolid)) ?? null;
};
exports.resolveWalkablePoint = resolveWalkablePoint;
const getNeighborCandidates = point => {
	const deltas = [
		{ x: 1, z: 0 },
		{ x: -1, z: 0 },
		{ x: 0, z: 1 },
		{ x: 0, z: -1 },
	];
	return deltas.reduce((neighbors, delta) => {
		neighbors.push({ x: point.x + delta.x, y: point.y, z: point.z + delta.z });
		neighbors.push({ x: point.x + delta.x, y: point.y + 1, z: point.z + delta.z });
		neighbors.push({ x: point.x + delta.x, y: point.y - 1, z: point.z + delta.z });
		return neighbors;
	}, []);
};
exports.getNeighborCandidates = getNeighborCandidates;
