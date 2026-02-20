import { NPCPersonaProfile } from './types';

export const npcPersonaProfiles: NPCPersonaProfile[] = [
	{ id: 'npc-01', name: 'Neon', profession: 'Hacker', skinIdx: 28 },
	{ id: 'npc-02', name: 'Blaze', profession: 'Street Vendor', skinIdx: 15 },
	{ id: 'npc-03', name: 'Wrench', profession: 'Mechanic', skinIdx: 7 },
	{ id: 'npc-04', name: 'Viper', profession: 'Bounty Hunter', skinIdx: 4 },
	{ id: 'npc-05', name: 'Doc', profession: 'Medic', skinIdx: 27 },
	{ id: 'npc-06', name: 'Drill', profession: 'Miner', skinIdx: 10 },
	{ id: 'npc-07', name: 'Skyline', profession: 'Architect', skinIdx: 9 },
	{ id: 'npc-08', name: 'Flash', profession: 'Courier', skinIdx: 12 },
	{ id: 'npc-09', name: 'Rust', profession: 'Scavenger', skinIdx: 24 },
	{ id: 'npc-10', name: 'Nix', profession: 'Bartender', skinIdx: 17 },
];

const npcSkinMap = new Map(npcPersonaProfiles.map(profile => [profile.id, profile.skinIdx]));

export const getNPCSkinById = (id: string) => npcSkinMap.get(id) ?? 0;
