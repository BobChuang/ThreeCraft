'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.NPCDecisionLoop = void 0;
const personas_1 = require('../personas');
const stub_brain_1 = require('../stub-brain');
const conversation_history_1 = require('./conversation-history');
const execute_action_1 = require('./execute-action');
const observe_1 = require('./observe');
const prompt_builder_1 = require('./prompt-builder');
const validation_1 = require('./validation');
const DEFAULT_DECISION_INTERVAL_MS = 5000;
const DEFAULT_OBSERVATION_RADIUS = 16;
const toStubAction = (decision, npc) => ({
	action: decision.action,
	dialogue: decision.dialogue,
	reasoning: decision.reasoning,
	nextGoal: decision.nextGoal,
	target: decision.delta
		? {
				position: {
					x: npc.position.x + decision.delta.x,
					y: npc.position.y + decision.delta.y,
					z: npc.position.z + decision.delta.z,
				},
		  }
		: undefined,
});
const resolvePersona = npc => {
	const persona = personas_1.npcPersonas.find(item => item.name === npc.name);
	if (persona) return persona;
	return {
		name: npc.name,
		profession: npc.profession,
		backstory: `${npc.name} survives by adapting to nearby world conditions.`,
		systemPrompt: `You are ${npc.name}. Stay grounded in observed state and output one valid JSON action.`,
		traits: ['adaptive'],
		defaultGoals: ['Keep stable position in current sector'],
		preferredActions: ['idle'],
	};
};
class NPCDecisionLoop {
	constructor(bridge, options = {}) {
		var _a, _b, _c, _d;
		this.bridge = bridge;
		this.decisionIntervalMs = (_a = options.decisionIntervalMs) !== null && _a !== void 0 ? _a : DEFAULT_DECISION_INTERVAL_MS;
		this.observationRadius = (_b = options.observationRadius) !== null && _b !== void 0 ? _b : DEFAULT_OBSERVATION_RADIUS;
		this.useStubBrain = (_c = options.useStubBrain) !== null && _c !== void 0 ? _c : false;
		this.now = (_d = options.now) !== null && _d !== void 0 ? _d : () => Date.now();
		this.onLifecycle = options.onLifecycle;
		this.onThinkingState = options.onThinkingState;
		this.onActionState = options.onActionState;
		this.addInventoryItem = options.addInventoryItem;
		this.consumeInventoryItem = options.consumeInventoryItem;
		this.history = new conversation_history_1.NPCConversationHistory();
		this.inFlightByNpc = new Set();
		this.nextDecisionAt = new Map();
		this.correctiveContextByNpc = new Map();
		this.actionTickByNpc = new Map();
		this.pendingPlayerDialogueByNpc = new Map();
	}
	getHistory(npcId) {
		return this.history.get(npcId);
	}
	queuePlayerDialogue(targetNpcId, content) {
		var _a;
		const queue = (_a = this.pendingPlayerDialogueByNpc.get(targetNpcId)) !== null && _a !== void 0 ? _a : [];
		const entry = {
			role: 'user',
			content,
			timestamp: this.now(),
		};
		const nextQueue = [...queue, entry].slice(-10);
		this.pendingPlayerDialogueByNpc.set(targetNpcId, nextQueue);
		this.history.appendPairDialogue({
			speakerId: 'player-local',
			listenerId: targetNpcId,
			content,
			timestamp: entry.timestamp,
		});
		this.nextDecisionAt.set(targetNpcId, this.now());
	}
	recordDialogueDelivery(speakerId, listenerId, content) {
		this.history.appendPairDialogue({
			speakerId,
			listenerId,
			content,
			timestamp: this.now(),
		});
	}
	getPairHistory(leftNpcId, rightNpcId) {
		return this.history.getPairDialogue(leftNpcId, rightNpcId);
	}
	async runDecision(npc, allNPCs) {
		var _a, _b, _c, _d;
		if (this.inFlightByNpc.has(npc.id)) return { status: 'skipped', reason: 'in-flight' };
		if (((_a = this.nextDecisionAt.get(npc.id)) !== null && _a !== void 0 ? _a : 0) > this.now()) return { status: 'skipped', reason: 'cadence' };
		if (this.actionTickByNpc.get(npc.id) === npc.tickCount) return { status: 'skipped', reason: 'one-action-per-tick' };
		this.inFlightByNpc.add(npc.id);
		try {
			this.transitionThinking(npc, 'requesting');
			this.emitLifecycle('npc:decision-observe', { npcId: npc.id });
			const observation = await (0, observe_1.observeNPCContext)(this.bridge, npc, allNPCs, this.observationRadius);
			this.emitLifecycle('npc:decision-prompt', { npcId: npc.id });
			const persona = resolvePersona(npc);
			const correctiveContext = this.correctiveContextByNpc.get(npc.id);
			const pendingPlayerMessages = (_b = this.pendingPlayerDialogueByNpc.get(npc.id)) !== null && _b !== void 0 ? _b : [];
			const prompt = (0, prompt_builder_1.buildNPCPrompt)(persona, npc, observation, this.history.get(npc.id), this.history.getDialogueContextForNpc(npc.id), pendingPlayerMessages, correctiveContext);
			this.correctiveContextByNpc.delete(npc.id);
			this.pendingPlayerDialogueByNpc.set(npc.id, []);
			this.history.append(npc.id, { role: 'user', content: prompt, timestamp: this.now() });
			this.emitLifecycle('npc:decision-call', { npcId: npc.id, useStubBrain: this.useStubBrain });
			const latestPlayerMessage = (_d = (_c = pendingPlayerMessages[pendingPlayerMessages.length - 1]) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d.trim();
			const rawContent = this.useStubBrain
				? JSON.stringify(
						latestPlayerMessage
							? {
									action: 'dialogue',
									target: { npcId: 'player-local' },
									dialogue: `Copy that. I heard: ${latestPlayerMessage.slice(0, 80)}`,
									reasoning: 'Responding to nearby player message.',
									nextGoal: 'Resume patrol after confirmation.',
							  }
							: toStubAction((0, stub_brain_1.getStubBrainDecision)(npc), npc)
				  )
				: (await this.bridge.callLLM(prompt, { npcId: npc.id, timeoutMs: this.decisionIntervalMs })).content;
			this.history.append(npc.id, { role: 'assistant', content: rawContent, timestamp: this.now() });
			const validation = (0, validation_1.validateNPCAction)({
				npc,
				observation,
				rawContent,
			});
			if (!validation.valid) {
				const failure = validation;
				this.correctiveContextByNpc.set(npc.id, failure.correctiveContext);
				this.emitLifecycle('npc:decision-warning', {
					npcId: npc.id,
					reason: failure.reason,
					warning: failure.warning,
				});
				this.transitionThinking(npc, 'executing');
				const fallbackAction = {
					action: 'idle',
					reasoning: `Fallback idle: ${failure.reason}`,
					nextGoal: 'Retry with corrective context',
				};
				const fallbackExecution = await (0, execute_action_1.executeNPCAction)(this.bridge, npc, fallbackAction, observation, {
					onActionState: (action, position, details) => {
						var _a;
						(_a = this.onActionState) === null || _a === void 0 ? void 0 : _a.call(this, npc, action, { position, details });
					},
					addInventoryItem: this.addInventoryItem,
					consumeInventoryItem: this.consumeInventoryItem,
				});
				this.emitLifecycle('npc:decision-execute', { npcId: npc.id, action: 'idle', applied: true, fallback: true });
				this.actionTickByNpc.set(npc.id, npc.tickCount);
				this.nextDecisionAt.set(npc.id, this.now());
				this.transitionThinking(npc, 'idle');
				return { status: 'executed', action: fallbackAction, execution: fallbackExecution };
			}
			const decidedAction = validation.action;
			this.transitionThinking(npc, 'received');
			this.emitLifecycle('npc:decision-validate', { npcId: npc.id, action: decidedAction.action });
			this.transitionThinking(npc, 'executing');
			const execution = await (0, execute_action_1.executeNPCAction)(this.bridge, npc, decidedAction, observation, {
				onActionState: (action, position, details) => {
					var _a;
					(_a = this.onActionState) === null || _a === void 0 ? void 0 : _a.call(this, npc, action, { position, details });
				},
				addInventoryItem: this.addInventoryItem,
				consumeInventoryItem: this.consumeInventoryItem,
			});
			this.emitLifecycle('npc:decision-execute', { npcId: npc.id, action: decidedAction.action, applied: execution.applied });
			this.actionTickByNpc.set(npc.id, npc.tickCount);
			this.nextDecisionAt.set(npc.id, this.now() + this.decisionIntervalMs);
			this.transitionThinking(npc, 'idle');
			return { status: 'executed', action: decidedAction, execution };
		} catch (error) {
			this.emitLifecycle('npc:decision-error', {
				npcId: npc.id,
				error: error instanceof Error ? error.message : String(error),
			});
			this.nextDecisionAt.set(npc.id, this.now() + this.decisionIntervalMs);
			this.transitionThinking(npc, 'idle');
			return { status: 'skipped', reason: 'error' };
		} finally {
			this.inFlightByNpc.delete(npc.id);
		}
	}
	emitLifecycle(eventType, payload) {
		var _a;
		(_a = this.onLifecycle) === null || _a === void 0 ? void 0 : _a.call(this, eventType, payload);
	}
	transitionThinking(npc, state) {
		var _a;
		npc.thinkingState = state;
		(_a = this.onThinkingState) === null || _a === void 0 ? void 0 : _a.call(this, npc, state);
	}
}
exports.NPCDecisionLoop = NPCDecisionLoop;
