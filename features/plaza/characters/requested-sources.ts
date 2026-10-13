/**
 * CTRL's 16 requested whole-character sources (2026-10-14).
 *
 * This is an ACQUISITION / CONVERSION registry, NOT the runtime character
 * catalog. None of these new binaries exists in public/plaza/characters yet.
 * NEVER turn these rows into selectable avatars until their self-contained,
 * redistributable VRM exports have been imported, validated and reviewed.
 *
 * Every character is free for every CTRL player. No token or paid tier.
 * Visual variety is intentional: anime, film-cartoon, stylized and realistic.
 * No modular wardrobe or appearance editing.
 */
export type SourceAvatarFormat = 'blender-rig' | 'unity-humanoid' | 'vrm-in-archive';
export type SourceAvatarLicense = 'CC-BY' | 'CC0' | 'creator-restrictions' | 'third-party-review';
export type AvatarPresentation = 'female' | 'male' | 'unspecified';
export interface CharacterSource {
  id: string;
  name: string;
  creator: string;
  presentation: AvatarPresentation;
  format: SourceAvatarFormat;
  license: SourceAvatarLicense;
  sourceUrl: string;
  /** Explicit pending review avoids advertising broken previews to players. */
  importState: 'pending-binary-and-visual-validation';
  /** Future audited local runtime paths only; never a remote hotlink. */
  assetPaths: null;
  freeForAllPlayers: true;
  gameUseRightsConfirmed: boolean;
  engineeringNote: string;
}

export const REQUESTED_CHARACTER_SOURCES = [
  {
    id:'blender-rain',name:'Rain',creator:'Blender Studio / Blender Foundation',presentation:'female',format:'blender-rig',license:'CC-BY',
    sourceUrl:'https://studio.blender.org/characters/rain/v3/',engineeringNote:'CloudRig/Blender 4.1: bake deformation and expressions, optimize, retarget to VRM. Credit required.'
  },
  {
    id:'blender-snow',name:'Snow',creator:'Blender Studio / Blender Foundation',presentation:'male',format:'blender-rig',license:'CC-BY',
    sourceUrl:'https://studio.blender.org/characters/snow/v4/',engineeringNote:'Blender 4.1 rig: bake to compatible humanoid, optimize, credit.'
  },
  {
    id:'blender-ellie',name:'Ellie',creator:'Blender Studio / Blender Foundation',presentation:'female',format:'blender-rig',license:'CC-BY',
    sourceUrl:'https://studio.blender.org/characters/ellie/v1/',engineeringNote:'Sprite Fright rig: Blender 3.3-3.6 compatibility, export skinned game geometry and retarget.'
  },
  {
    id:'blender-jay',name:'Jay',creator:'Blender Studio / Blender Foundation',presentation:'male',format:'blender-rig',license:'CC-BY',
    sourceUrl:'https://studio.blender.org/characters/jay/v1/',engineeringNote:'Sprite Fright rig: Blender 3.3-3.6 compatibility, retarget, credit.'
  },
  {
    id:'blender-victoria',name:'Victoria (Blender)',creator:'Blender Studio / Blender Foundation',presentation:'female',format:'blender-rig',license:'CC-BY',
    sourceUrl:'https://studio.blender.org/characters/victoria/v1/',engineeringNote:'Distinct from existing VRoid Victoria. Sprite Fright, Blender 3.3-3.6 rig conversion.'
  },
  {
    id:'blender-rex',name:'Rex',creator:'Blender Studio / Blender Foundation',presentation:'male',format:'blender-rig',license:'CC-BY',
    sourceUrl:'https://studio.blender.org/characters/rex/v1/',engineeringNote:'Sprite Fright rig: Blender 3.3-3.6, retarget and optimize.'
  },
  {
    id:'booth-haku',name:'Haku',creator:'MITUBA',presentation:'unspecified',format:'unity-humanoid',license:'CC0',
    sourceUrl:'https://booth.pm/en/items/8214054',engineeringNote:'Haku v1.51: Unity Humanoid FBX; 45k tris desktop / 11.7k Quest. Build a standalone VRM export from CC0 source; third-party shaders excluded.'
  },
  {
    id:'booth-shikk',name:'Shikk / Sick',creator:'MITUBA',presentation:'female',format:'unity-humanoid',license:'CC0',
    sourceUrl:'https://booth.pm/en/items/8664885',engineeringNote:'~58.8k tris; 408 MB original archive. Convert FBX to optimized VRM; lilToon/VRChat third-party tools are not part of CC0.'
  },
  {
    id:'booth-akane',name:'Akane',creator:'minto_akayama',presentation:'female',format:'vrm-in-archive',license:'CC0',
    sourceUrl:'https://booth.pm/en/items/8861598',engineeringNote:'Full VRM included; verify embedded metadata and choose optimized Quest-capable export.'
  },
  {
    id:'booth-satake-nagisa',name:'Satake Nagisa',creator:'Kantsu Horo',presentation:'male',format:'vrm-in-archive',license:'creator-restrictions',
    sourceUrl:'https://booth.pm/ja/items/8447196',engineeringNote:'Free VRM available but VN3 restrictions on public avatar use apply. Commercial WebGL redistribution clearance needed BEFORE import.'
  },
  {
    id:'booth-summer-chan',name:'Summer-Chan',creator:'Kana Fuyuko',presentation:'female',format:'vrm-in-archive',license:'third-party-review',
    sourceUrl:'https://booth.pm/en/items/6344155',engineeringNote:'Creator calls CC0; VRoid Stable presets were used. Check upstream pixiv terms and in-model rights before bundling.'
  },
  {
    id:'booth-donut-chan',name:'Donut-Chan',creator:'Kana Fuyuko',presentation:'female',format:'vrm-in-archive',license:'third-party-review',
    sourceUrl:'https://booth.pm/en/items/5975245',engineeringNote:'Creator calls public domain; VRoid Stable preset components may have extra rights. Check before bundling.'
  },
  {
    id:'blender-phil',name:'Phil',creator:'Blender Studio / Blender Foundation',presentation:'male',format:'blender-rig',license:'CC-BY',
    sourceUrl:'https://studio.blender.org/characters/phil/v1/',engineeringNote:'Sprite Fright film-cartoon, Blender 3.3-3.6; bake rig and credit.'
  },
  {
    id:'blender-einar',name:'Einar',creator:'Blender Studio / Blender Foundation',presentation:'male',format:'blender-rig',license:'CC-BY',
    sourceUrl:'https://studio.blender.org/characters/einar/v1/',engineeringNote:'Charge realistic detail and robotic left arm; hard LOD/optimization + Blender 3.5 retarget.'
  },
  {
    id:'blender-vincent',name:'Vincent',creator:'Blender Studio / Blender Foundation',presentation:'male',format:'blender-rig',license:'CC-BY',
    sourceUrl:'https://studio.blender.org/characters/vincent/v2/',engineeringNote:'BlenRig dependency, original Blender 3.4; use baked deform bones for a VRM humanoid, optimize and credit.'
  },
  {
    id:'blender-lunte',name:'Lunte',creator:'Blender Studio / Blender Foundation',presentation:'male',format:'blender-rig',license:'CC-BY',
    sourceUrl:'https://studio.blender.org/characters/lunte/v4/',engineeringNote:'Settlers masked character. Bake rig to VRM, attribute Blender Studio, check mobile materials.'
  },
].map(source=>({
  ...source,
  importState:'pending-binary-and-visual-validation' as const,
  assetPaths:null,
  freeForAllPlayers:true as const,
  gameUseRightsConfirmed:source.license==='CC0'||source.license==='CC-BY'
})) satisfies CharacterSource[];

/** NO candidates are runtime-ready without audited, local .vrm binaries. */
export const READY_REQUESTED_CHARACTER_SOURCES = REQUESTED_CHARACTER_SOURCES.filter(source=>source.assetPaths!==null && source.gameUseRightsConfirmed);

export function summarizeAvatarSourceReadiness() {
  return {
    requested:REQUESTED_CHARACTER_SOURCES.length,
    imported:READY_REQUESTED_CHARACTER_SOURCES.length,
    pending:REQUESTED_CHARACTER_SOURCES.length-READY_REQUESTED_CHARACTER_SOURCES.length,
    freeForPlayers:REQUESTED_CHARACTER_SOURCES.every(source=>source.freeForAllPlayers)
  };
}
