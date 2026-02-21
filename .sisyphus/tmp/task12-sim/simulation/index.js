'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.executeNPCAction =
	exports.parseAndValidateNPCAction =
	exports.NPCDecisionLoop =
	exports.LLMServiceError =
	exports.extractJsonFromLLMText =
	exports.GLM5Service =
	exports.ClientSimulationBridge =
	exports.MONSTER_DEFINITIONS =
	exports.MAX_ACTIVE_MONSTERS =
	exports.SimulationMonsterManager =
	exports.createDefaultSurvivalState =
	exports.SimulationSurvivalManager =
	exports.createInventorySlots =
	exports.addItemToInventory =
	exports.SimulationInventoryManager =
	exports.SimulationEngine =
		void 0;
var simulation_engine_1 = require('./simulation-engine');
Object.defineProperty(exports, 'SimulationEngine', {
	enumerable: true,
	get: function () {
		return simulation_engine_1.SimulationEngine;
	},
});
var inventory_1 = require('./inventory');
Object.defineProperty(exports, 'SimulationInventoryManager', {
	enumerable: true,
	get: function () {
		return inventory_1.SimulationInventoryManager;
	},
});
Object.defineProperty(exports, 'addItemToInventory', {
	enumerable: true,
	get: function () {
		return inventory_1.addItemToInventory;
	},
});
Object.defineProperty(exports, 'createInventorySlots', {
	enumerable: true,
	get: function () {
		return inventory_1.createInventorySlots;
	},
});
var survival_1 = require('./survival');
Object.defineProperty(exports, 'SimulationSurvivalManager', {
	enumerable: true,
	get: function () {
		return survival_1.SimulationSurvivalManager;
	},
});
Object.defineProperty(exports, 'createDefaultSurvivalState', {
	enumerable: true,
	get: function () {
		return survival_1.createDefaultSurvivalState;
	},
});
var monsters_1 = require('./monsters');
Object.defineProperty(exports, 'SimulationMonsterManager', {
	enumerable: true,
	get: function () {
		return monsters_1.SimulationMonsterManager;
	},
});
Object.defineProperty(exports, 'MAX_ACTIVE_MONSTERS', {
	enumerable: true,
	get: function () {
		return monsters_1.MAX_ACTIVE_MONSTERS;
	},
});
Object.defineProperty(exports, 'MONSTER_DEFINITIONS', {
	enumerable: true,
	get: function () {
		return monsters_1.MONSTER_DEFINITIONS;
	},
});
var client_bridge_1 = require('./bridges/client-bridge');
Object.defineProperty(exports, 'ClientSimulationBridge', {
	enumerable: true,
	get: function () {
		return client_bridge_1.ClientSimulationBridge;
	},
});
var llm_1 = require('./llm');
Object.defineProperty(exports, 'GLM5Service', {
	enumerable: true,
	get: function () {
		return llm_1.GLM5Service;
	},
});
Object.defineProperty(exports, 'extractJsonFromLLMText', {
	enumerable: true,
	get: function () {
		return llm_1.extractJsonFromLLMText;
	},
});
Object.defineProperty(exports, 'LLMServiceError', {
	enumerable: true,
	get: function () {
		return llm_1.LLMServiceError;
	},
});
var npc_ai_1 = require('./npc-ai');
Object.defineProperty(exports, 'NPCDecisionLoop', {
	enumerable: true,
	get: function () {
		return npc_ai_1.NPCDecisionLoop;
	},
});
Object.defineProperty(exports, 'parseAndValidateNPCAction', {
	enumerable: true,
	get: function () {
		return npc_ai_1.parseAndValidateNPCAction;
	},
});
Object.defineProperty(exports, 'executeNPCAction', {
	enumerable: true,
	get: function () {
		return npc_ai_1.executeNPCAction;
	},
});
