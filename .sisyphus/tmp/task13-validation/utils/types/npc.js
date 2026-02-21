'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.isValidNPCAction = exports.NPC_ACTIONS = void 0;
exports.NPC_ACTIONS = ['move', 'gather', 'build', 'dialogue', 'idle'];
const NPC_ACTION_SET = new Set(exports.NPC_ACTIONS);
const isFiniteNumber = value => typeof value === 'number' && Number.isFinite(value);
const isValidPosition = value => {
	if (!value || typeof value !== 'object') return false;
	const pos = value;
	return isFiniteNumber(pos.x) && isFiniteNumber(pos.y) && isFiniteNumber(pos.z);
};
const isValidTarget = value => {
	if (!value || typeof value !== 'object') return false;
	const target = value;
	if (target.position !== undefined && !isValidPosition(target.position)) return false;
	if (target.blockType !== undefined && typeof target.blockType !== 'string') return false;
	if (target.npcId !== undefined && typeof target.npcId !== 'string') return false;
	return true;
};
const isValidNPCAction = value => {
	if (!value || typeof value !== 'object') return false;
	const action = value;
	if (typeof action.action !== 'string' || !NPC_ACTION_SET.has(action.action)) return false;
	if (action.target !== undefined && !isValidTarget(action.target)) return false;
	if (action.dialogue !== undefined && typeof action.dialogue !== 'string') return false;
	if (action.reasoning !== undefined && typeof action.reasoning !== 'string') return false;
	if (action.nextGoal !== undefined && typeof action.nextGoal !== 'string') return false;
	return true;
};
exports.isValidNPCAction = isValidNPCAction;
