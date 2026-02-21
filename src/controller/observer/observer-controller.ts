import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import type { Controller } from '..';
import type Core from '../../core';
import { config } from '../config';
import { ObserverMarkerLayer } from './observer-markers';
import { ObserverUI } from './observer-ui';

const OBSERVER_HEIGHT = 42;
const PAN_SPEED = 18;

interface CameraSnapshot {
	position: THREE.Vector3;
	rotation: THREE.Euler;
}

export class ObserverController {
	private readonly host: Controller;

	private readonly core: Core;

	private readonly orbit: OrbitControls;

	private readonly markers: ObserverMarkerLayer;

	private readonly ui: ObserverUI;

	private readonly raycaster: THREE.Raycaster;

	private readonly pointer: THREE.Vector2;

	private readonly moveState: { w: boolean; a: boolean; s: boolean; d: boolean };

	private enabled: boolean;

	private cameraSnapshot: CameraSnapshot | null;

	private selectedNpcId: string | null;

	private readonly keyDownListener: (e: KeyboardEvent) => void;

	private readonly keyUpListener: (e: KeyboardEvent) => void;

	private readonly clickListener: (e: MouseEvent) => void;

	private readonly dblClickListener: (e: MouseEvent) => void;

	constructor(host: Controller) {
		this.host = host;
		if (!host.core) throw new Error('ObserverController requires initialized core');
		this.core = host.core;
		this.enabled = false;
		this.cameraSnapshot = null;
		this.selectedNpcId = null;
		this.raycaster = new THREE.Raycaster();
		this.pointer = new THREE.Vector2();
		this.moveState = { w: false, a: false, s: false, d: false };
		this.markers = new ObserverMarkerLayer(this.core.scene);
		const hudStage = document.getElementById('HUD-stage') ?? document.body;
		this.ui = new ObserverUI(hudStage);
		this.orbit = new OrbitControls(this.core.camera, this.core.renderer.domElement);
		this.orbit.enabled = false;
		this.orbit.enableDamping = true;
		this.orbit.enableZoom = true;
		this.orbit.enablePan = false;
		this.orbit.mouseButtons.LEFT = THREE.MOUSE.PAN;
		this.orbit.mouseButtons.MIDDLE = THREE.MOUSE.ROTATE;
		this.orbit.mouseButtons.RIGHT = THREE.MOUSE.PAN;
		this.orbit.maxPolarAngle = Math.PI * 0.499;
		this.orbit.minPolarAngle = 0;
		this.orbit.minDistance = 8;
		this.orbit.maxDistance = 180;
		this.keyDownListener = this.handleKeyDown.bind(this);
		this.keyUpListener = this.handleKeyUp.bind(this);
		this.clickListener = this.handleClick.bind(this);
		this.dblClickListener = this.handleDoubleClick.bind(this);
		document.addEventListener('keydown', this.keyDownListener);
		document.addEventListener('keyup', this.keyUpListener);
		this.core.renderer.domElement.addEventListener('click', this.clickListener);
		this.core.renderer.domElement.addEventListener('dblclick', this.dblClickListener);
	}

	isObserverMode(): boolean {
		return this.enabled;
	}

	update(): void {
		if (!this.host.simulationEngine || this.host.multiPlay.working) {
			this.markers.setVisible(false);
			this.updateIndicator();
			return;
		}
		const snapshots = this.host.simulationEngine.getNPCStates();
		this.markers.sync(snapshots);
		this.markers.setVisible(this.enabled);
		if (this.enabled) {
			this.updateObserverPan();
			this.orbit.update();
			config.state.posX = this.core.camera.position.x;
			config.state.posY = this.core.camera.position.y;
			config.state.posZ = this.core.camera.position.z;
		}
		if (this.selectedNpcId) {
			const selected = snapshots.find(npc => npc.id === this.selectedNpcId);
			if (selected) this.ui.showNPCInfo(selected);
			else {
				this.selectedNpcId = null;
				this.ui.hideNPCInfo();
			}
		}
		this.updateIndicator();
	}

	reset(): void {
		if (this.enabled) this.exitObserverMode();
		this.selectedNpcId = null;
		this.ui.hideNPCInfo();
		this.markers.clear();
		this.updateIndicator();
	}

	destroy(): void {
		this.reset();
		document.removeEventListener('keydown', this.keyDownListener);
		document.removeEventListener('keyup', this.keyUpListener);
		this.core.renderer.domElement.removeEventListener('click', this.clickListener);
		this.core.renderer.domElement.removeEventListener('dblclick', this.dblClickListener);
		this.orbit.dispose();
		this.ui.destroy();
	}

	private handleKeyDown(e: KeyboardEvent): void {
		if (!this.host.running || config.controller.operation !== 'pc') return;
		if (['g', 'G'].includes(e.key)) {
			e.preventDefault();
			this.toggleObserverMode();
			return;
		}
		if (!this.enabled) return;
		if (['w', 'W'].includes(e.key)) this.moveState.w = true;
		if (['a', 'A'].includes(e.key)) this.moveState.a = true;
		if (['s', 'S'].includes(e.key)) this.moveState.s = true;
		if (['d', 'D'].includes(e.key)) this.moveState.d = true;
	}

	private handleKeyUp(e: KeyboardEvent): void {
		if (!this.enabled) return;
		if (['w', 'W'].includes(e.key)) this.moveState.w = false;
		if (['a', 'A'].includes(e.key)) this.moveState.a = false;
		if (['s', 'S'].includes(e.key)) this.moveState.s = false;
		if (['d', 'D'].includes(e.key)) this.moveState.d = false;
	}

	private handleClick(e: MouseEvent): void {
		if (!this.enabled || !this.host.running) return;
		const npc = this.pickNPCFromEvent(e);
		if (!npc) {
			this.selectedNpcId = null;
			this.ui.hideNPCInfo();
			return;
		}
		this.selectedNpcId = npc.id;
		this.ui.showNPCInfo(npc);
	}

	private handleDoubleClick(e: MouseEvent): void {
		if (!this.enabled || !this.host.running) return;
		const npc = this.pickNPCFromEvent(e);
		if (!npc) return;
		if (this.host.possessionController.isPossessing()) return;
		this.exitObserverMode();
		this.host.possessionController.possessNPC(npc.id);
		this.updateIndicator();
	}

	private pickNPCFromEvent(e: MouseEvent) {
		const rect = this.core.renderer.domElement.getBoundingClientRect();
		this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
		this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
		this.raycaster.setFromCamera(this.pointer, this.core.camera);
		const intersections = this.raycaster.intersectObjects(this.markers.getObjects(), false);
		return this.markers.pick(intersections);
	}

	private toggleObserverMode(): void {
		if (this.host.multiPlay.working) return;
		if (this.host.possessionController.isPossessing()) return;
		if (this.enabled) this.exitObserverMode();
		else this.enterObserverMode();
		this.updateIndicator();
	}

	private enterObserverMode(): void {
		if (this.enabled) return;
		this.host.gameController.handleMoveAction({ font: 0, left: 0, up: 0 });
		this.cameraSnapshot = {
			position: this.core.camera.position.clone(),
			rotation: this.core.camera.rotation.clone(),
		};
		this.enabled = true;
		this.moveState.w = false;
		this.moveState.a = false;
		this.moveState.s = false;
		this.moveState.d = false;
		this.host.uiController.ui.actionControl.pause();
		document.exitPointerLock && document.exitPointerLock();
		const target = new THREE.Vector3(config.state.posX, config.state.posY, config.state.posZ);
		this.core.camera.position.set(target.x, target.y + OBSERVER_HEIGHT, target.z);
		this.core.camera.lookAt(target);
		this.core.camera.updateMatrix();
		this.orbit.target.copy(target);
		this.orbit.enabled = true;
		this.orbit.update();
	}

	private exitObserverMode(): void {
		if (!this.enabled) return;
		this.host.gameController.handleMoveAction({ font: 0, left: 0, up: 0 });
		this.enabled = false;
		this.orbit.enabled = false;
		this.moveState.w = false;
		this.moveState.a = false;
		this.moveState.s = false;
		this.moveState.d = false;
		this.markers.setVisible(false);
		this.selectedNpcId = null;
		this.ui.hideNPCInfo();
		if (this.cameraSnapshot) {
			this.core.camera.position.copy(this.cameraSnapshot.position);
			this.core.camera.rotation.copy(this.cameraSnapshot.rotation);
			config.state.posX = this.core.camera.position.x;
			config.state.posY = this.core.camera.position.y;
			config.state.posZ = this.core.camera.position.z;
		}
		if (this.host.running) this.host.uiController.ui.actionControl.listen();
	}

	private updateObserverPan(): void {
		const forward = (this.moveState.w ? 1 : 0) + (this.moveState.s ? -1 : 0);
		const left = (this.moveState.a ? 1 : 0) + (this.moveState.d ? -1 : 0);
		if (forward === 0 && left === 0) return;
		const yaw = this.core.camera.rotation.y;
		const speed = PAN_SPEED * (1 / 60);
		const xDelta = (-Math.sin(yaw) * forward + Math.cos(yaw) * left) * speed;
		const zDelta = (-Math.cos(yaw) * forward - Math.sin(yaw) * left) * speed;
		this.core.camera.position.x += xDelta;
		this.core.camera.position.z += zDelta;
		this.orbit.target.x += xDelta;
		this.orbit.target.z += zDelta;
	}

	private updateIndicator(): void {
		const possessedName = this.host.possessionController.getPossessedNPCName();
		if (possessedName) {
			this.ui.setIndicator('normal', possessedName);
			return;
		}
		this.ui.setIndicator(this.enabled ? 'observer' : 'normal');
	}
}
