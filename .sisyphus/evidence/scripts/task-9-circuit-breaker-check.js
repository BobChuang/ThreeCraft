const { GLM5Service } = require('../../../.sisyphus/tmp/task9-llm/glm5-service.js');

let fetchCalls = 0;

const fetchImpl = async () => {
	fetchCalls += 1;
	return {
		ok: false,
		status: 500,
		body: null,
	};
};

const service = new GLM5Service({
	apiKey: 'test-key',
	fetchImpl,
	circuitBreakerFailureThreshold: 3,
	circuitBreakerCooldownMs: 30_000,
});

const run = async () => {
	const statuses = [];
	for (let i = 1; i <= 4; i += 1) {
		try {
			await service.requestJson('Respond with JSON action', { npcId: 'npc-01' });
			statuses.push(`req${i}=ok`);
		} catch (error) {
			statuses.push(`req${i}=${error.code}`);
		}
	}
	console.log('command: node .sisyphus/evidence/scripts/task-9-circuit-breaker-check.js');
	console.log(statuses.join('\n'));
	console.log(`fetch_calls=${fetchCalls}`);
};

run().catch(error => {
	console.error(error);
	process.exit(1);
});
