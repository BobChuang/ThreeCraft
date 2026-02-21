'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.isSuspiciousNPCAction = void 0;
const INJECTION_PATTERNS = [
	/ignore\s+all\s+previous\s+instructions/i,
	/ignore\s+the\s+above\s+rules/i,
	/system\s+prompt/i,
	/developer\s+message/i,
	/reveal\s+(your\s+)?instructions/i,
	/<\s*script/i,
	/```/,
];
const hasInjectionPattern = content => INJECTION_PATTERNS.some(pattern => pattern.test(content));
const collectActionTextSegments = action => {
	var _a, _b;
	const segments = [
		action.dialogue,
		action.reasoning,
		action.nextGoal,
		(_a = action.target) === null || _a === void 0 ? void 0 : _a.blockType,
		(_b = action.target) === null || _b === void 0 ? void 0 : _b.npcId,
	];
	return segments.filter(segment => typeof segment === 'string' && segment.trim().length > 0);
};
const isSuspiciousNPCAction = (action, rawContent) => {
	if (hasInjectionPattern(rawContent)) return true;
	return collectActionTextSegments(action).some(text => hasInjectionPattern(text));
};
exports.isSuspiciousNPCAction = isSuspiciousNPCAction;
