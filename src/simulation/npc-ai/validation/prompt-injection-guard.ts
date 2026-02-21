import { NPCAction } from '../../../utils/types/npc';

const INJECTION_PATTERNS: RegExp[] = [
	/ignore\s+all\s+previous\s+instructions/i,
	/ignore\s+the\s+above\s+rules/i,
	/system\s+prompt/i,
	/developer\s+message/i,
	/reveal\s+(your\s+)?instructions/i,
	/<\s*script/i,
	/```/,
];

const hasInjectionPattern = (content: string): boolean => INJECTION_PATTERNS.some(pattern => pattern.test(content));

const collectActionTextSegments = (action: NPCAction): string[] => {
	const segments = [action.dialogue, action.reasoning, action.nextGoal, action.target?.blockType, action.target?.npcId];
	return segments.filter((segment): segment is string => typeof segment === 'string' && segment.trim().length > 0);
};

export const isSuspiciousNPCAction = (action: NPCAction, rawContent: string): boolean => {
	if (hasInjectionPattern(rawContent)) return true;
	return collectActionTextSegments(action).some(text => hasInjectionPattern(text));
};
