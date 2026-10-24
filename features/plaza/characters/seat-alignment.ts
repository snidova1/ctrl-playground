import type {Object3D,Vector3} from 'three';

/** Root Y needed to put the posed body's support on a world-space seat.
 * Sample after animator.update: VRM normalization, model scale, and floor offset
 * are all already represented in this bone's world transform. Habitat's avatar
 * root is in world space. Undefined retains the caller's legacy seatLift path.
 * The caller owns scratch so this does not allocate in the frame loop. */
export function seatedRootTargetY(root:Object3D,hips:Object3D|null,seatSurfaceY:number|undefined,scratch:Vector3,hipToContactY=0):number|undefined{
 if(!hips||seatSurfaceY===undefined||!Number.isFinite(seatSurfaceY)||!Number.isFinite(hipToContactY)||hipToContactY<0)return undefined;
 hips.getWorldPosition(scratch); // Refresh changed animation/ancestor matrices.
 const target=root.position.y+seatSurfaceY+hipToContactY-scratch.y;
 return Number.isFinite(scratch.y)&&Number.isFinite(target)?target:undefined;
}
