'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.LLMServiceError = void 0;
class LLMServiceError extends Error {
	constructor(code, message, details = {}) {
		super(message);
		this.code = code;
		this.details = details;
	}
}
exports.LLMServiceError = LLMServiceError;
