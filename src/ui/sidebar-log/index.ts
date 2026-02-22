import type { SimulationBridgeEvent } from '../../simulation';
import { config } from '../../controller/config';
import { readRequestMetrics, readEventString, parseReasoningFromRaw } from './event-reader';
import { renderEntryHTML } from './entry-template';
import { getStatusMeta } from './status-meta';
import type { NPCNameResolver, SidebarLogEntry, SidebarLogStatus } from './types';
import './css/style.less';

const MAX_ENTRIES = 120;

class SidebarLog {
	root: HTMLElement;

	listElem: HTMLElement;

	filterElem: HTMLSelectElement;

	countElem: HTMLElement;

	isMinimized = false;

	private filterNpcId = 'all';

	private entries: SidebarLogEntry[] = [];

	private expandedEntryIds = new Set<string>();

	private rawByNpc = new Map<string, string>();

	private activeRequestIdByNpc = new Map<string, string>();

	private knownNpcIds = new Set<string>();

	constructor(el: HTMLElement, private readonly resolveNPCName: NPCNameResolver = npcId => npcId) {
		Array.from(el.children).forEach(child => child.getAttribute('id') === 'sidebar-log-panel' && child.remove());
		this.root = document.createElement('aside');
		this.root.id = 'sidebar-log-panel';
		this.root.innerHTML = `<div id="sidebar-log-header"><strong id="sidebar-log-title">AI 决策日志</strong><button id="sidebar-log-toggle">最小化</button></div><div id="sidebar-log-body"><select id="sidebar-log-filter"><option value="all">全部 NPC</option></select><ul id="sidebar-log-list"></ul></div>`;
		this.filterElem = this.root.querySelector('#sidebar-log-filter') as HTMLSelectElement;
		this.listElem = this.root.querySelector('#sidebar-log-list') as HTMLElement;
		this.countElem = this.root.querySelector('#sidebar-log-title') as HTMLElement;
		this.filterElem.addEventListener('change', () => {
			this.filterNpcId = this.filterElem.value;
			this.render();
		});
		this.root.querySelector('#sidebar-log-toggle')?.addEventListener('click', () => this.toggleMinimized());
		el.appendChild(this.root);
		this.render();
	}

	handleSimulationEvent(event: SimulationBridgeEvent): void {
		if (event.type === 'thinking:state') {
			const npcId = readEventString(event.payload.npcId);
			const state = readEventString(event.payload.state);
			if (!npcId || !state) return;
			if (state === 'requesting') this.beginRequest(npcId, event.timestamp);
			if (state === 'received') this.completeRequest(npcId, 'success', '响应已接收', event.timestamp);
			if (state === 'executing') this.pushEntry(npcId, 'executing', '执行动作', event.timestamp);
			if (state === 'idle') this.activeRequestIdByNpc.delete(npcId);
			return;
		}
		if (event.type !== 'simulation:lifecycle') return;
		const npcId = readEventString(event.payload.npcId);
		const eventType = readEventString(event.payload.eventType) || readEventString(event.payload.status);
		if (!npcId || !eventType) return;
		if (eventType === 'thinking-stream') {
			const chunk = readEventString(event.payload.chunk);
			if (!chunk) return;
			const prev = this.rawByNpc.get(npcId) ?? '';
			this.rawByNpc.set(npcId, `${prev}${chunk}`.slice(-1800));
			return;
		}
		if (eventType === 'thinking-complete') {
			const { tokensUsed, latencyMs } = readRequestMetrics(event.payload);
			this.completeRequest(npcId, 'success', '请求成功', event.timestamp, tokensUsed, latencyMs);
			return;
		}
		if (eventType === 'thinking-error' || eventType === 'npc:decision-error' || eventType === 'llm-missing-key-fallback') {
			const message = readEventString(event.payload.message) || readEventString(event.payload.error) || '无详细错误信息';
			this.completeRequest(npcId, 'error', '请求失败', event.timestamp, undefined, undefined, message);
			return;
		}
		if (eventType === 'npc:decision-execute') this.pushEntry(npcId, 'executing', `执行动作：${readEventString(event.payload.action) || 'unknown'}`, event.timestamp);
	}

	private beginRequest(npcId: string, timestamp: number): void {
		this.rawByNpc.set(npcId, '');
		const entry = this.pushEntry(npcId, 'requesting', '发起请求', timestamp);
		this.activeRequestIdByNpc.set(npcId, entry.id);
	}

	private completeRequest(npcId: string, status: SidebarLogStatus, summary: string, timestamp: number, tokensUsed?: number, latencyMs?: number, errorMessage?: string): void {
		const rawResponse = this.rawByNpc.get(npcId)?.trim() || undefined;
		const entryId = this.activeRequestIdByNpc.get(npcId);
		const reasoning = rawResponse ? parseReasoningFromRaw(rawResponse) : undefined;
		if (!entryId) {
			this.pushEntry(npcId, status, summary, timestamp, reasoning, rawResponse, tokensUsed, latencyMs, errorMessage);
			return;
		}
		const target = this.entries.find(item => item.id === entryId);
		if (!target) return;
		target.status = status;
		target.statusText = getStatusMeta(status).label;
		target.summary = summary;
		target.timestamp = timestamp;
		target.rawResponse = rawResponse;
		target.reasoning = reasoning;
		target.tokensUsed = tokensUsed;
		target.latencyMs = latencyMs;
		target.errorMessage = errorMessage;
		if (status !== 'requesting') this.activeRequestIdByNpc.delete(npcId);
		this.render();
	}

	private pushEntry(
		npcId: string,
		status: SidebarLogStatus,
		summary: string,
		timestamp: number,
		reasoning?: string,
		rawResponse?: string,
		tokensUsed?: number,
		latencyMs?: number,
		errorMessage?: string
	): SidebarLogEntry {
		this.knownNpcIds.add(npcId);
		this.syncFilterOptions();
		const entry: SidebarLogEntry = {
			id: `${npcId}-${timestamp}-${Math.random().toString(16).slice(2, 8)}`,
			npcId,
			npcName: this.resolveNPCName(npcId),
			status,
			statusText: getStatusMeta(status).label,
			timestamp,
			summary,
			reasoning,
			rawResponse,
			tokensUsed,
			latencyMs,
			errorMessage,
		};
		this.entries.unshift(entry);
		if (this.entries.length > MAX_ENTRIES) this.entries.length = MAX_ENTRIES;
		this.render();
		return entry;
	}

	private syncFilterOptions(): void {
		const before = this.filterElem.value;
		this.filterElem.innerHTML = '<option value="all">全部 NPC</option>';
		[...this.knownNpcIds]
			.sort((a, b) => this.resolveNPCName(a).localeCompare(this.resolveNPCName(b)))
			.forEach(npcId => this.filterElem.insertAdjacentHTML('beforeend', `<option value="${npcId}">${this.resolveNPCName(npcId)}</option>`));
		this.filterElem.value = this.knownNpcIds.has(before) || before === 'all' ? before : 'all';
	}

	private render(): void {
		this.syncVisibility();
		if (this.root.classList.contains('pc-hidden')) return;
		this.countElem.textContent = `AI 决策日志 (${this.entries.length})`;
		this.entries.forEach(item => {
			item.npcName = this.resolveNPCName(item.npcId);
		});
		const records = this.entries.filter(item => this.filterNpcId === 'all' || item.npcId === this.filterNpcId);
		this.listElem.innerHTML = records.map(item => renderEntryHTML(item, this.expandedEntryIds.has(item.id))).join('');
		this.listElem.querySelectorAll('.sidebar-expand').forEach(button =>
			button.addEventListener('click', () => {
				const id = (button as HTMLElement).getAttribute('data-id');
				if (!id) return;
				if (this.expandedEntryIds.has(id)) this.expandedEntryIds.delete(id);
				else this.expandedEntryIds.add(id);
				this.render();
			})
		);
	}

	private toggleMinimized(): void {
		this.isMinimized = !this.isMinimized;
		this.root.classList.toggle('minimized', this.isMinimized);
		const toggle = this.root.querySelector('#sidebar-log-toggle');
		if (toggle) toggle.textContent = this.isMinimized ? '最大化' : '最小化';
	}

	private syncVisibility(): void {
		this.root.classList.toggle('pc-hidden', config.controller.operation !== 'pc');
	}
}

export default SidebarLog;
