import {Object3D} from 'three';
import type {RefObject} from 'react';
/** Drei's occlusion API requires a non-null ref. Mount/unmount/loading use a
 * raycast-empty object; the getter follows the actual committed building mesh. */
export function assignOcclusionTarget(target:RefObject<Object3D>,object:Object3D|null,empty:Object3D){
 target.current=object??empty;
}
