import { SidebarLogStatus } from './types';

export interface SidebarStatusMeta {
	label: string;
	className: string;
}

const STATUS_META: Record<SidebarLogStatus, SidebarStatusMeta> = {
	requesting: {
		label: '请求中',
		className: 'requesting',
	},
	success: {
		label: '成功',
		className: 'success',
	},
	executing: {
		label: '执行中',
		className: 'executing',
	},
	error: {
		label: '错误',
		className: 'error',
	},
};

export const getStatusMeta = (status: SidebarLogStatus): SidebarStatusMeta => STATUS_META[status];

export const formatTime = (timestamp: number): string => {
	const date = new Date(timestamp);
	return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
};

export const formatMetric = (value?: number, suffix = ''): string => (typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value)}${suffix}` : '--');

export const getNPCColor = (npcId: string): string => {
	let hash = 0;
	for (let i = 0; i < npcId.length; i += 1) hash = (hash * 31 + npcId.charCodeAt(i)) % 360;
	return `hsl(${hash}deg 86% 62%)`;
};
