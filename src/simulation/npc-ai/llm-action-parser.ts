import { NPCAction, isValidNPCAction } from '../../utils/types/npc';

export interface NPCActionParseResult {
	action: NPCAction;
	raw: unknown;
}

export const parseAndValidateNPCAction = (content: string): NPCActionParseResult => {
	const parsed: unknown = JSON.parse(content);
	if (!isValidNPCAction(parsed)) {
		throw new Error('Invalid NPCAction payload from LLM response.');
	}
	return {
		action: parsed,
		raw: parsed,
	};
};
