export const NPC_ACTIONS = ['move', 'gather', 'build', 'dialogue', 'idle'] as const;

export type NPCActionType = (typeof NPC_ACTIONS)[number];

export interface NPCActionTarget {
	position?: { x: number; y: number; z: number };
	blockType?: string;
	npcId?: string;
}

export interface NPCAction {
	action: NPCActionType;
	target?: NPCActionTarget;
	dialogue?: string;
	reasoning?: string;
	nextGoal?: string;
}

const NPC_ACTION_SET = new Set<string>(NPC_ACTIONS);

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const isValidPosition = (value: unknown): value is { x: number; y: number; z: number } => {
	if (!value || typeof value !== 'object') return false;
	const pos = value as { x?: unknown; y?: unknown; z?: unknown };
	return isFiniteNumber(pos.x) && isFiniteNumber(pos.y) && isFiniteNumber(pos.z);
};

const isValidTarget = (value: unknown): value is NPCActionTarget => {
	if (!value || typeof value !== 'object') return false;
	const target = value as { position?: unknown; blockType?: unknown; npcId?: unknown };
	if (target.position !== undefined && !isValidPosition(target.position)) return false;
	if (target.blockType !== undefined && typeof target.blockType !== 'string') return false;
	if (target.npcId !== undefined && typeof target.npcId !== 'string') return false;
	return true;
};

export const isValidNPCAction = (value: unknown): value is NPCAction => {
	if (!value || typeof value !== 'object') return false;
	const action = value as {
		action?: unknown;
		target?: unknown;
		dialogue?: unknown;
		reasoning?: unknown;
		nextGoal?: unknown;
	};
	if (typeof action.action !== 'string' || !NPC_ACTION_SET.has(action.action)) return false;
	if (action.target !== undefined && !isValidTarget(action.target)) return false;
	if (action.dialogue !== undefined && typeof action.dialogue !== 'string') return false;
	if (action.reasoning !== undefined && typeof action.reasoning !== 'string') return false;
	if (action.nextGoal !== undefined && typeof action.nextGoal !== 'string') return false;
	return true;
};
