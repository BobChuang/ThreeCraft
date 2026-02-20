import { blazePersona } from './blaze';
import { docPersona } from './doc';
import { drillPersona } from './drill';
import { flashPersona } from './flash';
import { neonPersona } from './neon';
import { nixPersona } from './nix';
import { rustPersona } from './rust';
import { skylinePersona } from './skyline';
import { viperPersona } from './viper';
import { wrenchPersona } from './wrench';

export interface NPCPersonaDefinition {
	name: string;
	profession: string;
	backstory: string;
	systemPrompt: string;
	traits: string[];
	defaultGoals: string[];
	preferredActions: string[];
}

export const npcPersonas: NPCPersonaDefinition[] = [neonPersona, blazePersona, wrenchPersona, viperPersona, docPersona, drillPersona, skylinePersona, flashPersona, rustPersona, nixPersona];

export { neonPersona, blazePersona, wrenchPersona, viperPersona, docPersona, drillPersona, skylinePersona, flashPersona, rustPersona, nixPersona };
