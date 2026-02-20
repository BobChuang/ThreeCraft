const { GLM5Service } = require('../../../.sisyphus/tmp/task9-llm/glm5-service.js');

const encoder = new TextEncoder();
const toSSE = obj => `data: ${JSON.stringify(obj)}\n\n`;

const fetchImpl = async () => ({
	ok: true,
	status: 200,
	body: new ReadableStream({
		start(controller) {
			controller.enqueue(encoder.encode(toSSE({ choices: [{ delta: { content: '{"action":"idle"}' } }], usage: { total_tokens: 8 } })));
			controller.enqueue(encoder.encode('data: [DONE]\n\n'));
			controller.close();
		},
	}),
});

const service = new GLM5Service({
	apiKey: 'test-key',
	fetchImpl,
	requestPerMinuteLimit: 5,
	tokenPerMinuteLimit: 50_000,
});

const run = async () => {
	const statuses = [];
	for (let i = 1; i <= 6; i += 1) {
		try {
			await service.requestJson('Respond with JSON action', {
				npcId: `npc-${String(i).padStart(2, '0')}`,
			});
			statuses.push(`req${i}=ok`);
		} catch (error) {
			statuses.push(`req${i}=${error.code}`);
		}
	}
	console.log('command: node .sisyphus/evidence/scripts/task-9-rate-limiter-check.js');
	console.log(statuses.join('\n'));
};

run().catch(error => {
	console.error(error);
	process.exit(1);
});
