import { NPCAction } from '../../utils/types/npc';
import { ISimulationBridge } from '../contracts/simulation-bridge';
import { SimulationNPCState } from '../npc-state';
import { NPCPersonaDefinition, npcPersonas } from '../personas';
import { getStubBrainDecision } from '../stub-brain';
import { ConversationMessage, NPCConversationHistory } from './conversation-history';
import { executeNPCAction, NPCActionExecutionResult } from './execute-action';
import { parseAndValidateNPCAction } from './llm-action-parser';
import { observeNPCContext } from './observe';
import { buildNPCPrompt } from './prompt-builder';

export interface NPCDecisionLoopOptions {
	decisionIntervalMs?: number;
	observationRadius?: number;
	useStubBrain?: boolean;
	now?: () => number;
	onLifecycle?: (eventType: string, payload: Record<string, unknown>) => void;
	onThinkingState?: (npc: SimulationNPCState, state: SimulationNPCState['thinkingState']) => void;
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

	private readonly history: NPCConversationHistory;

	private readonly inFlightByNpc: Set<string>;

	private readonly nextDecisionAt: Map<string, number>;

	constructor(bridge: ISimulationBridge, options: NPCDecisionLoopOptions = {}) {
		this.bridge = bridge;
		this.decisionIntervalMs = options.decisionIntervalMs ?? DEFAULT_DECISION_INTERVAL_MS;
		this.observationRadius = options.observationRadius ?? DEFAULT_OBSERVATION_RADIUS;
		this.useStubBrain = options.useStubBrain ?? false;
		this.now = options.now ?? (() => Date.now());
		this.onLifecycle = options.onLifecycle;
		this.onThinkingState = options.onThinkingState;
		this.history = new NPCConversationHistory();
		this.inFlightByNpc = new Set();
		this.nextDecisionAt = new Map();
	}

	getHistory(npcId: string): ConversationMessage[] {
		return this.history.get(npcId);
	}

	async runDecision(npc: SimulationNPCState, allNPCs: SimulationNPCState[]): Promise<NPCDecisionResult> {
		if (this.inFlightByNpc.has(npc.id)) return { status: 'skipped', reason: 'in-flight' };
		if ((this.nextDecisionAt.get(npc.id) ?? 0) > this.now()) return { status: 'skipped', reason: 'cadence' };

		this.inFlightByNpc.add(npc.id);
		try {
			this.transitionThinking(npc, 'requesting');
			this.emitLifecycle('npc:decision-observe', { npcId: npc.id });
			const observation = await observeNPCContext(this.bridge, npc, allNPCs, this.observationRadius);

			this.emitLifecycle('npc:decision-prompt', { npcId: npc.id });
			const persona = resolvePersona(npc);
			const prompt = buildNPCPrompt(persona, npc, observation, this.history.get(npc.id));
			this.history.append(npc.id, { role: 'user', content: prompt, timestamp: this.now() });

			this.emitLifecycle('npc:decision-call', { npcId: npc.id, useStubBrain: this.useStubBrain });
			const decidedAction = this.useStubBrain
				? toStubAction(getStubBrainDecision(npc), npc)
				: parseAndValidateNPCAction((await this.bridge.callLLM(prompt, { npcId: npc.id, timeoutMs: this.decisionIntervalMs })).content).action;
			this.history.append(npc.id, { role: 'assistant', content: JSON.stringify(decidedAction), timestamp: this.now() });

			this.transitionThinking(npc, 'received');
			this.emitLifecycle('npc:decision-validate', { npcId: npc.id, action: decidedAction.action });
			this.transitionThinking(npc, 'executing');
			const execution = await executeNPCAction(this.bridge, npc, decidedAction, observation);
			this.emitLifecycle('npc:decision-execute', { npcId: npc.id, action: decidedAction.action, applied: execution.applied });
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
