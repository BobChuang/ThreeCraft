import * as THREE from 'three';
import { symConfig } from '../../controller/config';
import { createNPCNameplate } from './nameplate';
import { MonsterRenderType, NPCAnimationState } from './types';

const createPart = (size: [number, number, number], color: string) => {
	const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.15 }));
	mesh.castShadow = false;
	mesh.receiveShadow = false;
	return mesh;
};

const createMonsterModel = (type: MonsterRenderType): THREE.Group => {
	const palette = type === 'mutant' ? { body: '#3fa05d', head: '#7fd06b', limb: '#2f7241' } : { body: '#5f6778', head: '#8f97a8', limb: '#444c5a' };
	const root = new THREE.Group();
	const body = createPart([0.62, 0.7, 0.42], palette.body);
	body.position.set(0, 0.95, 0);
	const head = createPart([0.46, 0.46, 0.46], palette.head);
	head.position.set(0, 1.55, 0);
	const leftLeg = createPart([0.2, 0.55, 0.2], palette.limb);
	leftLeg.position.set(-0.17, 0.3, 0);
	const rightLeg = createPart([0.2, 0.55, 0.2], palette.limb);
	rightLeg.position.set(0.17, 0.3, 0);
	root.add(body, head, leftLeg, rightLeg);
	root.userData.monsterParts = { leftLeg, rightLeg, head };
	return root;
};

export class MonsterEntity {
	readonly id: string;

	readonly player: THREE.Group;

	readonly nameplate: THREE.Sprite;

	private readonly parts: { leftLeg: THREE.Mesh; rightLeg: THREE.Mesh; head: THREE.Mesh };

	private readonly target = new THREE.Vector3();

	private animationState: NPCAnimationState;

	private animateStamp = 0;

	private lastCall = performance.now();

	constructor(id: string, type: MonsterRenderType, position: { x: number; y: number; z: number }, animationState: NPCAnimationState) {
		this.id = id;
		this.player = createMonsterModel(type);
		this.parts = this.player.userData.monsterParts;
		this.player.position.set(position.x, position.y + 0.2, position.z);
		this.target.copy(this.player.position);
		this.nameplate = createNPCNameplate(type === 'mutant' ? 'Mutant' : 'Corrupted Bot', 'Hostile');
		this.nameplate.position.set(0, 2.1, 0);
		this.player.add(this.nameplate);
		this.animationState = animationState;
	}

	get position() {
		return this.player.position;
	}

	setPosition(v: { x: number; y: number; z: number }) {
		this.target.set(v.x, v.y + 0.2, v.z);
	}

	setRotation(v: { y: number }) {
		this.player.rotation.set(0, v.y, 0, 'YXZ');
	}

	setAnimationState(state: NPCAnimationState) {
		this.animationState = state;
	}

	update() {
		const now = performance.now();
		const delta = now - this.lastCall;
		this.lastCall = now;
		const toTarget = this.target.clone().sub(this.player.position);
		const isMoving = toTarget.length() > symConfig.eps;
		if (isMoving) {
			const step = toTarget.normalize().multiplyScalar((delta / 1000) * 3);
			if (step.length() >= toTarget.length()) this.player.position.copy(this.target);
			else this.player.position.add(step);
			this.animationState = 'walking';
		}
		this.animateStamp += delta;
		const phase = this.animateStamp / 85;
		const swing = this.animationState === 'idle' ? 0 : Math.sin(phase) * 0.55;
		this.parts.leftLeg.rotation.x = swing;
		this.parts.rightLeg.rotation.x = -swing;
		this.parts.head.rotation.y = this.animationState === 'speaking' ? Math.sin(phase * 0.8) * 0.18 : 0;
	}
}
