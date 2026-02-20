import * as THREE from 'three';
import { NPCPersonaProfile } from './types';

export const npcPersonaProfiles: NPCPersonaProfile[] = [
	{ name: 'Neon', profession: 'Hacker', skinIdx: 28, spawnOffset: new THREE.Vector3(-6, 0, -4), defaultAnimation: 'speaking' },
	{ name: 'Blaze', profession: 'Street Vendor', skinIdx: 15, spawnOffset: new THREE.Vector3(-2, 0, -6), defaultAnimation: 'speaking' },
	{ name: 'Wrench', profession: 'Mechanic', skinIdx: 7, spawnOffset: new THREE.Vector3(2, 0, -6), defaultAnimation: 'building' },
	{ name: 'Viper', profession: 'Bounty Hunter', skinIdx: 4, spawnOffset: new THREE.Vector3(6, 0, -4), defaultAnimation: 'idle' },
	{ name: 'Doc', profession: 'Medic', skinIdx: 27, spawnOffset: new THREE.Vector3(-7, 0, 0), defaultAnimation: 'speaking' },
	{ name: 'Drill', profession: 'Miner', skinIdx: 10, spawnOffset: new THREE.Vector3(7, 0, 0), defaultAnimation: 'mining' },
	{ name: 'Skyline', profession: 'Architect', skinIdx: 9, spawnOffset: new THREE.Vector3(-6, 0, 5), defaultAnimation: 'building' },
	{ name: 'Flash', profession: 'Courier', skinIdx: 12, spawnOffset: new THREE.Vector3(-2, 0, 7), defaultAnimation: 'walking' },
	{ name: 'Rust', profession: 'Scavenger', skinIdx: 24, spawnOffset: new THREE.Vector3(2, 0, 7), defaultAnimation: 'mining' },
	{ name: 'Nix', profession: 'Bartender', skinIdx: 17, spawnOffset: new THREE.Vector3(6, 0, 5), defaultAnimation: 'speaking' },
];
