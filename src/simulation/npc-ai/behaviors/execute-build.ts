import { ISimulationBridge } from '../../contracts/simulation-bridge';
import { NPCBehaviorExecutionContext, NPCActionExecutionResult } from './types';
import { applyPathAsWalking, findPathToTarget, sleep, toRoundedPosition } from './shared';

const consumeBuildItem = (context: NPCBehaviorExecutionContext, blockType: string): number => {
	if (!context.consumeInventoryItem) {
		return 0;
	}
	return context.consumeInventoryItem(context.npc.id, blockType, 1);
};

export const executeBuildBehavior = async (bridge: ISimulationBridge, context: NPCBehaviorExecutionContext): Promise<NPCActionExecutionResult> => {
	const target = toRoundedPosition(context.action.target?.position ?? context.npc.position);
	const blockType = context.action.target?.blockType ?? '1';
	const path = findPathToTarget(context, target);
	const walked = applyPathAsWalking(context, path);

	context.npc.lastAction = 'build';
	context.onActionState?.('build', { ...context.npc.position }, { phase: 'building-start', target, blockType, walkedSteps: walked.length });
	await sleep(1_000);

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
