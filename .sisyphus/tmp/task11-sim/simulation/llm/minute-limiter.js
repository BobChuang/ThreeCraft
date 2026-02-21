'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.MinuteLimiter = void 0;
const ONE_MINUTE_MS = 60000;
class MinuteLimiter {
	constructor(requestLimit, tokenLimit, now = () => Date.now()) {
		this.requestLimit = requestLimit;
		this.tokenLimit = tokenLimit;
		this.now = now;
		this.entries = [];
	}
	canConsume(requests, tokens) {
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
	record(requests, tokens) {
		this.prune();
		this.entries.push({ timestamp: this.now(), requests, tokens });
	}
	snapshot() {
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
	prune() {
		const cutoff = this.now() - ONE_MINUTE_MS;
		while (this.entries.length > 0 && this.entries[0].timestamp < cutoff) {
			this.entries.shift();
		}
	}
}
exports.MinuteLimiter = MinuteLimiter;
