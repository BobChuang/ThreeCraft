'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.ClientSimulationBridge = void 0;
const llm_1 = require('../llm');
class ClientSimulationBridge {
	constructor(controller, options = {}) {
		this.controller = controller;
		this.onEvent = options.onEvent;
		this.llmConfig = options.llmConfig;
		this.llmService =
			options.llmService ??
			new llm_1.GLM5Service({
				runtimeMode: options.llmConfig?.runtimeMode ?? 'client',
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
		const terrain = this.controller.core?.terrain;
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
				const blockType = blockRef ? String(blockRef.typeIdx ?? 'unknown') : null;
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
		const apiKey = this.llmConfig?.apiKey ?? ClientSimulationBridge.readClientApiKey();
		if (!apiKey && (this.llmConfig?.runtimeMode ?? 'client') === 'client') {
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
		if (typeof window === 'undefined') return undefined;
		const storage = window.localStorage;
		const direct = storage.getItem('zhipu_api_key') ?? storage.getItem('ZHIPU_API_KEY') ?? storage.getItem('glm_api_key');
		const key = direct?.trim();
		return key || undefined;
	}
	emitEvent(event) {
		this.onEvent?.(event);
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
