import {createRequire} from 'node:module';
import {mkdir,writeFile,stat} from 'node:fs/promises';
const tools=process.env.CTRL_WORLD_TOOLS??'/tmp/ctrl-world-build-tools';
const require=createRequire(tools+'/package.json');
const {NodeIO}=await import(require.resolve('@gltf-transform/core'));
const {dedup,prune,weld,join,quantize}=await import(require.resolve('@gltf-transform/functions'));
const {ALL_EXTENSIONS}=await import(require.resolve('@gltf-transform/extensions'));
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);const source=process.argv[2]??'/home/celeng/ctrl-world-source/world_river_361374981.glb';
const output=process.argv[3]??'public/worlds/worldgacha/riverside.glb';
const document=await io.read(source),root=document.getRoot();
const trees=[];for(const node of root.listNodes())if(node.getName().startsWith('tree_')){trees.push({name:node.getName(),position:node.getWorldTranslation(),scale:node.getWorldScale()});node.dispose();}
await document.transform(prune(),dedup(),weld(),join(),quantize({quantizePosition:14,quantizeNormal:8}),dedup(),prune());
await io.write(output,document);
const report={source:'https://tools.oyasumi-gamedev.com/worldgacha/',seed:361374981,coreMeters:300,removedDetailedTreeInstances:trees.length,beforeBytes:(await stat(source)).size,afterBytes:(await stat(output)).size,nodes:root.listNodes().length,meshes:root.listMeshes().length,materials:root.listMaterials().length,trees};
await writeFile(output.replace('.glb','-build.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,trees:trees.slice(0,2)},null,2));
