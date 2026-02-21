import './common';
import Crosshair from './crosshair';
import Fps from './fps';
import Bag from './bag';
import Menu from './menu';
import ActonControl from './action';
import DialoguePanel from './dialogue';
import DeathOverlay from './death';
import SidebarLog from './sidebar-log';
import TaskListPanel from './task-list';
import SurvivalHUD from './survival-hud';
import { Controller } from '../controller';
import { config } from '../controller/config';

class UI {
	crosshair!: Crosshair;

	fps!: Fps;

	actionControl!: ActonControl;

	bag!: Bag;

	menu!: Menu;

	dialogue!: DialoguePanel;

	death!: DeathOverlay;

	sidebarLog!: SidebarLog;

	taskList!: TaskListPanel;

	survivalHud!: SurvivalHUD;

	controller!: Controller;

	loadController(controller: Controller) {
		// UI控制器
		this.controller = controller;
		// 十字准星对象
		this.crosshair = new Crosshair(document.getElementById('HUD-stage')!, config.controller.crosshair === 'dark');
		// FPS对象
		this.fps = new Fps(document.getElementById('HUD-stage')!);
		// 动作捕获对象
		this.actionControl = new ActonControl(document.getElementById('HUD-stage')!, this.controller);
		// 物品框& 背包对象
		this.bag = new Bag(document.getElementById('HUD-stage')!);
		// 菜单对象
		this.menu = new Menu(document.getElementById('app')!, this.controller);
		this.dialogue = new DialoguePanel(document.getElementById('HUD-stage')!);
		this.death = new DeathOverlay(document.getElementById('HUD-stage')!);
		this.sidebarLog = new SidebarLog(document.getElementById('HUD-stage')!, npcId => this.controller.getNPCStateFromClientBus(npcId)?.name ?? npcId);
		this.taskList = new TaskListPanel(document.getElementById('HUD-stage')!);
		this.survivalHud = new SurvivalHUD(document.getElementById('HUD-stage')!);
		document.oncontextmenu = () => false;
	}

	listenAll() {
		this.fps.listen();
		this.actionControl.listen();
		this.bag.listen();
	}

	pauseAll() {
		this.fps.pause();
		this.actionControl.pause();
		this.bag.pause();
		this.dialogue.close();
		this.death.close();
		this.taskList.sync(null);
		this.survivalHud.sync(null);
	}
}

export default UI;
