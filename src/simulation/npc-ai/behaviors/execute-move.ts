import { NPCBehaviorExecutionContext, NPCActionExecutionResult } from './types';
import { applyPathAsWalking, findPathToTarget, toRoundedPosition } from './shared';

export const executeMoveBehavior = async (context: NPCBehaviorExecutionContext): Promise<NPCActionExecutionResult> => {
	const target = toRoundedPosition(context.action.target?.position ?? context.npc.position);
	const path = findPathToTarget(context, target);
	const walked = applyPathAsWalking(context, path);
	return {
		action: 'move',
		applied: true,
		position: { ...context.npc.position },
		details: {
			target,
			pathLength: path?.length ?? 0,
			walkedSteps: walked.length,
		},
	};
};
