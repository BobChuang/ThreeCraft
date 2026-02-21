import * as THREE from 'three';
import { symConfig } from '../../controller/config';
import Player from '../player';
import { createNPCDialogueBubble, NPCDialogueBubbleHandle } from './dialogue-bubble';
import { createNPCNameplate } from './nameplate';
import { createNPCThinkingBubble, NPCThinkingBubbleHandle } from './thinking-bubble';
import { NPCAnimationState } from './types';

export class NPCEntity extends Player {
	readonly id: string;

	readonly displayName: string;

	readonly profession: string;

	readonly nameplate: THREE.Sprite;

	readonly dialogueBubble!: NPCDialogueBubbleHandle;

	readonly thinkingBubble!: NPCThinkingBubbleHandle;

	private animationState: NPCAnimationState;

	constructor({
		id,
		displayName,
		profession,
		skinIdx,
		pos,
		reward,
		animationState,
	}: {
		id: string;
		displayName: string;
		profession: string;
		skinIdx: number;
		pos: THREE.Vector3;
		reward: THREE.Euler;
		animationState: NPCAnimationState;
	}) {
		super({ idx: skinIdx, pos, reward });
		this.id = id;
		this.displayName = displayName;
		this.profession = profession;
		this.animationState = animationState;
		this.player.name = `npc_${id}`;
		this.nameplate = createNPCNameplate(displayName, profession);
		this.player.add(this.nameplate);
		this.dialogueBubble = createNPCDialogueBubble();
		this.player.add(this.dialogueBubble.sprite);
		this.thinkingBubble = createNPCThinkingBubble();
		this.player.add(this.thinkingBubble.object);
	}

	showDialogue(text: string, now: number) {
		this.dialogueBubble.show(text, now);
	}

	showThinkingRequesting(now: number) {
		this.thinkingBubble.showRequesting(now);
	}

	appendThinkingStream(chunk: string, now: number) {
		this.thinkingBubble.appendStreamChunk(chunk, now);
	}

	showThinkingReasoning(reasoning: string, now: number) {
		this.thinkingBubble.showReasoning(reasoning, now);
	}

	showThinkingExecuting(action: string, now: number) {
		this.thinkingBubble.showExecutingAction(action, now);
	}

	hideThinking() {
		this.thinkingBubble.hideNow();
	}

	setAnimationState(state: NPCAnimationState) {
		this.animationState = state;
	}

	getAnimationState() {
		return this.animationState;
	}

	update() {
		let delta = this.lastCall;
		this.lastCall = performance.now();
		delta = this.lastCall - delta;
		this.updateReward();
		this.dialogueBubble?.update(this.lastCall);

		const dx = this.target.x - this.position.x;
		const dy = this.target.y - this.position.y;
		const dz = this.target.z - this.position.z;
		const isMoving = dx * dx + dy * dy + dz * dz > symConfig.eps * symConfig.eps;
		if (isMoving) {
			this.updatePosition(delta);
			this.animationState = 'walking';
			this.reqAnimate(delta);
			return;
		}

		if (this.animationState === 'idle') {
			this.resetAnimate();
			return;
		}

		this.reqAnimate(delta);
	}

	setAnimate() {
		const phase = this.animateStamp / 75;
		const swing = Math.sin(phase);
		const oppositeSwing = Math.sin(phase + Math.PI);

		if (this.animationState === 'walking') {
			this.player.leftArm.rotation.x = swing;
			this.player.rightArm.rotation.x = oppositeSwing;
			this.player.leftLeg.rotation.x = swing;
			this.player.rightLeg.rotation.x = oppositeSwing;
			this.player.head.rotation.y = 0;
			return;
		}

		if (this.animationState === 'mining') {
			this.player.rightArm.rotation.x = -0.4 + Math.sin(phase * 1.8) * 1.1;
			this.player.leftArm.rotation.x = 0.2 + Math.sin(phase * 1.8 + Math.PI / 2) * 0.2;
			this.player.leftLeg.rotation.x = Math.sin(phase * 0.9) * 0.08;
			this.player.rightLeg.rotation.x = Math.sin(phase * 0.9 + Math.PI) * 0.08;
			this.player.head.rotation.y = 0;
			return;
		}

		if (this.animationState === 'building') {
			this.player.leftArm.rotation.x = -0.2 + Math.sin(phase * 1.3) * 0.75;
			this.player.rightArm.rotation.x = -0.2 + Math.sin(phase * 1.3 + Math.PI) * 0.75;
			this.player.leftLeg.rotation.x = Math.sin(phase) * 0.05;
			this.player.rightLeg.rotation.x = Math.sin(phase + Math.PI) * 0.05;
			this.player.head.rotation.y = 0;
			return;
		}

		if (this.animationState === 'speaking') {
			this.player.leftArm.rotation.x = 0.1 + Math.sin(phase * 1.4) * 0.35;
			this.player.rightArm.rotation.x = 0.1 + Math.sin(phase * 1.4 + Math.PI / 2) * 0.35;
			this.player.leftLeg.rotation.x = 0;
			this.player.rightLeg.rotation.x = 0;
			this.player.head.rotation.y = Math.sin(phase * 0.5) * 0.18;
			return;
		}

		this.player.leftArm.rotation.x = 0;
		this.player.rightArm.rotation.x = 0;
		this.player.leftLeg.rotation.x = 0;
		this.player.rightLeg.rotation.x = 0;
		this.player.head.rotation.y = 0;
	}
}
