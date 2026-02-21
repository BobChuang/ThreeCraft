'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.executeBuildBehavior = exports.executeGatherBehavior = exports.executeMoveBehavior = void 0;
var execute_move_1 = require('./execute-move');
Object.defineProperty(exports, 'executeMoveBehavior', {
	enumerable: true,
	get: function () {
		return execute_move_1.executeMoveBehavior;
	},
});
var execute_gather_1 = require('./execute-gather');
Object.defineProperty(exports, 'executeGatherBehavior', {
	enumerable: true,
	get: function () {
		return execute_gather_1.executeGatherBehavior;
	},
});
var execute_build_1 = require('./execute-build');
Object.defineProperty(exports, 'executeBuildBehavior', {
	enumerable: true,
	get: function () {
		return execute_build_1.executeBuildBehavior;
	},
});
