import { NPCBehaviorExecutionContext, NPCActionExecutionResult } from './types';
import { applyPathAsWalking, findPathToTarget, isPathReachable, toRoundedPosition } from './shared';

export const executeMoveBehavior = async (context: NPCBehaviorExecutionContext): Promise<NPCActionExecutionResult> => {
	const target = toRoundedPosition(context.action.target?.position ?? context.npc.position);
	const path = findPathToTarget(context, target);
	if (!isPathReachable(path)) {
		return {
			action: 'move',
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
