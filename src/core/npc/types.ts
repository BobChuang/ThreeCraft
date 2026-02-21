import type { SimulationThinkingState } from '../../simulation';

export type NPCAnimationState = 'idle' | 'walking' | 'mining' | 'building' | 'speaking';

export type NPCRenderEntityType = 'npc' | 'monster';

export type MonsterRenderType = 'mutant' | 'corrupted-bot';

export interface NPCPersonaProfile {
	id: string;
	name: string;
	profession: string;
	skinIdx: number;
}

export interface NPCRenderSnapshot {
	id: string;
	entityType: NPCRenderEntityType;
	name: string;
	profession: string;
	position: { x: number; y: number; z: number };
	rotation?: { y: number };
	animationState: NPCAnimationState;
	thinkingState: SimulationThinkingState;
	monsterType?: MonsterRenderType;
}
