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
		useStubBrain: false,
		initialObservers: [{ x: 9999, y: 1, z: 9999 }],
	});
	engine.start();
	await wait(1200);
	engine.stop();

	const sleepTicks = events.filter(event => event.type === 'simulation:npc-tick').filter(event => Boolean(event.payload.sleeping)).length;

	console.log('command: node .sisyphus/evidence/scripts/task-10-sleep-mode-check.js');
	console.log(`llm_calls=${llmCalls}`);
	console.log(`sleep_ticks=${sleepTicks}`);
	console.log(`sleep_mode_ok=${llmCalls === 0 && sleepTicks > 0}`);
};

run().catch(error => {
	console.error(error);
	process.exit(1);
});
