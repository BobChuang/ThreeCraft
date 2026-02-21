'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.GLM5Service = void 0;
const api_key_resolver_1 = require('./api-key-resolver');
const circuit_breaker_1 = require('./circuit-breaker');
const json_extract_1 = require('./json-extract');
const lifecycle_events_1 = require('./lifecycle-events');
const minute_limiter_1 = require('./minute-limiter');
const sse_parser_1 = require('./sse-parser');
const token_estimator_1 = require('./token-estimator');
const types_1 = require('./types');
const DEFAULT_ENDPOINT = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const DEFAULT_MODEL = 'glm-4.5';
const DEFAULT_REQUEST_LIMIT = 30;
const DEFAULT_TOKEN_LIMIT = 50000;
const DEFAULT_PER_NPC_IN_FLIGHT = 1;
const DEFAULT_FAILURE_THRESHOLD = 3;
const DEFAULT_COOLDOWN_MS = 30000;
const DEFAULT_TIMEOUT_MS = 10000;
const RETRY_JSON_SUFFIX = ' 仅用有效 JSON 回复';
class GLM5Service {
	constructor(config = {}) {
		this.now = config.now ?? (() => Date.now());
		this.config = {
			...config,
			runtimeMode: config.runtimeMode ?? 'client',
			model: config.model ?? DEFAULT_MODEL,
			endpoint: config.endpoint ?? DEFAULT_ENDPOINT,
			apiKeyFromEnv: config.apiKeyFromEnv ?? 'ZHIPU_API_KEY',
		};
		this.limiter = new minute_limiter_1.MinuteLimiter(config.requestPerMinuteLimit ?? DEFAULT_REQUEST_LIMIT, config.tokenPerMinuteLimit ?? DEFAULT_TOKEN_LIMIT, this.now);
		this.breaker = new circuit_breaker_1.PerNPCCircuitBreaker(config.circuitBreakerFailureThreshold ?? DEFAULT_FAILURE_THRESHOLD, config.circuitBreakerCooldownMs ?? DEFAULT_COOLDOWN_MS, this.now);
		this.inFlightByNpc = new Map();
	}
	async requestJson(prompt, options) {
		const { npcId } = options;
		this.assertConcurrency(npcId);
		this.beginRequest(npcId);
		try {
			return await this.requestWithRetry(prompt, options, false);
		} finally {
			this.endRequest(npcId);
		}
	}
	async requestWithRetry(prompt, options, retrying) {
		const response = await this.requestOnce(prompt, options);
		const parsed = (0, json_extract_1.extractJsonFromLLMText)(response.content);
		if (parsed) {
			return {
				...response,
				parsedJson: parsed.value,
				retriedForJson: retrying,
			};
		}
		if (retrying) {
			throw new types_1.LLMServiceError('PARSE_JSON_FAILED', 'Failed to parse valid JSON after retry.', { npcId: options.npcId });
		}
		return this.requestWithRetry(`${prompt}${RETRY_JSON_SUFFIX}`, options, true);
	}
	async requestOnce(prompt, options) {
		const apiKey = (0, api_key_resolver_1.resolveApiKey)(this.config);
		if (!apiKey) throw new types_1.LLMServiceError('MISSING_API_KEY', 'Missing GLM API key.', { runtimeMode: this.config.runtimeMode });
		const breakerState = this.breaker.canRequest(options.npcId);
		if (!breakerState.ok) throw new types_1.LLMServiceError('CIRCUIT_OPEN', 'Circuit breaker open for NPC.', { npcId: options.npcId, openUntil: breakerState.openUntil });
		const promptTokens = (0, token_estimator_1.estimateTokens)(prompt);
		const limit = this.limiter.canConsume(1, promptTokens);
		if (!limit.ok) {
			throw new types_1.LLMServiceError(limit.reason === 'requests' ? 'RATE_LIMIT_REQUESTS' : 'RATE_LIMIT_TOKENS', 'Minute budget exceeded.', { npcId: options.npcId, limiter: limit.snapshot });
		}
		this.emit('thinking-start', options.npcId, { promptLength: prompt.length, promptTokens });
		this.limiter.record(1, promptTokens);
		const startedAt = this.now();
		try {
			const stream = await this.fetchSSE(prompt, apiKey, options);
			const content = stream.content.trim();
			if (!content) throw new types_1.LLMServiceError('EMPTY_RESPONSE', 'GLM returned empty content.', { npcId: options.npcId });
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
				code: error instanceof types_1.LLMServiceError ? error.code : 'UNKNOWN',
				failures: breakerRecord.failures,
				openUntil: breakerRecord.openUntil,
			});
			throw error;
		}
	}
	async fetchSSE(prompt, apiKey, options) {
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
			if (!response.ok) throw new types_1.LLMServiceError('HTTP_ERROR', `GLM HTTP ${response.status}.`, { status: response.status, npcId: options.npcId });
			if (!response.body) throw new types_1.LLMServiceError('NETWORK_ERROR', 'SSE body unavailable.', { npcId: options.npcId });
			return this.readSSEBody(response.body, options);
		} catch (error) {
			if (error instanceof types_1.LLMServiceError) throw error;
			if (error instanceof DOMException && error.name === 'AbortError') {
				throw new types_1.LLMServiceError('TIMEOUT', 'GLM request timed out.', { npcId: options.npcId, timeoutMs });
			}
			throw new types_1.LLMServiceError('NETWORK_ERROR', 'GLM request failed.', { npcId: options.npcId, cause: error instanceof Error ? error.message : String(error) });
		} finally {
			clearTimeout(timeout);
		}
	}
	async readSSEBody(stream, options) {
		const decoder = new TextDecoder();
		const reader = stream.getReader();
		let buffer = '';
		let complete = '';
		let chunkIndex = 0;
		let tokensFromUsage = 0;
		const processEvents = rawEvents => {
			rawEvents.forEach(event => {
				if (!(0, sse_parser_1.isSSEDone)(event.data)) {
					const payload = (0, sse_parser_1.tryParseJson)(event.data);
					if (payload) {
						const choices = payload.choices;
						const firstChoice = choices?.[0];
						const deltaObj = firstChoice?.delta;
						const delta = typeof deltaObj?.content === 'string' ? deltaObj.content : '';
						if (delta) {
							complete += delta;
							const streamChunk = { text: delta, chunkIndex, raw: event.data };
							options.onStreamChunk?.(streamChunk);
							this.emit('thinking-stream', options.npcId, { chunk: delta, chunkIndex });
							chunkIndex += 1;
						}
						const usage = payload.usage;
						const totalTokens = Number(usage?.total_tokens ?? usage?.completion_tokens ?? 0);
						if (Number.isFinite(totalTokens) && totalTokens > 0) {
							tokensFromUsage = Math.max(tokensFromUsage, totalTokens);
						}
					}
				}
			});
		};
		const consume = async () => {
			const readResult = await reader.read();
			if (readResult.done) return;
			buffer += decoder.decode(readResult.value, { stream: true });
			const parsed = (0, sse_parser_1.parseSSEChunk)(buffer);
			buffer = parsed.rest;
			processEvents(parsed.events);
			await consume();
		};
		await consume();
		const estimated = (0, token_estimator_1.estimateTokens)(complete);
		return { content: complete, tokensUsed: tokensFromUsage || estimated };
	}
	assertConcurrency(npcId) {
		const maxInFlight = this.config.perNpcMaxInFlight ?? DEFAULT_PER_NPC_IN_FLIGHT;
		if ((this.inFlightByNpc.get(npcId) ?? 0) >= maxInFlight) {
			throw new types_1.LLMServiceError('NPC_CONCURRENCY_LIMIT', 'Per-NPC concurrency limit reached.', { npcId, maxInFlight });
		}
	}
	beginRequest(npcId) {
		this.inFlightByNpc.set(npcId, (this.inFlightByNpc.get(npcId) ?? 0) + 1);
	}
	endRequest(npcId) {
		const next = (this.inFlightByNpc.get(npcId) ?? 1) - 1;
		if (next <= 0) this.inFlightByNpc.delete(npcId);
		else this.inFlightByNpc.set(npcId, next);
	}
	emit(type, npcId, payload) {
		this.config.emitLifecycleEvent?.((0, lifecycle_events_1.createLifecycleEvent)({ type, npcId, payload, now: this.now }));
	}
}
exports.GLM5Service = GLM5Service;
