export type SidebarLogStatus = 'requesting' | 'success' | 'executing' | 'error';

export interface SidebarLogEntry {
	id: string;
	npcId: string;
	npcName: string;
	status: SidebarLogStatus;
	timestamp: number;
	statusText: string;
	summary: string;
	reasoning?: string;
	rawResponse?: string;
	tokensUsed?: number;
	latencyMs?: number;
	errorMessage?: string;
}

export type NPCNameResolver = (npcId: string) => string;
