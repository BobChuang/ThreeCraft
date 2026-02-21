'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.nixPersona =
	exports.rustPersona =
	exports.flashPersona =
	exports.skylinePersona =
	exports.drillPersona =
	exports.docPersona =
	exports.viperPersona =
	exports.wrenchPersona =
	exports.blazePersona =
	exports.neonPersona =
	exports.npcPersonas =
		void 0;
const blaze_1 = require('./blaze');
Object.defineProperty(exports, 'blazePersona', {
	enumerable: true,
	get: function () {
		return blaze_1.blazePersona;
	},
});
const doc_1 = require('./doc');
Object.defineProperty(exports, 'docPersona', {
	enumerable: true,
	get: function () {
		return doc_1.docPersona;
	},
});
const drill_1 = require('./drill');
Object.defineProperty(exports, 'drillPersona', {
	enumerable: true,
	get: function () {
		return drill_1.drillPersona;
	},
});
const flash_1 = require('./flash');
Object.defineProperty(exports, 'flashPersona', {
	enumerable: true,
	get: function () {
		return flash_1.flashPersona;
	},
});
const neon_1 = require('./neon');
Object.defineProperty(exports, 'neonPersona', {
	enumerable: true,
	get: function () {
		return neon_1.neonPersona;
	},
});
const nix_1 = require('./nix');
Object.defineProperty(exports, 'nixPersona', {
	enumerable: true,
	get: function () {
		return nix_1.nixPersona;
	},
});
const rust_1 = require('./rust');
Object.defineProperty(exports, 'rustPersona', {
	enumerable: true,
	get: function () {
		return rust_1.rustPersona;
	},
});
const skyline_1 = require('./skyline');
Object.defineProperty(exports, 'skylinePersona', {
	enumerable: true,
	get: function () {
		return skyline_1.skylinePersona;
	},
});
const viper_1 = require('./viper');
Object.defineProperty(exports, 'viperPersona', {
	enumerable: true,
	get: function () {
		return viper_1.viperPersona;
	},
});
const wrench_1 = require('./wrench');
Object.defineProperty(exports, 'wrenchPersona', {
	enumerable: true,
	get: function () {
		return wrench_1.wrenchPersona;
	},
});
exports.npcPersonas = [
	neon_1.neonPersona,
	blaze_1.blazePersona,
	wrench_1.wrenchPersona,
	viper_1.viperPersona,
	doc_1.docPersona,
	drill_1.drillPersona,
	skyline_1.skylinePersona,
	flash_1.flashPersona,
	rust_1.rustPersona,
	nix_1.nixPersona,
];
