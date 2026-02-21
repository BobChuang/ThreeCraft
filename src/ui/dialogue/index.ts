import './css/style.less';

interface DialogueOpenOptions {
	targetNpcId: string;
	targetNpcName: string;
	onSubmit: (content: string) => void;
}

class DialoguePanel {
	elem: HTMLElement;

	labelElem: HTMLElement;

	inputElem: HTMLInputElement;

	activeTargetNpcId: string | null;

	onSubmit: ((content: string) => void) | null;

	constructor(el: HTMLElement) {
		Array.from(el.children).forEach(d => d.getAttribute('id') === 'dialogue-panel' && d.remove());
		this.elem = document.createElement('div');
		this.elem.setAttribute('id', 'dialogue-panel');
		this.labelElem = document.createElement('span');
		this.labelElem.setAttribute('id', 'dialogue-target');
		this.inputElem = document.createElement('input');
		this.inputElem.setAttribute('id', 'dialogue-input');
		this.inputElem.setAttribute('placeholder', 'Type message and press Enter...');
		this.inputElem.setAttribute('maxlength', '180');
		this.elem.appendChild(this.labelElem);
		this.elem.appendChild(this.inputElem);
		el.appendChild(this.elem);
		this.activeTargetNpcId = null;
		this.onSubmit = null;
		this.inputElem.addEventListener('keydown', e => {
			if (e.key === 'Escape') {
				e.preventDefault();
				this.close();
				return;
			}
			if (e.key !== 'Enter') return;
			e.preventDefault();
			const content = this.inputElem.value.trim();
			if (!content || !this.onSubmit) {
				this.close();
				return;
			}
			this.onSubmit(content);
			this.close();
		});
	}

	open(options: DialogueOpenOptions): void {
		this.activeTargetNpcId = options.targetNpcId;
		this.onSubmit = options.onSubmit;
		this.labelElem.innerText = `Talking to ${options.targetNpcName}`;
		this.inputElem.value = '';
		this.elem.classList.add('active');
		this.inputElem.focus();
	}

	close(): void {
		this.activeTargetNpcId = null;
		this.onSubmit = null;
		this.elem.classList.remove('active');
		this.inputElem.blur();
	}

	isOpen(): boolean {
		return this.elem.classList.contains('active');
	}
}

export default DialoguePanel;
