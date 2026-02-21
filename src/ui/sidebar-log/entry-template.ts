import { formatMetric, formatTime, getNPCColor, getStatusMeta } from './status-meta';
import { SidebarLogEntry } from './types';

export const renderEntryHTML = (entry: SidebarLogEntry, expanded: boolean): string => {
	const meta = getStatusMeta(entry.status);
	const detailVisible = expanded ? '' : 'hidden';
	return `<li class="sidebar-log-entry"><div class="sidebar-log-row"><span class="npc"><span class="npc-dot" style="color:${getNPCColor(entry.npcId)}"></span>${
		entry.npcName
	}</span><span class="status ${meta.className}">${entry.statusText}</span></div><div class="sidebar-log-row meta"><span>${formatTime(entry.timestamp)} · ${
		entry.summary
	}</span><span>tokens ${formatMetric(entry.tokensUsed)} · ${formatMetric(entry.latencyMs, 'ms')}</span></div><button class="sidebar-expand" data-id="${entry.id}">${
		expanded ? '收起详情' : '展开详情'
	}</button><div class="sidebar-details ${detailVisible}"><div><span class="detail-label">Reasoning:</span> ${entry.reasoning || '暂无'}</div><div class="raw"><span class="detail-label">Raw:</span> ${
		entry.rawResponse || '暂无原始响应'
	}</div>${entry.errorMessage ? `<div class="raw"><span class="detail-label">Error:</span> ${entry.errorMessage}</div>` : ''}</div></li>`;
};
