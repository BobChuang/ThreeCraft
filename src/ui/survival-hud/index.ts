import type { SurvivalHUDViewModel } from './types';
import './css/style.less';

const clampPercent = (value: number): number => Math.min(100, Math.max(0, value));

const toPercent = (value: number, max: number): number => {
	if (max <= 0) return 0;
	return clampPercent((value / max) * 100);
};

const createSignature = (viewModel: SurvivalHUDViewModel): string => `${viewModel.modeText}|${viewModel.hp}/${viewModel.maxHp}|${viewModel.hunger}/${viewModel.maxHunger}|${viewModel.activeNpcCount}`;

class SurvivalHUD {
	root: HTMLElement;

	private readonly modeElem: HTMLElement;

	private readonly hpFillElem: HTMLElement;

	private readonly hungerFillElem: HTMLElement;

	private readonly hpValueElem: HTMLElement;

	private readonly hungerValueElem: HTMLElement;

	private readonly npcCountElem: HTMLElement;

	private lastSignature = '';

	constructor(el: HTMLElement) {
		Array.from(el.children).forEach(child => child.getAttribute('id') === 'survival-hud' && child.remove());
		this.root = document.createElement('section');
		this.root.id = 'survival-hud';
		this.root.className = 'survival-hud';
		this.root.innerHTML = `<div class="survival-hud-mode"></div><div class="survival-hud-bars"><div class="survival-hud-label">HP</div><div class="survival-hud-bar hp-bar"><span class="survival-hud-fill"></span><strong class="survival-hud-value"></strong></div><div class="survival-hud-label">HUNGER</div><div class="survival-hud-bar hunger-bar"><span class="survival-hud-fill"></span><strong class="survival-hud-value"></strong></div></div><div class="survival-hud-npc-count"></div>`;
		this.modeElem = this.root.querySelector('.survival-hud-mode') as HTMLElement;
		this.hpFillElem = this.root.querySelector('.hp-bar .survival-hud-fill') as HTMLElement;
		this.hungerFillElem = this.root.querySelector('.hunger-bar .survival-hud-fill') as HTMLElement;
		this.hpValueElem = this.root.querySelector('.hp-bar .survival-hud-value') as HTMLElement;
		this.hungerValueElem = this.root.querySelector('.hunger-bar .survival-hud-value') as HTMLElement;
		this.npcCountElem = this.root.querySelector('.survival-hud-npc-count') as HTMLElement;
		el.appendChild(this.root);
	}

	sync(viewModel: SurvivalHUDViewModel | null): void {
		if (!viewModel) {
			this.root.classList.remove('active');
			this.lastSignature = '';
			return;
		}
		this.root.classList.add('active');
		const signature = createSignature(viewModel);
		if (signature === this.lastSignature) return;
		this.lastSignature = signature;
		this.modeElem.textContent = viewModel.modeText;
		this.hpFillElem.style.width = `${toPercent(viewModel.hp, viewModel.maxHp)}%`;
		this.hungerFillElem.style.width = `${toPercent(viewModel.hunger, viewModel.maxHunger)}%`;
		this.hpValueElem.textContent = `${Math.max(0, Math.round(viewModel.hp))}/${Math.max(1, Math.round(viewModel.maxHp))}`;
		this.hungerValueElem.textContent = `${Math.max(0, Math.round(viewModel.hunger))}/${Math.max(1, Math.round(viewModel.maxHunger))}`;
		this.npcCountElem.textContent = `${Math.max(0, Math.round(viewModel.activeNpcCount))} 个 NPC 活跃`;
	}
}

export default SurvivalHUD;
