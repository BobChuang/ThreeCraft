import { config } from '../../../controller/config';
import './css/style.less';

class BagPcPlugin {
	bagOuterElem: HTMLElement;

	bagInnerElem: HTMLElement;

	bagItemsElem!: HTMLElement[];

	host: { highlight: () => void; toggleBag: () => void; bagBox: { working: boolean } };

	// eslint-disable-next-line
	clickItemEventListener: (e: MouseEvent) => void;

	// eslint-disable-next-line
	keyupItemEventListener: (e: KeyboardEvent) => void;

	// eslint-disable-next-line
	wheelItemEventListener: (e: WheelEvent) => void;

	constructor(bagOuterElem: HTMLElement, host: { highlight: () => void; toggleBag: () => void; bagBox: { working: boolean } }) {
		// 清除其他插件
		this.bagInnerElem = document.createElement('div');
		this.bagInnerElem.classList.add('pc');
		this.bagOuterElem = bagOuterElem;
		Array.from(this.bagOuterElem.children).forEach(d => !d.className.includes('bag-box') && d.remove());
		this.bagOuterElem.appendChild(this.bagInnerElem);
		this.host = host;
		// 添加事件监听
		this.clickItemEventListener = BagPcPlugin.getClickItemEventListener(this.host);
		this.keyupItemEventListener = BagPcPlugin.getKeyupItemEventListener(this.host);
		this.wheelItemEventListener = BagPcPlugin.getWheelItemEventListener(this.host);
	}

	// 调整位置
	place() {
		this;
	}

	// 开启监听
	listen() {
		this.bagInnerElem.addEventListener('click', this.clickItemEventListener);
		document.addEventListener('keyup', this.keyupItemEventListener);
		document.addEventListener('wheel', this.wheelItemEventListener);
	}

	// 关闭监听
	pause() {
		this.bagInnerElem.removeEventListener('click', this.clickItemEventListener);
		document.removeEventListener('keyup', this.keyupItemEventListener);
		document.removeEventListener('wheel', this.wheelItemEventListener);
	}

	destroy() {
		this.pause();
		this.bagInnerElem.remove();
	}

	// 点击背包框激活对应元素??
	static getClickItemEventListener(host: { highlight: () => void }) {
		return (e: MouseEvent) => {
			e.stopPropagation();
			const idxValue = (e.target as HTMLElement)?.getAttribute('idx') ?? '-1';
			const idx = Number.parseInt(idxValue, 10);
			if (idx >= 0 && idx <= 9) {
				config.bag.activeIndex = idx;
				host.highlight();
			}
			return false;
		};
	}

	// 按0-9激活不同背包框
	static getKeyupItemEventListener(host: { bagBox: { working: boolean }; highlight: () => void }) {
		return (e: KeyboardEvent) => {
			if (host.bagBox.working) return;
			const idx = Number.parseInt(e.key, 10);
			if (idx >= 0 && idx <= 9) {
				config.bag.activeIndex = (idx + 9) % 10;
				host.highlight();
			}
		};
	}

	// 滚轮激活不同背包框
	static getWheelItemEventListener(host: { bagBox: { working: boolean }; highlight: () => void }) {
		let lenCnt = 0;
		return (e: WheelEvent) => {
			if (host.bagBox.working) return;
			if (lenCnt * e.deltaY < 0) {
				lenCnt = e.deltaY;
			} else {
				lenCnt += e.deltaY;
			}
			if (lenCnt >= 30 || lenCnt <= -30) {
				config.bag.activeIndex = (config.bag.activeIndex + (e.deltaY < 0 ? -1 : 1) + 10) % 10;
				lenCnt = 0;
			}
			host.highlight();
		};
	}
}

export default BagPcPlugin;
