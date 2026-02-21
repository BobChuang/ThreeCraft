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
	const target = (0, shared_1.toRoundedPosition)(context.action.target?.position ?? context.npc.position);
	const blockType = context.action.target?.blockType ?? '1';
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
	context.onActionState?.('build', { ...context.npc.position }, { phase: 'building-start', target, blockType, walkedSteps: walked.length });
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
				pathLength: path?.length ?? 0,
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
			pathLength: path?.length ?? 0,
			walkedSteps: walked.length,
		},
	};
};
exports.executeBuildBehavior = executeBuildBehavior;
