import { NPCAction } from '../../utils/types/npc';
import { ISimulationBridge, SimulationVector3 } from '../contracts/simulation-bridge';
import { findPath } from '../pathfinding';
import { SimulationNPCState } from '../npc-state';
import { NPCObservation } from './observe';

export interface NPCActionExecutionResult {
	action: NPCAction['action'];
	applied: boolean;
	position: SimulationVector3;
	details: Record<string, unknown>;
}

const toKey = (position: SimulationVector3): string => `${position.x}:${position.y}:${position.z}`;

const toRoundedPosition = (position: SimulationVector3): SimulationVector3 => ({
	x: Math.round(position.x),
	y: Math.round(position.y),
	z: Math.round(position.z),
});

const createWorldQuery = (observation: NPCObservation) => {
	const blocks = new Map<string, string | null>();
	observation.worldState.blocks.forEach(block => {
		blocks.set(toKey(block.position), block.blockType);
	});
	return (x: number, y: number, z: number): string | null => blocks.get(toKey({ x, y, z })) ?? null;
};

const stepToward = (from: SimulationVector3, to: SimulationVector3): SimulationVector3 => {
	const dx = Math.sign(to.x - from.x);
	const dy = Math.sign(to.y - from.y);
	const dz = Math.sign(to.z - from.z);
	return {
		x: from.x + dx,
		y: from.y + dy,
		z: from.z + dz,
	};
};

export const executeNPCAction = async (bridge: ISimulationBridge, npc: SimulationNPCState, action: NPCAction, observation: NPCObservation): Promise<NPCActionExecutionResult> => {
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
		const target = toRoundedPosition(action.target?.position ?? npc.position);
		const start = toRoundedPosition(npc.position);
		const worldQuery = createWorldQuery(observation);
		const path = findPath(start, target, worldQuery);
		const next = path?.[1] ?? stepToward(start, target);
		npc.position = { ...next };
		return {
			action: 'move',
			applied: true,
			position: { ...npc.position },
			details: { pathLength: path?.length ?? 0, target },
		};
	}

	if (action.action === 'build') {
		const target = toRoundedPosition(action.target?.position ?? npc.position);
		const blockType = action.target?.blockType ?? '1';
		await bridge.modifyBlock(target, blockType, 'place');
		return {
			action: 'build',
			applied: true,
			position: { ...npc.position },
			details: { target, blockType },
		};
	}

	const target = toRoundedPosition(action.target?.position ?? npc.position);
	await bridge.modifyBlock(target, '0', 'remove');
	return {
		action: 'gather',
		applied: true,
		position: { ...npc.position },
		details: { target },
	};
};
