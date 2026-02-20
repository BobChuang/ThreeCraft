import { manhattanDistance } from './heuristics';
import { toPointKey, samePoint } from './point-key';
import { getNeighborCandidates, isWalkableCell } from './walkability';
import { GridPoint, BlockType, WorldQuery } from './types';

interface AStarNode {
	point: GridPoint;
	gScore: number;
	fScore: number;
	parentKey: string | null;
}

const pickBestNode = (openMap: Map<string, AStarNode>): AStarNode | null => {
	const nodes = Array.from(openMap.values());
	if (nodes.length === 0) {
		return null;
	}
	return nodes.reduce((winner, node) => {
		if (node.fScore < winner.fScore) {
			return node;
		}
		if (node.fScore === winner.fScore && node.gScore < winner.gScore) {
			return node;
		}
		return winner;
	});
};

const reconstructPath = (nodes: Map<string, AStarNode>, endNode: AStarNode): GridPoint[] => {
	const result: GridPoint[] = [];
	let cursor: AStarNode | undefined = endNode;
	while (cursor) {
		result.push(cursor.point);
		cursor = cursor.parentKey ? nodes.get(cursor.parentKey) : undefined;
	}
	result.reverse();
	return result;
};

export const runAStar = (start: GridPoint, target: GridPoint, worldQuery: WorldQuery, isSolid: (block: BlockType) => boolean, maxExploredNodes: number): GridPoint[] | null => {
	const startKey = toPointKey(start);
	const openMap = new Map<string, AStarNode>();
	const closedKeys = new Set<string>();
	const allNodes = new Map<string, AStarNode>();
	const startNode: AStarNode = {
		point: start,
		gScore: 0,
		fScore: manhattanDistance(start, target),
		parentKey: null,
	};
	openMap.set(startKey, startNode);
	allNodes.set(startKey, startNode);

	let explored = 0;
	while (openMap.size > 0 && explored < maxExploredNodes) {
		const currentNode = pickBestNode(openMap);
		if (!currentNode) {
			break;
		}
		explored += 1;
		const currentKey = toPointKey(currentNode.point);
		openMap.delete(currentKey);
		closedKeys.add(currentKey);

		if (samePoint(currentNode.point, target)) {
			return reconstructPath(allNodes, currentNode);
		}

		const neighbors = getNeighborCandidates(currentNode.point);
		neighbors.forEach(neighborPoint => {
			const heightDelta = Math.abs(neighborPoint.y - currentNode.point.y);
			if (heightDelta <= 1 && isWalkableCell(neighborPoint, worldQuery, isSolid)) {
				const neighborKey = toPointKey(neighborPoint);
				if (!closedKeys.has(neighborKey)) {
					const tentativeG = currentNode.gScore + 1;
					const existingNode = allNodes.get(neighborKey);
					if (!existingNode || tentativeG < existingNode.gScore) {
						const updatedNode: AStarNode = {
							point: neighborPoint,
							gScore: tentativeG,
							fScore: tentativeG + manhattanDistance(neighborPoint, target),
							parentKey: currentKey,
						};
						allNodes.set(neighborKey, updatedNode);
						openMap.set(neighborKey, updatedNode);
					}
				}
			}
		});
	}

	return null;
};
