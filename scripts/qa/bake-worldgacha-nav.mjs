import {createRequire} from 'node:module';import {readFile,writeFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';import {Vector3,Box3} from 'three';
const require=createRequire((process.env.CTRL_WORLD_TOOLS??'/tmp/ctrl-world-build-tools')+'/package.json');
const R=await import(require.resolve('recast-navigation'));const {generateSoloNavMesh}=await import(require.resolve('recast-navigation/generators'));
const path='public/worlds/worldgacha/riverside.glb',buffer=await readFile(path),gltf=await new GLTFLoader().parseAsync(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),'');
gltf.scene.updateMatrixWorld(true);const bounds=new Box3().setFromObject(gltf.scene),center=bounds.getCenter(new Vector3());console.log('MODEL',bounds.min.toArray(),bounds.max.toArray());
const positions=[],indices=[],point=new Vector3();gltf.scene.traverse(o=>{if(!o.isMesh||/water/i.test(o.name))return;const a=o.geometry.attributes.position,base=positions.length/3;for(let i=0;i<a.count;i++){point.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);positions.push(point.x,point.y,point.z);}const index=o.geometry.index;if(index)for(let i=0;i<index.count;i++)indices.push(base+index.getX(i));else for(let i=0;i<a.count;i++)indices.push(base+i);});
console.log('NAV INPUT',positions.length/3,indices.length/3);await R.init();
const generated=generateSoloNavMesh(positions,indices,{cs:.65,ch:.2,walkableSlopeAngle:40,walkableHeight:9,walkableClimb:2,walkableRadius:1,minRegionArea:16,mergeRegionArea:32});
if(!generated.success)throw new Error('Recast navmesh bake failed: '+JSON.stringify(generated.error));
const query=new R.NavMeshQuery(generated.navMesh),step=1.5,minX=Math.ceil(bounds.min.x/step)*step,minZ=Math.ceil(bounds.min.z/step)*step,width=Math.floor((bounds.max.x-minX)/step)+1,depth=Math.floor((bounds.max.z-minZ)/step)+1;
const heights=Array(width*depth).fill(null);let valid=0;
for(let iz=0;iz<depth;iz++)for(let ix=0;ix<width;ix++){const x=minX+ix*step,z=minZ+iz*step;const result=query.findClosestPoint({x,y:bounds.min.y-20,z},{halfExtents:{x:.72,y:150,z:.72}});if(result.success&&Math.hypot(result.point.x-x,result.point.z-z)<.65){heights[iz*width+ix]=Math.round(result.point.y*1000)/1000;valid++;}}
let spawn=-1,best=Infinity;
for(let i=0;i<heights.length;i++)if(heights[i]!==null){
 const ix=i%width,iz=Math.floor(i/width);if(ix<1||iz<1||ix>=width-1||iz>=depth-1)continue;
 let clear=true;for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){const h=heights[(iz+dz)*width+ix+dx];if(h===null||Math.abs(h-heights[i])>=1)clear=false;}if(!clear)continue;
 const x=minX+ix*step,z=minZ+iz*step,score=Math.hypot(x-(-50),z-(-200));if(score<best){best=score;spawn=i;}
}
if(spawn<0)throw new Error('No navigable spawn found');
const reached=new Uint8Array(heights.length),queue=[spawn];reached[spawn]=1;for(let q=0;q<queue.length;q++){const i=queue[q],x=i%width,z=Math.floor(i/width);for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1]]){const nx=x+dx,nz=z+dz,j=nz*width+nx;if(nx<0||nx>=width||nz<0||nz>=depth||reached[j]||heights[j]===null||Math.abs(heights[j]-heights[i])>1.1)continue;reached[j]=1;queue.push(j);}}
for(let i=0;i<heights.length;i++)if(!reached[i])heights[i]=null;
const spawnPoint={x:minX+spawn%width*step,y:heights[spawn],z:minZ+Math.floor(spawn/width)*step};
const output={generator:'recast-navigation@0.43.1',step,minX,minZ,width,depth,spawn:spawnPoint,walkableCells:queue.length,heights};await writeFile('public/worlds/worldgacha/navigation.json',JSON.stringify(output));
const navData=R.exportNavMesh(generated.navMesh);await writeFile('public/worlds/worldgacha/navigation.bin',navData);console.log('NAV RESULT',JSON.stringify({...output,heights:undefined,totalCells:heights.length,binaryBytes:navData.length}));query.destroy();generated.navMesh.destroy();
