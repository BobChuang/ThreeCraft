import { clampSurvivalState } from './clamp-survival-state';
import { createDefaultSurvivalState } from './default-state';
import { HP_REGEN_HUNGER_THRESHOLD, HP_REGEN_INTERVAL_MS, HUNGER_DECAY_INTERVAL_MS, STARVATION_HP_INTERVAL_MS } from './survival-constants';
import { SimulationSurvivalState, SurvivalFoodResult, SurvivalTickResult } from './types';

const cloneState = (state: SimulationSurvivalState): SimulationSurvivalState => ({ ...state });

const consumeInterval = (elapsedMs: number, intervalMs: number): { ticks: number; remainder: number } => {
	if (elapsedMs <= 0) return { ticks: 0, remainder: 0 };
	const ticks = Math.floor(elapsedMs / intervalMs);
	return { ticks, remainder: elapsedMs - ticks * intervalMs };
};

export class SimulationSurvivalManager {
	private readonly states = new Map<string, SimulationSurvivalState>();

	private readonly hungerElapsed = new Map<string, number>();

	private readonly hpElapsed = new Map<string, number>();

	registerEntity(entityId: string, initialState?: SimulationSurvivalState): SimulationSurvivalState {
		const existing = this.states.get(entityId);
		if (existing) return cloneState(existing);
		const state = clampSurvivalState(initialState ? cloneState(initialState) : createDefaultSurvivalState());
		this.states.set(entityId, state);
		this.hungerElapsed.set(entityId, 0);
		this.hpElapsed.set(entityId, 0);
		return cloneState(state);
	}

	getState(entityId: string): SimulationSurvivalState {
		const state = this.states.get(entityId);
		if (state) return cloneState(state);
		return this.registerEntity(entityId);
	}

	tickEntity(entityId: string, elapsedMs: number): SurvivalTickResult {
		const state = this.states.get(entityId) ?? this.registerEntity(entityId);
		const previous = cloneState(state);

		const hungerTime = (this.hungerElapsed.get(entityId) ?? 0) + Math.max(0, elapsedMs);
		const hungerStep = consumeInterval(hungerTime, HUNGER_DECAY_INTERVAL_MS);
		this.hungerElapsed.set(entityId, hungerStep.remainder);
		if (hungerStep.ticks > 0) {
			state.hunger = Math.max(0, state.hunger - hungerStep.ticks);
		}

		const hpTime = (this.hpElapsed.get(entityId) ?? 0) + Math.max(0, elapsedMs);
		const hpStep = consumeInterval(hpTime, STARVATION_HP_INTERVAL_MS);
		this.hpElapsed.set(entityId, hpStep.remainder);
		if (hpStep.ticks > 0) {
			if (state.hunger <= 0) {
				state.hp = Math.max(0, state.hp - hpStep.ticks);
			} else if (state.hunger > HP_REGEN_HUNGER_THRESHOLD) {
				const regenStep = Math.floor((hpStep.ticks * STARVATION_HP_INTERVAL_MS) / HP_REGEN_INTERVAL_MS);
				state.hp = Math.min(state.maxHp, state.hp + regenStep);
			}
		}

		const next = clampSurvivalState(state);
		this.states.set(entityId, next);
		return {
			state: cloneState(next),
			changed: next.hp !== previous.hp || next.hunger !== previous.hunger,
		};
	}

	consumeFood(entityId: string, hungerRestore: number): SurvivalFoodResult {
		const state = this.states.get(entityId) ?? this.registerEntity(entityId);
		if (hungerRestore <= 0) return { consumed: false, state: cloneState(state) };
		const next = clampSurvivalState({
			...state,
			hunger: state.hunger + hungerRestore,
		});
		this.states.set(entityId, next);
		return { consumed: true, state: cloneState(next) };
	}

	applyDamage(entityId: string, damage: number): SurvivalTickResult {
		const state = this.states.get(entityId) ?? this.registerEntity(entityId);
		const previous = cloneState(state);
		if (damage > 0) state.hp = Math.max(0, state.hp - damage);
		const next = clampSurvivalState(state);
		this.states.set(entityId, next);
		return {
			state: cloneState(next),
			changed: next.hp !== previous.hp || next.hunger !== previous.hunger,
		};
	}
}
