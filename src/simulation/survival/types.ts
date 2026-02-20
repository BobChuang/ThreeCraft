export interface SimulationSurvivalState {
	hp: number;
	maxHp: number;
	hunger: number;
	maxHunger: number;
}

export interface SurvivalTickResult {
	state: SimulationSurvivalState;
	changed: boolean;
}

export interface SurvivalFoodResult {
	consumed: boolean;
	state: SimulationSurvivalState;
}
