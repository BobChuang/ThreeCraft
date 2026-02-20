export { SimulationEngine } from './simulation-engine';
export type { SimulationEngineOptions } from './simulation-engine';
export { SimulationInventoryManager, addItemToInventory, createInventorySlots } from './inventory';
export type { SimulationDroppedItem, SimulationInventoryAddResult, SimulationInventorySlot } from './inventory';
export { ClientSimulationBridge } from './bridges/client-bridge';
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
