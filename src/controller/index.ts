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
} from '../simulation';
import { NPCRenderer, toNPCRenderSnapshot } from '../core/npc';
import { PossessionController } from './possession';
import { ObserverController } from './observer';

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

	clientEventBus: ClientNPCEventBus | null;

	readonly npcStateById: Map<string, SimulationNPCState>;

	private npcEventUnsubscribers: Array<() => void>;

	npcRenderer: NPCRenderer | null;

	possessionController: PossessionController;

	observerController: ObserverController;

	readonly npcDialogueLog: string[];

	readonly npcThinkingStreamById: Map<string, string>;

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
		if (config.weather === null) {
			const fixedMapIndex = getFixedMapIndex();
			config.weather = fixedMapIndex === null ? Math.floor(Math.random() * weatherConfig.length) : fixedMapIndex;
		}
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
		this.simulationEngine?.stop();
		this.simulationEngine = null;
		this.npcRenderer?.clear();
		this.npcRenderer = null;
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
		const bridge = new ClientSimulationBridge(this, {
			onEvent: event => this.handleSimulationEvent(event),
		});
		this.simulationEngine = new SimulationEngine(bridge, {
			tickIntervalMs: 500,
			observerSleepDistance: 128,
			useStubBrain: true,
			initialObservers: [{ x: config.state.posX, y: config.state.posY, z: config.state.posZ }],
		});
		this.simulationEngine.start();
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
}

export { Controller };
