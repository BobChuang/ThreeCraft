const { SimulationEngine } = require('../../../.sisyphus/tmp/task10-sim/simulation/simulation-engine.js');

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const events = [];
let llmCalls = 0;

const bridge = {
	async getWorldState(position, radius) {
		return {
			center: { ...position },
			radius,
			blocks: [],
			timestamp: Date.now(),
		};
	},
	async callLLM() {
		llmCalls += 1;
		return {
			content: '{"action":"idle"}',
		};
	},
	emitEvent(event) {
		events.push(event);
	},
	async modifyBlock() {},
};

const run = async () => {
	const engine = new SimulationEngine(bridge, {
		tickIntervalMs: 100,
		decisionIntervalMs: 200,
		useStubBrain: true,
		initialObservers: [{ x: 0, y: 1, z: 0 }],
	});
	engine.start();
	await wait(1200);
	engine.stop();

	const wrenchActions = events
		.filter(event => event.type === 'npc:action')
		.filter(event => event.payload.npcId === 'npc-03')
		.map(event => String(event.payload.action));

	console.log('command: node .sisyphus/evidence/scripts/task-10-stub-brain-check.js');
	console.log(`llm_calls=${llmCalls}`);
	console.log(`wrench_actions=${wrenchActions.slice(0, 5).join(',')}`);
	console.log(`stub_mode_ok=${llmCalls === 0 && wrenchActions.length > 0}`);
};

run().catch(error => {
	console.error(error);
	process.exit(1);
});
