export type ConversationRole = 'system' | 'user' | 'assistant';

export interface ConversationMessage {
	role: ConversationRole;
	content: string;
	timestamp: number;
}

const MAX_HISTORY_MESSAGES = 10;

const limitHistory = (messages: ConversationMessage[]): ConversationMessage[] => {
	if (messages.length <= MAX_HISTORY_MESSAGES) return messages;
	return messages.slice(messages.length - MAX_HISTORY_MESSAGES);
};

export class NPCConversationHistory {
	private readonly messagesByNpc: Map<string, ConversationMessage[]>;

	constructor() {
		this.messagesByNpc = new Map();
	}

	get(npcId: string): ConversationMessage[] {
		return [...(this.messagesByNpc.get(npcId) ?? [])];
	}

	append(npcId: string, message: ConversationMessage): ConversationMessage[] {
		const next = limitHistory([...(this.messagesByNpc.get(npcId) ?? []), message]);
		this.messagesByNpc.set(npcId, next);
		return [...next];
	}
}
