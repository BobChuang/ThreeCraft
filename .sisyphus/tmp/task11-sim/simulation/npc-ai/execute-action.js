'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.executeNPCAction = void 0;
const behaviors_1 = require('./behaviors');
const executeNPCAction = async (bridge, npc, action, observation, context = {}) => {
	const behaviorContext = {
		npc,
		action,
		observation,
		onActionState: context.onActionState,
		addInventoryItem: context.addInventoryItem,
		consumeInventoryItem: context.consumeInventoryItem,
	};
	if (action.action === 'idle') {
		return { action: 'idle', applied: true, position: { ...npc.position }, details: {} };
	}
	if (action.action === 'dialogue') {
		return {
			action: 'dialogue',
			applied: true,
			position: { ...npc.position },
			details: { dialogue: action.dialogue ?? '' },
		};
	}
	if (action.action === 'move') {
		return (0, behaviors_1.executeMoveBehavior)(behaviorContext);
	}
	if (action.action === 'build') {
		return (0, behaviors_1.executeBuildBehavior)(bridge, behaviorContext);
	}
	return (0, behaviors_1.executeGatherBehavior)(bridge, behaviorContext);
};
exports.executeNPCAction = executeNPCAction;
