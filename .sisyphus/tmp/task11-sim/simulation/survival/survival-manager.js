'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.SimulationSurvivalManager = void 0;
const clamp_survival_state_1 = require('./clamp-survival-state');
const default_state_1 = require('./default-state');
const survival_constants_1 = require('./survival-constants');
const cloneState = state => ({ ...state });
const consumeInterval = (elapsedMs, intervalMs) => {
	if (elapsedMs <= 0) return { ticks: 0, remainder: 0 };
	const ticks = Math.floor(elapsedMs / intervalMs);
	return { ticks, remainder: elapsedMs - ticks * intervalMs };
};
class SimulationSurvivalManager {
	constructor() {
		this.states = new Map();
		this.hungerElapsed = new Map();
		this.hpElapsed = new Map();
	}
	registerEntity(entityId, initialState) {
		const existing = this.states.get(entityId);
		if (existing) return cloneState(existing);
		const state = (0, clamp_survival_state_1.clampSurvivalState)(initialState ? cloneState(initialState) : (0, default_state_1.createDefaultSurvivalState)());
		this.states.set(entityId, state);
		this.hungerElapsed.set(entityId, 0);
		this.hpElapsed.set(entityId, 0);
		return cloneState(state);
	}
	getState(entityId) {
		const state = this.states.get(entityId);
		if (state) return cloneState(state);
		return this.registerEntity(entityId);
	}
	tickEntity(entityId, elapsedMs) {
		const state = this.states.get(entityId) ?? this.registerEntity(entityId);
		const previous = cloneState(state);
		const hungerTime = (this.hungerElapsed.get(entityId) ?? 0) + Math.max(0, elapsedMs);
		const hungerStep = consumeInterval(hungerTime, survival_constants_1.HUNGER_DECAY_INTERVAL_MS);
		this.hungerElapsed.set(entityId, hungerStep.remainder);
		if (hungerStep.ticks > 0) {
			state.hunger = Math.max(0, state.hunger - hungerStep.ticks);
		}
		const hpTime = (this.hpElapsed.get(entityId) ?? 0) + Math.max(0, elapsedMs);
		const hpStep = consumeInterval(hpTime, survival_constants_1.STARVATION_HP_INTERVAL_MS);
		this.hpElapsed.set(entityId, hpStep.remainder);
		if (hpStep.ticks > 0) {
			if (state.hunger <= 0) {
				state.hp = Math.max(0, state.hp - hpStep.ticks);
			} else if (state.hunger > survival_constants_1.HP_REGEN_HUNGER_THRESHOLD) {
				const regenStep = Math.floor((hpStep.ticks * survival_constants_1.STARVATION_HP_INTERVAL_MS) / survival_constants_1.HP_REGEN_INTERVAL_MS);
				state.hp = Math.min(state.maxHp, state.hp + regenStep);
			}
		}
		const next = (0, clamp_survival_state_1.clampSurvivalState)(state);
		this.states.set(entityId, next);
		return {
			state: cloneState(next),
			changed: next.hp !== previous.hp || next.hunger !== previous.hunger,
		};
	}
	consumeFood(entityId, hungerRestore) {
		const state = this.states.get(entityId) ?? this.registerEntity(entityId);
		if (hungerRestore <= 0) return { consumed: false, state: cloneState(state) };
		const next = (0, clamp_survival_state_1.clampSurvivalState)({
			...state,
			hunger: state.hunger + hungerRestore,
		});
		this.states.set(entityId, next);
		return { consumed: true, state: cloneState(next) };
	}
}
exports.SimulationSurvivalManager = SimulationSurvivalManager;
