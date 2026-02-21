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
		this.pairMessages = new Map();
	}
	static toPairKey(leftId, rightId) {
		return [leftId, rightId].sort((a, b) => a.localeCompare(b)).join('::');
	}
	get(npcId) {
		var _a;
		return [...((_a = this.messagesByNpc.get(npcId)) !== null && _a !== void 0 ? _a : [])];
	}
	append(npcId, message) {
		var _a;
		const next = limitHistory([...((_a = this.messagesByNpc.get(npcId)) !== null && _a !== void 0 ? _a : []), message]);
		this.messagesByNpc.set(npcId, next);
		return [...next];
	}
	appendPairDialogue(message) {
		var _a;
		const key = NPCConversationHistory.toPairKey(message.speakerId, message.listenerId);
		const next = limitHistory([...((_a = this.pairMessages.get(key)) !== null && _a !== void 0 ? _a : []), message]);
		this.pairMessages.set(key, next);
		return [...next];
	}
	getPairDialogue(leftId, rightId) {
		var _a;
		return [...((_a = this.pairMessages.get(NPCConversationHistory.toPairKey(leftId, rightId))) !== null && _a !== void 0 ? _a : [])];
	}
	getDialogueContextForNpc(npcId) {
		const collected = [];
		this.pairMessages.forEach(messages => {
			if (!messages.some(message => message.speakerId === npcId || message.listenerId === npcId)) return;
			collected.push(...messages);
		});
		collected.sort((a, b) => a.timestamp - b.timestamp);
		return collected.slice(Math.max(0, collected.length - MAX_HISTORY_MESSAGES));
	}
}
exports.NPCConversationHistory = NPCConversationHistory;
