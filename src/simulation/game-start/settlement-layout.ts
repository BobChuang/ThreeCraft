import type { SimulationVector3 } from '../contracts/simulation-bridge';

const SETTLEMENT_LAYOUT_XZ: Array<{ x: number; z: number }> = [
	{ x: -9, z: -8 },
	{ x: -5, z: -7 },
	{ x: -1, z: -8 },
	{ x: 3, z: -7 },
	{ x: 7, z: -8 },
	{ x: -8, z: -3 },
	{ x: -4, z: -2 },
	{ x: 0, z: -3 },
	{ x: 4, z: -2 },
	{ x: 8, z: -3 },
];

export const createSettlementSpawnPositions = (resolveSurfaceY: (x: number, z: number) => number): SimulationVector3[] =>
	SETTLEMENT_LAYOUT_XZ.map(({ x, z }) => ({
		x,
		y: resolveSurfaceY(x, z),
		z,
	}));
