'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.validateNPCActionSchema = exports.parseNPCActionJson = void 0;
const npc_1 = require('../../../utils/types/npc');
const asRecord = value => {
	if (!value || typeof value !== 'object') return null;
	return value;
};
const createUnknownActionReason = raw => {
	if (typeof raw.action !== 'string') {
		return 'missing action type';
	}
	return 'unknown action type';
};
const parseNPCActionJson = content => {
	try {
		return { parsed: JSON.parse(content) };
	} catch {
		return { error: 'invalid json' };
	}
};
exports.parseNPCActionJson = parseNPCActionJson;
const validateNPCActionSchema = value => {
	if ((0, npc_1.isValidNPCAction)(value)) {
		return { action: value };
	}
	const raw = asRecord(value);
	if (!raw) {
		return { error: 'payload must be object' };
	}
	const unknownActionReason = createUnknownActionReason(raw);
	if (unknownActionReason) {
		return { error: unknownActionReason };
	}
	return { error: 'invalid npc action schema' };
};
exports.validateNPCActionSchema = validateNPCActionSchema;
