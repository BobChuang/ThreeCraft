const { GLM5Service } = require('../../../.sisyphus/tmp/task9-llm/glm5-service.js');

const encoder = new TextEncoder();
const toSSE = obj => `data: ${JSON.stringify(obj)}\n\n`;

const events = [
	toSSE({ choices: [{ delta: { content: '```json\n' } }] }),
	toSSE({ choices: [{ delta: { content: '{"action":"idle"}' } }] }),
	toSSE({ choices: [{ delta: { content: '\n```' } }], usage: { total_tokens: 19 } }),
	'data: [DONE]\n\n',
];

const fetchImpl = async () => ({
	ok: true,
	status: 200,
	body: new ReadableStream({
		start(controller) {
			events.forEach(chunk => controller.enqueue(encoder.encode(chunk)));
			controller.close();
		},
	}),
});

const chunks = [];
const lifecycle = [];

const service = new GLM5Service({
	apiKey: 'test-key',
	fetchImpl,
	emitLifecycleEvent: event => lifecycle.push(event),
});

service
	.requestJson('Respond JSON', {
		npcId: 'npc-01',
		onStreamChunk: chunk => chunks.push(chunk.text),
	})
	.then(result => {
		console.log('command: node .sisyphus/evidence/scripts/task-9-glm5-streaming-check.js');
		console.log(`stream_chunk_count=${chunks.length}`);
		console.log(`lifecycle_events=${lifecycle.map(event => event.type).join(',')}`);
		console.log(`parsed_action=${result.parsedJson.action}`);
		console.log(`retried_for_json=${result.retriedForJson}`);
		console.log(`tokens_used=${result.tokensUsed}`);
	})
	.catch(error => {
		console.error(error);
		process.exit(1);
	});
