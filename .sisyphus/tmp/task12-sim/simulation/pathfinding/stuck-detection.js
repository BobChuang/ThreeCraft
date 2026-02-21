'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.PathStuckDetector = exports.shouldRerouteFromStuckTicks = void 0;
const point_key_1 = require('./point-key');
const STUCK_TICKS_THRESHOLD = 3;
const shouldRerouteFromStuckTicks = ticksWithoutMovement => ticksWithoutMovement >= STUCK_TICKS_THRESHOLD;
exports.shouldRerouteFromStuckTicks = shouldRerouteFromStuckTicks;
class PathStuckDetector {
	constructor() {
		this.previousPosition = null;
		this.ticksWithoutMovement = 0;
	}
	update(position) {
		if (this.previousPosition && (0, point_key_1.samePoint)(this.previousPosition, position)) {
			this.ticksWithoutMovement += 1;
		} else {
			this.ticksWithoutMovement = 0;
		}
		this.previousPosition = { ...position };
		return (0, exports.shouldRerouteFromStuckTicks)(this.ticksWithoutMovement);
	}
	reset() {
		this.previousPosition = null;
		this.ticksWithoutMovement = 0;
	}
	getTicksWithoutMovement() {
		return this.ticksWithoutMovement;
	}
}
exports.PathStuckDetector = PathStuckDetector;
