import * as THREE from 'three';

export const getDistanceSq = (observer: THREE.Vector3, position: { x: number; y: number; z: number }): number => {
	const dx = observer.x - position.x;
	const dy = observer.y - position.y;
	const dz = observer.z - position.z;
	return dx * dx + dy * dy + dz * dz;
};
