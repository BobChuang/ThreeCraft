'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.LruRouteCache = void 0;
class LruRouteCache {
	constructor(capacity) {
		this.cache = new Map();
		this.capacity = capacity;
	}
	get(key) {
		const value = this.cache.get(key);
		if (!value) {
			return null;
		}
		this.cache.delete(key);
		this.cache.set(key, value);
		return value.map(point => ({ ...point }));
	}
	set(key, route) {
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
	clear() {
		this.cache.clear();
	}
	size() {
		return this.cache.size;
	}
}
exports.LruRouteCache = LruRouteCache;
