'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.sleep = exports.isPathReachable = exports.applyPathAsWalking = exports.findPathToTarget = exports.createWorldQuery = exports.toRoundedPosition = void 0;
const pathfinding_1 = require('../../pathfinding');
const toKey = position => `${position.x}:${position.y}:${position.z}`;
const toRoundedPosition = position => ({
	x: Math.round(position.x),
	y: Math.round(position.y),
	z: Math.round(position.z),
});
exports.toRoundedPosition = toRoundedPosition;
const createWorldQuery = observation => {
	const blocks = new Map();
	observation.worldState.blocks.forEach(block => {
		blocks.set(toKey(block.position), block.blockType);
	});
	return (x, y, z) => {
		var _a;
		return (_a = blocks.get(toKey({ x, y, z }))) !== null && _a !== void 0 ? _a : null;
	};
};
exports.createWorldQuery = createWorldQuery;
const findPathToTarget = (context, target) => {
	const start = (0, exports.toRoundedPosition)(context.npc.position);
	const worldQuery = (0, exports.createWorldQuery)(context.observation);
	return (0, pathfinding_1.findPath)(start, target, worldQuery);
};
exports.findPathToTarget = findPathToTarget;
const applyPathAsWalking = (context, path) => {
	if (!path || path.length <= 1) {
		return [];
	}
	const walked = path.slice(1);
	walked.forEach((point, stepIndex) => {
		var _a;
		context.npc.position = { ...point };
		context.npc.lastAction = 'move';
		(_a = context.onActionState) === null || _a === void 0 ? void 0 : _a.call(context, 'move', { ...context.npc.position }, { stepIndex: stepIndex + 1, pathLength: path.length });
	});
	return walked;
};
exports.applyPathAsWalking = applyPathAsWalking;
const isPathReachable = path => Boolean(path && path.length > 0);
exports.isPathReachable = isPathReachable;
const sleep = async ms => {
	await new Promise(resolve => {
		setTimeout(resolve, ms);
	});
};
exports.sleep = sleep;
