import * as THREE from 'three';
import type { SimulationNPCState } from '../../simulation';

const MARKER_RADIUS = 0.28;

interface MarkerEntry {
	mesh: THREE.Mesh;
	npc: SimulationNPCState;
}

const createMarker = (): THREE.Mesh => {
	const geometry = new THREE.SphereGeometry(MARKER_RADIUS, 16, 16);
	const material = new THREE.MeshBasicMaterial({ color: 0x29f0ff, transparent: true, opacity: 0.9 });
	const marker = new THREE.Mesh(geometry, material);
	marker.renderOrder = 10;
	return marker;
};

export class ObserverMarkerLayer {
	private readonly scene: THREE.Scene;

	private readonly markerMap: Map<string, MarkerEntry>;

	private markerVisible: boolean;

	constructor(scene: THREE.Scene) {
		this.scene = scene;
		this.markerMap = new Map();
		this.markerVisible = false;
	}

	sync(npcs: SimulationNPCState[]): void {
		const incoming = new Set(npcs.map(npc => npc.id));
		npcs.forEach(npc => {
			const current = this.markerMap.get(npc.id);
			if (!current) {
				const marker = createMarker();
				marker.name = `observer_marker_${npc.id}`;
				marker.userData.npcId = npc.id;
				this.scene.add(marker);
				this.markerMap.set(npc.id, { mesh: marker, npc });
			}
			const entry = this.markerMap.get(npc.id);
			if (!entry) return;
			entry.npc = npc;
			entry.mesh.position.set(npc.position.x, npc.position.y + 2.15, npc.position.z);
			entry.mesh.visible = this.markerVisible;
		});

		[...this.markerMap.entries()].forEach(([id, entry]) => {
			if (incoming.has(id)) return;
			this.scene.remove(entry.mesh);
			entry.mesh.geometry.dispose();
			(entry.mesh.material as THREE.Material).dispose();
			this.markerMap.delete(id);
		});
	}

	setVisible(visible: boolean): void {
		this.markerVisible = visible;
		this.markerMap.forEach(entry => {
			entry.mesh.visible = visible;
		});
	}

	pick(intersections: THREE.Intersection[]): SimulationNPCState | null {
		const markerId = intersections.map(item => item.object.userData.npcId).find((value): value is string => typeof value === 'string');
		if (!markerId) {
			return null;
		}
		return this.markerMap.get(markerId)?.npc ?? null;
	}

	getObjects(): THREE.Object3D[] {
		return [...this.markerMap.values()].map(entry => entry.mesh);
	}

	clear(): void {
		this.markerMap.forEach(entry => {
			this.scene.remove(entry.mesh);
			entry.mesh.geometry.dispose();
			(entry.mesh.material as THREE.Material).dispose();
		});
		this.markerMap.clear();
	}
}
