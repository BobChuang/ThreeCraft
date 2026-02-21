import { NPCAction, isValidNPCAction } from '../../../utils/types/npc';

const asRecord = (value: unknown): Record<string, unknown> | null => {
	if (!value || typeof value !== 'object') return null;
	return value as Record<string, unknown>;
};

const createUnknownActionReason = (raw: Record<string, unknown>): string | null => {
	if (typeof raw.action !== 'string') {
		return 'missing action type';
	}
	return 'unknown action type';
};

export const parseNPCActionJson = (content: string): { parsed: unknown } | { error: string } => {
	try {
		return { parsed: JSON.parse(content) };
	} catch {
		return { error: 'invalid json' };
	}
};

export const validateNPCActionSchema = (value: unknown): { action: NPCAction } | { error: string } => {
	if (isValidNPCAction(value)) {
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
