import * as THREE from 'three';
import { config } from '../../controller/config';
import { NPCEntity } from './entity';
import { MonsterEntity } from './monster-entity';
import { getNPCSkinById } from './personas';
import { NPCRenderSnapshot } from './types';

const mapActionToAnimation = (action: string): NPCRenderSnapshot['animationState'] => {
	if (action === 'move') return 'walking';
	if (action === 'build') return 'building';
	if (action === 'gather') return 'mining';
	if (action === 'dialogue') return 'speaking';
	return 'idle';
};

const inferMonsterType = (id: string, profession: string, name: string): NPCRenderSnapshot['monsterType'] | undefined => {
	if (id.startsWith('monster-')) {
		if (profession === 'mutant' || name === 'Mutant') return 'mutant';
		return 'corrupted-bot';
	}
	if (profession === 'mutant' || profession === 'corrupted-bot') return profession;
	return undefined;
};

export const toNPCRenderSnapshot = (state: {
	id: string;
	name: string;
	profession: string;
	entityType?: NPCRenderSnapshot['entityType'];
	monsterType?: NPCRenderSnapshot['monsterType'];
	position: { x: number; y: number; z: number };
	lastAction?: string;
	thinkingState: NPCRenderSnapshot['thinkingState'];
}): NPCRenderSnapshot => {
	const inferredMonsterType = state.monsterType ?? inferMonsterType(state.id, state.profession, state.name);
	return {
		id: state.id,
		entityType: state.entityType ?? (inferredMonsterType ? 'monster' : 'npc'),
		monsterType: inferredMonsterType,
		name: state.name,
		profession: state.profession,
		position: state.position,
		animationState: mapActionToAnimation(state.lastAction ?? 'idle'),
		thinkingState: state.thinkingState,
	};
};

export class NPCRenderer {
	private readonly scene: THREE.Scene;

	private readonly entityMap: Map<string, NPCEntity | MonsterEntity>;

	constructor(scene: THREE.Scene) {
		this.scene = scene;
		this.entityMap = new Map();
	}

	syncSnapshots(snapshots: NPCRenderSnapshot[]) {
		const incoming = new Set(snapshots.map(snapshot => snapshot.id));
		snapshots.forEach(snapshot => this.upsertEntity(snapshot));
		[...this.entityMap.entries()].forEach(([id, entity]) => {
			if (incoming.has(id)) return;
			this.scene.remove(entity.player);
			entity.player.remove();
			this.entityMap.delete(id);
		});
	}

	render() {
		const visibilityDistance = Math.max(24, config.renderer.stageSize / 2);
		const observer = new THREE.Vector3(config.state.posX, config.state.posY, config.state.posZ);
		const now = Date.now();
		this.entityMap.forEach(entity => {
			entity.update();
			const dist = observer.distanceTo(entity.position);
			const visible = dist <= visibilityDistance;
			entity.player.visible = visible;
			entity.nameplate.visible = visible;
			if (entity instanceof NPCEntity) {
				entity.dialogueBubble.sprite.visible = visible && entity.dialogueBubble.sprite.visible;
				entity.thinkingBubble.updateVisibility(visible, now);
			}
		});
	}

	showDialogue(npcId: string, text: string, now = Date.now()): void {
		const entity = this.entityMap.get(npcId);
		if (!(entity instanceof NPCEntity)) return;
		entity.showDialogue(text, now);
	}

	showThinkingRequesting(npcId: string, now = Date.now()): void {
		const entity = this.entityMap.get(npcId);
		if (!(entity instanceof NPCEntity)) return;
		entity.showThinkingRequesting(now);
	}

	appendThinkingStream(npcId: string, chunk: string, now = Date.now()): void {
		const entity = this.entityMap.get(npcId);
		if (!(entity instanceof NPCEntity)) return;
		entity.appendThinkingStream(chunk, now);
	}

	showThinkingReasoning(npcId: string, reasoning: string, now = Date.now()): void {
		const entity = this.entityMap.get(npcId);
		if (!(entity instanceof NPCEntity)) return;
		entity.showThinkingReasoning(reasoning, now);
	}

	showThinkingExecuting(npcId: string, action: string, now = Date.now()): void {
		const entity = this.entityMap.get(npcId);
		if (!(entity instanceof NPCEntity)) return;
		entity.showThinkingExecuting(action, now);
	}

	hideThinking(npcId: string): void {
		const entity = this.entityMap.get(npcId);
		if (!(entity instanceof NPCEntity)) return;
		entity.hideThinking();
	}

	findNearestNPC(position: { x: number; y: number; z: number }, maxDistance: number): NPCEntity | null {
		const observer = new THREE.Vector3(position.x, position.y, position.z);
		let nearest: NPCEntity | null = null;
		let nearestDistance = maxDistance;
		this.entityMap.forEach(entity => {
			if (!(entity instanceof NPCEntity)) return;
			const distance = observer.distanceTo(entity.position);
			if (distance > nearestDistance) return;
			nearest = entity;
			nearestDistance = distance;
		});
		return nearest;
	}

	clear() {
		this.entityMap.forEach(entity => {
			entity.player.remove(entity.nameplate);
			if (entity instanceof NPCEntity) {
				entity.player.remove(entity.dialogueBubble.sprite);
				entity.player.remove(entity.thinkingBubble.object);
			}
			this.scene.remove(entity.player);
			entity.player.remove();
		});
		this.entityMap.clear();
	}

	private upsertEntity(snapshot: NPCRenderSnapshot) {
		const existing = this.entityMap.get(snapshot.id);
		if (existing) {
			existing.setAnimationState(snapshot.animationState);
			existing.setPosition({ x: snapshot.position.x, y: snapshot.position.y + 0.25, z: snapshot.position.z });
			if (snapshot.rotation?.y !== undefined) existing.setRotation({ y: snapshot.rotation.y });
			return;
		}

		if (snapshot.entityType === 'monster' && snapshot.monsterType) {
			const monster = new MonsterEntity(snapshot.id, snapshot.monsterType, snapshot.position, snapshot.animationState);
			monster.setPosition(snapshot.position);
			this.entityMap.set(snapshot.id, monster);
			this.scene.add(monster.player);
			return;
		}

		const spawnY = snapshot.position.y + 0.25;
		const npc = new NPCEntity({
			id: snapshot.id,
			displayName: snapshot.name,
			profession: snapshot.profession,
			skinIdx: getNPCSkinById(snapshot.id),
			pos: new THREE.Vector3(snapshot.position.x, spawnY, snapshot.position.z),
			reward: new THREE.Euler(0, Math.PI, 0, 'YXZ'),
			animationState: snapshot.animationState,
		});
		npc.setPosition({ x: snapshot.position.x, y: spawnY, z: snapshot.position.z });
		this.entityMap.set(snapshot.id, npc);
		this.scene.add(npc.player);
	}
}
