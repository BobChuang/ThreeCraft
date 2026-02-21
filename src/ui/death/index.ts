import './css/style.less';

interface DeathOverlayOptions {
	onRespawn: () => void;
}

class DeathOverlay {
	elem: HTMLElement;

	messageElem: HTMLElement;

	buttonElem: HTMLButtonElement;

	private onRespawn: (() => void) | null;

	constructor(el: HTMLElement) {
		Array.from(el.children).forEach(child => child.getAttribute('id') === 'death-overlay' && child.remove());
		this.elem = document.createElement('div');
		this.elem.setAttribute('id', 'death-overlay');

		this.messageElem = document.createElement('div');
		this.messageElem.setAttribute('id', 'death-message');
		this.messageElem.innerText = '你已死亡';

		this.buttonElem = document.createElement('button');
		this.buttonElem.setAttribute('id', 'death-respawn-btn');
		this.buttonElem.innerText = '重生';
		this.buttonElem.addEventListener('click', () => {
			if (!this.onRespawn) return;
			this.onRespawn();
		});

		this.elem.appendChild(this.messageElem);
		this.elem.appendChild(this.buttonElem);
		el.appendChild(this.elem);

		this.onRespawn = null;
	}

	open(options: DeathOverlayOptions): void {
		this.onRespawn = options.onRespawn;
		this.elem.classList.add('active');
	}

	close(): void {
		this.onRespawn = null;
		this.elem.classList.remove('active');
	}

	isOpen(): boolean {
		return this.elem.classList.contains('active');
	}
}

export default DeathOverlay;
