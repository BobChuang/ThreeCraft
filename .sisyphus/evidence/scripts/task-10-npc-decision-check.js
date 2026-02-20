const { SimulationEngine } = require('../../../.sisyphus/tmp/task10-sim/simulation/simulation-engine.js');

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const createGroundBlocks = center => {
	const blocks = [];
	for (let x = center.x - 4; x <= center.x + 4; x += 1) {
		for (let z = center.z - 4; z <= center.z + 4; z += 1) {
			blocks.push({
				position: { x, y: center.y - 1, z },
				blockType: '1',
			});
		}
	}
	return blocks;
};

const events = [];
let llmCalls = 0;

const bridge = {
	async getWorldState(position, radius) {
		return {
			center: { ...position },
			radius,
			blocks: createGroundBlocks(position),
			timestamp: Date.now(),
		};
	},
	async callLLM() {
		llmCalls += 1;
		return {
			content: JSON.stringify({
				action: 'dialogue',
				dialogue: 'Sector clear. Proceeding.',
				reasoning: 'Confirming local status.',
				nextGoal: 'Continue patrol.',
			}),
			latencyMs: 5,
			model: 'mock-glm5',
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
		decisionIntervalMs: 250,
		useStubBrain: false,
		initialObservers: [{ x: 0, y: 1, z: 0 }],
	});
	engine.start();
	await wait(1200);
	engine.stop();

	const wrenchEvents = events.filter(event => event.payload && event.payload.npcId === 'npc-03');
	const lifecycle = wrenchEvents.filter(event => event.type === 'simulation:lifecycle').map(event => String(event.payload.status));
	const actions = wrenchEvents.filter(event => event.type === 'npc:action').map(event => String(event.payload.action));
	const history = engine.getNPCConversationHistory('npc-03');

	console.log('command: node .sisyphus/evidence/scripts/task-10-npc-decision-check.js');
	console.log(`wrench_lifecycle=${lifecycle.slice(0, 5).join('>')}`);
	console.log(`wrench_action_count=${actions.length}`);
	console.log(`wrench_last_action=${actions[actions.length - 1] || 'none'}`);
	console.log(`llm_calls=${llmCalls}`);
	console.log(`history_size=${history.length}`);
	console.log(`history_cap_ok=${history.length <= 10}`);
};

run().catch(error => {
	console.error(error);
	process.exit(1);
});
