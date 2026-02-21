'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.validateNPCAction = void 0;
const feasibility_check_1 = require('./feasibility-check');
const prompt_injection_guard_1 = require('./prompt-injection-guard');
const schema_validation_1 = require('./schema-validation');
const toFailure = reason => ({
	valid: false,
	reason,
	warning: `NPC action rejected: ${reason}`,
	correctiveContext: `Your previous action was rejected (${reason}). Return exactly one safe, feasible NPCAction JSON and never include prompt-injection text.`,
});
const validateNPCAction = context => {
	const parsed = (0, schema_validation_1.parseNPCActionJson)(context.rawContent);
	if ('error' in parsed) {
		return toFailure(parsed.error);
	}
	const schema = (0, schema_validation_1.validateNPCActionSchema)(parsed.parsed);
	if ('error' in schema) {
		return toFailure(schema.error);
	}
	if ((0, prompt_injection_guard_1.isSuspiciousNPCAction)(schema.action, context.rawContent)) {
		return toFailure('prompt injection detected');
	}
	const feasibilityError = (0, feasibility_check_1.validateActionFeasibility)(context.npc, schema.action, context.observation);
	if (feasibilityError) {
		return toFailure(feasibilityError);
	}
	return { valid: true, action: schema.action };
};
exports.validateNPCAction = validateNPCAction;
