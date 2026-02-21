export { SimulationEngine } from './simulation-engine';
export type { SimulationEngineOptions } from './simulation-engine';
export { SimulationInventoryManager, addItemToInventory, createInventorySlots } from './inventory';
export type { SimulationDroppedItem, SimulationInventoryAddResult, SimulationInventorySlot } from './inventory';
export { SimulationSurvivalManager, createDefaultSurvivalState } from './survival';
export { SimulationMonsterManager, MAX_ACTIVE_MONSTERS, MONSTER_DEFINITIONS } from './monsters';
export { PLAYER_RESPAWN_POINT_XZ } from './death';
export type { SimulationSurvivalState, SurvivalFoodResult, SurvivalTickResult } from './survival';
export type { SimulationMonsterState, MonsterType, MonsterPhase, MonsterAttackEvent } from './monsters';
export { ClientSimulationBridge } from './bridges/client-bridge';
export { GLM5Service, extractJsonFromLLMText, LLMServiceError } from './llm';
export { NPCDecisionLoop, parseAndValidateNPCAction, executeNPCAction } from './npc-ai';
export type { LLMServiceConfig, LLMServiceResult, LLMRequestOptions, LLMRuntimeMode, ThinkingLifecycleEvent, ThinkingLifecycleEventType } from './llm';
export type { NPCDecisionLoopOptions, NPCDecisionResult, NPCActionExecutionResult, ConversationMessage } from './npc-ai';
export type {
	ISimulationBridge,
	SimulationBlockAction,
	SimulationBridgeEvent,
	SimulationLLMOptions,
	SimulationLLMResult,
	SimulationVector3,
	SimulationWorldBlock,
	SimulationWorldState,
} from './contracts/simulation-bridge';
export type { SimulationNPCState, SimulationThinkingState } from './npc-state';
