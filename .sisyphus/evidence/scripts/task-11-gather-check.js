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
	map.set(toKey({ x: -7, y: 0, z: -8 }), '1');
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
				action: 'gather',
				target: {
					position: { x: -7, y: 0, z: -8 },
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
	engine.start();
	await wait(3200);
	engine.stop();

	const inventory = engine.getInventory('npc-01');
	const gatheredQuantity = inventory.filter(slot => slot.type === '1').reduce((sum, slot) => sum + slot.quantity, 0);
	const removed = !worldMap.has(toKey({ x: -7, y: 0, z: -8 }));
	const removeCalls = modifyCalls.filter(call => call.action === 'remove').length;

	console.log('command: node .sisyphus/evidence/scripts/task-11-gather-check.js');
	console.log(`remove_calls=${removeCalls}`);
	console.log(`target_removed=${removed}`);
	console.log(`npc_item_1_quantity=${gatheredQuantity}`);
	console.log(`gather_ok=${removed && gatheredQuantity >= 1}`);
};

run().catch(error => {
	console.error(error);
	process.exit(1);
});
