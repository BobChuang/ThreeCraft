import { GridPoint } from './types';

export class LruRouteCache {
	private readonly capacity: number;

	private readonly cache = new Map<string, GridPoint[]>();

	constructor(capacity: number) {
		this.capacity = capacity;
	}

	get(key: string): GridPoint[] | null {
		const value = this.cache.get(key);
		if (!value) {
			return null;
		}
		this.cache.delete(key);
		this.cache.set(key, value);
		return value.map(point => ({ ...point }));
	}

	set(key: string, route: GridPoint[]): void {
		if (this.cache.has(key)) {
			this.cache.delete(key);
		}
		this.cache.set(
			key,
			route.map(point => ({ ...point }))
		);
		if (this.cache.size <= this.capacity) {
			return;
		}
		const oldestKey = this.cache.keys().next().value;
		if (oldestKey) {
			this.cache.delete(oldestKey);
		}
	}

	clear(): void {
		this.cache.clear();
	}

	size(): number {
		return this.cache.size;
	}
}
