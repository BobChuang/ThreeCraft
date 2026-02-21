import { ISimulationBridge, SimulationVector3 } from './contracts/simulation-bridge';
import { SimulationEvent, SimulationEventPayloadMap, SimulationEventType, toBridgeEvent } from './events';
import { createInitialNPCRegistry, SimulationNPCState } from './npc-state';
import { getInventoryItemDefinition, SimulationDroppedItem, SimulationInventoryAddResult, SimulationInventoryManager, SimulationInventorySlot } from './inventory';
import { NPCDecisionLoop, ConversationMessage } from './npc-ai';
import { createDefaultSurvivalState, SimulationSurvivalManager, SimulationSurvivalState } from './survival';
import { SimulationMonsterManager, SimulationMonsterState } from './monsters';
import { DROP_PICKUP_RADIUS, NPC_RESPAWN_DELAY_MS, NPC_REVIVAL_SPRING_POSITION, SimulationDeathManager, WORLD_DROP_DESPAWN_MS } from './death';
import type { PersistedNPCState } from './persistence';

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

	readonly survival: SimulationSurvivalManager;

	readonly monsters: SimulationMonsterManager;

	readonly death: SimulationDeathManager;

	private previousTickAt: number | null;

	private readonly pausedNPCDecisionIds: Set<string>;

	private readonly npcRespawnAtById: Map<string, number>;

	constructor(bridge: ISimulationBridge, options: SimulationEngineOptions = {}) {
		this.bridge = bridge;
		this.tickIntervalMs = options.tickIntervalMs ?? 500;
		this.observerSleepDistance = options.observerSleepDistance ?? 128;
		this.useStubBrain = options.useStubBrain ?? false;
		this.tickHandle = null;
		this.previousTickAt = null;
		this.observers = options.initialObservers ?? [];
		this.pausedNPCDecisionIds = new Set();
		this.npcRespawnAtById = new Map();
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
			onActionState: (npc, action, payload) => {
				npc.lastAction = action;
				this.emit('npc:action', {
					npcId: npc.id,
					action,
					position: { ...payload.position },
				});
			},
			addInventoryItem: (npcId, itemType, quantity) => {
				const result = this.inventory.addItem(npcId, itemType, quantity);
				this.refreshNPCInventory(npcId);
				return result;
			},
			consumeInventoryItem: (npcId, itemType, quantity) => {
				const consumed = this.inventory.consumeItem(npcId, itemType, quantity);
				this.refreshNPCInventory(npcId);
				return consumed;
			},
		});
		this.inventory = new SimulationInventoryManager();
		this.survival = new SimulationSurvivalManager();
		this.death = new SimulationDeathManager();
		this.monsters = new SimulationMonsterManager({
			onAttack: attack => {
				const result = this.survival.applyDamage(attack.targetEntityId, attack.damage);
				if (result.changed) {
					this.emit('survival:update', {
						entityId: attack.targetEntityId,
						hp: result.state.hp,
						hunger: result.state.hunger,
					});
				}
				this.emit('monster:attack', attack);
			},
			onDropSynthRation: monster => {
				const drop = this.inventory.createWorldDrop(monster.id, 'synth-ration', 1, monster.position);
				if (drop) this.emit('inventory:drop', drop);
			},
		});
		this.inventory.registerEntity('player-local');
		this.survival.registerEntity('player-local', createDefaultSurvivalState());
		[...this.npcRegistry.values()].forEach(npc => {
			this.inventory.registerEntity(npc.id);
			this.survival.registerEntity(npc.id, npc.survival);
			npc.inventory = this.inventory.getInventory(npc.id);
			npc.survival = this.survival.getState(npc.id);
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
		this.previousTickAt = Date.now();
	}

	stop() {
		if (!this.tickHandle) return;
		clearInterval(this.tickHandle);
		this.tickHandle = null;
		this.previousTickAt = null;
		this.emit('simulation:lifecycle', { status: 'stopped' });
	}

	setObservers(observers: SimulationVector3[]) {
		this.observers = observers;
	}

	getNPCStates(): SimulationNPCState[] {
		const npcStates = [...this.npcRegistry.values()].map(npc => ({
			...npc,
			position: { ...npc.position },
			inventory: npc.inventory.map(slot => ({ ...slot })),
			survival: { ...npc.survival },
		}));
		const monsterAsNPCStates: SimulationNPCState[] = this.monsters.getStates().map(monster => ({
			id: monster.id,
			name: monster.label,
			profession: monster.type,
			position: { ...monster.position },
			inventory: [],
			survival: {
				hp: monster.hp,
				maxHp: monster.maxHp,
				hunger: 0,
				maxHunger: 100,
			},
			thinkingState: 'idle',
			isSleeping: false,
			lastTickAt: monster.updatedAt,
			tickCount: 0,
			lastAction: monster.phase === 'chase' ? 'move' : 'idle',
		}));
		return npcStates.concat(monsterAsNPCStates);
	}

	getMonsterStates(): SimulationMonsterState[] {
		return this.monsters.getStates();
	}

	exportPersistedNPCStates(): PersistedNPCState[] {
		return [...this.npcRegistry.values()].map(npc => ({
			id: npc.id,
			position: { ...npc.position },
			inventory: npc.inventory.map(slot => ({ ...slot })),
			survival: { ...npc.survival },
			thinkingState: npc.thinkingState,
			isSleeping: npc.isSleeping,
			lastTickAt: npc.lastTickAt,
			tickCount: npc.tickCount,
			lastAction: npc.lastAction,
		}));
	}

	applyPersistedState(snapshot: { npcs: PersistedNPCState[]; playerSurvival: SimulationSurvivalState; worldDrops: SimulationDroppedItem[]; monsters: SimulationMonsterState[] }): void {
		this.survival.setState('player-local', snapshot.playerSurvival);
		snapshot.npcs.forEach(item => {
			const npc = this.npcRegistry.get(item.id);
			if (!npc) return;
			npc.position = { ...item.position };
			npc.thinkingState = item.thinkingState;
			npc.isSleeping = item.isSleeping;
			npc.lastTickAt = item.lastTickAt;
			npc.tickCount = item.tickCount;
			npc.lastAction = item.lastAction;
			this.inventory.setInventory(npc.id, item.inventory);
			npc.inventory = this.inventory.getInventory(npc.id);
			npc.survival = this.survival.setState(npc.id, item.survival);
		});
		this.inventory.setWorldDrops(snapshot.worldDrops);
		this.monsters.setStates(snapshot.monsters);
	}

	damageMonster(monsterId: string, damage: number): boolean {
		return this.monsters.damageMonster(monsterId, damage);
	}

	getInventory(entityId: string): SimulationInventorySlot[] {
		return this.inventory.getInventory(entityId);
	}

	getWorldDrops(): SimulationDroppedItem[] {
		return this.inventory.getWorldDrops();
	}

	getSurvivalState(entityId: string) {
		if (entityId.startsWith('npc-')) {
			const npc = this.npcRegistry.get(entityId);
			if (npc) npc.survival = this.survival.getState(entityId);
		}
		return this.survival.getState(entityId);
	}

	getNPCConversationHistory(npcId: string): ConversationMessage[] {
		return this.decisionLoop.getHistory(npcId);
	}

	submitPlayerDialogue(targetNpcId: string, content: string): boolean {
		const npc = this.npcRegistry.get(targetNpcId);
		const normalized = content.trim();
		if (!npc || !normalized) return false;
		this.decisionLoop.queuePlayerDialogue(targetNpcId, normalized);
		this.emit('npc:dialogue', {
			npcId: targetNpcId,
			dialogue: `Player: ${normalized}`,
			targetNpcId,
			sourceNpcId: 'player-local',
			sourceType: 'player',
		});
		return true;
	}

	getNPCPairDialogueHistory(leftNpcId: string, rightNpcId: string) {
		return this.decisionLoop.getPairHistory(leftNpcId, rightNpcId);
	}

	setNPCDecisionPaused(npcId: string, paused: boolean): void {
		if (!this.npcRegistry.has(npcId)) return;
		if (paused) {
			this.pausedNPCDecisionIds.add(npcId);
			const npc = this.npcRegistry.get(npcId);
			if (npc) npc.thinkingState = 'idle';
			return;
		}
		this.pausedNPCDecisionIds.delete(npcId);
	}

	isNPCDecisionPaused(npcId: string): boolean {
		return this.pausedNPCDecisionIds.has(npcId);
	}

	overrideNPCPosition(npcId: string, position: SimulationVector3): void {
		const npc = this.npcRegistry.get(npcId);
		if (!npc) return;
		npc.position = {
			x: position.x,
			y: position.y,
			z: position.z,
		};
	}

	addInventoryItem(entityId: string, type: string, quantity: number, maxStack?: number): SimulationInventoryAddResult {
		const result = this.inventory.addItem(entityId, type, quantity, maxStack);
		this.refreshNPCInventory(entityId);
		return result;
	}

	dropInventorySlot(entityId: string, slotIndex: number, quantity: number, position: SimulationVector3): SimulationDroppedItem | null {
		const drop = this.inventory.dropFromSlot(entityId, slotIndex, quantity, position);
		this.refreshNPCInventory(entityId);
		if (drop) this.emit('inventory:drop', drop);
		return drop;
	}

	dropAllInventoryOnDeath(entityId: string, position: SimulationVector3): SimulationDroppedItem[] {
		const drops = this.inventory.dropAllForDeath(entityId, position);
		this.refreshNPCInventory(entityId);
		drops.forEach(drop => this.emit('inventory:drop', drop));
		return drops;
	}

	isPlayerDead(): boolean {
		return this.death.isDead('player-local');
	}

	respawnPlayer(position: SimulationVector3): boolean {
		if (!this.death.isDead('player-local')) return false;
		this.death.clearDeath('player-local');
		this.inventory.clearInventory('player-local');
		const survival = this.survival.setState('player-local', {
			hp: 100,
			maxHp: 100,
			hunger: 50,
			maxHunger: 100,
		});
		this.emit('survival:update', {
			entityId: 'player-local',
			hp: survival.hp,
			hunger: survival.hunger,
		});
		this.emit('player:respawn', {
			entityId: 'player-local',
			position: { ...position },
			hp: survival.hp,
			hunger: survival.hunger,
		});
		return true;
	}

	consumeFood(entityId: string, itemType: string): boolean {
		const itemDefinition = getInventoryItemDefinition(itemType);
		if (!itemDefinition.hungerRestore || itemDefinition.hungerRestore <= 0) return false;
		const consumed = this.inventory.consumeItem(entityId, itemDefinition.type, 1);
		if (consumed <= 0) return false;
		const foodResult = this.survival.consumeFood(entityId, itemDefinition.hungerRestore);
		if (entityId.startsWith('npc-')) {
			const npc = this.npcRegistry.get(entityId);
			if (npc) {
				npc.inventory = this.inventory.getInventory(entityId);
				npc.survival = foodResult.state;
			}
		}
		this.emit('survival:update', {
			entityId,
			hp: foodResult.state.hp,
			hunger: foodResult.state.hunger,
		});
		return true;
	}

	private async tick() {
		const now = Date.now();
		const elapsedMs = this.previousTickAt === null ? this.tickIntervalMs : now - this.previousTickAt;
		this.previousTickAt = now;

		if (!this.death.isDead('player-local')) {
			const playerSurvival = this.survival.tickEntity('player-local', elapsedMs);
			if (playerSurvival.changed) {
				this.emit('survival:update', {
					entityId: 'player-local',
					hp: playerSurvival.state.hp,
					hunger: playerSurvival.state.hunger,
				});
			}
			if (playerSurvival.state.hp <= 0) this.handlePlayerDeath(now);
		}

		const npcs = [...this.npcRegistry.values()];
		const playerState = this.survival.getState('player-local');
		this.monsters.tick({
			observers: this.observers,
			playerPosition: this.observers[0] ?? { x: 0, y: 1, z: 0 },
			playerAlive: playerState.hp > 0,
			elapsedMs,
		});
		this.monsters.getStates().forEach(monster => {
			this.emit('monster:state', {
				monsterId: monster.id,
				type: monster.type,
				position: { ...monster.position },
				hp: monster.hp,
				phase: monster.phase,
			});
		});
		const activeNPCs: SimulationNPCState[] = [];
		npcs.forEach(npc => {
			if (this.death.isDead(npc.id)) {
				if (now >= (this.npcRespawnAtById.get(npc.id) ?? Number.POSITIVE_INFINITY)) this.respawnNPC(npc, now);
				return;
			}
			const survivalUpdate = this.survival.tickEntity(npc.id, elapsedMs);
			npc.survival = survivalUpdate.state;
			if (survivalUpdate.changed) {
				this.emit('survival:update', {
					entityId: npc.id,
					hp: npc.survival.hp,
					hunger: npc.survival.hunger,
				});
			}
			if (npc.survival.hp <= 0) {
				this.handleNPCDeath(npc, now);
				return;
			}
			npc.lastTickAt = Date.now();
			npc.tickCount += 1;
			const sleeping = this.shouldSleepByObserverDistance(npc.position);
			npc.isSleeping = sleeping;
			this.emit('simulation:npc-tick', { npcId: npc.id, tickCount: npc.tickCount, sleeping });
			if (!sleeping && !this.pausedNPCDecisionIds.has(npc.id)) activeNPCs.push(npc);
		});
		this.inventory.purgeExpiredDrops(WORLD_DROP_DESPAWN_MS, now);
		this.collectNearbyDrops();
		await Promise.all(activeNPCs.map(npc => this.processNPCDecision(npc, npcs)));
	}

	private collectNearbyDrops(): void {
		const drops = this.inventory.getWorldDrops();
		if (drops.length === 0) return;
		const collectors: Array<{ entityId: string; position: SimulationVector3 }> = [];
		if (!this.death.isDead('player-local')) {
			collectors.push({
				entityId: 'player-local',
				position: this.observers[0] ?? { x: 0, y: 1, z: 0 },
			});
		}
		this.npcRegistry.forEach(npc => {
			if (this.death.isDead(npc.id)) return;
			collectors.push({
				entityId: npc.id,
				position: npc.position,
			});
		});
		drops.forEach(drop => {
			const collector = collectors.find(item => calculateDistance(item.position, drop.position) <= DROP_PICKUP_RADIUS);
			if (!collector) return;
			const collected = this.inventory.collectDrop(drop.id, collector.entityId);
			if (!collected) return;
			this.refreshNPCInventory(collector.entityId);
		});
	}

	private handlePlayerDeath(now: number): void {
		if (this.death.isDead('player-local')) return;
		const position = this.observers[0] ?? { x: 0, y: 1, z: 0 };
		this.death.markDead('player-local', position, now);
		this.dropAllInventoryOnDeath('player-local', position);
		this.emit('player:death', {
			entityId: 'player-local',
			position: { ...position },
			diedAt: now,
		});
	}

	private handleNPCDeath(npc: SimulationNPCState, now: number): void {
		if (this.death.isDead(npc.id)) return;
		this.death.markDead(npc.id, npc.position, now);
		this.dropAllInventoryOnDeath(npc.id, npc.position);
		npc.inventory = this.inventory.getInventory(npc.id);
		npc.thinkingState = 'idle';
		npc.isSleeping = true;
		const respawnAt = now + NPC_RESPAWN_DELAY_MS;
		this.npcRespawnAtById.set(npc.id, respawnAt);
		this.decisionLoop.appendSystemHistory(npc.id, `${npc.name} died and will respawn at Revival Spring.`);
		this.emit('npc:death', {
			entityId: npc.id,
			position: { ...npc.position },
			diedAt: now,
			respawnAt,
		});
	}

	private respawnNPC(npc: SimulationNPCState, now: number): void {
		this.death.clearDeath(npc.id);
		this.npcRespawnAtById.delete(npc.id);
		npc.position = { ...NPC_REVIVAL_SPRING_POSITION };
		this.inventory.clearInventory(npc.id);
		npc.inventory = this.inventory.getInventory(npc.id);
		npc.survival = this.survival.setState(npc.id, createDefaultSurvivalState());
		npc.thinkingState = 'idle';
		npc.isSleeping = false;
		npc.lastTickAt = now;
		this.emit('survival:update', {
			entityId: npc.id,
			hp: npc.survival.hp,
			hunger: npc.survival.hunger,
		});
		this.emit('npc:respawn', {
			entityId: npc.id,
			position: { ...npc.position },
			hp: npc.survival.hp,
			hunger: npc.survival.hunger,
		});
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
			const targetNpcId = result.action.target?.npcId;
			if (targetNpcId && this.npcRegistry.has(targetNpcId) && targetNpcId !== npc.id) {
				this.decisionLoop.recordDialogueDelivery(npc.id, targetNpcId, result.action.dialogue);
			}
			this.emit('npc:dialogue', {
				npcId: npc.id,
				dialogue: result.action.dialogue,
				targetNpcId,
				sourceNpcId: npc.id,
				sourceType: 'npc',
			});
		}
	}

	private refreshNPCInventory(entityId: string): void {
		if (!entityId.startsWith('npc-')) return;
		const npc = this.npcRegistry.get(entityId);
		if (!npc) return;
		npc.inventory = this.inventory.getInventory(entityId);
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
