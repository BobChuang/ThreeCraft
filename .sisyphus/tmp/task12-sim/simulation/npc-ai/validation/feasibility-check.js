'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.validateActionFeasibility = void 0;
const pathfinding_1 = require('../../pathfinding');
const positionKey = position => `${position.x}:${position.y}:${position.z}`;
const asRounded = position => ({
	x: Math.round(position.x),
	y: Math.round(position.y),
	z: Math.round(position.z),
});
const buildWorldQuery = observation => {
	const map = new Map();
	observation.worldState.blocks.forEach(block => {
		map.set(positionKey(block.position), block.blockType);
	});
	return (x, y, z) => {
		var _a;
		return (_a = map.get(positionKey({ x, y, z }))) !== null && _a !== void 0 ? _a : null;
	};
};
const isLegalPosition = position => {
	if (![position.x, position.y, position.z].every(Number.isFinite)) return false;
	if (Math.abs(position.x) > 4096 || Math.abs(position.z) > 4096) return false;
	if (position.y < -64 || position.y > 512) return false;
	return true;
};
const hasInventoryBlock = (npc, blockType) => npc.inventory.some(slot => slot.type === blockType && slot.quantity > 0);
const isReachableTarget = (npc, target, observation) => {
	const start = asRounded(npc.position);
	const goal = asRounded(target);
	if (positionKey(start) === positionKey(goal)) return true;
	const worldQuery = buildWorldQuery(observation);
	const path = (0, pathfinding_1.findPath)(start, goal, worldQuery);
	if (path && path.length > 0) return true;
	const dx = goal.x - start.x;
	const dy = goal.y - start.y;
	const dz = goal.z - start.z;
	const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
	return distance <= observation.worldState.radius;
};
const validateActionFeasibility = (npc, action, observation) => {
	var _a, _b;
	if (action.action === 'idle' || action.action === 'dialogue') {
		return null;
	}
	const targetPosition = (_a = action.target) === null || _a === void 0 ? void 0 : _a.position;
	if (!targetPosition) {
		return 'target position is required';
	}
	if (!isLegalPosition(targetPosition)) {
		return 'illegal target position';
	}
	if (!isReachableTarget(npc, targetPosition, observation)) {
		return 'target is not reachable';
	}
	if (action.action === 'build') {
		const blockType = (_b = action.target) === null || _b === void 0 ? void 0 : _b.blockType;
		if (!blockType) {
			return 'build action requires target blockType';
		}
		if (!hasInventoryBlock(npc, blockType)) {
			return 'missing block in inventory';
		}
	}
	return null;
};
exports.validateActionFeasibility = validateActionFeasibility;
