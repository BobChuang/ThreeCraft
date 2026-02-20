import { ISimulationBridge, SimulationVector3 } from './contracts/simulation-bridge';
import { SimulationEvent, SimulationEventPayloadMap, SimulationEventType, toBridgeEvent } from './events';
import { createInitialNPCRegistry, SimulationNPCState } from './npc-state';
import { SimulationDroppedItem, SimulationInventoryAddResult, SimulationInventoryManager, SimulationInventorySlot } from './inventory';
import { NPCDecisionLoop, ConversationMessage } from './npc-ai';

const calculateDistance = (a: SimulationVector3, b: SimulationVector3): number => {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

export interface SimulationEngineOptions {
	tickIntervalMs?: number;
	decisionIntervalMs?: number;
	observerSleepDistance?: number;
	useStubBrain?: boolean;
	initialObservers?: SimulationVector3[];
}

export class SimulationEngine {
	private readonly bridge: ISimulationBridge;

	private readonly tickIntervalMs: number;

	private readonly observerSleepDistance: number;

	private readonly useStubBrain: boolean;

	private readonly decisionLoop: NPCDecisionLoop;

	private tickHandle: ReturnType<typeof setInterval> | null;

	private observers: SimulationVector3[];

	readonly npcRegistry: Map<string, SimulationNPCState>;

	readonly inventory: SimulationInventoryManager;

	constructor(bridge: ISimulationBridge, options: SimulationEngineOptions = {}) {
		this.bridge = bridge;
		this.tickIntervalMs = options.tickIntervalMs ?? 500;
		this.observerSleepDistance = options.observerSleepDistance ?? 128;
		this.useStubBrain = options.useStubBrain ?? false;
		this.tickHandle = null;
		this.observers = options.initialObservers ?? [];
		this.npcRegistry = createInitialNPCRegistry();
		this.decisionLoop = new NPCDecisionLoop(bridge, {
			useStubBrain: this.useStubBrain,
			decisionIntervalMs: options.decisionIntervalMs ?? 5_000,
			onThinkingState: (npc, state) => {
				npc.thinkingState = state;
				this.emit('thinking:state', { npcId: npc.id, state });
			},
			onLifecycle: (eventType, payload) => {
				this.emit('simulation:lifecycle', {
					status: eventType,
					...payload,
				});
			},
		});
		this.inventory = new SimulationInventoryManager();
		this.inventory.registerEntity('player-local');
		[...this.npcRegistry.values()].forEach(npc => {
			this.inventory.registerEntity(npc.id);
			npc.inventory = this.inventory.getInventory(npc.id);
		});
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
		return [...this.npcRegistry.values()].map(npc => ({
			...npc,
			position: { ...npc.position },
			inventory: npc.inventory.map(slot => ({ ...slot })),
			survival: { ...npc.survival },
		}));
	}

	getInventory(entityId: string): SimulationInventorySlot[] {
		return this.inventory.getInventory(entityId);
	}

	getWorldDrops(): SimulationDroppedItem[] {
		return this.inventory.getWorldDrops();
	}

	getNPCConversationHistory(npcId: string): ConversationMessage[] {
		return this.decisionLoop.getHistory(npcId);
	}

	addInventoryItem(entityId: string, type: string, quantity: number, maxStack?: number): SimulationInventoryAddResult {
		const result = this.inventory.addItem(entityId, type, quantity, maxStack);
		if (entityId.startsWith('npc-')) {
			const npc = this.npcRegistry.get(entityId);
			if (npc) npc.inventory = this.inventory.getInventory(entityId);
		}
		return result;
	}

	dropInventorySlot(entityId: string, slotIndex: number, quantity: number, position: SimulationVector3): SimulationDroppedItem | null {
		const drop = this.inventory.dropFromSlot(entityId, slotIndex, quantity, position);
		if (entityId.startsWith('npc-')) {
			const npc = this.npcRegistry.get(entityId);
			if (npc) npc.inventory = this.inventory.getInventory(entityId);
		}
		if (drop) this.emit('inventory:drop', drop);
		return drop;
	}

	dropAllInventoryOnDeath(entityId: string, position: SimulationVector3): SimulationDroppedItem[] {
		const drops = this.inventory.dropAllForDeath(entityId, position);
		if (entityId.startsWith('npc-')) {
			const npc = this.npcRegistry.get(entityId);
			if (npc) npc.inventory = this.inventory.getInventory(entityId);
		}
		drops.forEach(drop => this.emit('inventory:drop', drop));
		return drops;
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
		await Promise.all(activeNPCs.map(npc => this.processNPCDecision(npc, npcs)));
	}

	private shouldSleepByObserverDistance(position: SimulationVector3): boolean {
		if (this.observers.length === 0) return false;
		return this.observers.every(observer => calculateDistance(position, observer) > this.observerSleepDistance);
	}

	private async processNPCDecision(npc: SimulationNPCState, allNPCs: SimulationNPCState[]) {
		const result = await this.decisionLoop.runDecision(npc, allNPCs);
		if (result.status === 'skipped') {
			this.emit('simulation:lifecycle', {
				status: 'npc:decision-skipped',
				npcId: npc.id,
				reason: result.reason,
			});
			return;
		}
		npc.lastAction = result.action?.action ?? npc.lastAction;
		this.emit('npc:action', {
			npcId: npc.id,
			action: npc.lastAction,
			position: { ...npc.position },
			reasoning: result.action?.reasoning,
			nextGoal: result.action?.nextGoal,
		});
		if (result.action?.action === 'dialogue' && result.action.dialogue) {
			this.emit('npc:dialogue', {
				npcId: npc.id,
				dialogue: result.action.dialogue,
				targetNpcId: result.action.target?.npcId,
			});
		}
		this.emit('survival:update', {
			entityId: npc.id,
			hp: npc.survival.hp,
			hunger: npc.survival.hunger,
		});
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
