import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import UI from '../ui';
import Core from '../core';
import UiController from './ui-controller';
import { GameController } from './game-controller';
import { config, defaultConfig, language } from './config';
import { deepCopy } from '../utils/deep-copy';
import weatherConfig from '../core/weather';
import Log from './log';
import MultiPlay from './MultiPlay';
import {
	CLIENT_NPC_EVENT_TYPES,
	ClientNPCEvent,
	ClientNPCEventBus,
	ClientSimulationBridge,
	mapBridgeEventToClientNPCEvent,
	mapNPCStatesToClientEvents,
	PLAYER_RESPAWN_POINT_XZ,
	SimulationBridgeEvent,
	SimulationEngine,
	SimulationNPCState,
	initializeCyberpunkGameStart,
	resolveCyberpunkBrainBootstrap,
	type PersistenceAdapter,
	WorldPersistenceController,
} from '../simulation';
import { NPCRenderer, toNPCRenderSnapshot } from '../core/npc';
import { PossessionController } from './possession';
import { ObserverController } from './observer';
import type { SurvivalHUDViewModel } from '../ui/survival-hud/types';

const fixedMapIndexRaw = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_FIXED_MAP_INDEX?.trim();
let hasWarnedInvalidFixedMapIndex = false;

const getFixedMapIndex = () => {
	if (!fixedMapIndexRaw) return null;
	const fixedMapIndex = Number(fixedMapIndexRaw);
	const maxIndex = weatherConfig.length - 1;
	if (!Number.isInteger(fixedMapIndex) || fixedMapIndex < 0 || fixedMapIndex > maxIndex) {
		if (!hasWarnedInvalidFixedMapIndex) {
			console.warn(`[config] Invalid VITE_FIXED_MAP_INDEX="${fixedMapIndexRaw}", expected integer in range 0-${maxIndex}. Fallback to random map index.`);
			hasWarnedInvalidFixedMapIndex = true;
		}
		return null;
	}
	return fixedMapIndex;
};

interface NPCTaskTracker {
	npcName: string;
	completedGoals: string[];
	currentGoal: string | null;
	upcomingGoals: string[];
	updatedAt: number;
}

interface NPCTaskListPanelState {
	npcName: string;
	currentGoal: string | null;
	items: Array<{ text: string; status: 'todo' | 'in-progress' | 'done' }>;
}

interface PlayerSurvivalHUDState {
	hp: number;
	maxHp: number;
	hunger: number;
	maxHunger: number;
}

const normalizeGoalText = (value: string): string =>
	value
		.trim()
		.replace(/[\u3000\t]+/g, ' ')
		.replace(/\s{2,}/g, ' ')
		.replace(/^[-*•\d.)、\]]+\s*/, '')
		.replace(/[;；。]+$/, '');

const parseGoalListFromNextGoal = (nextGoal: string): string[] => {
	const normalized = nextGoal.replaceAll('\r', '').trim();
	if (!normalized) return [];
	const byLine = normalized.split('\n').map(normalizeGoalText).filter(Boolean);
	if (byLine.length > 1) return byLine.slice(0, 8);
	const numbered = normalized
		.split(/\s*\d+[.)、]\s*/)
		.map(normalizeGoalText)
		.filter(Boolean);
	if (numbered.length > 1) return numbered.slice(0, 8);
	const segmented = normalized
		.split(/\s*(?:->|=>|＞|>|\||;|；)\s*/)
		.map(normalizeGoalText)
		.filter(Boolean);
	if (segmented.length > 1) return segmented.slice(0, 8);
	return [normalizeGoalText(normalized)].filter(Boolean);
};

const isValidWeatherIndex = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0 && (value as number) < weatherConfig.length;

const resolvePlayableWeatherIndex = (current: unknown): number => {
	if (isValidWeatherIndex(current)) return current;
	const fixedMapIndex = getFixedMapIndex();
	if (fixedMapIndex !== null) return fixedMapIndex;
	return Math.floor(Math.random() * weatherConfig.length);
};

const isCyberpunkSceneSelected = (): boolean => {
	if (!isValidWeatherIndex(config.weather)) return false;
	const weatherType = weatherConfig[config.weather];
	if (!weatherType) return false;
	return weatherType[3] === 5;
};

class Controller {
	ui: UI;

	core: Core | null;

	gameController: GameController;

	uiController: UiController;

	running: boolean;

	gameStage: HTMLElement;

	hudStage: HTMLElement;

	VRButtonElem: HTMLElement;

	vr: boolean;

	vrSupport: boolean;

	log: Log;

	multiPlay: MultiPlay;

	simulationEngine: SimulationEngine | null;

	worldPersistence: WorldPersistenceController | null;

	clientEventBus: ClientNPCEventBus | null;

	readonly npcStateById: Map<string, SimulationNPCState>;

	private npcEventUnsubscribers: Array<() => void>;

	npcRenderer: NPCRenderer | null;

	possessionController: PossessionController;

	observerController: ObserverController;

	readonly npcDialogueLog: string[];

	readonly npcThinkingStreamById: Map<string, string>;

	readonly npcTaskTrackerById: Map<string, NPCTaskTracker>;

	private playerSurvivalState: PlayerSurvivalHUDState;

	private hasInitializedCyberpunkStartFlow: boolean;

	private loadedSinglePlayerSnapshot: boolean;

	constructor(el: HTMLElement) {
		// 挂载游戏层和控制器层, 默认看不到
		[...el.children].forEach(d => d.remove());
		this.gameStage = document.createElement('div');
		this.gameStage.setAttribute('id', 'game-stage');
		this.gameStage.classList.add('hidden');
		el.appendChild(this.gameStage);
		this.hudStage = document.createElement('div');
		this.hudStage.setAttribute('id', 'HUD-stage');
		this.hudStage.classList.add('hidden');
		el.appendChild(this.hudStage);

		this.multiPlay = new MultiPlay(this);
		this.simulationEngine = null;
		this.worldPersistence = null;
		this.clientEventBus = null;
		this.npcStateById = new Map();
		this.npcEventUnsubscribers = [];
		this.npcRenderer = null;

		// 读取默认配置文件
		deepCopy(defaultConfig, config);

		// 创建UI与游戏核心
		this.ui = new UI();
		this.core = new Core(this);
		this.running = false;

		// 创建UI控制器与游戏控制器
		this.uiController = new UiController(this.ui);
		this.gameController = new GameController(this.core, this);
		this.possessionController = new PossessionController(this);
		this.observerController = new ObserverController(this);
		this.npcDialogueLog = [];
		this.npcThinkingStreamById = new Map();
		this.npcTaskTrackerById = new Map();
		this.playerSurvivalState = { hp: 100, maxHp: 100, hunger: 100, maxHunger: 100 };
		this.hasInitializedCyberpunkStartFlow = false;
		this.loadedSinglePlayerSnapshot = false;
		this.log = new Log([]);

		// 特殊处理VR部分
		this.vr = false;
		this.vrSupport = false;
		this.VRButtonElem = VRButton.createButton(this.core.renderer);
		this.VRButtonElem.setAttribute('id', 'VRButton');
		document.body.appendChild(this.VRButtonElem);
		navigator?.xr?.isSessionSupported &&
			navigator.xr.isSessionSupported('immersive-vr').then(() => {
				this.core.renderer.xr.enabled = true;
				this.vrSupport = true;
			});

		// 为UI载入控制器
		this.ui.loadController(this);
	}

	// 开始游戏, 载入/创建世界模型, 从头绘制场景(用于从主菜单点击开始游戏后调用)
	startGame(justInit: boolean) {
		// 特判移动端, 要求横屏游戏
		if (config.controller.operation === 'mobile' && !config.controller.dev && window.innerHeight > window.innerWidth) {
			this.uiController.ui.menu.setNotify(language.tryRotate);
			return;
		}
		// 移除隐藏属性
		this.gameStage.classList.remove('hidden');
		this.hudStage.classList.remove('hidden');
		// 单人游戏
		// 如果没有地形, 就生成
		if (config.seed === null) config.seed = Math.random();
		if (config.cloudSeed === null) config.cloudSeed = Math.random();
		if (config.treeSeed === null) config.treeSeed = Math.random();
		if (!isValidWeatherIndex(config.weather)) config.weather = resolvePlayableWeatherIndex(config.weather);
		// 载入log
		this.log.load(config.log);
		if (!this.multiPlay.working) this.ensureSinglePlayerSimulation();
		if (justInit) return;
		// 刷新背包
		this.uiController.ui.bag.place();
		// 尝试渲染
		this.runGame();
		// 提示当前游戏场景名
		this.uiController.ui.menu.setNotify(`${language.weather}: ${language.weatherName[weatherConfig[config.weather][3]]}`, 1500, this.uiController.ui.actionControl.elem);
	}

	// 运行游戏, 更新控制信息并重新绘制场景, 用于点击返回游戏后调用
	runGame() {
		this.gameController.hasChange = false;
		// 特判移动端, 要求横屏游戏
		if (config.controller.operation === 'mobile' && !config.controller.dev && window.innerHeight > window.innerWidth) {
			this.uiController.ui.menu.setNotify(language.tryRotate);
			return;
		}
		// 更新地形, 开始游戏
		this.core.terrain.updateState();
		if (!this.multiPlay.working) this.ensureSinglePlayerNPCs();
		if (!this.multiPlay.working) this.ensureCyberpunkGameStartFlow();
		this.running = true;
		this.core.updateCore();
		// 要求控制层重新开始监听
		this.uiController.ui.listenAll();
		this.uiController.ui.menu.hideMenu();
		// 默认正在跳跃, 防止卡Bug
		this.gameController.moveController.jumping = true;
		this.tryRender();
		this.multiPlay.playersController.addScene();
		if (this.multiPlay.working) {
			this.npcRenderer?.clear();
			this.npcRenderer = null;
		}
	}

	// 停止游戏(进入了菜单)
	pauseGame() {
		this.running = false;
		this.uiController.ui.pauseAll();
	}

	// 结束游戏(清除当前状态)
	endGame() {
		this.observerController.reset();
		this.possessionController.reset();
		this.npcEventUnsubscribers.forEach(unsubscribe => unsubscribe());
		this.npcEventUnsubscribers = [];
		this.clientEventBus?.clear();
		this.clientEventBus = null;
		this.npcStateById.clear();
		this.npcThinkingStreamById.clear();
		this.npcTaskTrackerById.clear();
		this.playerSurvivalState = { hp: 100, maxHp: 100, hunger: 100, maxHunger: 100 };
		this.simulationEngine?.stop();
		this.worldPersistence?.saveNow();
		this.worldPersistence?.stop();
		this.worldPersistence = null;
		this.simulationEngine = null;
		this.npcRenderer?.clear();
		this.npcRenderer = null;
		this.hasInitializedCyberpunkStartFlow = false;
		this.loadedSinglePlayerSnapshot = false;
		deepCopy(defaultConfig, config);
		this.core.terrain.clear();
		if (this.multiPlay.working) {
			this.multiPlay?.emitLeaveRoom();
			this.multiPlay.socket?.close();
			this.multiPlay.socket = null;
		}
	}

	// 用户切换了作弊模式
	toggleCheatMode() {
		config.controller.cheat = !config.controller.cheat;
		this.gameController.moveController.jumping = true;
		this;
	}

	// 尝试渲染
	tryRender() {
		if (!this.running) return;
		// 对于VR使用setAnimationLoop
		if (this.vr) this.core.renderer.setAnimationLoop(this.tryRender.bind(this));
		else requestAnimationFrame(this.tryRender.bind(this));
		// 发送动作到游戏手柄
		if (this.uiController.ui.actionControl.gamepad) this.uiController.ui.actionControl.sendGamepadAction(navigator?.getGamepads());
		if (this.uiController.ui.bag.gamepad) this.uiController.ui.bag.sendGamepadAction(navigator?.getGamepads());
		// 上传数据
		if (this.multiPlay.working && this.gameController.hasChange) {
			this.multiPlay.emitUpdateState();
			this.gameController.hasChange = false;
		}
		this.possessionController.syncControlledNPCPosition();
		this.observerController.update();
		if (this.simulationEngine) this.simulationEngine.setObservers([{ x: config.state.posX, y: config.state.posY, z: config.state.posZ }]);
		if (this.simulationEngine && this.npcRenderer) {
			const npcStates = this.simulationEngine.getNPCStates();
			this.clientEventBus?.dispatchBatch(mapNPCStatesToClientEvents(npcStates));
			const snapshots = npcStates.map((state: SimulationNPCState) =>
				toNPCRenderSnapshot({
					id: state.id,
					name: state.name,
					profession: state.profession,
					position: state.position,
					lastAction: state.lastAction,
					thinkingState: state.thinkingState,
				})
			);
			this.npcRenderer.syncSnapshots(snapshots);
			this.possessionController.syncPossessedStateFromSimulation();
		}
		this.ui.taskList.sync(this.getPossessedNPCTaskListState());
		this.ui.survivalHud.sync(this.getSurvivalHUDState());
		// 补充人物运动动画
		this.multiPlay.playersController.render();
		if (!this.multiPlay.working) this.npcRenderer?.render();
		// FPS继续计数
		this.uiController.ui.fps.work();
		this.gameController.update();
		// 尝试渲染场景
		this.core.tryRender();
	}

	ensureSinglePlayerSimulation() {
		if (this.simulationEngine || this.multiPlay.working) return;
		this.ensureClientEventBus();
		const cyberpunkScene = isCyberpunkSceneSelected();
		const brainBootstrap = resolveCyberpunkBrainBootstrap(cyberpunkScene);
		const bridge = new ClientSimulationBridge(this, {
			onEvent: event => this.handleSimulationEvent(event),
			llmConfig: brainBootstrap.llmConfig,
		});
		this.simulationEngine = new SimulationEngine(bridge, {
			tickIntervalMs: 500,
			observerSleepDistance: 128,
			useStubBrain: brainBootstrap.useStubBrain,
			initialObservers: [{ x: config.state.posX, y: config.state.posY, z: config.state.posZ }],
		});
		this.worldPersistence = new WorldPersistenceController(this.createSinglePlayerPersistenceAdapter());
		const snapshot = this.worldPersistence.loadLatest();
		this.loadedSinglePlayerSnapshot = Boolean(snapshot);
		if (snapshot) {
			this.log = new Log(config.log);
		}
		this.simulationEngine.start();
		const playerSurvival = this.simulationEngine.getSurvivalState('player-local');
		this.playerSurvivalState = {
			hp: playerSurvival.hp,
			maxHp: playerSurvival.maxHp,
			hunger: playerSurvival.hunger,
			maxHunger: playerSurvival.maxHunger,
		};
		this.worldPersistence.start();
	}

	private ensureCyberpunkGameStartFlow(): void {
		if (!this.simulationEngine || !this.core || this.hasInitializedCyberpunkStartFlow || !isCyberpunkSceneSelected()) return;
		initializeCyberpunkGameStart({
			simulationEngine: this.simulationEngine,
			terrain: this.core.terrain,
			skipForPersistedWorld: this.loadedSinglePlayerSnapshot,
			applySpringBlocks: blocks => {
				blocks.forEach(block => this.log.insert(block));
				this.gameController.blockController.update(blocks, true);
			},
			notifyHint: message => {
				this.uiController.ui.menu.setNotify(message, 1800, this.uiController.ui.actionControl.elem);
			},
		});
		this.hasInitializedCyberpunkStartFlow = true;
	}

	private createSinglePlayerPersistenceAdapter(): PersistenceAdapter {
		return {
			readWorldConfig: () => ({
				seed: config.seed,
				cloudSeed: config.cloudSeed,
				treeSeed: config.treeSeed,
				weather: config.weather,
				playerPosition: {
					x: config.state.posX,
					y: config.state.posY,
					z: config.state.posZ,
				},
				blockLog: this.log.export(),
			}),
			readWorldState: () => {
				if (!this.simulationEngine) throw new Error('Simulation engine is not ready');
				return {
					npcs: this.simulationEngine.exportPersistedNPCStates(),
					playerSurvival: this.simulationEngine.getSurvivalState('player-local'),
					worldDrops: this.simulationEngine.getWorldDrops(),
					monsters: this.simulationEngine.getMonsterStates(),
				};
			},
			applySnapshot: snapshot => {
				if (!this.simulationEngine) throw new Error('Simulation engine is not ready');
				const resolvedWeather = isValidWeatherIndex(snapshot.weather) ? snapshot.weather : resolvePlayableWeatherIndex(config.weather);
				const mutableConfig = config as unknown as {
					seed: number | null;
					cloudSeed: number | null;
					treeSeed: number | null;
					weather: number | null;
					state: { posX: number; posY: number; posZ: number };
					log: Array<{ type: string | null; posX: number; posY: number; posZ: number }>;
				};
				mutableConfig.seed = snapshot.seed;
				mutableConfig.cloudSeed = snapshot.cloudSeed;
				mutableConfig.treeSeed = snapshot.treeSeed;
				mutableConfig.weather = resolvedWeather;
				mutableConfig.state.posX = snapshot.playerPosition.x;
				mutableConfig.state.posY = snapshot.playerPosition.y;
				mutableConfig.state.posZ = snapshot.playerPosition.z;
				mutableConfig.log = snapshot.blockLog.map(item => ({ ...item }));
				this.core?.camera.position.set(snapshot.playerPosition.x, snapshot.playerPosition.y, snapshot.playerPosition.z);
				this.simulationEngine.applyPersistedState({
					npcs: snapshot.npcs,
					playerSurvival: snapshot.playerSurvival,
					worldDrops: snapshot.worldDrops,
					monsters: snapshot.monsters,
				});
				this.playerSurvivalState = {
					hp: snapshot.playerSurvival.hp,
					maxHp: snapshot.playerSurvival.maxHp,
					hunger: snapshot.playerSurvival.hunger,
					maxHunger: snapshot.playerSurvival.maxHunger,
				};
			},
		};
	}

	tryOpenDialogueWithNearbyNPC(): boolean {
		if (!this.simulationEngine || !this.npcRenderer) return false;
		const nearest = this.npcRenderer.findNearestNPC({ x: config.state.posX, y: config.state.posY, z: config.state.posZ }, 24);
		if (!nearest) return false;
		this.ui.dialogue.open({
			targetNpcId: nearest.id,
			targetNpcName: nearest.displayName,
			onSubmit: content => {
				const accepted = this.simulationEngine?.submitPlayerDialogue(nearest.id, content);
				if (!accepted) return;
				this.ui.menu.setNotify(`Sent to ${nearest.displayName}`, 900, this.ui.actionControl.elem);
			},
		});
		return true;
	}

	private handleSimulationEvent(event: SimulationBridgeEvent): void {
		this.ui.sidebarLog.handleSimulationEvent(event);
		if (event.type === 'survival:update') {
			const entityId = typeof event.payload.entityId === 'string' ? event.payload.entityId : '';
			if (entityId === 'player-local') {
				const hp = typeof event.payload.hp === 'number' ? event.payload.hp : this.playerSurvivalState.hp;
				const hunger = typeof event.payload.hunger === 'number' ? event.payload.hunger : this.playerSurvivalState.hunger;
				this.playerSurvivalState = {
					...this.playerSurvivalState,
					hp,
					hunger,
				};
			}
		}
		const mapped = mapBridgeEventToClientNPCEvent(event);
		if (mapped) this.clientEventBus?.dispatchBatch([mapped]);
		if (event.type === 'player:death') {
			if (this.multiPlay.working || !this.simulationEngine || this.simulationEngine.isPlayerDead() === false) return;
			if (this.possessionController.isPossessing()) this.possessionController.reset();
			if (this.observerController.isObserverMode()) this.observerController.reset();
			this.ui.dialogue.close();
			this.ui.death.open({
				onRespawn: () => this.handlePlayerRespawnRequest(),
			});
			this.ui.actionControl.pause();
			return;
		}
		if (event.type === 'player:respawn') {
			this.ui.death.close();
			if (this.running) this.ui.actionControl.listen();
		}
	}

	private handlePlayerRespawnRequest(): void {
		if (!this.simulationEngine || !this.core || this.multiPlay.working) return;
		const surfaceY = this.core.terrain.getFloorHeight(PLAYER_RESPAWN_POINT_XZ.x, PLAYER_RESPAWN_POINT_XZ.z) + 1;
		const respawnPosition = {
			x: PLAYER_RESPAWN_POINT_XZ.x,
			y: surfaceY,
			z: PLAYER_RESPAWN_POINT_XZ.z,
		};
		const success = this.simulationEngine.respawnPlayer(respawnPosition);
		if (!success) return;
		config.state.posX = respawnPosition.x;
		config.state.posY = respawnPosition.y;
		config.state.posZ = respawnPosition.z;
		this.core.camera.position.set(respawnPosition.x, respawnPosition.y, respawnPosition.z);
		this.gameController.moveController.jumping = true;
		this.uiController.ui.bag.items = Array(10).fill(null);
		this.uiController.ui.bag.update();
		this.uiController.ui.bag.highlight();
		this.ui.menu.setNotify('已在复活点重生', 1200, this.ui.actionControl.elem);
	}

	ensureSinglePlayerNPCs() {
		if (this.multiPlay.working) return;
		if (!this.npcRenderer) this.npcRenderer = new NPCRenderer(this.core.scene);
	}

	getNPCStateFromClientBus(npcId: string): SimulationNPCState | null {
		const state = this.npcStateById.get(npcId);
		if (!state) return null;
		return {
			...state,
			position: { ...state.position },
			inventory: state.inventory.map(slot => ({ ...slot })),
			survival: { ...state.survival },
		};
	}

	getNPCStatesFromClientBus(): SimulationNPCState[] {
		return [...this.npcStateById.values()].map(state => ({
			...state,
			position: { ...state.position },
			inventory: state.inventory.map(slot => ({ ...slot })),
			survival: { ...state.survival },
		}));
	}

	private ensureClientEventBus(): void {
		if (this.clientEventBus) return;
		this.clientEventBus = new ClientNPCEventBus();
		this.npcEventUnsubscribers.push(
			this.clientEventBus.subscribe(CLIENT_NPC_EVENT_TYPES.NPC_STATE_UPDATE, event => {
				this.npcStateById.set(event.payload.npcId, event.payload.state);
				const tracked = this.npcTaskTrackerById.get(event.payload.npcId);
				if (tracked && tracked.npcName !== event.payload.state.name) tracked.npcName = event.payload.state.name;
			}),
			this.clientEventBus.subscribe(CLIENT_NPC_EVENT_TYPES.NPC_THINKING_STATE, event => {
				const current = this.npcStateById.get(event.payload.npcId);
				if (current) {
					this.npcStateById.set(event.payload.npcId, {
						...current,
						thinkingState: event.payload.state,
					});
				}
				if (event.payload.state === 'idle') {
					this.npcThinkingStreamById.delete(event.payload.npcId);
					this.npcRenderer?.hideThinking(event.payload.npcId);
					return;
				}
				if (event.payload.state === 'requesting') {
					this.npcThinkingStreamById.delete(event.payload.npcId);
					this.npcRenderer?.showThinkingRequesting(event.payload.npcId, event.timestamp);
					return;
				}
				if (event.payload.state === 'received') {
					const streamedReasoning = this.npcThinkingStreamById.get(event.payload.npcId)?.trim();
					if (!streamedReasoning) return;
					this.npcRenderer?.showThinkingReasoning(event.payload.npcId, streamedReasoning, event.timestamp);
					return;
				}
				if (event.payload.state === 'executing') {
					this.npcRenderer?.showThinkingExecuting(event.payload.npcId, '执行中', event.timestamp);
				}
			}),
			this.clientEventBus.subscribe(CLIENT_NPC_EVENT_TYPES.NPC_THINKING_STREAM, event => {
				const prevChunk = this.npcThinkingStreamById.get(event.payload.npcId) ?? '';
				const nextChunk = `${prevChunk}${event.payload.chunk}`.trim();
				if (nextChunk) this.npcThinkingStreamById.set(event.payload.npcId, nextChunk.slice(0, 240));
				this.npcRenderer?.appendThinkingStream(event.payload.npcId, event.payload.chunk, event.timestamp);
			}),
			this.clientEventBus.subscribe(CLIENT_NPC_EVENT_TYPES.NPC_ACTION, event => {
				const current = this.npcStateById.get(event.payload.npcId);
				if (!current) return;
				this.npcStateById.set(event.payload.npcId, {
					...current,
					lastAction: event.payload.action,
					position: { ...event.payload.position },
				});
				if (typeof event.payload.reasoning === 'string' && event.payload.reasoning.trim()) {
					this.npcRenderer?.showThinkingReasoning(event.payload.npcId, event.payload.reasoning, event.timestamp);
					this.npcThinkingStreamById.set(event.payload.npcId, event.payload.reasoning.trim().slice(0, 240));
				}
				this.updateNPCTaskTracker(event.payload.npcId, event.payload.nextGoal);
				this.npcRenderer?.showThinkingExecuting(event.payload.npcId, event.payload.action, event.timestamp);
			}),
			this.clientEventBus.subscribe(CLIENT_NPC_EVENT_TYPES.SURVIVAL_UPDATE, event => {
				if (!event.payload.entityId.startsWith('npc-')) return;
				const current = this.npcStateById.get(event.payload.entityId);
				if (!current) return;
				this.npcStateById.set(event.payload.entityId, {
					...current,
					survival: {
						...current.survival,
						hp: event.payload.hp,
						hunger: event.payload.hunger,
					},
				});
			}),
			this.clientEventBus.subscribe(CLIENT_NPC_EVENT_TYPES.NPC_DIALOGUE, event => this.handleClientNPCDialogue(event))
		);
	}

	private handleClientNPCDialogue(event: ClientNPCEvent<'NPC_DIALOGUE'>): void {
		const { npcId, dialogue } = event.payload;
		if (!npcId || !dialogue) return;
		this.npcRenderer?.showDialogue(npcId, dialogue, event.timestamp);
		const sourceId = typeof event.payload.sourceNpcId === 'string' ? event.payload.sourceNpcId : npcId;
		const targetId = typeof event.payload.targetNpcId === 'string' ? event.payload.targetNpcId : 'unknown';
		this.npcDialogueLog.push(`${new Date(event.timestamp).toISOString()} ${sourceId} -> ${targetId}: ${dialogue}`);
		if (this.npcDialogueLog.length > 100) this.npcDialogueLog.shift();
	}

	private getPossessedNPCTaskListState(): NPCTaskListPanelState | null {
		if (config.controller.operation !== 'pc') return null;
		const possessedNpcId = this.possessionController.getPossessedNPCId();
		if (!possessedNpcId) return null;
		const npcName = this.npcStateById.get(possessedNpcId)?.name ?? possessedNpcId;
		const tracked = this.npcTaskTrackerById.get(possessedNpcId);
		if (!tracked) {
			return {
				npcName,
				currentGoal: null,
				items: [],
			};
		}
		tracked.npcName = npcName;
		const items = [
			...tracked.completedGoals.map(text => ({ text, status: 'done' as const })),
			...(tracked.currentGoal ? [{ text: tracked.currentGoal, status: 'in-progress' as const }] : []),
			...tracked.upcomingGoals.map(text => ({ text, status: 'todo' as const })),
		].slice(-10);
		return {
			npcName: tracked.npcName,
			currentGoal: tracked.currentGoal,
			items,
		};
	}

	private updateNPCTaskTracker(npcId: string, rawNextGoal: unknown): void {
		if (typeof rawNextGoal !== 'string') return;
		const parsedGoals = parseGoalListFromNextGoal(rawNextGoal);
		if (parsedGoals.length === 0) return;
		const npcName = this.npcStateById.get(npcId)?.name ?? npcId;
		const tracker =
			this.npcTaskTrackerById.get(npcId) ??
			({
				npcName,
				completedGoals: [],
				currentGoal: null,
				upcomingGoals: [],
				updatedAt: 0,
			} as NPCTaskTracker);
		tracker.npcName = npcName;
		const [nextCurrentGoal, ...nextUpcomingGoals] = parsedGoals;
		if (tracker.currentGoal && tracker.currentGoal !== nextCurrentGoal && !tracker.completedGoals.includes(tracker.currentGoal)) {
			tracker.completedGoals.push(tracker.currentGoal);
			if (tracker.completedGoals.length > 8) tracker.completedGoals.shift();
		}
		tracker.currentGoal = nextCurrentGoal;
		tracker.upcomingGoals = nextUpcomingGoals;
		tracker.updatedAt = Date.now();
		this.npcTaskTrackerById.set(npcId, tracker);
	}

	private getSurvivalHUDState(): SurvivalHUDViewModel | null {
		if (config.controller.operation !== 'pc' || !isCyberpunkSceneSelected()) return null;
		const possessedNpcId = this.possessionController.getPossessedNPCId();
		const possessedNpcName = this.possessionController.getPossessedNPCName();
		let modeText = '普通';
		if (this.observerController.isObserverMode()) modeText = '观察者模式';
		else if (possessedNpcName) modeText = `附身：${possessedNpcName}`;
		const possessedNpc =
			possessedNpcId && this.simulationEngine ? this.getNPCStateFromClientBus(possessedNpcId) ?? this.simulationEngine.getNPCStates().find(item => item.id === possessedNpcId) ?? null : null;
		const hp = possessedNpc?.survival.hp ?? this.playerSurvivalState.hp;
		const maxHp = possessedNpc?.survival.maxHp ?? this.playerSurvivalState.maxHp;
		const hunger = possessedNpc?.survival.hunger ?? this.playerSurvivalState.hunger;
		const maxHunger = possessedNpc?.survival.maxHunger ?? this.playerSurvivalState.maxHunger;
		const activeNpcCount = this.npcStateById.size > 0 ? this.npcStateById.size : this.simulationEngine?.getNPCStates().length ?? 0;
		return {
			modeText,
			hp,
			maxHp,
			hunger,
			maxHunger,
			activeNpcCount,
		};
	}
}

export { Controller };
