import { SimulationVector3 } from '../contracts/simulation-bridge';

export interface EntityDeathState {
	entityId: string;
	diedAt: number;
	position: SimulationVector3;
}
