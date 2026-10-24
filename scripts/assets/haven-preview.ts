import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(384,384);renderer.setPixelRatio(1);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#f1ebdc');const pmrem=new THREE.PMREMGenerator(renderer),environment=new RoomEnvironment();scene.environment=pmrem.fromScene(environment,.04).texture;environment.dispose();pmrem.dispose();
scene.add(new THREE.HemisphereLight('#fff5df','#8b9078',2));const sun=new THREE.DirectionalLight('#fff1d2',3.4);sun.position.set(-3,7,5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-5;sun.shadow.camera.right=5;sun.shadow.camera.top=5;sun.shadow.camera.bottom=-5;sun.shadow.normalBias=.02;scene.add(sun);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(50,50),new THREE.MeshStandardMaterial({color:'#f1ebdc',roughness:1}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
const camera=new THREE.PerspectiveCamera(35,1,.01,100);let current:THREE.Group|null=null;
(window as any).renderFurniture=async(url:string)=>{
 if(current){scene.remove(current);current.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];for(const mat of materials){for(const value of Object.values(mat))if(value instanceof THREE.Texture)value.dispose();mat.dispose();}}});}
 const gltf=await new GLTFLoader().loadAsync(url);current=gltf.scene;scene.add(current);const bounds=new THREE.Box3().setFromObject(current),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());current.position.set(-center.x,-bounds.min.y,-center.z);current.traverse(o=>{o.castShadow=true;o.receiveShadow=true;});
 const radius=size.length()/2,direction=new THREE.Vector3(1.6,1,2).normalize(),target=new THREE.Vector3(0,size.y*.48,0);camera.position.copy(target).addScaledVector(direction,radius/Math.sin(THREE.MathUtils.degToRad(17.5))*1.06);camera.lookAt(target);renderer.render(scene,camera);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));renderer.render(scene,camera);
 return {meshes:(()=>{let n=0;current!.traverse(o=>{if(o instanceof THREE.Mesh)n++;});return n;})(),bounds:size.toArray(),triangles:renderer.info.render.triangles};
};
