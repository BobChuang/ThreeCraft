import { SimulationVector3 } from '../contracts/simulation-bridge';

export type MonsterType = 'mutant' | 'corrupted-bot';

export type MonsterPhase = 'idle' | 'wander' | 'chase';

export interface MonsterDefinition {
	type: MonsterType;
	label: string;
	maxHp: number;
	damage: number;
	speedMultiplier: number;
}

export interface SimulationMonsterState {
	id: string;
	type: MonsterType;
	label: string;
	position: SimulationVector3;
	hp: number;
	maxHp: number;
	damage: number;
	speedMultiplier: number;
	phase: MonsterPhase;
	targetEntityId: string | null;
	nextAttackAt: number;
	nextWanderAt: number;
	wanderTarget: SimulationVector3 | null;
	spawnedAt: number;
	updatedAt: number;
}

export interface MonsterAttackEvent {
	monsterId: string;
	type: MonsterType;
	targetEntityId: string;
	damage: number;
	distance: number;
	timestamp: number;
}
