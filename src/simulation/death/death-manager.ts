import { SimulationVector3 } from '../contracts/simulation-bridge';
import { EntityDeathState } from './types';

const clonePosition = (position: SimulationVector3): SimulationVector3 => ({
	x: position.x,
	y: position.y,
	z: position.z,
});

export class SimulationDeathManager {
	private readonly deadEntities = new Map<string, EntityDeathState>();

	markDead(entityId: string, position: SimulationVector3, now = Date.now()): EntityDeathState {
		const death: EntityDeathState = {
			entityId,
			diedAt: now,
			position: clonePosition(position),
		};
		this.deadEntities.set(entityId, death);
		return death;
	}

	isDead(entityId: string): boolean {
		return this.deadEntities.has(entityId);
	}

	clearDeath(entityId: string): void {
		this.deadEntities.delete(entityId);
	}

	getDeath(entityId: string): EntityDeathState | null {
		const death = this.deadEntities.get(entityId);
		if (!death) return null;
		return {
			entityId: death.entityId,
			diedAt: death.diedAt,
			position: clonePosition(death.position),
		};
	}
}
