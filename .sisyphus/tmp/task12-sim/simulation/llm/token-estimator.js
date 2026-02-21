'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.estimateTokens = void 0;
const estimateTokens = text => {
	if (!text) return 0;
	return Math.max(1, Math.ceil(text.length / 4));
};
exports.estimateTokens = estimateTokens;
