import { GridPoint } from './types';

export const manhattanDistance = (from: GridPoint, to: GridPoint): number => Math.abs(from.x - to.x) + Math.abs(from.y - to.y) + Math.abs(from.z - to.z);
