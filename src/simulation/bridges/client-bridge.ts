import type { BlockLog } from '../../utils/types/block';
import {
	ISimulationBridge,
	SimulationBlockAction,
	SimulationBridgeEvent,
	SimulationLLMOptions,
	SimulationLLMResult,
	SimulationVector3,
	SimulationWorldBlock,
	SimulationWorldState,
} from '../contracts/simulation-bridge';

export interface ClientSimulationBridgeOptions {
	onEvent?: (event: SimulationBridgeEvent) => void;
}

interface ClientBridgeTerrain {
	getFloorHeight(x: number, z: number): number;
	hasBlock(x: number, z: number, y: number): { typeIdx?: number } | undefined;
}

interface ClientBridgeController {
	core: { terrain: ClientBridgeTerrain } | null;
	gameController: {
		blockController: {
			update(blocks: BlockLog[], ignoreMultiPlay?: boolean): void;
		};
	};
}

export class ClientSimulationBridge implements ISimulationBridge {
	private readonly controller: ClientBridgeController;

	private readonly onEvent?: (event: SimulationBridgeEvent) => void;

	constructor(controller: ClientBridgeController, options: ClientSimulationBridgeOptions = {}) {
		this.controller = controller;
		this.onEvent = options.onEvent;
	}

	async getWorldState(position: SimulationVector3, radius: number): Promise<SimulationWorldState> {
		const terrain = this.controller.core?.terrain;
		if (!terrain) {
			return {
				center: { ...position },
				radius,
				blocks: [],
				timestamp: Date.now(),
			};
		}
		const blocks: SimulationWorldBlock[] = [];
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

	async callLLM(prompt: string, options: SimulationLLMOptions): Promise<SimulationLLMResult> {
		this.emitEvent({
			type: 'simulation:lifecycle',
			timestamp: Date.now(),
			payload: {
				status: 'llm-stub',
				npcId: options.npcId,
				promptLength: prompt.length,
			},
		});
		return {
			content: '{"action":"idle"}',
			model: 'stub-client-bridge',
			latencyMs: 0,
		};
	}

	emitEvent(event: SimulationBridgeEvent): void {
		this.onEvent?.(event);
	}

	async modifyBlock(position: SimulationVector3, blockType: string, action: SimulationBlockAction): Promise<void> {
		const blockLog: BlockLog = {
			type: action === 'remove' ? null : blockType,
			posX: Math.round(position.x),
			posY: Math.round(position.y),
			posZ: Math.round(position.z),
		};
		this.controller.gameController.blockController.update([blockLog], true);
	}
}
