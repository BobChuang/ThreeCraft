export interface ParsedSSEEvent {
	data: string;
}

const DONE_SENTINEL = '[DONE]';

const parseEvent = (block: string): ParsedSSEEvent | null => {
	const lines = block
		.split(/\r?\n/)
		.map(line => line.trim())
		.filter(Boolean);
	if (lines.length === 0) return null;
	const dataLines = lines.filter(line => line.startsWith('data:')).map(line => line.slice('data:'.length).trimStart());
	if (dataLines.length === 0) return null;
	return { data: dataLines.join('\n') };
};

export const isSSEDone = (data: string): boolean => data.trim() === DONE_SENTINEL;

export const parseSSEChunk = (buffer: string): { events: ParsedSSEEvent[]; rest: string } => {
	const separator = /\r?\n\r?\n/;
	const events: ParsedSSEEvent[] = [];
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

export const tryParseJson = (value: string): Record<string, unknown> | null => {
	try {
		const parsed = JSON.parse(value);
		if (typeof parsed === 'object' && parsed !== null) {
			return parsed as Record<string, unknown>;
		}
		return null;
	} catch {
		return null;
	}
};
