import * as THREE from 'three';
import {loadCharacter,disposeVrm} from '../../features/plaza/characters/loader';
import {normalizeAppearance,newModularAppearance,resolveCharacter,createCharacterMotion} from '../../features/plaza/characters/catalog';
import {applyCharacterAppearance} from '../../features/plaza/characters/appearance';
import {HumanoidAnimator} from '../../features/plaza/characters/animation';
import {updateModularParts} from '../../features/plaza/characters/modular-runtime';
const scene=new THREE.Scene();scene.background=new THREE.Color('#ece7df');
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(1);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.outputColorSpace=THREE.SRGBColorSpace;document.body.appendChild(renderer.domElement);
scene.add(new THREE.AmbientLight(0xffffff,.55),new THREE.HemisphereLight('#fff9f0','#9fae96',.8));
const key=new THREE.DirectionalLight(0xffffff,1.65);key.position.set(-3,4,5);scene.add(key);const fill=new THREE.DirectionalLight('#d8e8f0',.65);fill.position.set(3,2,-3);scene.add(fill);
const camera=new THREE.PerspectiveCamera(28,innerWidth/innerHeight,.01,30);
let loaded:any,anim:HumanoidAnimator|undefined,root:THREE.Group|undefined;
const q=new URLSearchParams(location.search);const family=q.get('family')??'drophunter';const expression=q.get('expression')??'neutral';
window.addEventListener('error',e=>{document.body.dataset.error=e.message;});
async function start(){
 let appearance=normalizeAppearance({...newModularAppearance(family==='drophunter'?'female':'male'),hairId:'espresso',expressionId:expression},family==='drophunter'?'female':'male','original');
 if(appearance.modular){appearance.modular.hair=family==='drophunter'?'straight':'short';if(family==='drophunter'){appearance.modular.top='lightshirt';appearance.modular.outer='shortjacket';}}
 const definition=resolveCharacter(appearance);loaded=await loadCharacter(definition,q.get('quality')==='low'?'low':'high',undefined,'mtoon','source','source',appearance.modular);
 applyCharacterAppearance(loaded.vrm,appearance);root=new THREE.Group();root.scale.setScalar(loaded.scale);root.position.y=loaded.floor;root.add(loaded.vrm.scene);scene.add(root);
 anim=new HumanoidAnimator(loaded);const input={moving:false,motion:createCharacterMotion(),sitting:false,celebrate:false,interactedAt:-Infinity,now:100000};
 for(let i=0;i<35;i++)anim.update(1/60,input);
 if(expression==='blink'){loaded.vrm.expressionManager.setValue('blink',1);loaded.vrm.update(0);updateModularParts(loaded.vrm,0);}
 const head=loaded.vrm.humanoid.getRawBoneNode('head');scene.updateMatrixWorld(true);const target=head!.getWorldPosition(new THREE.Vector3());
 const center=family==='drophunter'?1.56:1.58;camera.position.set(0,center,.87);camera.lookAt(0,center,0);
 if(q.get('angle')==='three-quarter'){camera.position.x=.37;camera.position.z=.8;camera.lookAt(0,center,0);}
 renderer.render(scene,camera);document.body.dataset.ready='true';
 (window as any).ctrlFace={family,expression,instance:loaded.vrm.scene.uuid,head:target.toArray(),meshes:loaded.vrm.scene.getObjectsByProperty('isSkinnedMesh',true).length,expressions:loaded.vrm.expressionManager.expressions.map((e:any)=>e.expressionName),quality:q.get('quality')??'high'};
}
start().catch(e=>{document.body.dataset.error=String(e);console.error(e);});
