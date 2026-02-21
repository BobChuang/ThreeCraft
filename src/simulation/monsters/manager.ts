import { SimulationVector3 } from '../contracts/simulation-bridge';
import { MAX_ACTIVE_MONSTERS, MONSTER_AGGRO_RANGE, MONSTER_ATTACK_COOLDOWN_MS, MONSTER_ATTACK_RANGE, MONSTER_DEFINITIONS, MONSTER_DISENGAGE_RANGE, MONSTER_SPAWN_INTERVAL_MS } from './catalog';
import { MonsterAttackEvent, MonsterDefinition, SimulationMonsterState } from './types';

const BLOCKS_PER_SECOND = 3;
const IDLE_WANDER_INTERVAL_MS = 2_500;
const MONSTER_DESPAWN_RANGE = 42;

const distanceBetween = (a: SimulationVector3, b: SimulationVector3): number => {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const moveToward = (from: SimulationVector3, to: SimulationVector3, maxDistance: number): SimulationVector3 => {
	const dx = to.x - from.x;
	const dy = to.y - from.y;
	const dz = to.z - from.z;
	const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
	if (dist <= 0 || dist <= maxDistance) return { ...to };
	const t = maxDistance / dist;
	return {
		x: from.x + dx * t,
		y: from.y + dy * t,
		z: from.z + dz * t,
	};
};

export interface MonsterManagerContext {
	observers: SimulationVector3[];
	playerPosition: SimulationVector3;
	playerAlive: boolean;
	elapsedMs: number;
}

export interface MonsterManagerOptions {
	now?: () => number;
	onAttack?: (event: MonsterAttackEvent) => void;
	onDropSynthRation?: (monster: SimulationMonsterState) => void;
}

export class SimulationMonsterManager {
	private readonly monsters = new Map<string, SimulationMonsterState>();

	private readonly now: () => number;

	private readonly onAttack?: (event: MonsterAttackEvent) => void;

	private readonly onDropSynthRation?: (monster: SimulationMonsterState) => void;

	private spawnClockMs = 0;

	private spawnCounter = 0;

	private randState = 4242;

	constructor(options: MonsterManagerOptions = {}) {
		this.now = options.now ?? (() => Date.now());
		this.onAttack = options.onAttack;
		this.onDropSynthRation = options.onDropSynthRation;
	}

	getStates(): SimulationMonsterState[] {
		return [...this.monsters.values()].map(monster => ({ ...monster, position: { ...monster.position }, wanderTarget: monster.wanderTarget ? { ...monster.wanderTarget } : null }));
	}

	tick(context: MonsterManagerContext): void {
		const now = this.now();
		this.spawnClockMs += context.elapsedMs;
		if (this.spawnClockMs >= MONSTER_SPAWN_INTERVAL_MS) {
			this.spawnClockMs = 0;
			this.spawnForDistance(context.observers, context.playerPosition, now);
		}
		this.getStates().forEach(state => {
			const monster = this.monsters.get(state.id);
			if (!monster) return;
			this.updateMonster(monster, context, now);
			if (monster.phase !== 'chase' && distanceBetween(monster.position, context.playerPosition) > MONSTER_DESPAWN_RANGE) {
				this.monsters.delete(monster.id);
			}
		});
	}

	damageMonster(monsterId: string, damage: number): boolean {
		const monster = this.monsters.get(monsterId);
		if (!monster || damage <= 0) return false;
		monster.hp = Math.max(0, monster.hp - damage);
		if (monster.hp > 0) return false;
		this.monsters.delete(monsterId);
		if (this.nextRandom() < 0.5) this.onDropSynthRation?.(monster);
		return true;
	}

	private spawnForDistance(observers: SimulationVector3[], playerPosition: SimulationVector3, now: number): void {
		const source = observers.length > 0 ? observers : [playerPosition];
		const avgDistance = source.reduce((sum, obs) => sum + Math.sqrt(obs.x * obs.x + obs.z * obs.z), 0) / source.length;
		const desired = clamp(Math.floor(avgDistance / 20), 0, MAX_ACTIVE_MONSTERS);
		if (desired <= this.monsters.size) return;
		const spawnCount = Math.min(desired - this.monsters.size, MAX_ACTIVE_MONSTERS - this.monsters.size);
		for (let i = 0; i < spawnCount; i += 1) this.spawnSingle(playerPosition, now);
	}

	private spawnSingle(playerPosition: SimulationVector3, now: number): void {
		const def = MONSTER_DEFINITIONS[this.spawnCounter % MONSTER_DEFINITIONS.length] as MonsterDefinition;
		const angle = this.nextRandom() * Math.PI * 2;
		const ring = 16 + this.nextRandom() * 10;
		const id = `monster-${String(this.spawnCounter + 1).padStart(4, '0')}`;
		this.spawnCounter += 1;
		const position = {
			x: Math.round(playerPosition.x + Math.cos(angle) * ring),
			y: 1,
			z: Math.round(playerPosition.z + Math.sin(angle) * ring),
		};
		this.monsters.set(id, {
			id,
			type: def.type,
			label: def.label,
			position,
			hp: def.maxHp,
			maxHp: def.maxHp,
			damage: def.damage,
			speedMultiplier: def.speedMultiplier,
			phase: 'idle',
			targetEntityId: null,
			nextAttackAt: now,
			nextWanderAt: now,
			wanderTarget: null,
			spawnedAt: now,
			updatedAt: now,
		});
	}

	private updateMonster(monster: SimulationMonsterState, context: MonsterManagerContext, now: number): void {
		const playerDistance = distanceBetween(monster.position, context.playerPosition);
		if (playerDistance <= MONSTER_AGGRO_RANGE && context.playerAlive) {
			monster.phase = 'chase';
			monster.targetEntityId = 'player-local';
		}
		if (monster.phase === 'chase' && playerDistance > MONSTER_DISENGAGE_RANGE) {
			monster.phase = 'idle';
			monster.targetEntityId = null;
		}

		const moveStep = (context.elapsedMs / 1000) * BLOCKS_PER_SECOND * monster.speedMultiplier;
		if (monster.phase === 'chase' && monster.targetEntityId === 'player-local') {
			monster.position = moveToward(monster.position, context.playerPosition, moveStep);
			const attackDistance = distanceBetween(monster.position, context.playerPosition);
			if (attackDistance <= MONSTER_ATTACK_RANGE && now >= monster.nextAttackAt && context.playerAlive) {
				monster.nextAttackAt = now + MONSTER_ATTACK_COOLDOWN_MS;
				this.onAttack?.({
					monsterId: monster.id,
					type: monster.type,
					targetEntityId: 'player-local',
					damage: monster.damage,
					distance: attackDistance,
					timestamp: now,
				});
			}
		} else {
			if (!monster.wanderTarget || now >= monster.nextWanderAt || distanceBetween(monster.position, monster.wanderTarget) <= 0.5) {
				const angle = this.nextRandom() * Math.PI * 2;
				const radius = 2 + this.nextRandom() * 4;
				monster.wanderTarget = {
					x: monster.position.x + Math.cos(angle) * radius,
					y: monster.position.y,
					z: monster.position.z + Math.sin(angle) * radius,
				};
				monster.nextWanderAt = now + IDLE_WANDER_INTERVAL_MS;
				monster.phase = 'wander';
			}
			monster.position = moveToward(monster.position, monster.wanderTarget, moveStep * 0.65);
		}
		monster.updatedAt = now;
	}

	private nextRandom(): number {
		this.randState = (this.randState * 1664525 + 1013904223) % 4294967296;
		return this.randState / 4294967296;
	}
}
