'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.executeBuildBehavior = void 0;
const shared_1 = require('./shared');
const consumeBuildItem = (context, blockType) => {
	if (!context.consumeInventoryItem) {
		return 0;
	}
	return context.consumeInventoryItem(context.npc.id, blockType, 1);
};
const executeBuildBehavior = async (bridge, context) => {
	var _a, _b, _c, _d, _e, _f, _g;
	const target = (0, shared_1.toRoundedPosition)((_b = (_a = context.action.target) === null || _a === void 0 ? void 0 : _a.position) !== null && _b !== void 0 ? _b : context.npc.position);
	const blockType = (_d = (_c = context.action.target) === null || _c === void 0 ? void 0 : _c.blockType) !== null && _d !== void 0 ? _d : '1';
	const path = (0, shared_1.findPathToTarget)(context, target);
	if (!(0, shared_1.isPathReachable)(path)) {
		return {
			action: 'build',
			applied: false,
			position: { ...context.npc.position },
			details: {
				target,
				blockType,
				reason: 'path-not-found',
				pathLength: 0,
				walkedSteps: 0,
			},
		};
	}
	const walked = (0, shared_1.applyPathAsWalking)(context, path);
	context.npc.lastAction = 'build';
	(_e = context.onActionState) === null || _e === void 0 ? void 0 : _e.call(context, 'build', { ...context.npc.position }, { phase: 'building-start', target, blockType, walkedSteps: walked.length });
	await (0, shared_1.sleep)(1000);
	const consumed = consumeBuildItem(context, blockType);
	if (consumed <= 0) {
		return {
			action: 'build',
			applied: false,
			position: { ...context.npc.position },
			details: {
				target,
				blockType,
				reason: 'missing-inventory-item',
				pathLength: (_f = path === null || path === void 0 ? void 0 : path.length) !== null && _f !== void 0 ? _f : 0,
				walkedSteps: walked.length,
			},
		};
	}
	await bridge.modifyBlock(target, blockType, 'place');
	return {
		action: 'build',
		applied: true,
		position: { ...context.npc.position },
		details: {
			target,
			blockType,
			consumed,
			pathLength: (_g = path === null || path === void 0 ? void 0 : path.length) !== null && _g !== void 0 ? _g : 0,
			walkedSteps: walked.length,
		},
	};
};
exports.executeBuildBehavior = executeBuildBehavior;
