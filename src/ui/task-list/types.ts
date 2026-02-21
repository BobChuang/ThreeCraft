export type TaskItemStatus = 'todo' | 'in-progress' | 'done';

export interface TaskListItemViewModel {
	text: string;
	status: TaskItemStatus;
}

export interface TaskListPanelViewModel {
	npcName: string;
	currentGoal: string | null;
	items: TaskListItemViewModel[];
}
