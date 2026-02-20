import { resolveApiKey } from './api-key-resolver';
import { PerNPCCircuitBreaker } from './circuit-breaker';
import { extractJsonFromLLMText } from './json-extract';
import { createLifecycleEvent } from './lifecycle-events';
import { MinuteLimiter } from './minute-limiter';
import { isSSEDone, parseSSEChunk, tryParseJson } from './sse-parser';
import { estimateTokens } from './token-estimator';
import { LLMRequestOptions, LLMServiceConfig, LLMServiceError, LLMServiceResult } from './types';

const DEFAULT_ENDPOINT = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const DEFAULT_MODEL = 'glm-4.5';
const DEFAULT_REQUEST_LIMIT = 30;
const DEFAULT_TOKEN_LIMIT = 50_000;
const DEFAULT_PER_NPC_IN_FLIGHT = 1;
const DEFAULT_FAILURE_THRESHOLD = 3;
const DEFAULT_COOLDOWN_MS = 30_000;
const DEFAULT_TIMEOUT_MS = 10_000;
const RETRY_JSON_SUFFIX = ' 仅用有效 JSON 回复';

export class GLM5Service {
	private readonly config: Omit<LLMServiceConfig, 'runtimeMode' | 'model' | 'endpoint' | 'apiKeyFromEnv' | 'now'> & {
		runtimeMode: 'client' | 'server';
		model: string;
		endpoint: string;
		apiKeyFromEnv: string;
	};

	private readonly now: () => number;

	private readonly limiter: MinuteLimiter;

	private readonly breaker: PerNPCCircuitBreaker;

	private readonly inFlightByNpc: Map<string, number>;

	constructor(config: LLMServiceConfig = {}) {
		this.now = config.now ?? (() => Date.now());
		this.config = {
			...config,
			runtimeMode: config.runtimeMode ?? 'client',
			model: config.model ?? DEFAULT_MODEL,
			endpoint: config.endpoint ?? DEFAULT_ENDPOINT,
			apiKeyFromEnv: config.apiKeyFromEnv ?? 'ZHIPU_API_KEY',
		};
		this.limiter = new MinuteLimiter(config.requestPerMinuteLimit ?? DEFAULT_REQUEST_LIMIT, config.tokenPerMinuteLimit ?? DEFAULT_TOKEN_LIMIT, this.now);
		this.breaker = new PerNPCCircuitBreaker(config.circuitBreakerFailureThreshold ?? DEFAULT_FAILURE_THRESHOLD, config.circuitBreakerCooldownMs ?? DEFAULT_COOLDOWN_MS, this.now);
		this.inFlightByNpc = new Map<string, number>();
	}

	async requestJson(prompt: string, options: LLMRequestOptions): Promise<LLMServiceResult> {
		const { npcId } = options;
		this.assertConcurrency(npcId);
		this.beginRequest(npcId);
		try {
			return await this.requestWithRetry(prompt, options, false);
		} finally {
			this.endRequest(npcId);
		}
	}

	private async requestWithRetry(prompt: string, options: LLMRequestOptions, retrying: boolean): Promise<LLMServiceResult> {
		const response = await this.requestOnce(prompt, options);
		const parsed = extractJsonFromLLMText(response.content);
		if (parsed) {
			return {
				...response,
				parsedJson: parsed.value,
				retriedForJson: retrying,
			};
		}
		if (retrying) {
			throw new LLMServiceError('PARSE_JSON_FAILED', 'Failed to parse valid JSON after retry.', { npcId: options.npcId });
		}
		return this.requestWithRetry(`${prompt}${RETRY_JSON_SUFFIX}`, options, true);
	}

	private async requestOnce(prompt: string, options: LLMRequestOptions): Promise<Omit<LLMServiceResult, 'parsedJson' | 'retriedForJson'>> {
		const apiKey = resolveApiKey(this.config);
		if (!apiKey) throw new LLMServiceError('MISSING_API_KEY', 'Missing GLM API key.', { runtimeMode: this.config.runtimeMode });
		const breakerState = this.breaker.canRequest(options.npcId);
		if (!breakerState.ok) throw new LLMServiceError('CIRCUIT_OPEN', 'Circuit breaker open for NPC.', { npcId: options.npcId, openUntil: breakerState.openUntil });
		const promptTokens = estimateTokens(prompt);
		const limit = this.limiter.canConsume(1, promptTokens);
		if (!limit.ok) {
			throw new LLMServiceError(limit.reason === 'requests' ? 'RATE_LIMIT_REQUESTS' : 'RATE_LIMIT_TOKENS', 'Minute budget exceeded.', { npcId: options.npcId, limiter: limit.snapshot });
		}

		this.emit('thinking-start', options.npcId, { promptLength: prompt.length, promptTokens });
		this.limiter.record(1, promptTokens);
		const startedAt = this.now();
		try {
			const stream = await this.fetchSSE(prompt, apiKey, options);
			const content = stream.content.trim();
			if (!content) throw new LLMServiceError('EMPTY_RESPONSE', 'GLM returned empty content.', { npcId: options.npcId });
			const latencyMs = this.now() - startedAt;
			const completionTokens = stream.tokensUsed;
			if (completionTokens > 0) this.limiter.record(0, completionTokens);
			this.breaker.recordSuccess(options.npcId);
			this.emit('thinking-complete', options.npcId, { latencyMs, model: this.config.model, completionTokens });
			return { content, rawContent: stream.content, model: this.config.model, latencyMs, tokensUsed: promptTokens + completionTokens };
		} catch (error) {
			const breakerRecord = this.breaker.recordFailure(options.npcId);
			this.emit('thinking-error', options.npcId, {
				message: error instanceof Error ? error.message : String(error),
				code: error instanceof LLMServiceError ? error.code : 'UNKNOWN',
				failures: breakerRecord.failures,
				openUntil: breakerRecord.openUntil,
			});
			throw error;
		}
	}

	private async fetchSSE(prompt: string, apiKey: string, options: LLMRequestOptions): Promise<{ content: string; tokensUsed: number }> {
		const fetchImpl = this.config.fetchImpl ?? fetch;
		const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
		const timeoutController = new AbortController();
		const timeout = setTimeout(() => timeoutController.abort(), timeoutMs);
		const signal = options.signal ?? timeoutController.signal;
		try {
			const response = await fetchImpl(this.config.endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					model: this.config.model,
					stream: true,
					messages: [{ role: 'user', content: prompt }],
				}),
				signal,
			});
			if (!response.ok) throw new LLMServiceError('HTTP_ERROR', `GLM HTTP ${response.status}.`, { status: response.status, npcId: options.npcId });
			if (!response.body) throw new LLMServiceError('NETWORK_ERROR', 'SSE body unavailable.', { npcId: options.npcId });
			return this.readSSEBody(response.body, options);
		} catch (error) {
			if (error instanceof LLMServiceError) throw error;
			if (error instanceof DOMException && error.name === 'AbortError') {
				throw new LLMServiceError('TIMEOUT', 'GLM request timed out.', { npcId: options.npcId, timeoutMs });
			}
			throw new LLMServiceError('NETWORK_ERROR', 'GLM request failed.', { npcId: options.npcId, cause: error instanceof Error ? error.message : String(error) });
		} finally {
			clearTimeout(timeout);
		}
	}

	private async readSSEBody(stream: ReadableStream<Uint8Array>, options: LLMRequestOptions): Promise<{ content: string; tokensUsed: number }> {
		const decoder = new TextDecoder();
		const reader = stream.getReader();
		let buffer = '';
		let complete = '';
		let chunkIndex = 0;
		let tokensFromUsage = 0;

		const processEvents = (rawEvents: Array<{ data: string }>): void => {
			rawEvents.forEach(event => {
				if (!isSSEDone(event.data)) {
					const payload = tryParseJson(event.data);
					if (payload) {
						const choices = payload.choices as Array<Record<string, unknown>> | undefined;
						const firstChoice = choices?.[0];
						const deltaObj = firstChoice?.delta as Record<string, unknown> | undefined;
						const delta = typeof deltaObj?.content === 'string' ? deltaObj.content : '';
						if (delta) {
							complete += delta;
							const streamChunk = { text: delta, chunkIndex, raw: event.data };
							options.onStreamChunk?.(streamChunk);
							this.emit('thinking-stream', options.npcId, { chunk: delta, chunkIndex });
							chunkIndex += 1;
						}
						const usage = payload.usage as Record<string, unknown> | undefined;
						const totalTokens = Number(usage?.total_tokens ?? usage?.completion_tokens ?? 0);
						if (Number.isFinite(totalTokens) && totalTokens > 0) {
							tokensFromUsage = Math.max(tokensFromUsage, totalTokens);
						}
					}
				}
			});
		};

		const consume = async (): Promise<void> => {
			const readResult = await reader.read();
			if (readResult.done) return;
			buffer += decoder.decode(readResult.value, { stream: true });
			const parsed = parseSSEChunk(buffer);
			buffer = parsed.rest;
			processEvents(parsed.events);
			await consume();
		};

		await consume();
		const estimated = estimateTokens(complete);
		return { content: complete, tokensUsed: tokensFromUsage || estimated };
	}

	private assertConcurrency(npcId: string): void {
		const maxInFlight = this.config.perNpcMaxInFlight ?? DEFAULT_PER_NPC_IN_FLIGHT;
		if ((this.inFlightByNpc.get(npcId) ?? 0) >= maxInFlight) {
			throw new LLMServiceError('NPC_CONCURRENCY_LIMIT', 'Per-NPC concurrency limit reached.', { npcId, maxInFlight });
		}
	}

	private beginRequest(npcId: string): void {
		this.inFlightByNpc.set(npcId, (this.inFlightByNpc.get(npcId) ?? 0) + 1);
	}

	private endRequest(npcId: string): void {
		const next = (this.inFlightByNpc.get(npcId) ?? 1) - 1;
		if (next <= 0) this.inFlightByNpc.delete(npcId);
		else this.inFlightByNpc.set(npcId, next);
	}

	private emit(type: 'thinking-start' | 'thinking-stream' | 'thinking-complete' | 'thinking-error', npcId: string, payload: Record<string, unknown>): void {
		this.config.emitLifecycleEvent?.(createLifecycleEvent({ type, npcId, payload, now: this.now }));
	}
}
