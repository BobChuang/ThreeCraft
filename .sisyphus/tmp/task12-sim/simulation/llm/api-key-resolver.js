'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.resolveApiKey = void 0;
const readNodeEnv = () => {
	if (typeof process === 'undefined' || !(process === null || process === void 0 ? void 0 : process.env)) return {};
	return process.env;
};
const resolveApiKey = ({ runtimeMode, apiKey, apiKeyFromEnv }) => {
	if (runtimeMode === 'client') {
		const key = apiKey === null || apiKey === void 0 ? void 0 : apiKey.trim();
		return key || undefined;
	}
	const envKeyName = (apiKeyFromEnv !== null && apiKeyFromEnv !== void 0 ? apiKeyFromEnv : 'ZHIPU_API_KEY').trim();
	if (!envKeyName) return undefined;
	const envValue = readNodeEnv()[envKeyName];
	const key = envValue === null || envValue === void 0 ? void 0 : envValue.trim();
	return key || undefined;
};
exports.resolveApiKey = resolveApiKey;
