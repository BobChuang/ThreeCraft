'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.executeGatherBehavior = void 0;
const shared_1 = require('./shared');
const gatherItemFromTarget = (context, targetBlockType) => {
	if (!context.addInventoryItem) {
		return { accepted: 0, rejected: 1, isFull: false };
	}
	return context.addInventoryItem(context.npc.id, targetBlockType, 1);
};
const removeTargetBlock = async (bridge, target) => {
	await bridge.modifyBlock(target, '0', 'remove');
};
const executeGatherBehavior = async (bridge, context) => {
	const target = (0, shared_1.toRoundedPosition)(context.action.target?.position ?? context.npc.position);
	const path = (0, shared_1.findPathToTarget)(context, target);
	if (!(0, shared_1.isPathReachable)(path)) {
		return {
			action: 'gather',
			applied: false,
			position: { ...context.npc.position },
			details: {
				target,
				reason: 'path-not-found',
				pathLength: 0,
				walkedSteps: 0,
			},
		};
	}
	const walked = (0, shared_1.applyPathAsWalking)(context, path);
	context.npc.lastAction = 'gather';
	context.onActionState?.('gather', { ...context.npc.position }, { phase: 'digging-start', target, walkedSteps: walked.length });
	await (0, shared_1.sleep)(2000);
	const worldQuery = (0, shared_1.createWorldQuery)(context.observation);
	const targetBlockType = String(context.action.target?.blockType ?? worldQuery(target.x, target.y, target.z) ?? '1');
	await removeTargetBlock(bridge, target);
	const inventoryResult = gatherItemFromTarget(context, targetBlockType);
	return {
		action: 'gather',
		applied: true,
		position: { ...context.npc.position },
		details: {
			target,
			targetBlockType,
			pathLength: path?.length ?? 0,
			walkedSteps: walked.length,
			inventoryAccepted: inventoryResult.accepted,
			inventoryRejected: inventoryResult.rejected,
			inventoryFull: inventoryResult.isFull,
		},
	};
};
exports.executeGatherBehavior = executeGatherBehavior;
