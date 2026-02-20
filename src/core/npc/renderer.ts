import * as THREE from 'three';
import { config } from '../../controller/config';
import Terrain from '../terrain';
import { NPCEntity } from './entity';
import { npcPersonaProfiles } from './personas';
import { NPCAnimationState } from './types';

const WALKER_ID = 'npc-7';

export class NPCRenderer {
	private readonly scene: THREE.Scene;

	private readonly terrain: Terrain;

	private readonly npcs: NPCEntity[];

	private readonly walkAnchors: THREE.Vector3[];

	private walkTargetIdx: number;

	constructor(scene: THREE.Scene, terrain: Terrain) {
		this.scene = scene;
		this.terrain = terrain;
		this.npcs = [];
		this.walkAnchors = [new THREE.Vector3(-2, 0, 7), new THREE.Vector3(6, 0, 7)];
		this.walkTargetIdx = 0;
	}

	spawnAroundOrigin() {
		this.clear();
		this.walkTargetIdx = 0;
		this.npcs.push(
			...npcPersonaProfiles.map((profile, idx) => {
				const { x } = profile.spawnOffset;
				const { z } = profile.spawnOffset;
				const y = this.terrain.getFloorHeight(x, z) + 1.25;
				const npc = new NPCEntity({
					id: `npc-${idx}`,
					displayName: profile.name,
					profession: profile.profession,
					skinIdx: profile.skinIdx,
					pos: new THREE.Vector3(x, y, z),
					reward: new THREE.Euler(0, Math.PI, 0, 'YXZ'),
					animationState: profile.defaultAnimation,
				});

				if (npc.id === WALKER_ID) {
					npc.setAnimationState('walking');
					npc.setPosition({ x: this.walkAnchors[this.walkTargetIdx].x, y, z: this.walkAnchors[this.walkTargetIdx].z });
				}

				this.scene.add(npc.player);
				return npc;
			})
		);
		this.refreshStaticStates();
	}

	render() {
		const visibilityDistance = Math.max(24, config.renderer.stageSize / 2);
		const observer = new THREE.Vector3(config.state.posX, config.state.posY, config.state.posZ);
		this.npcs.forEach(npc => {
			this.driveAnimationState(npc);
			npc.update();

			const dist = observer.distanceTo(npc.position);
			const visible = dist <= visibilityDistance;
			npc.player.visible = visible;
			npc.nameplate.visible = visible;
		});
	}

	clear() {
		this.npcs.forEach(npc => {
			npc.player.remove(npc.nameplate);
			this.scene.remove(npc.player);
			npc.player.remove();
		});
		this.npcs.length = 0;
	}

	private driveAnimationState(npc: NPCEntity) {
		if (npc.id !== WALKER_ID) return;
		const target = this.walkAnchors[this.walkTargetIdx];
		const horizontalDistance = Math.hypot(target.x - npc.position.x, target.z - npc.position.z);
		if (horizontalDistance > 0.25) return;

		this.walkTargetIdx = (this.walkTargetIdx + 1) % this.walkAnchors.length;
		const nextTarget = this.walkAnchors[this.walkTargetIdx];
		const nextY = this.terrain.getFloorHeight(nextTarget.x, nextTarget.z) + 1.25;
		npc.setAnimationState('walking');
		npc.setPosition({ x: nextTarget.x, y: nextY, z: nextTarget.z });
		npc.setRotation({ y: Math.atan2(nextTarget.x - npc.position.x, nextTarget.z - npc.position.z) } as { y: number });
	}

	private refreshStaticStates() {
		const staticStates: NPCAnimationState[] = ['idle', 'mining', 'building', 'speaking'];
		this.npcs.forEach((npc, idx) => {
			if (npc.id === WALKER_ID) return;
			npc.setAnimationState(staticStates[idx % staticStates.length]);
		});
	}
}
