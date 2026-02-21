'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.buildNPCPrompt = void 0;
const serialize = value => JSON.stringify(value);
const summarizeBlocks = observation => {
	const sample = observation.worldState.blocks.slice(0, 16).map(block => ({
		x: block.position.x,
		y: block.position.y,
		z: block.position.z,
		type: block.blockType,
	}));
	return serialize(sample);
};
const summarizeNearbyNPCs = observation =>
	serialize(
		observation.nearbyNPCs.map(npc => ({
			id: npc.id,
			name: npc.name,
			profession: npc.profession,
			position: npc.position,
			lastAction: npc.lastAction,
		}))
	);
const summarizeHistory = history =>
	serialize(
		history.map(message => ({
			role: message.role,
			content: message.content,
			timestamp: message.timestamp,
		}))
	);
const summarizeDialogueContext = history =>
	serialize(
		history.map(message => ({
			speakerId: message.speakerId,
			listenerId: message.listenerId,
			content: message.content,
			timestamp: message.timestamp,
		}))
	);
const summarizeIncomingPlayerMessages = messages =>
	serialize(
		messages.map(message => ({
			content: message.content,
			timestamp: message.timestamp,
		}))
	);
const buildNPCPrompt = (persona, npc, observation, history, dialogueContext, incomingPlayerMessages, correctiveContext) => {
	const worldStateLine = `[World State] Nearby blocks: ${summarizeBlocks(observation)}, Nearby NPCs: ${summarizeNearbyNPCs(observation)}, Inventory: ${serialize(npc.inventory)}, HP: ${
		npc.survival.hp
	}, Hunger: ${npc.survival.hunger}`;
	const instructionLine =
		'[Instruction] Decide your next single action and return only valid JSON: {"action":"move|gather|build|dialogue|idle","target":{"position":{"x":number,"y":number,"z":number},"blockType":"string","npcId":"string"},"dialogue":"string","reasoning":"string","nextGoal":"string"}';
	return [
		`[System] You are ${persona.name}, a ${persona.profession} in a cyberpunk voxel world. ${persona.backstory} ${persona.systemPrompt}`,
		worldStateLine,
		`[Recent History] ${summarizeHistory(history)}`,
		`[Dialogue Context] ${summarizeDialogueContext(dialogueContext)}`,
		`[Incoming Player Messages] ${summarizeIncomingPlayerMessages(incomingPlayerMessages)}`,
		`[Task List] ${serialize(persona.defaultGoals)}`,
		correctiveContext ? `[Corrective Context] ${correctiveContext}` : '',
		instructionLine,
	]
		.filter(Boolean)
		.join('\n');
};
exports.buildNPCPrompt = buildNPCPrompt;
