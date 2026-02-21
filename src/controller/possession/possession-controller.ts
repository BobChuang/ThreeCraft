import { config, language } from '../config';
import type { Controller } from '..';
import type { SimulationInventorySlot, SimulationNPCState } from '../../simulation';

const POSSESSION_RANGE = 4.5;

interface CachedPlayerState {
	position: { x: number; y: number; z: number };
	rotation: { x: number; y: number; z: number };
	bagItems: (number | null)[];
	activeBagIndex: number;
}

interface ActivePossession {
	npcId: string;
	playerState: CachedPlayerState;
	lastHudSignature: string;
}

const toBagItems = (inventory: SimulationInventorySlot[]): (number | null)[] =>
	inventory.slice(0, 10).map(slot => {
		if (!slot.type || slot.quantity <= 0) return null;
		const idx = Number.parseInt(slot.type, 10);
		if (!Number.isInteger(idx)) return null;
		return idx;
	});

const toHudSignature = (npc: SimulationNPCState): string => {
	const inventorySignature = npc.inventory.map(slot => `${slot.type ?? 'null'}:${slot.quantity}`).join('|');
	return `${npc.survival.hp}/${npc.survival.hunger}|${inventorySignature}`;
};

const toInventorySummary = (inventory: SimulationInventorySlot[]): string => {
	const list = inventory
		.filter(slot => slot.type && slot.quantity > 0)
		.slice(0, 3)
		.map(slot => `${slot.type} x${slot.quantity}`);
	if (list.length === 0) return 'empty';
	return list.join(', ');
};

export class PossessionController {
	private readonly host: Controller;

	private active: ActivePossession | null;

	constructor(host: Controller) {
		this.host = host;
		this.active = null;
	}

	reset(): void {
		if (this.active) this.releaseActiveNPC();
		this.active = null;
	}

	isPossessing(): boolean {
		return this.active !== null;
	}

	getPossessedNPCId(): string | null {
		return this.active?.npcId ?? null;
	}

	getPossessedNPCName(): string | null {
		if (!this.active || !this.host.simulationEngine) return null;
		const npc = this.host.getNPCStateFromClientBus(this.active.npcId) ?? this.host.simulationEngine.getNPCStates().find(item => item.id === this.active?.npcId);
		return npc?.name ?? null;
	}

	handleToggleRequest(): void {
		if (this.host.multiPlay.working) return;
		if (this.active) {
			this.releaseActiveNPC();
			return;
		}
		const target = this.findNearestNPC();
		if (!target) {
			this.host.ui.menu.setNotify(language.possessionNoTarget, 1400, this.host.uiController.ui.actionControl.elem);
			return;
		}
		this.possessNPC(target.id);
	}

	possessNPC(npcId: string): boolean {
		if (this.active) {
			this.host.ui.menu.setNotify(language.possessionConflict, 1400, this.host.uiController.ui.actionControl.elem);
			return false;
		}
		const simulation = this.host.simulationEngine;
		const { core } = this.host;
		if (!simulation || !core) {
			this.host.ui.menu.setNotify(language.developing, 1200, this.host.uiController.ui.actionControl.elem);
			return false;
		}
		const npc = this.host.getNPCStateFromClientBus(npcId) ?? simulation.getNPCStates().find(item => item.id === npcId);
		if (!npc) {
			this.host.ui.menu.setNotify(language.possessionNoTarget, 1200, this.host.uiController.ui.actionControl.elem);
			return false;
		}

		this.active = {
			npcId,
			playerState: {
				position: {
					x: config.state.posX,
					y: config.state.posY,
					z: config.state.posZ,
				},
				rotation: {
					x: core.camera.rotation.x,
					y: core.camera.rotation.y,
					z: core.camera.rotation.z,
				},
				bagItems: [...this.host.uiController.ui.bag.items],
				activeBagIndex: config.bag.activeIndex,
			},
			lastHudSignature: '',
		};

		simulation.setNPCDecisionPaused(npcId, true);
		config.state.posX = npc.position.x;
		config.state.posY = npc.position.y;
		config.state.posZ = npc.position.z;
		core.camera.position.set(config.state.posX, config.state.posY, config.state.posZ);
		this.syncPossessedStateFromSimulation();
		this.host.ui.menu.setNotify(`${language.possessionStart}: ${npc.name}`, 1200, this.host.uiController.ui.actionControl.elem);
		return true;
	}

	releaseActiveNPC(): boolean {
		if (!this.active) return false;
		if (!this.host.core) return false;
		const { npcId, playerState } = this.active;
		this.host.simulationEngine?.setNPCDecisionPaused(npcId, false);

		config.state.posX = playerState.position.x;
		config.state.posY = playerState.position.y;
		config.state.posZ = playerState.position.z;
		this.host.core.camera.position.set(config.state.posX, config.state.posY, config.state.posZ);
		this.host.core.camera.rotation.set(playerState.rotation.x, playerState.rotation.y, playerState.rotation.z);
		this.host.uiController.ui.bag.items = [...playerState.bagItems];
		config.bag.activeIndex = playerState.activeBagIndex;
		this.host.uiController.ui.bag.update();
		this.host.uiController.ui.bag.highlight();

		this.active = null;
		this.host.ui.menu.setNotify(language.possessionRelease, 1200, this.host.uiController.ui.actionControl.elem);
		return true;
	}

	syncControlledNPCPosition(): void {
		if (!this.active) return;
		this.host.simulationEngine?.overrideNPCPosition(this.active.npcId, {
			x: config.state.posX,
			y: config.state.posY,
			z: config.state.posZ,
		});
	}

	syncPossessedStateFromSimulation(): void {
		if (!this.active || !this.host.simulationEngine) return;
		const { active } = this;
		const npc = this.host.getNPCStateFromClientBus(active.npcId) ?? this.host.simulationEngine.getNPCStates().find(item => item.id === active.npcId);
		if (!npc) {
			this.releaseActiveNPC();
			return;
		}
		const signature = toHudSignature(npc);
		if (signature === active.lastHudSignature) return;
		active.lastHudSignature = signature;
		this.host.uiController.ui.bag.items = toBagItems(npc.inventory);
		config.bag.activeIndex = 0;
		this.host.uiController.ui.bag.update();
		this.host.uiController.ui.bag.highlight();
		const info = `${npc.name} HP ${npc.survival.hp} | Hunger ${npc.survival.hunger} | ${toInventorySummary(npc.inventory)}`;
		this.host.ui.menu.setNotify(info, 1400, this.host.uiController.ui.actionControl.elem);
	}

	private findNearestNPC(): SimulationNPCState | null {
		if (!this.host.simulationEngine) return null;
		const fromBus = this.host.getNPCStatesFromClientBus();
		const npcs = fromBus.length > 0 ? fromBus : this.host.simulationEngine.getNPCStates();
		let nearest: SimulationNPCState | null = null;
		let nearestDist = Number.POSITIVE_INFINITY;
		npcs.forEach(npc => {
			const dx = npc.position.x - config.state.posX;
			const dy = npc.position.y - config.state.posY;
			const dz = npc.position.z - config.state.posZ;
			const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
			if (dist <= POSSESSION_RANGE && dist < nearestDist) {
				nearest = npc;
				nearestDist = dist;
			}
		});
		return nearest;
	}
}
