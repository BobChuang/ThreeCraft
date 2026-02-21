'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.parseAndValidateNPCAction = void 0;
const npc_1 = require('../../utils/types/npc');
const parseAndValidateNPCAction = content => {
	const parsed = JSON.parse(content);
	if (!(0, npc_1.isValidNPCAction)(parsed)) {
		throw new Error('Invalid NPCAction payload from LLM response.');
	}
	return {
		action: parsed,
		raw: parsed,
	};
};
exports.parseAndValidateNPCAction = parseAndValidateNPCAction;
