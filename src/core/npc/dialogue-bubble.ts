import * as THREE from 'three';

const BUBBLE_WIDTH = 420;
const BUBBLE_HEIGHT = 160;
const BUBBLE_DURATION_MS = 5_000;

const createBubbleCanvas = () => {
	const canvas = document.createElement('canvas');
	canvas.width = BUBBLE_WIDTH;
	canvas.height = BUBBLE_HEIGHT;
	return canvas;
};

const wrapLines = (context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
	const words = text.trim().split(/\s+/).filter(Boolean);
	if (!words.length) return ['...'];
	const lines: string[] = [];
	let current = '';
	words.forEach(word => {
		const next = current ? `${current} ${word}` : word;
		if (context.measureText(next).width <= maxWidth) {
			current = next;
			return;
		}
		if (current) lines.push(current);
		current = word;
	});
	if (current) lines.push(current);
	return lines.slice(0, 3);
};

const drawBubble = (context: CanvasRenderingContext2D, text: string): void => {
	context.clearRect(0, 0, BUBBLE_WIDTH, BUBBLE_HEIGHT);
	context.fillStyle = 'rgba(8, 18, 22, 0.88)';
	context.strokeStyle = 'rgba(118, 238, 255, 0.98)';
	context.lineWidth = 4;
	context.beginPath();
	context.moveTo(24, 10);
	context.lineTo(BUBBLE_WIDTH - 24, 10);
	context.quadraticCurveTo(BUBBLE_WIDTH - 10, 10, BUBBLE_WIDTH - 10, 24);
	context.lineTo(BUBBLE_WIDTH - 10, BUBBLE_HEIGHT - 44);
	context.quadraticCurveTo(BUBBLE_WIDTH - 10, BUBBLE_HEIGHT - 30, BUBBLE_WIDTH - 24, BUBBLE_HEIGHT - 30);
	context.lineTo(250, BUBBLE_HEIGHT - 30);
	context.lineTo(212, BUBBLE_HEIGHT - 10);
	context.lineTo(214, BUBBLE_HEIGHT - 30);
	context.lineTo(24, BUBBLE_HEIGHT - 30);
	context.quadraticCurveTo(10, BUBBLE_HEIGHT - 30, 10, BUBBLE_HEIGHT - 44);
	context.lineTo(10, 24);
	context.quadraticCurveTo(10, 10, 24, 10);
	context.closePath();
	context.fill();
	context.stroke();

	context.fillStyle = '#e9fdff';
	context.font = '600 27px "Trebuchet MS", "Segoe UI", sans-serif';
	context.textAlign = 'left';
	context.textBaseline = 'top';
	const lines = wrapLines(context, text, BUBBLE_WIDTH - 64);
	lines.forEach((line, index) => {
		context.fillText(line, 30, 28 + index * 36);
	});
};

export interface NPCDialogueBubbleHandle {
	sprite: THREE.Sprite;
	show: (text: string, now: number) => void;
	update: (now: number) => void;
}

export const createNPCDialogueBubble = (): NPCDialogueBubbleHandle => {
	const canvas = createBubbleCanvas();
	const context = canvas.getContext('2d');
	const texture = new THREE.CanvasTexture(canvas);
	texture.needsUpdate = true;
	const material = new THREE.SpriteMaterial({
		map: texture,
		transparent: true,
		opacity: 0,
		depthWrite: false,
	});
	const sprite = new THREE.Sprite(material);
	sprite.scale.set(2.2, 0.84, 1);
	sprite.position.set(0, 2.38, 0);
	sprite.visible = false;

	let visibleUntil = 0;

	const update = (now: number) => {
		if (now >= visibleUntil) {
			sprite.visible = false;
			material.opacity = 0;
			return;
		}
		const remaining = visibleUntil - now;
		sprite.visible = true;
		material.opacity = Math.max(0, Math.min(1, remaining / BUBBLE_DURATION_MS));
	};

	const show = (text: string, now: number) => {
		if (context) drawBubble(context, text);
		texture.needsUpdate = true;
		visibleUntil = now + BUBBLE_DURATION_MS;
		update(now);
	};

	return { sprite, show, update };
};
