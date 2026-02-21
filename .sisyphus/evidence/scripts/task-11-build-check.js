const { SimulationEngine } = require('../../../.sisyphus/tmp/task11-sim/simulation/simulation-engine.js');

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const toKey = position => `${position.x}:${position.y}:${position.z}`;

const createWorldMap = () => {
	const map = new Map();
	for (let x = -12; x <= 4; x += 1) {
		for (let z = -12; z <= 4; z += 1) {
			map.set(toKey({ x, y: 0, z }), '1');
		}
	}
	return map;
};

const worldMap = createWorldMap();
const modifyCalls = [];

const bridge = {
	async getWorldState(position, radius) {
		const blocks = [...worldMap.entries()].map(([key, blockType]) => {
			const [x, y, z] = key.split(':').map(Number);
			return {
				position: { x, y, z },
				blockType,
			};
		});
		return {
			center: { ...position },
			radius,
			blocks,
			timestamp: Date.now(),
		};
	},
	async callLLM(_prompt, options) {
		if (options.npcId !== 'npc-01') {
			return { content: JSON.stringify({ action: 'idle' }) };
		}
		return {
			content: JSON.stringify({
				action: 'build',
				target: {
					position: { x: -7, y: 1, z: -8 },
					blockType: '9',
				},
			}),
		};
	},
	emitEvent() {},
	async modifyBlock(position, blockType, action) {
		modifyCalls.push({ position: { ...position }, blockType, action });
		const key = toKey(position);
		if (action === 'remove') {
			worldMap.delete(key);
			return;
		}
		worldMap.set(key, blockType);
	},
};

const run = async () => {
	const engine = new SimulationEngine(bridge, {
		tickIntervalMs: 100,
		decisionIntervalMs: 600,
		initialObservers: [{ x: -8, y: 1, z: -8 }],
	});
	engine.addInventoryItem('npc-01', '9', 1);
	engine.start();
	await wait(2400);
	engine.stop();

	const inventory = engine.getInventory('npc-01');
	const remainingQuantity = inventory.filter(slot => slot.type === '9').reduce((sum, slot) => sum + slot.quantity, 0);
	const placedType = worldMap.get(toKey({ x: -7, y: 1, z: -8 })) ?? null;
	const placeCalls = modifyCalls.filter(call => call.action === 'place').length;

	console.log('command: node .sisyphus/evidence/scripts/task-11-build-check.js');
	console.log(`place_calls=${placeCalls}`);
	console.log(`placed_type=${placedType}`);
	console.log(`npc_item_9_remaining=${remainingQuantity}`);
	console.log(`build_ok=${placedType === '9' && remainingQuantity === 0}`);
};

run().catch(error => {
	console.error(error);
	process.exit(1);
});
