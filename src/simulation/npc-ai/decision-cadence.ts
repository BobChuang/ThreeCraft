const hashNpcId = (npcId: string): number => {
	let hash = 0;
	for (let i = 0; i < npcId.length; i += 1) {
		hash = (hash * 131 + npcId.charCodeAt(i)) % 2147483647;
	}
	return hash;
};

const getNpcJitterMs = (npcId: string, decisionIntervalMs: number): number => {
	const jitterWindowMs = Math.max(1, Math.floor(decisionIntervalMs * 0.2));
	return hashNpcId(npcId) % jitterWindowMs;
};

export const getInitialDecisionAt = (nowMs: number, decisionIntervalMs: number, npcId: string): number => {
	return nowMs + getNpcJitterMs(npcId, decisionIntervalMs);
};

export const getRecurringDecisionAt = (nowMs: number, decisionIntervalMs: number, npcId: string): number => {
	return nowMs + decisionIntervalMs + getNpcJitterMs(npcId, decisionIntervalMs);
};
