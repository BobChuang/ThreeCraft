'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.HP_REGEN_HUNGER_THRESHOLD =
	exports.HP_REGEN_INTERVAL_MS =
	exports.STARVATION_HP_INTERVAL_MS =
	exports.HUNGER_DECAY_INTERVAL_MS =
	exports.clampSurvivalState =
	exports.createDefaultSurvivalState =
	exports.SimulationSurvivalManager =
		void 0;
var survival_manager_1 = require('./survival-manager');
Object.defineProperty(exports, 'SimulationSurvivalManager', {
	enumerable: true,
	get: function () {
		return survival_manager_1.SimulationSurvivalManager;
	},
});
var default_state_1 = require('./default-state');
Object.defineProperty(exports, 'createDefaultSurvivalState', {
	enumerable: true,
	get: function () {
		return default_state_1.createDefaultSurvivalState;
	},
});
var clamp_survival_state_1 = require('./clamp-survival-state');
Object.defineProperty(exports, 'clampSurvivalState', {
	enumerable: true,
	get: function () {
		return clamp_survival_state_1.clampSurvivalState;
	},
});
var survival_constants_1 = require('./survival-constants');
Object.defineProperty(exports, 'HUNGER_DECAY_INTERVAL_MS', {
	enumerable: true,
	get: function () {
		return survival_constants_1.HUNGER_DECAY_INTERVAL_MS;
	},
});
Object.defineProperty(exports, 'STARVATION_HP_INTERVAL_MS', {
	enumerable: true,
	get: function () {
		return survival_constants_1.STARVATION_HP_INTERVAL_MS;
	},
});
Object.defineProperty(exports, 'HP_REGEN_INTERVAL_MS', {
	enumerable: true,
	get: function () {
		return survival_constants_1.HP_REGEN_INTERVAL_MS;
	},
});
Object.defineProperty(exports, 'HP_REGEN_HUNGER_THRESHOLD', {
	enumerable: true,
	get: function () {
		return survival_constants_1.HP_REGEN_HUNGER_THRESHOLD;
	},
});
