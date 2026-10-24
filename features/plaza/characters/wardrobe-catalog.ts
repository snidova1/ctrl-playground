import{airiWardrobeStyles}from'./airi-style-catalog';
export const wardrobeStyles=[
 {id:'source',name:'Original outfit'},
 {id:'darkness-studio',name:'Darkness · gothic dress & shoes',characterId:'ctrl-anime-female-studio',url:'/plaza/characters/wardrobe/darkness-studio.glb'},
 ...airiWardrobeStyles,
] as const;
export type WardrobeStyleId=typeof wardrobeStyles[number]['id'];
export function availableWardrobeStyles(characterId:string){return wardrobeStyles.filter(s=>s.id==='source'||s.characterId===characterId);}
