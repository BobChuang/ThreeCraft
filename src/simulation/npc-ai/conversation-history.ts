export type ConversationRole = 'system' | 'user' | 'assistant';

export interface ConversationMessage {
	role: ConversationRole;
	content: string;
	timestamp: number;
}

export interface PairDialogueMessage {
	speakerId: string;
	listenerId: string;
	content: string;
	timestamp: number;
}

const MAX_HISTORY_MESSAGES = 10;

const limitHistory = <T>(messages: T[]): T[] => {
	if (messages.length <= MAX_HISTORY_MESSAGES) return messages;
	return messages.slice(messages.length - MAX_HISTORY_MESSAGES);
};

export class NPCConversationHistory {
	private readonly messagesByNpc: Map<string, ConversationMessage[]>;

	private readonly pairMessages: Map<string, PairDialogueMessage[]>;

	constructor() {
		this.messagesByNpc = new Map();
		this.pairMessages = new Map();
	}

	private static toPairKey(leftId: string, rightId: string): string {
		return [leftId, rightId].sort((a, b) => a.localeCompare(b)).join('::');
	}

	get(npcId: string): ConversationMessage[] {
		return [...(this.messagesByNpc.get(npcId) ?? [])];
	}

	append(npcId: string, message: ConversationMessage): ConversationMessage[] {
		const next = limitHistory([...(this.messagesByNpc.get(npcId) ?? []), message]);
		this.messagesByNpc.set(npcId, next);
		return [...next];
	}

	appendPairDialogue(message: PairDialogueMessage): PairDialogueMessage[] {
		const key = NPCConversationHistory.toPairKey(message.speakerId, message.listenerId);
		const next = limitHistory([...(this.pairMessages.get(key) ?? []), message]);
		this.pairMessages.set(key, next);
		return [...next];
	}

	getPairDialogue(leftId: string, rightId: string): PairDialogueMessage[] {
		return [...(this.pairMessages.get(NPCConversationHistory.toPairKey(leftId, rightId)) ?? [])];
	}

	getDialogueContextForNpc(npcId: string): PairDialogueMessage[] {
		const collected: PairDialogueMessage[] = [];
		this.pairMessages.forEach(messages => {
			if (!messages.some(message => message.speakerId === npcId || message.listenerId === npcId)) return;
			collected.push(...messages);
		});
		collected.sort((a, b) => a.timestamp - b.timestamp);
		return collected.slice(Math.max(0, collected.length - MAX_HISTORY_MESSAGES));
	}
}
