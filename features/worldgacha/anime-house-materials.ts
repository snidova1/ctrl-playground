import {BufferAttribute,Mesh,MeshStandardMaterial,MeshToonMaterial,ShaderChunk,type Texture} from 'three';
import {cel} from './vendor/anime-toon';
import {plasterTextures,kawaraTextures,woodTextures} from './vendor/anime-textures';
let textures:ReturnType<typeof makeTextures>|undefined;
function makeTextures(){return {wall:plasterTextures(0xf4eedc,19),roof:kawaraTextures(0xd2c5b6,23),wood:woodTextures(0xd4b78f,0x6b503a,17)};}
/** True authored procedural albedo and relief maps, not a screen colour filter.
 * Box-projected local UVs keep paint attached to walls/roof as the camera moves. */
export function paintAnimeHouse(mesh:Mesh){const t=textures??=makeTextures(),g=mesh.geometry.clone(),pos=g.attributes.position,n=g.attributes.normal,uv=new Float32Array(pos.count*2);for(let i=0;i<pos.count;i++)pos.setY(i,Math.min(pos.getY(i),5.83));pos.needsUpdate=true;g.computeVertexNormals();g.computeBoundingBox();const roofStart=(g.boundingBox?.max.y??7)*.55;
 for(let i=0;i<pos.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));if(ny>.3){uv[i*2]=pos.getX(i)*.32;uv[i*2+1]=(pos.getZ(i)+pos.getY(i)*.6)*.32;}else{uv[i*2]=(nx>nz?pos.getZ(i):pos.getX(i))*.3;uv[i*2+1]=pos.getY(i)*.3;}}
 g.setAttribute('uv',new BufferAttribute(uv,2));mesh.geometry=g;mesh.userData.animeOwnedGeometry=true;
 const convert=(old:MeshStandardMaterial)=>{const m=cel({color:old.color.getHex(),bands:3,tint:0x9cabc7,flat:false,vertexColors:old.vertexColors,side:old.side,cache:false}) as MeshToonMaterial;m.normalMap=t.wall.normalMap;m.normalScale.set(.30,.30);m.emissive.copy(old.emissive);m.emissiveIntensity=old.emissiveIntensity;
 const tint=m.onBeforeCompile.bind(m);m.onBeforeCompile=(shader,renderer)=>{tint(shader,renderer);shader.uniforms.uPaintWall={value:t.wall.map};shader.uniforms.uPaintRoof={value:t.roof.map};shader.uniforms.uPaintWood={value:t.wood.map};shader.uniforms.uRoofNormal={value:t.roof.normalMap};shader.uniforms.uRoofStart={value:roofStart};
 shader.vertexShader='varying vec2 vPaintUV;varying float vRoof;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPaintUV=uv;vRoof=step('+roofStart.toFixed(3)+',position.y)*step(.25,abs(normal.y));');
 shader.fragmentShader='uniform sampler2D uPaintWall,uPaintRoof,uPaintWood,uRoofNormal;varying vec2 vPaintUV;varying float vRoof;\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\nvec3 paint=texture2D(uPaintWall,vPaintUV).rgb;float isTimber=step(dot(diffuseColor.rgb,vec3(.299,.587,.114)),.20);paint=mix(paint,texture2D(uPaintWood,vPaintUV*vec2(2.,.6)).rgb,isTimber*.65);paint=mix(paint,texture2D(uPaintRoof,vPaintUV*3.).rgb,vRoof);diffuseColor.rgb*=mix(vec3(1.),paint*1.28,.85);`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',ShaderChunk.normal_fragment_maps.replace('texture2D( normalMap, vNormalMapUv ).xyz','mix(texture2D(normalMap,vNormalMapUv).xyz,texture2D(uRoofNormal,vPaintUV*3.).xyz,vRoof)'));
 };m.customProgramCacheKey=()=>`willow-painted-cel-house-${roofStart.toFixed(3)}`;m.userData.ctrlPaint=true;old.dispose();return m;};
 mesh.material=Array.isArray(mesh.material)?mesh.material.map(m=>convert(m as MeshStandardMaterial)):convert(mesh.material as MeshStandardMaterial);
}
