import * as THREE from 'three';

export type NPCAnimationState = 'idle' | 'walking' | 'mining' | 'building' | 'speaking';

export interface NPCPersonaProfile {
	name: string;
	profession: string;
	skinIdx: number;
	spawnOffset: THREE.Vector3;
	defaultAnimation: NPCAnimationState;
}
