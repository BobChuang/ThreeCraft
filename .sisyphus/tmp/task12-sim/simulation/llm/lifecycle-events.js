'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.createLifecycleEvent = void 0;
const createLifecycleEvent = ({ type, npcId, payload, now }) => ({
	type,
	npcId,
	timestamp: now(),
	payload: payload !== null && payload !== void 0 ? payload : {},
});
exports.createLifecycleEvent = createLifecycleEvent;
