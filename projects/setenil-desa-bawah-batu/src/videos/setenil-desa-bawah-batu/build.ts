import * as THREE from "three";

// Minimal kit typing for this single-frame project: the world is
// built procedurally in world.ts, so the kit is an empty record
// (same shape as the series scaffold's Kit type).
export type Kit = Record<string, THREE.Object3D>;
export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
