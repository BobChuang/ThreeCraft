'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.ClientSimulationBridge = void 0;
const llm_1 = require('../llm');
class ClientSimulationBridge {
	constructor(controller, options = {}) {
		var _a, _b, _c;
		this.controller = controller;
		this.onEvent = options.onEvent;
		this.llmConfig = options.llmConfig;
		this.llmService =
			(_a = options.llmService) !== null && _a !== void 0
				? _a
				: new llm_1.GLM5Service({
						runtimeMode: (_c = (_b = options.llmConfig) === null || _b === void 0 ? void 0 : _b.runtimeMode) !== null && _c !== void 0 ? _c : 'client',
						...options.llmConfig,
						emitLifecycleEvent: event => {
							this.emitEvent({
								type: 'simulation:lifecycle',
								timestamp: event.timestamp,
								payload: {
									eventType: event.type,
									npcId: event.npcId,
									...event.payload,
								},
							});
						},
				  });
	}
	async getWorldState(position, radius) {
		var _a, _b;
		const terrain = (_a = this.controller.core) === null || _a === void 0 ? void 0 : _a.terrain;
		if (!terrain) {
			return {
				center: { ...position },
				radius,
				blocks: [],
				timestamp: Date.now(),
			};
		}
		const blocks = [];
		const steps = Math.max(1, Math.floor(radius / 4));
		for (let x = position.x - radius; x <= position.x + radius; x += steps) {
			for (let z = position.z - radius; z <= position.z + radius; z += steps) {
				const roundedX = Math.round(x);
				const roundedZ = Math.round(z);
				const y = terrain.getFloorHeight(roundedX, roundedZ);
				const blockRef = terrain.hasBlock(roundedX, roundedZ, y);
				const blockType = blockRef ? String((_b = blockRef.typeIdx) !== null && _b !== void 0 ? _b : 'unknown') : null;
				blocks.push({
					position: { x: roundedX, y, z: roundedZ },
					blockType,
				});
			}
		}
		return {
			center: { ...position },
			radius,
			blocks,
			timestamp: Date.now(),
		};
	}
	async callLLM(prompt, options) {
		var _a, _b, _c, _d;
		const apiKey = (_b = (_a = this.llmConfig) === null || _a === void 0 ? void 0 : _a.apiKey) !== null && _b !== void 0 ? _b : ClientSimulationBridge.readClientApiKey();
		if (!apiKey && ((_d = (_c = this.llmConfig) === null || _c === void 0 ? void 0 : _c.runtimeMode) !== null && _d !== void 0 ? _d : 'client') === 'client') {
			this.emitEvent({
				type: 'simulation:lifecycle',
				timestamp: Date.now(),
				payload: {
					status: 'llm-missing-key-fallback',
					npcId: options.npcId,
				},
			});
			return {
				content: '{"action":"idle"}',
				model: 'stub-client-bridge',
				latencyMs: 0,
			};
		}
		const result = await this.llmService.requestJson(prompt, {
			npcId: options.npcId,
			timeoutMs: options.timeoutMs,
		});
		return {
			content: JSON.stringify(result.parsedJson),
			model: result.model,
			latencyMs: result.latencyMs,
		};
	}
	static readClientApiKey() {
		var _a, _b;
		if (typeof window === 'undefined') return undefined;
		const storage = window.localStorage;
		const direct = (_b = (_a = storage.getItem('zhipu_api_key')) !== null && _a !== void 0 ? _a : storage.getItem('ZHIPU_API_KEY')) !== null && _b !== void 0 ? _b : storage.getItem('glm_api_key');
		const key = direct === null || direct === void 0 ? void 0 : direct.trim();
		return key || undefined;
	}
	emitEvent(event) {
		var _a;
		(_a = this.onEvent) === null || _a === void 0 ? void 0 : _a.call(this, event);
	}
	async modifyBlock(position, blockType, action) {
		const blockLog = {
			type: action === 'remove' ? null : blockType,
			posX: Math.round(position.x),
			posY: Math.round(position.y),
			posZ: Math.round(position.z),
		};
		this.controller.gameController.blockController.update([blockLog], true);
	}
}
exports.ClientSimulationBridge = ClientSimulationBridge;
