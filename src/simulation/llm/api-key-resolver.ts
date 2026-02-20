import { LLMRuntimeMode } from './types';

export interface ApiKeyResolveInput {
	runtimeMode: LLMRuntimeMode;
	apiKey?: string;
	apiKeyFromEnv?: string;
}

const readNodeEnv = (): Record<string, string | undefined> => {
	if (typeof process === 'undefined' || !process?.env) return {};
	return process.env as Record<string, string | undefined>;
};

export const resolveApiKey = ({ runtimeMode, apiKey, apiKeyFromEnv }: ApiKeyResolveInput): string | undefined => {
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
