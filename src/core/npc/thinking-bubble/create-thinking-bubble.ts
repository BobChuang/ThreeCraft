import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { NPCThinkingBubbleHandle, NPCThinkingBubblePhase } from './types';

const HIDE_DELAY_MS = 3_000;
const REQUESTING_HOLD_MS = 450;
const RECEIVED_HOLD_MS = 450;

const ACTION_META: Record<string, { icon: string; label: string }> = {
	idle: { icon: '⏸', label: '待机' },
	move: { icon: '👣', label: '移动' },
	gather: { icon: '⛏', label: '采集' },
	build: { icon: '🧱', label: '建造' },
	dialogue: { icon: '💬', label: '对话' },
	executing: { icon: '⚙️', label: '执行中' },
};

const REQUESTING_DOTS = ['.', '..', '...'];

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

const normalizeActionKey = (raw: string): string => {
	const normalized = raw.trim().toLowerCase();
	if (ACTION_META[normalized]) return normalized;
	if (raw.includes('待机')) return 'idle';
	if (raw.includes('移动')) return 'move';
	if (raw.includes('采集') || raw.includes('挖')) return 'gather';
	if (raw.includes('建造')) return 'build';
	if (raw.includes('对话')) return 'dialogue';
	if (raw.includes('执行')) return 'executing';
	return '';
};

const formatActionText = (action: string): string => {
	const key = normalizeActionKey(action);
	if (!key) return `${ACTION_META.executing.icon} ${clampText(action, 48)}`;
	const matched = ACTION_META[key];
	return `${matched.icon} ${matched.label}`;
};

const formatPhaseText = (phase: NPCThinkingBubblePhase, content: string, now: number): string => {
	if (phase === 'requesting') return `思考中${REQUESTING_DOTS[Math.floor(now / 360) % REQUESTING_DOTS.length]}`;
	if (phase === 'received') return `推理：${content}`;
	if (phase === 'executing') return formatActionText(content);
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
	let phaseLockedUntil = 0;
	let streamText = '';
	let contentText = '';
	let inRange = true;
	const pendingPhases: Array<{ phase: NPCThinkingBubblePhase; text: string; now?: number }> = [];

	const applyPhase = (nextPhase: NPCThinkingBubblePhase, text: string, now?: number): void => {
		phase = nextPhase;
		if (nextPhase === 'streaming') {
			const normalized = text.replace(/\s+/g, ' ').trim();
			if (!normalized) return;
			streamText = clampText(`${streamText}${normalized}`, 72);
			contentText = streamText;
			element.textContent = streamText;
			visibleUntil = toNow(now) + HIDE_DELAY_MS;
			return;
		}
		streamText = '';
		contentText = clampText(text) || '思考中...';
		element.textContent = contentText;
		visibleUntil = toNow(now) + HIDE_DELAY_MS;
	};

	const render = (now?: number): void => {
		const ts = toNow(now);
		while (pendingPhases.length && ts >= phaseLockedUntil) {
			const next = pendingPhases.shift();
			if (!next) break;
			applyPhase(next.phase, next.text, next.now ?? ts);
			if (next.phase === 'received') {
				phaseLockedUntil = ts + RECEIVED_HOLD_MS;
				break;
			}
			if (next.phase === 'requesting') {
				phaseLockedUntil = ts + REQUESTING_HOLD_MS;
				break;
			}
			phaseLockedUntil = ts;
		}
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
		element.textContent = formatPhaseText(phase, phase === 'streaming' ? streamText : contentText, ts);
		object.visible = true;
	};

	const showWithText = (nextPhase: NPCThinkingBubblePhase, text: string, now?: number): void => {
		const ts = toNow(now);
		if (nextPhase !== 'requesting' && ts < phaseLockedUntil) {
			pendingPhases.push({ phase: nextPhase, text, now: ts });
			render(ts);
			return;
		}
		applyPhase(nextPhase, text, ts);
		if (nextPhase === 'requesting') phaseLockedUntil = ts + REQUESTING_HOLD_MS;
		if (nextPhase === 'received') phaseLockedUntil = ts + RECEIVED_HOLD_MS;
		if (nextPhase === 'executing') phaseLockedUntil = ts;
		render(now);
	};

	return {
		object,
		showRequesting: now => {
			pendingPhases.length = 0;
			showWithText('requesting', '思考中...', now);
		},
		appendStreamChunk: (chunk, now) => {
			const ts = toNow(now);
			const normalized = chunk.replace(/\s+/g, ' ').trim();
			if (!normalized) return;
			if (ts < phaseLockedUntil) {
				pendingPhases.push({ phase: 'streaming', text: normalized, now: ts });
				render(ts);
				return;
			}
			applyPhase('streaming', normalized, ts);
			render(ts);
		},
		showReasoning: (reasoning, now) => {
			const text = clampText(reasoning, 90) || streamText || '响应已接收';
			showWithText('received', text, now);
		},
		showExecutingAction: (action, now) => {
			showWithText('executing', action, now);
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
