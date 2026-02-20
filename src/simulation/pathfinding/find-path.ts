import { runAStar } from './a-star';
import { LruRouteCache } from './lru-route-cache';
import { GridPoint, PathResult, WorldQuery, FindPathOptions } from './types';
import { toPointKey } from './point-key';
import { defaultIsSolid, resolveWalkablePoint } from './walkability';

const MAX_EXPLORED_NODES = 200;
const ROUTE_CACHE_CAPACITY = 50;

const routeCache = new LruRouteCache(ROUTE_CACHE_CAPACITY);

const getRouteCacheKey = (start: GridPoint, target: GridPoint): string => `${toPointKey(start)}->${toPointKey(target)}`;

export const findPath = (start: GridPoint, target: GridPoint, worldQuery: WorldQuery, options: FindPathOptions = {}): PathResult => {
	const isSolid = options.isSolid ?? defaultIsSolid;
	const maxExploredNodes = options.maxExploredNodes ?? MAX_EXPLORED_NODES;
	const walkableStart = resolveWalkablePoint(start, worldQuery, isSolid);
	const walkableTarget = resolveWalkablePoint(target, worldQuery, isSolid);
	if (!walkableStart || !walkableTarget) {
		return null;
	}

	const cacheKey = getRouteCacheKey(walkableStart, walkableTarget);
	const cachedPath = routeCache.get(cacheKey);
	if (cachedPath) {
		return cachedPath;
	}

	const path = runAStar(walkableStart, walkableTarget, worldQuery, isSolid, maxExploredNodes);
	if (!path) {
		return null;
	}
	routeCache.set(cacheKey, path);
	return path;
};

export const clearPathCache = (): void => {
	routeCache.clear();
};

export const getPathCacheSize = (): number => routeCache.size();
