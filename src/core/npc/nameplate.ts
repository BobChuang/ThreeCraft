import * as THREE from 'three';

const PLATE_WIDTH = 384;
const PLATE_HEIGHT = 96;

export const createNPCNameplate = (name: string, profession: string) => {
	const canvas = document.createElement('canvas');
	canvas.width = PLATE_WIDTH;
	canvas.height = PLATE_HEIGHT;
	const context = canvas.getContext('2d');
	if (!context) return new THREE.Sprite();

	context.clearRect(0, 0, PLATE_WIDTH, PLATE_HEIGHT);
	context.fillStyle = 'rgba(4, 12, 16, 0.72)';
	context.strokeStyle = 'rgba(74, 233, 255, 0.95)';
	context.lineWidth = 4;
	context.beginPath();
	context.moveTo(24, 8);
	context.lineTo(PLATE_WIDTH - 24, 8);
	context.quadraticCurveTo(PLATE_WIDTH - 8, 8, PLATE_WIDTH - 8, 24);
	context.lineTo(PLATE_WIDTH - 8, PLATE_HEIGHT - 24);
	context.quadraticCurveTo(PLATE_WIDTH - 8, PLATE_HEIGHT - 8, PLATE_WIDTH - 24, PLATE_HEIGHT - 8);
	context.lineTo(24, PLATE_HEIGHT - 8);
	context.quadraticCurveTo(8, PLATE_HEIGHT - 8, 8, PLATE_HEIGHT - 24);
	context.lineTo(8, 24);
	context.quadraticCurveTo(8, 8, 24, 8);
	context.closePath();
	context.fill();
	context.stroke();

	context.fillStyle = '#e8fbff';
	context.font = '700 34px "Trebuchet MS", "Segoe UI", sans-serif';
	context.textAlign = 'center';
	context.textBaseline = 'middle';
	context.fillText(name, PLATE_WIDTH / 2, 34);

	context.fillStyle = '#7be7ff';
	context.font = '600 24px "Trebuchet MS", "Segoe UI", sans-serif';
	context.fillText(`[${profession}]`, PLATE_WIDTH / 2, 68);

	const texture = new THREE.CanvasTexture(canvas);
	texture.needsUpdate = true;
	const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
	const sprite = new THREE.Sprite(material);
	sprite.scale.set(1.8, 0.45, 1);
	sprite.position.set(0, 1.75, 0);

	return sprite;
};
