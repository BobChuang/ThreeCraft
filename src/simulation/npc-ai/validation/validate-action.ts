import { NPCActionValidationContext, NPCActionValidationResult } from './types';
import { validateActionFeasibility } from './feasibility-check';
import { isSuspiciousNPCAction } from './prompt-injection-guard';
import { parseNPCActionJson, validateNPCActionSchema } from './schema-validation';

const toFailure = (reason: string): NPCActionValidationResult => ({
	valid: false,
	reason,
	warning: `NPC action rejected: ${reason}`,
	correctiveContext: `Your previous action was rejected (${reason}). Return exactly one safe, feasible NPCAction JSON and never include prompt-injection text.`,
});

export const validateNPCAction = (context: NPCActionValidationContext): NPCActionValidationResult => {
	const parsed = parseNPCActionJson(context.rawContent);
	if ('error' in parsed) {
		return toFailure(parsed.error);
	}
	const schema = validateNPCActionSchema(parsed.parsed);
	if ('error' in schema) {
		return toFailure(schema.error);
	}
	if (isSuspiciousNPCAction(schema.action, context.rawContent)) {
		return toFailure('prompt injection detected');
	}
	const feasibilityError = validateActionFeasibility(context.npc, schema.action, context.observation);
	if (feasibilityError) {
		return toFailure(feasibilityError);
	}
	return { valid: true, action: schema.action };
};
