'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.tryParseJson = exports.parseSSEChunk = exports.isSSEDone = void 0;
const DONE_SENTINEL = '[DONE]';
const parseEvent = block => {
	const lines = block
		.split(/\r?\n/)
		.map(line => line.trim())
		.filter(Boolean);
	if (lines.length === 0) return null;
	const dataLines = lines.filter(line => line.startsWith('data:')).map(line => line.slice('data:'.length).trimStart());
	if (dataLines.length === 0) return null;
	return { data: dataLines.join('\n') };
};
const isSSEDone = data => data.trim() === DONE_SENTINEL;
exports.isSSEDone = isSSEDone;
const parseSSEChunk = buffer => {
	const separator = /\r?\n\r?\n/;
	const events = [];
	let cursor = 0;
	let match = separator.exec(buffer.slice(cursor));
	while (match) {
		const blockLength = match.index;
		const block = buffer.slice(cursor, cursor + blockLength);
		const parsed = parseEvent(block);
		if (parsed) events.push(parsed);
		cursor += blockLength + match[0].length;
		match = separator.exec(buffer.slice(cursor));
	}
	return {
		events,
		rest: buffer.slice(cursor),
	};
};
exports.parseSSEChunk = parseSSEChunk;
const tryParseJson = value => {
	try {
		const parsed = JSON.parse(value);
		if (typeof parsed === 'object' && parsed !== null) {
			return parsed;
		}
		return null;
	} catch {
		return null;
	}
};
exports.tryParseJson = tryParseJson;
