import {Mesh,MeshBasicMaterial,Raycaster,SphereGeometry,Vector3} from 'three';
/** Decorative terrain stays beyond the shared walking bounds. */
export const TOWN_HILLS=[[-39,-40,12,7],[-6,-47,22,10],[34,-42,15,8],[-51,22,18,9],[52,26,19,11]] as const;
const terrainMaterial=new MeshBasicMaterial();
const terrainGeometry=new SphereGeometry(1,12,8);
const surfaces=TOWN_HILLS.map(([x,z,w,h])=>{const mesh=new Mesh(terrainGeometry,terrainMaterial);mesh.position.set(x,-h*.32,z);mesh.scale.set(w,h,w*.6);mesh.updateMatrixWorld();return mesh;});
const ray=new Raycaster(),origin=new Vector3(),down=new Vector3(0,-1,0);
export function townTerrainHeight(x:number,z:number){
 // Match the rendered low-poly triangles, not an analytic ellipsoid: the
 // latter placed some trunks 0.76 m above the actual faceted hill surface.
 ray.set(origin.set(x,50,z),down);
 return Math.max(-.1,...ray.intersectObjects(surfaces,false).map(hit=>hit.point.y));
}
