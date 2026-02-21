import { CLIENT_NPC_EVENT_TYPES, ClientNPCEvent, ClientNPCEventListener, ClientNPCEventPayloadMap, ClientNPCEventType } from './client-npc-event-types';

type Unsubscribe = () => void;

type ClientNPCEventBusOptions = {
	throttleMs?: Partial<Record<ClientNPCEventType, number>>;
};

const DEFAULT_THROTTLE_MS: Record<ClientNPCEventType, number> = {
	[CLIENT_NPC_EVENT_TYPES.NPC_STATE_UPDATE]: 120,
	[CLIENT_NPC_EVENT_TYPES.NPC_ACTION]: 0,
	[CLIENT_NPC_EVENT_TYPES.NPC_DIALOGUE]: 0,
	[CLIENT_NPC_EVENT_TYPES.SURVIVAL_UPDATE]: 120,
};

const getThrottleKey = (event: ClientNPCEvent): string => {
	switch (event.type) {
		case CLIENT_NPC_EVENT_TYPES.NPC_STATE_UPDATE:
			return (event as ClientNPCEvent<'NPC_STATE_UPDATE'>).payload.npcId;
		case CLIENT_NPC_EVENT_TYPES.NPC_ACTION:
			return (event as ClientNPCEvent<'NPC_ACTION'>).payload.npcId;
		case CLIENT_NPC_EVENT_TYPES.NPC_DIALOGUE:
			return (event as ClientNPCEvent<'NPC_DIALOGUE'>).payload.npcId;
		case CLIENT_NPC_EVENT_TYPES.SURVIVAL_UPDATE:
			return (event as ClientNPCEvent<'SURVIVAL_UPDATE'>).payload.entityId;
		default:
			return '__default__';
	}
};

export class ClientNPCEventBus {
	private readonly listeners: {
		[K in ClientNPCEventType]: Set<ClientNPCEventListener<K>>;
	};

	private readonly throttleMsByType: Record<ClientNPCEventType, number>;

	private readonly pendingByTypeAndKey: Map<ClientNPCEventType, Map<string, ClientNPCEvent>>;

	private readonly timerByType: Map<ClientNPCEventType, ReturnType<typeof setTimeout>>;

	constructor(options: ClientNPCEventBusOptions = {}) {
		this.listeners = {
			NPC_STATE_UPDATE: new Set(),
			NPC_ACTION: new Set(),
			NPC_DIALOGUE: new Set(),
			SURVIVAL_UPDATE: new Set(),
		};
		this.throttleMsByType = {
			...DEFAULT_THROTTLE_MS,
			...options.throttleMs,
		};
		this.pendingByTypeAndKey = new Map();
		this.timerByType = new Map();
	}

	subscribe<T extends ClientNPCEventType>(type: T, listener: ClientNPCEventListener<T>): Unsubscribe {
		this.listeners[type].add(listener as ClientNPCEventListener);
		return () => this.unsubscribe(type, listener);
	}

	unsubscribe<T extends ClientNPCEventType>(type: T, listener: ClientNPCEventListener<T>): void {
		this.listeners[type].delete(listener as ClientNPCEventListener);
	}

	dispatch<T extends ClientNPCEventType>(type: T, payload: ClientNPCEventPayloadMap[T], timestamp = Date.now()): void {
		const event: ClientNPCEvent<T> = {
			type,
			timestamp,
			payload,
		};
		this.enqueueOrEmit(event);
	}

	dispatchBatch(events: ClientNPCEvent[]): void {
		events.forEach(event => this.enqueueOrEmit(event));
	}

	clear(): void {
		this.timerByType.forEach(timer => clearTimeout(timer));
		this.timerByType.clear();
		this.pendingByTypeAndKey.clear();
	}

	private enqueueOrEmit(event: ClientNPCEvent): void {
		const throttleMs = this.throttleMsByType[event.type] ?? 0;
		if (throttleMs <= 0) {
			this.emitNow(event);
			return;
		}
		const key = getThrottleKey(event);
		const pendingByKey = this.pendingByTypeAndKey.get(event.type) ?? new Map<string, ClientNPCEvent>();
		pendingByKey.set(key, event);
		this.pendingByTypeAndKey.set(event.type, pendingByKey);
		if (this.timerByType.has(event.type)) return;
		const timer = setTimeout(() => {
			this.timerByType.delete(event.type);
			const queue = this.pendingByTypeAndKey.get(event.type);
			if (!queue) return;
			this.pendingByTypeAndKey.delete(event.type);
			queue.forEach(item => this.emitNow(item));
		}, throttleMs);
		this.timerByType.set(event.type, timer);
	}

	private emitNow<T extends ClientNPCEventType>(event: ClientNPCEvent<T>): void {
		this.listeners[event.type].forEach(listener => {
			(listener as ClientNPCEventListener<T>)(event);
		});
	}
}
