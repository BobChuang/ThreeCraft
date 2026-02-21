'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.toBridgeEvent = void 0;
const toBridgeEvent = event => ({
	type: event.type,
	timestamp: event.timestamp,
	payload: event.payload,
});
exports.toBridgeEvent = toBridgeEvent;
