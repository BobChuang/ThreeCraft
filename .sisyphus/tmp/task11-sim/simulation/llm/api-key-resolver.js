'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.resolveApiKey = void 0;
const readNodeEnv = () => {
	if (typeof process === 'undefined' || !process?.env) return {};
	return process.env;
};
const resolveApiKey = ({ runtimeMode, apiKey, apiKeyFromEnv }) => {
	if (runtimeMode === 'client') {
		const key = apiKey?.trim();
		return key || undefined;
	}
	const envKeyName = (apiKeyFromEnv ?? 'ZHIPU_API_KEY').trim();
	if (!envKeyName) return undefined;
	const envValue = readNodeEnv()[envKeyName];
	const key = envValue?.trim();
	return key || undefined;
};
exports.resolveApiKey = resolveApiKey;
