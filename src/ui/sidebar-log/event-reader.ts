export const readEventString = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value : null);

export const readEventNumber = (value: unknown): number | undefined => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);

export const readRequestMetrics = (payload: Record<string, unknown>): { tokensUsed?: number; latencyMs?: number } => ({
	tokensUsed: readEventNumber(payload.completionTokens) ?? readEventNumber(payload.tokensUsed),
	latencyMs: readEventNumber(payload.latencyMs) ?? readEventNumber(payload.responseTimeMs),
});

export const parseReasoningFromRaw = (raw: string): string | undefined => {
	const fenced = raw.match(/```(?:json)?\s*([\s\S]+?)\s*```/i)?.[1] ?? raw;
	try {
		const parsed = JSON.parse(fenced);
		if (parsed && typeof parsed.reasoning === 'string' && parsed.reasoning.trim()) return parsed.reasoning.trim();
	} catch {
		return undefined;
	}
	return undefined;
};
