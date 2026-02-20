interface MinuteLimiterEntry {
	timestamp: number;
	requests: number;
	tokens: number;
}

export interface MinuteLimiterSnapshot {
	windowRequests: number;
	windowTokens: number;
	requestLimit: number;
	tokenLimit: number;
}

const ONE_MINUTE_MS = 60_000;

export class MinuteLimiter {
	private readonly requestLimit: number;

	private readonly tokenLimit: number;

	private readonly now: () => number;

	private readonly entries: MinuteLimiterEntry[];

	constructor(requestLimit: number, tokenLimit: number, now: () => number = () => Date.now()) {
		this.requestLimit = requestLimit;
		this.tokenLimit = tokenLimit;
		this.now = now;
		this.entries = [];
	}

	canConsume(requests: number, tokens: number): { ok: boolean; reason?: 'requests' | 'tokens'; snapshot: MinuteLimiterSnapshot } {
		this.prune();
		const snapshot = this.snapshot();
		if (snapshot.windowRequests + requests > this.requestLimit) {
			return { ok: false, reason: 'requests', snapshot };
		}
		if (snapshot.windowTokens + tokens > this.tokenLimit) {
			return { ok: false, reason: 'tokens', snapshot };
		}
		return { ok: true, snapshot };
	}

	record(requests: number, tokens: number): void {
		this.prune();
		this.entries.push({ timestamp: this.now(), requests, tokens });
	}

	snapshot(): MinuteLimiterSnapshot {
		this.prune();
		let windowRequests = 0;
		let windowTokens = 0;
		this.entries.forEach(entry => {
			windowRequests += entry.requests;
			windowTokens += entry.tokens;
		});
		return {
			windowRequests,
			windowTokens,
			requestLimit: this.requestLimit,
			tokenLimit: this.tokenLimit,
		};
	}

	private prune(): void {
		const cutoff = this.now() - ONE_MINUTE_MS;
		while (this.entries.length > 0 && this.entries[0].timestamp < cutoff) {
			this.entries.shift();
		}
	}
}
