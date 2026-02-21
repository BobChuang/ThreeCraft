import { renderTaskItems } from './render-task-items';
import type { TaskListPanelViewModel } from './types';
import './css/style.less';

const EMPTY_TASK_TEXT = '等待 NPC 生成 nextGoal...';

const createSignature = (viewModel: TaskListPanelViewModel): string => `${viewModel.npcName}|${viewModel.currentGoal ?? ''}|${viewModel.items.map(item => `${item.status}:${item.text}`).join('||')}`;

class TaskListPanel {
	root: HTMLElement;

	private titleElem: HTMLElement;

	private subtitleElem: HTMLElement;

	private currentGoalElem: HTMLElement;

	private listElem: HTMLElement;

	private emptyElem: HTMLElement;

	private lastSignature = '';

	constructor(el: HTMLElement) {
		Array.from(el.children).forEach(child => child.getAttribute('id') === 'npc-task-list-panel' && child.remove());
		this.root = document.createElement('aside');
		this.root.id = 'npc-task-list-panel';
		this.root.innerHTML = `<div id="npc-task-list-title">NPC TASK LIST</div><div id="npc-task-list-subtitle"></div><div id="npc-task-current-goal"></div><ol id="npc-task-list"></ol><div id="npc-task-empty"></div>`;
		this.titleElem = this.root.querySelector('#npc-task-list-title') as HTMLElement;
		this.subtitleElem = this.root.querySelector('#npc-task-list-subtitle') as HTMLElement;
		this.currentGoalElem = this.root.querySelector('#npc-task-current-goal') as HTMLElement;
		this.listElem = this.root.querySelector('#npc-task-list') as HTMLElement;
		this.emptyElem = this.root.querySelector('#npc-task-empty') as HTMLElement;
		el.appendChild(this.root);
	}

	sync(viewModel: TaskListPanelViewModel | null): void {
		if (!viewModel) {
			this.root.classList.remove('active');
			this.lastSignature = '';
			return;
		}
		this.root.classList.add('active');
		const signature = createSignature(viewModel);
		if (signature === this.lastSignature) return;
		this.lastSignature = signature;
		this.titleElem.textContent = `${viewModel.npcName} · TASK LIST`;
		this.subtitleElem.textContent = '附身中（只读）';
		this.currentGoalElem.textContent = `当前目标：${viewModel.currentGoal ?? '暂无'}`;
		const hasItems = viewModel.items.length > 0;
		this.listElem.innerHTML = hasItems ? renderTaskItems(viewModel.items) : '';
		this.emptyElem.textContent = hasItems ? '' : EMPTY_TASK_TEXT;
	}
}

export default TaskListPanel;
