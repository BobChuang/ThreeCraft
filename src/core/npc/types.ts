import type { SimulationThinkingState } from '../../simulation';

export type NPCAnimationState = 'idle' | 'walking' | 'mining' | 'building' | 'speaking';

export interface NPCPersonaProfile {
	id: string;
	name: string;
	profession: string;
	skinIdx: number;
}

export interface NPCRenderSnapshot {
	id: string;
	name: string;
	profession: string;
	position: { x: number; y: number; z: number };
	rotation?: { y: number };
	animationState: NPCAnimationState;
	thinkingState: SimulationThinkingState;
}
