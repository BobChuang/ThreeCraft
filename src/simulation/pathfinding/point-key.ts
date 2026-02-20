import { GridPoint } from './types';

export const toPointKey = ({ x, y, z }: GridPoint): string => `${x}:${y}:${z}`;

export const samePoint = (left: GridPoint, right: GridPoint): boolean => left.x === right.x && left.y === right.y && left.z === right.z;
