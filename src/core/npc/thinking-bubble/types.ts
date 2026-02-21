import type { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

export type NPCThinkingBubblePhase = 'idle' | 'requesting' | 'streaming' | 'received' | 'executing';

export interface NPCThinkingBubbleHandle {
	readonly object: CSS2DObject;
	showRequesting: (now?: number) => void;
	appendStreamChunk: (chunk: string, now?: number) => void;
	showReasoning: (reasoning: string, now?: number) => void;
	showExecutingAction: (action: string, now?: number) => void;
	hideNow: () => void;
	updateVisibility: (visibleInRange: boolean, now?: number) => void;
}
