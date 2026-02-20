import { SimulationSurvivalState } from './types';

const clamp = (value: number, min: number, max: number): number => {
	if (value < min) return min;
	if (value > max) return max;
	return value;
};

export const clampSurvivalState = (state: SimulationSurvivalState): SimulationSurvivalState => ({
	...state,
	hp: clamp(state.hp, 0, state.maxHp),
	hunger: clamp(state.hunger, 0, state.maxHunger),
});
