import type { SimulationNPCState } from '../../simulation';

const MODE_BADGES = {
	normal: '普通',
	observer: '观察者模式',
};

export class ObserverUI {
	private readonly stage: HTMLElement;

	private readonly indicator: HTMLDivElement;

	private readonly panel: HTMLDivElement;

	constructor(stage: HTMLElement) {
		this.stage = stage;
		this.indicator = document.createElement('div');
		this.indicator.id = 'observer-mode-indicator';
		this.indicator.innerText = MODE_BADGES.normal;
		this.indicator.style.position = 'fixed';
		this.indicator.style.left = '16px';
		this.indicator.style.top = '16px';
		this.indicator.style.zIndex = '100000000';
		this.indicator.style.background = 'rgba(12, 17, 24, 0.78)';
		this.indicator.style.color = '#7ff7ff';
		this.indicator.style.border = '1px solid rgba(127, 247, 255, 0.62)';
		this.indicator.style.padding = '6px 10px';
		this.indicator.style.fontSize = '14px';
		this.indicator.style.lineHeight = '18px';
		this.indicator.style.pointerEvents = 'none';
		this.indicator.style.borderRadius = '3px';
		this.indicator.style.boxShadow = '0 0 8px rgba(41, 240, 255, 0.35)';

		this.panel = document.createElement('div');
		this.panel.id = 'observer-info-panel';
		this.panel.className = 'hidden';
		this.panel.style.position = 'fixed';
		this.panel.style.right = '16px';
		this.panel.style.top = '16px';
		this.panel.style.minWidth = '250px';
		this.panel.style.maxWidth = '320px';
		this.panel.style.zIndex = '100000000';
		this.panel.style.background = 'rgba(12, 17, 24, 0.86)';
		this.panel.style.color = '#e7f4ff';
		this.panel.style.border = '1px solid rgba(127, 247, 255, 0.45)';
		this.panel.style.padding = '10px 12px';
		this.panel.style.borderRadius = '4px';
		this.panel.style.lineHeight = '1.5';
		this.panel.style.boxShadow = '0 0 12px rgba(41, 240, 255, 0.26)';
		this.stage.appendChild(this.indicator);
		this.stage.appendChild(this.panel);
	}

	setIndicator(mode: 'normal' | 'observer', possessedNpcName?: string): void {
		if (possessedNpcName) {
			this.indicator.innerText = `附身：${possessedNpcName}`;
			return;
		}
		this.indicator.innerText = mode === 'observer' ? MODE_BADGES.observer : MODE_BADGES.normal;
	}

	showNPCInfo(npc: SimulationNPCState): void {
		this.panel.classList.remove('hidden');
		this.panel.innerHTML = `
			<div style="font-weight: 700; color: #7ff7ff; margin-bottom: 4px;">${npc.name}</div>
			<div>职业：${npc.profession}</div>
			<div>当前动作：${npc.lastAction}</div>
			<div>HP：${npc.survival.hp}</div>
			<div>饥饿：${npc.survival.hunger}</div>
		`;
	}

	hideNPCInfo(): void {
		this.panel.classList.add('hidden');
		this.panel.innerHTML = '';
	}

	destroy(): void {
		this.indicator.remove();
		this.panel.remove();
	}
}
