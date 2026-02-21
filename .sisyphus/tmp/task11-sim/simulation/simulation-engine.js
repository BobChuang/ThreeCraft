'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.SimulationEngine = void 0;
const events_1 = require('./events');
const npc_state_1 = require('./npc-state');
const inventory_1 = require('./inventory');
const npc_ai_1 = require('./npc-ai');
const survival_1 = require('./survival');
const calculateDistance = (a, b) => {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
};
class SimulationEngine {
	constructor(bridge, options = {}) {
		this.bridge = bridge;
		this.tickIntervalMs = options.tickIntervalMs ?? 500;
		this.observerSleepDistance = options.observerSleepDistance ?? 128;
		this.useStubBrain = options.useStubBrain ?? false;
		this.tickHandle = null;
		this.previousTickAt = null;
		this.observers = options.initialObservers ?? [];
		this.pausedNPCDecisionIds = new Set();
		this.npcRegistry = (0, npc_state_1.createInitialNPCRegistry)();
		this.decisionLoop = new npc_ai_1.NPCDecisionLoop(bridge, {
			useStubBrain: this.useStubBrain,
			decisionIntervalMs: options.decisionIntervalMs ?? 5000,
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
		this.inventory = new inventory_1.SimulationInventoryManager();
		this.survival = new survival_1.SimulationSurvivalManager();
		this.inventory.registerEntity('player-local');
		this.survival.registerEntity('player-local', (0, survival_1.createDefaultSurvivalState)());
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
	setObservers(observers) {
		this.observers = observers;
	}
	getNPCStates() {
		return [...this.npcRegistry.values()].map(npc => ({
			...npc,
			position: { ...npc.position },
			inventory: npc.inventory.map(slot => ({ ...slot })),
			survival: { ...npc.survival },
		}));
	}
	getInventory(entityId) {
		return this.inventory.getInventory(entityId);
	}
	getWorldDrops() {
		return this.inventory.getWorldDrops();
	}
	getSurvivalState(entityId) {
		if (entityId.startsWith('npc-')) {
			const npc = this.npcRegistry.get(entityId);
			if (npc) npc.survival = this.survival.getState(entityId);
		}
		return this.survival.getState(entityId);
	}
	getNPCConversationHistory(npcId) {
		return this.decisionLoop.getHistory(npcId);
	}
	setNPCDecisionPaused(npcId, paused) {
		if (!this.npcRegistry.has(npcId)) return;
		if (paused) {
			this.pausedNPCDecisionIds.add(npcId);
			const npc = this.npcRegistry.get(npcId);
			if (npc) npc.thinkingState = 'idle';
			return;
		}
		this.pausedNPCDecisionIds.delete(npcId);
	}
	isNPCDecisionPaused(npcId) {
		return this.pausedNPCDecisionIds.has(npcId);
	}
	overrideNPCPosition(npcId, position) {
		const npc = this.npcRegistry.get(npcId);
		if (!npc) return;
		npc.position = {
			x: position.x,
			y: position.y,
			z: position.z,
		};
	}
	addInventoryItem(entityId, type, quantity, maxStack) {
		const result = this.inventory.addItem(entityId, type, quantity, maxStack);
		this.refreshNPCInventory(entityId);
		return result;
	}
	dropInventorySlot(entityId, slotIndex, quantity, position) {
		const drop = this.inventory.dropFromSlot(entityId, slotIndex, quantity, position);
		this.refreshNPCInventory(entityId);
		if (drop) this.emit('inventory:drop', drop);
		return drop;
	}
	dropAllInventoryOnDeath(entityId, position) {
		const drops = this.inventory.dropAllForDeath(entityId, position);
		this.refreshNPCInventory(entityId);
		drops.forEach(drop => this.emit('inventory:drop', drop));
		return drops;
	}
	consumeFood(entityId, itemType) {
		const itemDefinition = (0, inventory_1.getInventoryItemDefinition)(itemType);
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
	async tick() {
		const now = Date.now();
		const elapsedMs = this.previousTickAt === null ? this.tickIntervalMs : now - this.previousTickAt;
		this.previousTickAt = now;
		const playerSurvival = this.survival.tickEntity('player-local', elapsedMs);
		if (playerSurvival.changed) {
			this.emit('survival:update', {
				entityId: 'player-local',
				hp: playerSurvival.state.hp,
				hunger: playerSurvival.state.hunger,
			});
		}
		const npcs = [...this.npcRegistry.values()];
		const activeNPCs = [];
		npcs.forEach(npc => {
			const survivalUpdate = this.survival.tickEntity(npc.id, elapsedMs);
			npc.survival = survivalUpdate.state;
			if (survivalUpdate.changed) {
				this.emit('survival:update', {
					entityId: npc.id,
					hp: npc.survival.hp,
					hunger: npc.survival.hunger,
				});
			}
			npc.lastTickAt = Date.now();
			npc.tickCount += 1;
			const sleeping = this.shouldSleepByObserverDistance(npc.position);
			npc.isSleeping = sleeping;
			this.emit('simulation:npc-tick', { npcId: npc.id, tickCount: npc.tickCount, sleeping });
			if (!sleeping && !this.pausedNPCDecisionIds.has(npc.id)) activeNPCs.push(npc);
		});
		await Promise.all(activeNPCs.map(npc => this.processNPCDecision(npc, npcs)));
	}
	shouldSleepByObserverDistance(position) {
		if (this.observers.length === 0) return false;
		return this.observers.every(observer => calculateDistance(position, observer) > this.observerSleepDistance);
	}
	async processNPCDecision(npc, allNPCs) {
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
	}
	refreshNPCInventory(entityId) {
		if (!entityId.startsWith('npc-')) return;
		const npc = this.npcRegistry.get(entityId);
		if (!npc) return;
		npc.inventory = this.inventory.getInventory(entityId);
	}
	emit(type, payload) {
		const event = {
			type,
			timestamp: Date.now(),
			payload,
		};
		this.bridge.emitEvent((0, events_1.toBridgeEvent)(event));
	}
}
exports.SimulationEngine = SimulationEngine;
