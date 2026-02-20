export interface GridPoint {
	x: number;
	y: number;
	z: number;
}

export type BlockType = string | number | boolean | null | undefined;

export type WorldQuery = (x: number, y: number, z: number) => BlockType;

export type PathResult = GridPoint[] | null;

export interface FindPathOptions {
	maxExploredNodes?: number;
	isSolid?: (block: BlockType) => boolean;
}
