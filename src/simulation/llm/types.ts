export type LLMRuntimeMode = 'client' | 'server';

export type ThinkingLifecycleEventType = 'thinking-start' | 'thinking-stream' | 'thinking-complete' | 'thinking-error';

export interface ThinkingLifecycleEvent {
	type: ThinkingLifecycleEventType;
	npcId: string;
	timestamp: number;
	payload: Record<string, unknown>;
}

export interface LLMStreamChunk {
	text: string;
	chunkIndex: number;
	raw: string;
}

export interface LLMRequestOptions {
	npcId: string;
	timeoutMs?: number;
	signal?: AbortSignal;
	onStreamChunk?: (chunk: LLMStreamChunk) => void;
}

export interface LLMServiceResult {
	content: string;
	latencyMs: number;
	model: string;
	tokensUsed: number;
	parsedJson: unknown;
	rawContent: string;
	retriedForJson: boolean;
}

export interface LLMServiceConfig {
	apiKey?: string;
	apiKeyFromEnv?: string;
	runtimeMode?: LLMRuntimeMode;
	model?: string;
	endpoint?: string;
	requestPerMinuteLimit?: number;
	tokenPerMinuteLimit?: number;
	perNpcMaxInFlight?: number;
	circuitBreakerFailureThreshold?: number;
	circuitBreakerCooldownMs?: number;
	emitLifecycleEvent?: (event: ThinkingLifecycleEvent) => void;
	fetchImpl?: typeof fetch;
	now?: () => number;
}

export class LLMServiceError extends Error {
	readonly code:
		| 'MISSING_API_KEY'
		| 'NPC_CONCURRENCY_LIMIT'
		| 'RATE_LIMIT_REQUESTS'
		| 'RATE_LIMIT_TOKENS'
		| 'CIRCUIT_OPEN'
		| 'HTTP_ERROR'
		| 'NETWORK_ERROR'
		| 'TIMEOUT'
		| 'EMPTY_RESPONSE'
		| 'PARSE_JSON_FAILED';

	readonly details: Record<string, unknown>;

	constructor(code: LLMServiceError['code'], message: string, details: Record<string, unknown> = {}) {
		super(message);
		this.code = code;
		this.details = details;
	}
}
