export interface ProfessionLoadoutItem {
	type: string;
	quantity: number;
}

const PROFESSION_LOADOUTS: Record<string, ProfessionLoadoutItem[]> = {
	Hacker: [
		{ type: 'cyberCircuit', quantity: 12 },
		{ type: 'cyberCore', quantity: 4 },
		{ type: 'energy-bar', quantity: 2 },
	],
	Mechanic: [
		{ type: 'cyberSteel', quantity: 16 },
		{ type: 'cyberPanel', quantity: 8 },
		{ type: 'synth-ration', quantity: 1 },
	],
	Architect: [
		{ type: 'cyberPanel', quantity: 18 },
		{ type: 'cyberGlass', quantity: 10 },
		{ type: 'cyberGrid', quantity: 8 },
	],
	Miner: [
		{ type: 'cyberAsphalt', quantity: 16 },
		{ type: 'stone', quantity: 12 },
		{ type: 'synth-ration', quantity: 2 },
	],
	Medic: [
		{ type: 'synth-ration', quantity: 4 },
		{ type: 'energy-bar', quantity: 4 },
		{ type: 'cyberGlass', quantity: 6 },
	],
	'Bounty Hunter': [
		{ type: 'cyberSteel', quantity: 14 },
		{ type: 'cobblestone', quantity: 8 },
		{ type: 'energy-bar', quantity: 3 },
	],
	Courier: [
		{ type: 'energy-bar', quantity: 6 },
		{ type: 'cyberGrid', quantity: 8 },
		{ type: 'cyberGlass', quantity: 4 },
	],
	Scavenger: [
		{ type: 'cyberAsphalt', quantity: 10 },
		{ type: 'cyberSteel', quantity: 8 },
		{ type: 'synth-ration', quantity: 2 },
	],
	'Street Vendor': [
		{ type: 'energy-bar', quantity: 5 },
		{ type: 'synth-ration', quantity: 3 },
		{ type: 'cyberNeon', quantity: 6 },
	],
	Bartender: [
		{ type: 'energy-bar', quantity: 4 },
		{ type: 'cyberGlass', quantity: 8 },
		{ type: 'cyberNeon', quantity: 4 },
	],
};

const DEFAULT_LOADOUT: ProfessionLoadoutItem[] = [
	{ type: 'cyberGrid', quantity: 10 },
	{ type: 'synth-ration', quantity: 2 },
];

export const getProfessionLoadout = (profession: string): ProfessionLoadoutItem[] => (PROFESSION_LOADOUTS[profession] ?? DEFAULT_LOADOUT).map(item => ({ ...item }));
