interface NPCBreakerState {
	consecutiveFailures: number;
	openUntil: number;
}

export class PerNPCCircuitBreaker {
	private readonly failureThreshold: number;

	private readonly cooldownMs: number;

	private readonly now: () => number;

	private readonly states: Map<string, NPCBreakerState>;

	constructor(failureThreshold: number, cooldownMs: number, now: () => number = () => Date.now()) {
		this.failureThreshold = failureThreshold;
		this.cooldownMs = cooldownMs;
		this.now = now;
		this.states = new Map<string, NPCBreakerState>();
	}

	canRequest(npcId: string): { ok: boolean; openUntil?: number } {
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

	recordSuccess(npcId: string): void {
		const state = this.getState(npcId);
		state.consecutiveFailures = 0;
		state.openUntil = 0;
	}

	recordFailure(npcId: string): { opened: boolean; openUntil?: number; failures: number } {
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

	private getState(npcId: string): NPCBreakerState {
		const existing = this.states.get(npcId);
		if (existing) return existing;
		const created: NPCBreakerState = { consecutiveFailures: 0, openUntil: 0 };
		this.states.set(npcId, created);
		return created;
	}
}
