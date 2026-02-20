import * as THREE from 'three';
import { config } from '../../controller/config';
import { NPCEntity } from './entity';
import { getNPCSkinById } from './personas';
import { NPCRenderSnapshot } from './types';

const mapActionToAnimation = (action: string): NPCRenderSnapshot['animationState'] => {
	if (action === 'move') return 'walking';
	if (action === 'build') return 'building';
	if (action === 'gather') return 'mining';
	if (action === 'dialogue') return 'speaking';
	return 'idle';
};

export const toNPCRenderSnapshot = (state: {
	id: string;
	name: string;
	profession: string;
	position: { x: number; y: number; z: number };
	lastAction?: string;
	thinkingState: NPCRenderSnapshot['thinkingState'];
}): NPCRenderSnapshot => ({
	id: state.id,
	name: state.name,
	profession: state.profession,
	position: state.position,
	animationState: mapActionToAnimation(state.lastAction ?? 'idle'),
	thinkingState: state.thinkingState,
});

export class NPCRenderer {
	private readonly scene: THREE.Scene;

	private readonly npcMap: Map<string, NPCEntity>;

	constructor(scene: THREE.Scene) {
		this.scene = scene;
		this.npcMap = new Map();
	}

	syncSnapshots(snapshots: NPCRenderSnapshot[]) {
		const incoming = new Set(snapshots.map(snapshot => snapshot.id));
		snapshots.forEach(snapshot => this.upsertNPC(snapshot));
		[...this.npcMap.entries()].forEach(([id, npc]) => {
			if (incoming.has(id)) return;
			this.scene.remove(npc.player);
			npc.player.remove();
			this.npcMap.delete(id);
		});
	}

	render() {
		const visibilityDistance = Math.max(24, config.renderer.stageSize / 2);
		const observer = new THREE.Vector3(config.state.posX, config.state.posY, config.state.posZ);
		this.npcMap.forEach(npc => {
			npc.update();
			const dist = observer.distanceTo(npc.position);
			const visible = dist <= visibilityDistance;
			npc.player.visible = visible;
			npc.nameplate.visible = visible;
		});
	}

	clear() {
		this.npcMap.forEach(npc => {
			npc.player.remove(npc.nameplate);
			this.scene.remove(npc.player);
			npc.player.remove();
		});
		this.npcMap.clear();
	}

	private upsertNPC(snapshot: NPCRenderSnapshot) {
		const existing = this.npcMap.get(snapshot.id);
		if (existing) {
			existing.setAnimationState(snapshot.animationState);
			existing.setPosition({ x: snapshot.position.x, y: snapshot.position.y + 0.25, z: snapshot.position.z });
			if (snapshot.rotation?.y !== undefined) existing.setRotation({ y: snapshot.rotation.y });
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
		this.npcMap.set(snapshot.id, npc);
		this.scene.add(npc.player);
	}
}
