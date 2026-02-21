'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.extractJsonFromLLMText = void 0;
const CODE_FENCE_JSON = /```(?:json)?\s*([\s\S]*?)\s*```/i;
const extractBraceBalancedJson = input => {
	const start = input.indexOf('{');
	if (start < 0) return null;
	let depth = 0;
	let inString = false;
	let escaping = false;
	for (let i = start; i < input.length; i += 1) {
		const char = input[i];
		if (escaping) {
			escaping = false;
		} else if (char === '\\') {
			escaping = true;
		} else if (char === '"') {
			inString = !inString;
		} else if (!inString) {
			if (char === '{') depth += 1;
			if (char === '}') {
				depth -= 1;
				if (depth === 0) {
					return input.slice(start, i + 1);
				}
			}
		}
	}
	return null;
};
const tryParse = value => {
	try {
		return JSON.parse(value);
	} catch {
		return null;
	}
};
const extractJsonFromLLMText = text => {
	const trimmed = text.trim();
	if (!trimmed) return null;
	const direct = tryParse(trimmed);
	if (direct !== null) {
		return {
			jsonText: trimmed,
			value: direct,
		};
	}
	const fencedMatch = trimmed.match(CODE_FENCE_JSON);
	if (fencedMatch === null || fencedMatch === void 0 ? void 0 : fencedMatch[1]) {
		const fencedBody = fencedMatch[1].trim();
		const parsedFenced = tryParse(fencedBody);
		if (parsedFenced !== null) {
			return {
				jsonText: fencedBody,
				value: parsedFenced,
			};
		}
	}
	const balanced = extractBraceBalancedJson(trimmed);
	if (!balanced) return null;
	const parsedBalanced = tryParse(balanced);
	if (parsedBalanced === null) return null;
	return {
		jsonText: balanced,
		value: parsedBalanced,
	};
};
exports.extractJsonFromLLMText = extractJsonFromLLMText;
