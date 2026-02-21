'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.NPCConversationHistory = void 0;
const MAX_HISTORY_MESSAGES = 10;
const limitHistory = messages => {
	if (messages.length <= MAX_HISTORY_MESSAGES) return messages;
	return messages.slice(messages.length - MAX_HISTORY_MESSAGES);
};
class NPCConversationHistory {
	constructor() {
		this.messagesByNpc = new Map();
	}
	get(npcId) {
		return [...(this.messagesByNpc.get(npcId) ?? [])];
	}
	append(npcId, message) {
		const next = limitHistory([...(this.messagesByNpc.get(npcId) ?? []), message]);
		this.messagesByNpc.set(npcId, next);
		return [...next];
	}
}
exports.NPCConversationHistory = NPCConversationHistory;
