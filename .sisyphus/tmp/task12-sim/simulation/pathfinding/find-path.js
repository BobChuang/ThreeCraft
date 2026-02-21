'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.getPathCacheSize = exports.clearPathCache = exports.findPath = void 0;
const a_star_1 = require('./a-star');
const lru_route_cache_1 = require('./lru-route-cache');
const point_key_1 = require('./point-key');
const walkability_1 = require('./walkability');
const MAX_EXPLORED_NODES = 200;
const ROUTE_CACHE_CAPACITY = 50;
const routeCache = new lru_route_cache_1.LruRouteCache(ROUTE_CACHE_CAPACITY);
const getRouteCacheKey = (start, target) => `${(0, point_key_1.toPointKey)(start)}->${(0, point_key_1.toPointKey)(target)}`;
const findPath = (start, target, worldQuery, options = {}) => {
	var _a, _b;
	const isSolid = (_a = options.isSolid) !== null && _a !== void 0 ? _a : walkability_1.defaultIsSolid;
	const maxExploredNodes = (_b = options.maxExploredNodes) !== null && _b !== void 0 ? _b : MAX_EXPLORED_NODES;
	const walkableStart = (0, walkability_1.resolveWalkablePoint)(start, worldQuery, isSolid);
	const walkableTarget = (0, walkability_1.resolveWalkablePoint)(target, worldQuery, isSolid);
	if (!walkableStart || !walkableTarget) {
		return null;
	}
	const cacheKey = getRouteCacheKey(walkableStart, walkableTarget);
	const cachedPath = routeCache.get(cacheKey);
	if (cachedPath) {
		return cachedPath;
	}
	const path = (0, a_star_1.runAStar)(walkableStart, walkableTarget, worldQuery, isSolid, maxExploredNodes);
	if (!path) {
		return null;
	}
	routeCache.set(cacheKey, path);
	return path;
};
exports.findPath = findPath;
const clearPathCache = () => {
	routeCache.clear();
};
exports.clearPathCache = clearPathCache;
const getPathCacheSize = () => routeCache.size();
exports.getPathCacheSize = getPathCacheSize;
