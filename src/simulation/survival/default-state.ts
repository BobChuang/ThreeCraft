import { SimulationSurvivalState } from './types';

export const createDefaultSurvivalState = (): SimulationSurvivalState => ({
	hp: 100,
	maxHp: 100,
	hunger: 100,
	maxHunger: 100,
});
