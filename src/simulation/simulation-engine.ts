import { ISimulationBridge, SimulationVector3 } from './contracts/simulation-bridge';
import { SimulationEvent, SimulationEventPayloadMap, SimulationEventType, toBridgeEvent } from './events';
import { createInitialNPCRegistry, SimulationNPCState } from './npc-state';
import { getStubBrainDecision } from './stub-brain';

const calculateDistance = (a: SimulationVector3, b: SimulationVector3): number => {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

const extractActionFromLLMContent = (content: string): string => {
	const lowered = content.toLowerCase();
	if (lowered.includes('move')) return 'move';
	if (lowered.includes('build')) return 'build';
	if (lowered.includes('gather')) return 'gather';
	if (lowered.includes('dialogue')) return 'dialogue';
	return 'idle';
};

export interface SimulationEngineOptions {
	tickIntervalMs?: number;
	observerSleepDistance?: number;
	useStubBrain?: boolean;
	initialObservers?: SimulationVector3[];
}

export class SimulationEngine {
	private readonly bridge: ISimulationBridge;

	private readonly tickIntervalMs: number;

	private readonly observerSleepDistance: number;

	private readonly useStubBrain: boolean;

	private tickHandle: ReturnType<typeof setInterval> | null;

	private observers: SimulationVector3[];

	readonly npcRegistry: Map<string, SimulationNPCState>;

	constructor(bridge: ISimulationBridge, options: SimulationEngineOptions = {}) {
		this.bridge = bridge;
		this.tickIntervalMs = options.tickIntervalMs ?? 500;
		this.observerSleepDistance = options.observerSleepDistance ?? 128;
		this.useStubBrain = options.useStubBrain ?? true;
		this.tickHandle = null;
		this.observers = options.initialObservers ?? [];
		this.npcRegistry = createInitialNPCRegistry();
	}

	start() {
		if (this.tickHandle) return;
		this.emit('simulation:lifecycle', {
			status: 'started',
			npcCount: this.npcRegistry.size,
			tickIntervalMs: this.tickIntervalMs,
		});
		this.tickHandle = setInterval(() => {
			this.tick().catch(error => {
				this.emit('simulation:lifecycle', {
					status: 'tick-error',
					error: error instanceof Error ? error.message : String(error),
				});
			});
		}, this.tickIntervalMs);
	}

	stop() {
		if (!this.tickHandle) return;
		clearInterval(this.tickHandle);
		this.tickHandle = null;
		this.emit('simulation:lifecycle', { status: 'stopped' });
	}

	setObservers(observers: SimulationVector3[]) {
		this.observers = observers;
	}

	getNPCStates(): SimulationNPCState[] {
		return [...this.npcRegistry.values()].map(npc => ({ ...npc, position: { ...npc.position }, inventory: [...npc.inventory], survival: { ...npc.survival } }));
	}

	private async tick() {
		const npcs = [...this.npcRegistry.values()];
		const activeNPCs: SimulationNPCState[] = [];
		npcs.forEach(npc => {
			npc.lastTickAt = Date.now();
			npc.tickCount += 1;
			const sleeping = this.shouldSleepByObserverDistance(npc.position);
			npc.isSleeping = sleeping;
			this.emit('simulation:npc-tick', { npcId: npc.id, tickCount: npc.tickCount, sleeping });
			if (!sleeping) activeNPCs.push(npc);
		});
		await Promise.all(activeNPCs.map(npc => this.processNPCDecision(npc)));
	}

	private shouldSleepByObserverDistance(position: SimulationVector3): boolean {
		if (this.observers.length === 0) return false;
		return this.observers.every(observer => calculateDistance(position, observer) > this.observerSleepDistance);
	}

	private async processNPCDecision(npc: SimulationNPCState) {
		this.setThinkingState(npc, 'requesting');
		await this.bridge.getWorldState(npc.position, 16);
		let decisionAction = 'idle';
		if (this.useStubBrain) {
			const decision = getStubBrainDecision(npc);
			decisionAction = decision.action;
			if (decision.delta) {
				npc.position = {
					x: npc.position.x + decision.delta.x,
					y: npc.position.y + decision.delta.y,
					z: npc.position.z + decision.delta.z,
				};
			}
		} else {
			const llmResult = await this.bridge.callLLM(`NPC ${npc.name} choose next action in JSON.`, { npcId: npc.id, timeoutMs: this.tickIntervalMs });
			decisionAction = extractActionFromLLMContent(llmResult.content);
		}
		this.setThinkingState(npc, 'executing');
		npc.lastAction = decisionAction;
		this.emit('npc:action', {
			npcId: npc.id,
			action: decisionAction,
			position: { ...npc.position },
		});
		this.emit('survival:update', {
			entityId: npc.id,
			hp: npc.survival.hp,
			hunger: npc.survival.hunger,
		});
		this.setThinkingState(npc, 'idle');
	}

	private setThinkingState(npc: SimulationNPCState, state: SimulationNPCState['thinkingState']) {
		npc.thinkingState = state;
		this.emit('thinking:state', { npcId: npc.id, state });
	}

	private emit<T extends SimulationEventType>(type: T, payload: SimulationEventPayloadMap[T]) {
		const event: SimulationEvent<T> = {
			type,
			timestamp: Date.now(),
			payload,
		};
		this.bridge.emitEvent(toBridgeEvent(event));
	}
}
