import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { NPCThinkingBubbleHandle, NPCThinkingBubblePhase } from './types';

const HIDE_DELAY_MS = 3_000;

const ACTION_LABEL: Record<string, string> = {
	idle: '待机',
	move: '移动',
	gather: '采集',
	build: '建造',
	dialogue: '对话',
};

const toNow = (now?: number): number => now ?? Date.now();

const clampText = (text: string, max = 72): string => {
	const normalized = text.replace(/\s+/g, ' ').trim();
	if (!normalized) return '';
	return normalized.length <= max ? normalized : `${normalized.slice(0, max - 1)}…`;
};

const createRootElement = (): HTMLDivElement => {
	const root = document.createElement('div');
	root.style.maxWidth = '220px';
	root.style.padding = '8px 10px';
	root.style.border = '2px solid rgba(124, 242, 255, 0.95)';
	root.style.borderRadius = '10px';
	root.style.background = 'rgba(8, 17, 22, 0.92)';
	root.style.color = '#e9fdff';
	root.style.font = '600 13px/1.35 "Trebuchet MS", "Segoe UI", sans-serif';
	root.style.boxShadow = '0 0 10px rgba(90, 232, 255, 0.25)';
	root.style.whiteSpace = 'normal';
	root.style.wordBreak = 'break-word';
	root.style.textAlign = 'left';
	root.style.pointerEvents = 'none';
	root.style.display = 'none';
	return root;
};

const formatPhaseText = (phase: NPCThinkingBubblePhase, content: string): string => {
	if (phase === 'requesting') return '思考中...';
	if (phase === 'received') return `推理：${content}`;
	if (phase === 'executing') return `执行中：${content}`;
	if (phase === 'streaming') return content;
	return '';
};

export const createNPCThinkingBubble = (): NPCThinkingBubbleHandle => {
	const element = createRootElement();
	const object = new CSS2DObject(element);
	object.position.set(0, 2.62, 0);
	object.visible = false;

	let phase: NPCThinkingBubblePhase = 'idle';
	let visibleUntil = 0;
	let streamText = '';
	let contentText = '';
	let inRange = true;

	const render = (now?: number): void => {
		const ts = toNow(now);
		const expired = ts >= visibleUntil;
		if (phase === 'idle' || expired || !inRange) {
			element.style.display = 'none';
			object.visible = false;
			if (expired) {
				phase = 'idle';
				streamText = '';
			}
			return;
		}
		element.style.display = 'block';
		element.textContent = formatPhaseText(phase, phase === 'streaming' ? streamText : contentText);
		object.visible = true;
	};

	const showWithText = (nextPhase: NPCThinkingBubblePhase, text: string, now?: number): void => {
		phase = nextPhase;
		if (nextPhase !== 'streaming') {
			streamText = '';
			contentText = clampText(text) || '思考中...';
		}
		element.textContent = contentText;
		visibleUntil = toNow(now) + HIDE_DELAY_MS;
		render(now);
	};

	return {
		object,
		showRequesting: now => {
			showWithText('requesting', '思考中...', now);
		},
		appendStreamChunk: (chunk, now) => {
			const normalized = chunk.replace(/\s+/g, ' ').trim();
			if (!normalized) return;
			phase = 'streaming';
			streamText = clampText(`${streamText}${normalized}`, 72);
			contentText = streamText;
			element.textContent = streamText;
			visibleUntil = toNow(now) + HIDE_DELAY_MS;
			render(now);
		},
		showReasoning: (reasoning, now) => {
			const text = clampText(reasoning, 90);
			if (!text) return;
			showWithText('received', text, now);
		},
		showExecutingAction: (action, now) => {
			showWithText('executing', ACTION_LABEL[action] ?? action, now);
		},
		hideNow: () => {
			phase = 'idle';
			streamText = '';
			contentText = '';
			visibleUntil = 0;
			render();
		},
		updateVisibility: (visibleInRange, now) => {
			inRange = visibleInRange;
			render(now);
		},
	};
};
