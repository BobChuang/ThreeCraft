'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.executeMoveBehavior = void 0;
const shared_1 = require('./shared');
const executeMoveBehavior = async context => {
	var _a, _b, _c;
	const target = (0, shared_1.toRoundedPosition)((_b = (_a = context.action.target) === null || _a === void 0 ? void 0 : _a.position) !== null && _b !== void 0 ? _b : context.npc.position);
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
			pathLength: (_c = path === null || path === void 0 ? void 0 : path.length) !== null && _c !== void 0 ? _c : 0,
			walkedSteps: walked.length,
		},
	};
};
exports.executeMoveBehavior = executeMoveBehavior;
