import type { BlockLog } from '../../utils/types/block';

const REVIVAL_SPRING_BLOCKS_XZ: Array<{ x: number; z: number; type: string; yOffset?: number }> = [
	{ x: 0, z: 0, type: 'cyberCore' },
	{ x: -1, z: 0, type: 'cyberSteel' },
	{ x: 1, z: 0, type: 'cyberSteel' },
	{ x: 0, z: -1, type: 'cyberSteel' },
	{ x: 0, z: 1, type: 'cyberSteel' },
	{ x: -1, z: -1, type: 'cyberNeon' },
	{ x: 1, z: -1, type: 'cyberNeon' },
	{ x: -1, z: 1, type: 'cyberNeon' },
	{ x: 1, z: 1, type: 'cyberNeon' },
	{ x: 0, z: 0, type: 'cyberGlass', yOffset: 1 },
];

export const createRevivalSpringBlockLogs = (centerY: number): BlockLog[] =>
	REVIVAL_SPRING_BLOCKS_XZ.map(({ x, z, type, yOffset = 0 }) => ({
		type,
		posX: x,
		posY: centerY + yOffset,
		posZ: z,
	}));
