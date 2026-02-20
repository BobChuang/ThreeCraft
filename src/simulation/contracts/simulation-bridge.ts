export interface SimulationVector3 {
	x: number;
	y: number;
	z: number;
}

export interface SimulationWorldBlock {
	position: SimulationVector3;
	blockType: string | null;
}

export interface SimulationWorldState {
	center: SimulationVector3;
	radius: number;
	blocks: SimulationWorldBlock[];
	timestamp: number;
}

export interface SimulationLLMOptions {
	npcId: string;
	timeoutMs?: number;
}

export interface SimulationLLMResult {
	content: string;
	latencyMs?: number;
	model?: string;
}

export type SimulationBlockAction = 'place' | 'remove';

export interface SimulationBridgeEvent {
	type: string;
	timestamp: number;
	payload: Record<string, unknown>;
}

export interface ISimulationBridge {
	getWorldState(position: SimulationVector3, radius: number): Promise<SimulationWorldState>;
	callLLM(prompt: string, options: SimulationLLMOptions): Promise<SimulationLLMResult>;
	emitEvent(event: SimulationBridgeEvent): void;
	modifyBlock(position: SimulationVector3, blockType: string, action: SimulationBlockAction): Promise<void>;
}
