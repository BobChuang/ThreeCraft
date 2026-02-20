export const NPC_RUNTIME_TYPES = ['idle', 'walker', 'merchant', 'hacker', 'drone'] as const;

export type NPCRuntimeType = (typeof NPC_RUNTIME_TYPES)[number];

export const NPC_ACTIONS = ['idle', 'patrol', 'interact', 'trade', 'hack', 'scan'] as const;

export type NPCAction = (typeof NPC_ACTIONS)[number];

const NPC_ACTION_SET = new Set<string>(NPC_ACTIONS);

export interface NPCActionEvent {
	npcId: string;
	runtimeType: NPCRuntimeType;
	action: NPCAction;
	timestamp: number;
	payload?: Record<string, unknown>;
}

export const isValidNPCAction = (action: unknown): action is NPCAction => typeof action === 'string' && NPC_ACTION_SET.has(action);
