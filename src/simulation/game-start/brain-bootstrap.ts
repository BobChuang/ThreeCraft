import type { LLMServiceConfig } from '../llm';

export interface CyberpunkBrainBootstrap {
	useStubBrain: boolean;
	llmConfig?: LLMServiceConfig;
}

const readClientApiKey = (): string | undefined => {
	if (typeof window === 'undefined') return undefined;
	const direct = window.localStorage.getItem('zhipu_api_key') ?? window.localStorage.getItem('ZHIPU_API_KEY') ?? window.localStorage.getItem('glm_api_key');
	const apiKey = direct?.trim();
	return apiKey || undefined;
};

export const resolveCyberpunkBrainBootstrap = (isCyberpunkScene: boolean): CyberpunkBrainBootstrap => {
	if (!isCyberpunkScene) return { useStubBrain: true };
	const apiKey = readClientApiKey();
	if (!apiKey) return { useStubBrain: true };
	return {
		useStubBrain: false,
		llmConfig: {
			runtimeMode: 'client',
			apiKey,
			model: 'glm-5',
		},
	};
};
