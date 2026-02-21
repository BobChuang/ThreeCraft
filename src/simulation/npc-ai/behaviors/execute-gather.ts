import { ISimulationBridge } from '../../contracts/simulation-bridge';
import { NPCBehaviorExecutionContext, NPCActionExecutionResult } from './types';
import { applyPathAsWalking, createWorldQuery, findPathToTarget, sleep, toRoundedPosition } from './shared';

const gatherItemFromTarget = (context: NPCBehaviorExecutionContext, targetBlockType: string): { accepted: number; rejected: number; isFull: boolean } => {
	if (!context.addInventoryItem) {
		return { accepted: 0, rejected: 1, isFull: false };
	}
	return context.addInventoryItem(context.npc.id, targetBlockType, 1);
};

const removeTargetBlock = async (bridge: ISimulationBridge, target: { x: number; y: number; z: number }): Promise<void> => {
	await bridge.modifyBlock(target, '0', 'remove');
};

export const executeGatherBehavior = async (bridge: ISimulationBridge, context: NPCBehaviorExecutionContext): Promise<NPCActionExecutionResult> => {
	const target = toRoundedPosition(context.action.target?.position ?? context.npc.position);
	const path = findPathToTarget(context, target);
	const walked = applyPathAsWalking(context, path);

	context.npc.lastAction = 'gather';
	context.onActionState?.('gather', { ...context.npc.position }, { phase: 'digging-start', target, walkedSteps: walked.length });
	await sleep(2_000);

	const worldQuery = createWorldQuery(context.observation);
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
