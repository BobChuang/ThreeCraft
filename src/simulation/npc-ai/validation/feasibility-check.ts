import { NPCAction } from '../../../utils/types/npc';
import { SimulationVector3 } from '../../contracts/simulation-bridge';
import { SimulationNPCState } from '../../npc-state';
import { findPath } from '../../pathfinding';
import { NPCObservation } from '../observe';

const positionKey = (position: SimulationVector3): string => `${position.x}:${position.y}:${position.z}`;

const asRounded = (position: SimulationVector3): SimulationVector3 => ({
	x: Math.round(position.x),
	y: Math.round(position.y),
	z: Math.round(position.z),
});

const buildWorldQuery = (observation: NPCObservation) => {
	const map = new Map<string, string | null>();
	observation.worldState.blocks.forEach(block => {
		map.set(positionKey(block.position), block.blockType);
	});
	return (x: number, y: number, z: number): string | null => map.get(positionKey({ x, y, z })) ?? null;
};

const isLegalPosition = (position: SimulationVector3): boolean => {
	if (![position.x, position.y, position.z].every(Number.isFinite)) return false;
	if (Math.abs(position.x) > 4096 || Math.abs(position.z) > 4096) return false;
	if (position.y < -64 || position.y > 512) return false;
	return true;
};

const hasInventoryBlock = (npc: SimulationNPCState, blockType: string): boolean => npc.inventory.some(slot => slot.type === blockType && slot.quantity > 0);

const isReachableTarget = (npc: SimulationNPCState, target: SimulationVector3, observation: NPCObservation): boolean => {
	const start = asRounded(npc.position);
	const goal = asRounded(target);
	if (positionKey(start) === positionKey(goal)) return true;
	const worldQuery = buildWorldQuery(observation);
	const path = findPath(start, goal, worldQuery);
	if (path && path.length > 0) return true;
	const dx = goal.x - start.x;
	const dy = goal.y - start.y;
	const dz = goal.z - start.z;
	const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
	return distance <= observation.worldState.radius;
};

export const validateActionFeasibility = (npc: SimulationNPCState, action: NPCAction, observation: NPCObservation): string | null => {
	if (action.action === 'idle' || action.action === 'dialogue') {
		return null;
	}
	const targetPosition = action.target?.position;
	if (!targetPosition) {
		return 'target position is required';
	}
	if (!isLegalPosition(targetPosition)) {
		return 'illegal target position';
	}
	if (!isReachableTarget(npc, targetPosition, observation)) {
		return 'target is not reachable';
	}
	if (action.action === 'build') {
		const blockType = action.target?.blockType;
		if (!blockType) {
			return 'build action requires target blockType';
		}
		if (!hasInventoryBlock(npc, blockType)) {
			return 'missing block in inventory';
		}
	}
	return null;
};
