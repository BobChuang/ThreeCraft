'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.PerNPCCircuitBreaker = void 0;
class PerNPCCircuitBreaker {
	constructor(failureThreshold, cooldownMs, now = () => Date.now()) {
		this.failureThreshold = failureThreshold;
		this.cooldownMs = cooldownMs;
		this.now = now;
		this.states = new Map();
	}
	canRequest(npcId) {
		const state = this.getState(npcId);
		if (state.openUntil > this.now()) {
			return { ok: false, openUntil: state.openUntil };
		}
		if (state.openUntil > 0 && state.openUntil <= this.now()) {
			state.openUntil = 0;
			state.consecutiveFailures = 0;
		}
		return { ok: true };
	}
	recordSuccess(npcId) {
		const state = this.getState(npcId);
		state.consecutiveFailures = 0;
		state.openUntil = 0;
	}
	recordFailure(npcId) {
		const state = this.getState(npcId);
		state.consecutiveFailures += 1;
		if (state.consecutiveFailures >= this.failureThreshold) {
			state.openUntil = this.now() + this.cooldownMs;
			return {
				opened: true,
				openUntil: state.openUntil,
				failures: state.consecutiveFailures,
			};
		}
		return {
			opened: false,
			failures: state.consecutiveFailures,
		};
	}
	getState(npcId) {
		const existing = this.states.get(npcId);
		if (existing) return existing;
		const created = { consecutiveFailures: 0, openUntil: 0 };
		this.states.set(npcId, created);
		return created;
	}
}
exports.PerNPCCircuitBreaker = PerNPCCircuitBreaker;
