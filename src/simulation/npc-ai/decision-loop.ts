import { NPCAction } from '../../utils/types/npc';
import { ISimulationBridge } from '../contracts/simulation-bridge';
import { SimulationNPCState } from '../npc-state';
import { NPCPersonaDefinition, npcPersonas } from '../personas';
import { getStubBrainDecision } from '../stub-brain';
import { ConversationMessage, NPCConversationHistory, PairDialogueMessage } from './conversation-history';
import { executeNPCAction, NPCActionExecutionResult } from './execute-action';
import { observeNPCContext } from './observe';
import { buildNPCPrompt } from './prompt-builder';
import { validateNPCAction } from './validation';
import type { NPCActionValidationFailure } from './validation';

export interface NPCDecisionLoopOptions {
	decisionIntervalMs?: number;
	observationRadius?: number;
	useStubBrain?: boolean;
	now?: () => number;
	onLifecycle?: (eventType: string, payload: Record<string, unknown>) => void;
	onThinkingState?: (npc: SimulationNPCState, state: SimulationNPCState['thinkingState']) => void;
	onActionState?: (npc: SimulationNPCState, action: NPCAction['action'], payload: { position: SimulationNPCState['position']; details?: Record<string, unknown> }) => void;
	addInventoryItem?: (npcId: string, itemType: string, quantity: number) => { accepted: number; rejected: number; isFull: boolean };
	consumeInventoryItem?: (npcId: string, itemType: string, quantity: number) => number;
}

export interface NPCDecisionResult {
	status: 'executed' | 'skipped';
	reason?: string;
	action?: NPCAction;
	execution?: NPCActionExecutionResult;
}

const DEFAULT_DECISION_INTERVAL_MS = 5_000;
const DEFAULT_OBSERVATION_RADIUS = 16;

const toStubAction = (decision: ReturnType<typeof getStubBrainDecision>, npc: SimulationNPCState): NPCAction => ({
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

const resolvePersona = (npc: SimulationNPCState): NPCPersonaDefinition => {
	const persona = npcPersonas.find(item => item.name === npc.name);
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

export class NPCDecisionLoop {
	private readonly bridge: ISimulationBridge;

	private readonly decisionIntervalMs: number;

	private readonly observationRadius: number;

	private readonly useStubBrain: boolean;

	private readonly now: () => number;

	private readonly onLifecycle?: (eventType: string, payload: Record<string, unknown>) => void;

	private readonly onThinkingState?: (npc: SimulationNPCState, state: SimulationNPCState['thinkingState']) => void;

	private readonly onActionState?: (npc: SimulationNPCState, action: NPCAction['action'], payload: { position: SimulationNPCState['position']; details?: Record<string, unknown> }) => void;

	private readonly addInventoryItem?: (npcId: string, itemType: string, quantity: number) => { accepted: number; rejected: number; isFull: boolean };

	private readonly consumeInventoryItem?: (npcId: string, itemType: string, quantity: number) => number;

	private readonly history: NPCConversationHistory;

	private readonly inFlightByNpc: Set<string>;

	private readonly nextDecisionAt: Map<string, number>;

	private readonly correctiveContextByNpc: Map<string, string>;

	private readonly actionTickByNpc: Map<string, number>;

	private readonly pendingPlayerDialogueByNpc: Map<string, ConversationMessage[]>;

	constructor(bridge: ISimulationBridge, options: NPCDecisionLoopOptions = {}) {
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
		this.history = new NPCConversationHistory();
		this.inFlightByNpc = new Set();
		this.nextDecisionAt = new Map();
		this.correctiveContextByNpc = new Map();
		this.actionTickByNpc = new Map();
		this.pendingPlayerDialogueByNpc = new Map();
	}

	getHistory(npcId: string): ConversationMessage[] {
		return this.history.get(npcId);
	}

	queuePlayerDialogue(targetNpcId: string, content: string): void {
		const queue = this.pendingPlayerDialogueByNpc.get(targetNpcId) ?? [];
		const entry: ConversationMessage = {
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

	recordDialogueDelivery(speakerId: string, listenerId: string, content: string): void {
		this.history.appendPairDialogue({
			speakerId,
			listenerId,
			content,
			timestamp: this.now(),
		});
	}

	getPairHistory(leftNpcId: string, rightNpcId: string): PairDialogueMessage[] {
		return this.history.getPairDialogue(leftNpcId, rightNpcId);
	}

	async runDecision(npc: SimulationNPCState, allNPCs: SimulationNPCState[]): Promise<NPCDecisionResult> {
		if (this.inFlightByNpc.has(npc.id)) return { status: 'skipped', reason: 'in-flight' };
		if ((this.nextDecisionAt.get(npc.id) ?? 0) > this.now()) return { status: 'skipped', reason: 'cadence' };
		if (this.actionTickByNpc.get(npc.id) === npc.tickCount) return { status: 'skipped', reason: 'one-action-per-tick' };

		this.inFlightByNpc.add(npc.id);
		try {
			this.transitionThinking(npc, 'requesting');
			this.emitLifecycle('npc:decision-observe', { npcId: npc.id });
			const observation = await observeNPCContext(this.bridge, npc, allNPCs, this.observationRadius);

			this.emitLifecycle('npc:decision-prompt', { npcId: npc.id });
			const persona = resolvePersona(npc);
			const correctiveContext = this.correctiveContextByNpc.get(npc.id);
			const pendingPlayerMessages = this.pendingPlayerDialogueByNpc.get(npc.id) ?? [];
			const prompt = buildNPCPrompt(persona, npc, observation, this.history.get(npc.id), this.history.getDialogueContextForNpc(npc.id), pendingPlayerMessages, correctiveContext);
			this.correctiveContextByNpc.delete(npc.id);
			this.pendingPlayerDialogueByNpc.set(npc.id, []);
			this.history.append(npc.id, { role: 'user', content: prompt, timestamp: this.now() });

			this.emitLifecycle('npc:decision-call', { npcId: npc.id, useStubBrain: this.useStubBrain });
			const latestPlayerMessage = pendingPlayerMessages[pendingPlayerMessages.length - 1]?.content?.trim();
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
							: toStubAction(getStubBrainDecision(npc), npc)
				  )
				: (await this.bridge.callLLM(prompt, { npcId: npc.id, timeoutMs: this.decisionIntervalMs })).content;
			this.history.append(npc.id, { role: 'assistant', content: rawContent, timestamp: this.now() });

			const validation = validateNPCAction({
				npc,
				observation,
				rawContent,
			});
			if (!validation.valid) {
				const failure = validation as NPCActionValidationFailure;
				this.correctiveContextByNpc.set(npc.id, failure.correctiveContext);
				this.emitLifecycle('npc:decision-warning', {
					npcId: npc.id,
					reason: failure.reason,
					warning: failure.warning,
				});
				this.transitionThinking(npc, 'executing');
				const fallbackAction: NPCAction = {
					action: 'idle',
					reasoning: `Fallback idle: ${failure.reason}`,
					nextGoal: 'Retry with corrective context',
				};
				const fallbackExecution = await executeNPCAction(this.bridge, npc, fallbackAction, observation, {
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
			const execution = await executeNPCAction(this.bridge, npc, decidedAction, observation, {
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

	private emitLifecycle(eventType: string, payload: Record<string, unknown>): void {
		this.onLifecycle?.(eventType, payload);
	}

	private transitionThinking(npc: SimulationNPCState, state: SimulationNPCState['thinkingState']): void {
		npc.thinkingState = state;
		this.onThinkingState?.(npc, state);
	}
}
