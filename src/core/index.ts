import * as THREE from 'three';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { blockLoader, blockTypes } from './loader';
import { config, symConfig } from '../controller/config';
import Audio from './audio';
import Terrain from './terrain';
import BlockAction from './block-action';
import { Controller } from '../controller';

class Core {
	camera: THREE.PerspectiveCamera;

	scene: THREE.Scene;

	renderer: THREE.WebGLRenderer;

	labelRenderer: CSS2DRenderer;

	terrain: Terrain;

	audio: Audio;

	blockAction: BlockAction;

	controller: Controller;

	constructor(controller: Controller) {
		this.camera = new THREE.PerspectiveCamera();
		this.scene = new THREE.Scene();
		this.renderer = new THREE.WebGLRenderer();
		this.labelRenderer = new CSS2DRenderer();

		this.terrain = new Terrain(this);
		this.audio = new Audio(this);
		this.blockAction = new BlockAction(this);

		this.controller = controller;

		this.init();
	}

	// 初始化场景
	init() {
		// 窗口大小改变监听
		window.addEventListener('resize', () => {
			this.camera.aspect = window.innerWidth / window.innerHeight;
			this.camera.updateProjectionMatrix();
		});
		window.addEventListener('resize', () => {
			this.renderer.setSize(window.innerWidth, window.innerHeight);
			this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
		});

		// 设置相机参数
		this.camera.fov = config.camera.fov;
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.near = 0.01;
		this.camera.far = Math.max(233, config.renderer.stageSize * Math.sqrt(3));
		this.camera.updateProjectionMatrix();
		this.camera.position.set(config.state.posX, config.state.posY, config.state.posZ);
		// 注意, 必须要改欧拉角顺序
		this.camera.rotation.order = 'YXZ';

		this.scene = new THREE.Scene();
		const backgroundColor = symConfig.stage.skyBackground;
		this.scene.fog = new THREE.FogExp2(backgroundColor, config.renderer.fog);
		this.scene.background = new THREE.Color(backgroundColor);

		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
		this.labelRenderer.domElement.style.position = 'absolute';
		this.labelRenderer.domElement.style.top = '0';
		this.labelRenderer.domElement.style.left = '0';
		this.labelRenderer.domElement.style.pointerEvents = 'none';
		this.labelRenderer.domElement.style.zIndex = '10';
		const gameStage = document.getElementById('game-stage');
		if (!gameStage) return;
		gameStage.appendChild(this.renderer.domElement);
		gameStage.appendChild(this.labelRenderer.domElement);
	}

	tryRender() {
		this.terrain.tryUpdateScene();
		this.renderer.render(this.scene, this.camera);
		this.labelRenderer.render(this.scene, this.camera);
	}

	// 更新控制信息
	updateCore() {
		(this.scene.fog as THREE.FogExp2).density = config.renderer.fog;
		this.camera.fov = config.camera.fov;
		this.camera.far = Math.max(233, config.renderer.stageSize * Math.sqrt(3));
		this.camera.position.set(config.state.posX, config.state.posY, config.state.posZ);
		this.camera.updateProjectionMatrix();
	}

	// 获取某个块的材质对象
	static getMaterial(idx: number) {
		const blockKey = blockTypes[idx] as keyof typeof blockLoader;
		const texture = blockLoader[blockKey].textureImg;
		if (Array.isArray(texture)) return texture.map(d => new THREE.MeshStandardMaterial({ map: d }));
		return new THREE.MeshStandardMaterial({ map: texture });
	}
}

export default Core;
