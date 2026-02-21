'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.observeNPCContext = void 0;
const distanceBetween = (a, b) => {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
};
const observeNPCContext = async (bridge, npc, allNPCs, radius) => {
	const worldState = await bridge.getWorldState(npc.position, radius);
	const nearbyNPCs = allNPCs
		.filter(candidate => candidate.id !== npc.id)
		.filter(candidate => distanceBetween(candidate.position, npc.position) <= radius)
		.map(candidate => ({
			id: candidate.id,
			name: candidate.name,
			profession: candidate.profession,
			position: { ...candidate.position },
			lastAction: candidate.lastAction,
		}));
	return { worldState, nearbyNPCs };
};
exports.observeNPCContext = observeNPCContext;
