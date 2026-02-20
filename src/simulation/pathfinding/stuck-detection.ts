import { GridPoint } from './types';
import { samePoint } from './point-key';

const STUCK_TICKS_THRESHOLD = 3;

export const shouldRerouteFromStuckTicks = (ticksWithoutMovement: number): boolean => ticksWithoutMovement >= STUCK_TICKS_THRESHOLD;

export class PathStuckDetector {
	private previousPosition: GridPoint | null = null;

	private ticksWithoutMovement = 0;

	update(position: GridPoint): boolean {
		if (this.previousPosition && samePoint(this.previousPosition, position)) {
			this.ticksWithoutMovement += 1;
		} else {
			this.ticksWithoutMovement = 0;
		}
		this.previousPosition = { ...position };
		return shouldRerouteFromStuckTicks(this.ticksWithoutMovement);
	}

	reset(): void {
		this.previousPosition = null;
		this.ticksWithoutMovement = 0;
	}

	getTicksWithoutMovement(): number {
		return this.ticksWithoutMovement;
	}
}
