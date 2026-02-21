'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.getStubBrainDecision = void 0;
const deterministicActionCycle = [
	{
		action: 'idle',
		reasoning: 'Conserving energy while scanning nearby blocks.',
		nextGoal: 'Maintain situational awareness.',
	},
	{
		action: 'move',
		reasoning: 'Repositioning to keep patrol path active.',
		nextGoal: 'Reach the next local waypoint.',
		delta: { x: 1, y: 0, z: 0 },
	},
	{
		action: 'dialogue',
		reasoning: 'Broadcasting status to nearby allies.',
		nextGoal: 'Share world updates with observers.',
		dialogue: 'Status check complete. Sector stable.',
	},
	{
		action: 'move',
		reasoning: 'Returning to base lane for deterministic route loop.',
		nextGoal: 'Continue patrol loop.',
		delta: { x: 0, y: 0, z: 1 },
	},
];
const getStubBrainDecision = npc => {
	const cycleIndex = npc.tickCount % deterministicActionCycle.length;
	return deterministicActionCycle[cycleIndex];
};
exports.getStubBrainDecision = getStubBrainDecision;
