import { SimulationVector3 } from '../../contracts/simulation-bridge';
import { findPath } from '../../pathfinding';
import { NPCObservation } from '../observe';
import { NPCBehaviorExecutionContext } from './types';

const toKey = (position: SimulationVector3): string => `${position.x}:${position.y}:${position.z}`;

export const toRoundedPosition = (position: SimulationVector3): SimulationVector3 => ({
	x: Math.round(position.x),
	y: Math.round(position.y),
	z: Math.round(position.z),
});

export const createWorldQuery = (observation: NPCObservation) => {
	const blocks = new Map<string, string | null>();
	observation.worldState.blocks.forEach(block => {
		blocks.set(toKey(block.position), block.blockType);
	});
	return (x: number, y: number, z: number): string | null => blocks.get(toKey({ x, y, z })) ?? null;
};

export const findPathToTarget = (context: NPCBehaviorExecutionContext, target: SimulationVector3): SimulationVector3[] | null => {
	const start = toRoundedPosition(context.npc.position);
	const worldQuery = createWorldQuery(context.observation);
	return findPath(start, target, worldQuery);
};

export const applyPathAsWalking = (context: NPCBehaviorExecutionContext, path: SimulationVector3[] | null): SimulationVector3[] => {
	if (!path || path.length <= 1) {
		return [];
	}
	const walked = path.slice(1);
	walked.forEach((point, stepIndex) => {
		context.npc.position = { ...point };
		context.npc.lastAction = 'move';
		context.onActionState?.('move', { ...context.npc.position }, { stepIndex: stepIndex + 1, pathLength: path.length });
	});
	return walked;
};

export const sleep = async (ms: number): Promise<void> => {
	await new Promise<void>(resolve => {
		setTimeout(resolve, ms);
	});
};
