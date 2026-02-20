import { ThinkingLifecycleEvent, ThinkingLifecycleEventType } from './types';

export interface CreateLifecycleEventInput {
	type: ThinkingLifecycleEventType;
	npcId: string;
	payload?: Record<string, unknown>;
	now: () => number;
}

export const createLifecycleEvent = ({ type, npcId, payload, now }: CreateLifecycleEventInput): ThinkingLifecycleEvent => ({
	type,
	npcId,
	timestamp: now(),
	payload: payload ?? {},
});
