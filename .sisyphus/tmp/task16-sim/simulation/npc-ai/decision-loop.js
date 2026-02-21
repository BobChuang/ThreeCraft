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
		this.bridge = bridge;
		this.decisionIntervalMs = options.decisionIntervalMs ?? DEFAULT_DECISION_INTERVAL_MS;
		this.observationRadius = options.observationRadius ?? DEFAULT_OBSERVATION_RADIUS;
		this.useStubBrain = options.useStubBrain ?? false;
		this.now = options.now ?? (() => Date.now());
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
	}
	getHistory(npcId) {
		return this.history.get(npcId);
	}
	async runDecision(npc, allNPCs) {
		if (this.inFlightByNpc.has(npc.id)) return { status: 'skipped', reason: 'in-flight' };
		if ((this.nextDecisionAt.get(npc.id) ?? 0) > this.now()) return { status: 'skipped', reason: 'cadence' };
		if (this.actionTickByNpc.get(npc.id) === npc.tickCount) return { status: 'skipped', reason: 'one-action-per-tick' };
		this.inFlightByNpc.add(npc.id);
		try {
			this.transitionThinking(npc, 'requesting');
			this.emitLifecycle('npc:decision-observe', { npcId: npc.id });
			const observation = await (0, observe_1.observeNPCContext)(this.bridge, npc, allNPCs, this.observationRadius);
			this.emitLifecycle('npc:decision-prompt', { npcId: npc.id });
			const persona = resolvePersona(npc);
			const correctiveContext = this.correctiveContextByNpc.get(npc.id);
			const prompt = (0, prompt_builder_1.buildNPCPrompt)(persona, npc, observation, this.history.get(npc.id), correctiveContext);
			this.correctiveContextByNpc.delete(npc.id);
			this.history.append(npc.id, { role: 'user', content: prompt, timestamp: this.now() });
			this.emitLifecycle('npc:decision-call', { npcId: npc.id, useStubBrain: this.useStubBrain });
			const rawContent = this.useStubBrain
				? JSON.stringify(toStubAction((0, stub_brain_1.getStubBrainDecision)(npc), npc))
				: (await this.bridge.callLLM(prompt, { npcId: npc.id, timeoutMs: this.decisionIntervalMs })).content;
			this.history.append(npc.id, { role: 'assistant', content: rawContent, timestamp: this.now() });
			const validation = (0, validation_1.validateNPCAction)({
				npc,
				observation,
				rawContent,
			});
			if (!validation.valid) {
				this.correctiveContextByNpc.set(npc.id, validation.correctiveContext);
				this.emitLifecycle('npc:decision-warning', {
					npcId: npc.id,
					reason: validation.reason,
					warning: validation.warning,
				});
				this.transitionThinking(npc, 'executing');
				const fallbackAction = {
					action: 'idle',
					reasoning: `Fallback idle: ${validation.reason}`,
					nextGoal: 'Retry with corrective context',
				};
				const fallbackExecution = await (0, execute_action_1.executeNPCAction)(this.bridge, npc, fallbackAction, observation, {
					onActionState: (action, position, details) => {
						this.onActionState?.(npc, action, { position, details });
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
					this.onActionState?.(npc, action, { position, details });
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
		this.onLifecycle?.(eventType, payload);
	}
	transitionThinking(npc, state) {
		npc.thinkingState = state;
		this.onThinkingState?.(npc, state);
	}
}
exports.NPCDecisionLoop = NPCDecisionLoop;
