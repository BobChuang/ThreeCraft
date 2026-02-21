import type { TaskListItemViewModel, TaskItemStatus } from './types';

const STATUS_ICON: Record<TaskItemStatus, string> = {
	todo: '○',
	'in-progress': '◉',
	done: '✓',
};

const STATUS_LABEL: Record<TaskItemStatus, string> = {
	todo: '待办',
	'in-progress': '进行中',
	done: '完成',
};

const escapeHtml = (value: string): string => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

export const renderTaskItems = (items: TaskListItemViewModel[]): string =>
	items
		.map(
			(item, index) => `<li class="npc-task-item ${item.status}">
				<span class="npc-task-order">${index + 1}.</span>
				<span class="npc-task-icon">${STATUS_ICON[item.status]}</span>
				<span class="npc-task-text">${escapeHtml(item.text)}</span>
				<span class="npc-task-status">${STATUS_LABEL[item.status]}</span>
			</li>`
		)
		.join('');
