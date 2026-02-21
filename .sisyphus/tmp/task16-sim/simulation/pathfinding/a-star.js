'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.runAStar = void 0;
const heuristics_1 = require('./heuristics');
const point_key_1 = require('./point-key');
const walkability_1 = require('./walkability');
const pickBestNode = openMap => {
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
const reconstructPath = (nodes, endNode) => {
	const result = [];
	let cursor = endNode;
	while (cursor) {
		result.push(cursor.point);
		cursor = cursor.parentKey ? nodes.get(cursor.parentKey) : undefined;
	}
	result.reverse();
	return result;
};
const runAStar = (start, target, worldQuery, isSolid, maxExploredNodes) => {
	const startKey = (0, point_key_1.toPointKey)(start);
	const openMap = new Map();
	const closedKeys = new Set();
	const allNodes = new Map();
	const startNode = {
		point: start,
		gScore: 0,
		fScore: (0, heuristics_1.manhattanDistance)(start, target),
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
		const currentKey = (0, point_key_1.toPointKey)(currentNode.point);
		openMap.delete(currentKey);
		closedKeys.add(currentKey);
		if ((0, point_key_1.samePoint)(currentNode.point, target)) {
			return reconstructPath(allNodes, currentNode);
		}
		const neighbors = (0, walkability_1.getNeighborCandidates)(currentNode.point);
		neighbors.forEach(neighborPoint => {
			const heightDelta = Math.abs(neighborPoint.y - currentNode.point.y);
			if (heightDelta <= 1 && (0, walkability_1.isWalkableCell)(neighborPoint, worldQuery, isSolid)) {
				const neighborKey = (0, point_key_1.toPointKey)(neighborPoint);
				if (!closedKeys.has(neighborKey)) {
					const tentativeG = currentNode.gScore + 1;
					const existingNode = allNodes.get(neighborKey);
					if (!existingNode || tentativeG < existingNode.gScore) {
						const updatedNode = {
							point: neighborPoint,
							gScore: tentativeG,
							fScore: tentativeG + (0, heuristics_1.manhattanDistance)(neighborPoint, target),
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
exports.runAStar = runAStar;
