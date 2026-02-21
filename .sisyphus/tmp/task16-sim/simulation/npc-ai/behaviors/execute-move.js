'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.executeMoveBehavior = void 0;
const shared_1 = require('./shared');
const executeMoveBehavior = async context => {
	const target = (0, shared_1.toRoundedPosition)(context.action.target?.position ?? context.npc.position);
	const path = (0, shared_1.findPathToTarget)(context, target);
	if (!(0, shared_1.isPathReachable)(path)) {
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
	const walked = (0, shared_1.applyPathAsWalking)(context, path);
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
exports.executeMoveBehavior = executeMoveBehavior;
