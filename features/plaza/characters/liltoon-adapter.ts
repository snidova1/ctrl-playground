// Adapt approved self-contained VRM materials in memory, before GLTF loading.
// This lets three-liltoon's real loader create materials before VRM color/UV
// expression bindings are built; morphs, skeletons and asset files stay intact.
export const LILTOON_EXTENSION='MOCHIYA_materials_liltoon';
type LegacyMaterial={shader?:string;floatProperties?:Record<string,number>;vectorProperties?:Record<string,number[]>;textureProperties?:Record<string,number>};
type MaterialDef={name?:string;alphaMode?:string;alphaCutoff?:number;doubleSided?:boolean;pbrMetallicRoughness?:{baseColorFactor?:number[];baseColorTexture?:{index:number}};extensions?:Record<string,unknown>};
type Manifest={materials?:MaterialDef[];extensionsUsed?:string[];extensions?:{VRM?:{materialProperties?:LegacyMaterial[]}}};
export function adaptVrmToLilToon(input:unknown,quality:'low'|'high'){
 const json=input as Manifest;let count=0;
 for(const [index,material] of (json.materials??[]).entries()){
  if(material.extensions?.[LILTOON_EXTENSION])continue;
  const old=json.extensions?.VRM?.materialProperties?.[index];
  const modern=material.extensions?.VRMC_materials_mtoon as {shadeColorFactor?:number[];shadeMultiplyTexture?:{index:number}}|undefined;
  if(old?.shader!=='VRM/MToon'&&!modern)continue;
  const vectors=old?.vectorProperties??{},floats=old?.floatProperties??{},textures:Record<string,number>={};
  const main=old?.textureProperties?._MainTex??material.pbrMetallicRoughness?.baseColorTexture?.index;
  if(typeof main==='number'&&Number.isInteger(main)&&main>=0)textures._MainTex=main;
  const color=vectors._Color??material.pbrMetallicRoughness?.baseColorFactor??[1,1,1,1];
  const shade=vectors._ShadeColor??[...(modern?.shadeColorFactor??[.84,.80,.82]),1];
  const mode=material.alphaMode==='BLEND'?'transparent':material.alphaMode==='MASK'?'cutout':'opaque';
  material.extensions={...material.extensions,[LILTOON_EXTENSION]:{
   specVersion:'1.0',renderMode:mode,properties:{
    _Color:[...color],_UseShadow:1,_ShadowColor:[...shade],_ShadowStrength:.7,
    _ShadowBorder:.5,_ShadowBlur:.22,_LightMinLimit:.12,_LightMaxLimit:1,
    _Cull:material.doubleSided?0:(floats._CullMode??2),
    _Cutoff:mode==='cutout'?(material.alphaCutoff??floats._Cutoff??.5):0,
    // Mobile avoids auxiliary outline draws; desktop uses a thin ink edge.
    _OutlineWidth:quality==='high'?.06:0,_OutlineColor:vectors._OutlineColor??[.25,.21,.24,1],
   },textures,
  }};
  count++;
 }
 if(count){json.extensionsUsed??=[];if(!json.extensionsUsed.includes(LILTOON_EXTENSION))json.extensionsUsed.push(LILTOON_EXTENSION);}
 return count;
}
