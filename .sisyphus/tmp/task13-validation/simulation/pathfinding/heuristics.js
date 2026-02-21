'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.manhattanDistance = void 0;
const manhattanDistance = (from, to) => Math.abs(from.x - to.x) + Math.abs(from.y - to.y) + Math.abs(from.z - to.z);
exports.manhattanDistance = manhattanDistance;
