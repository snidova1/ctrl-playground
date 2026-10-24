/** Reviewed edits of the SAME model/skin. IDs are persisted independently of color. */
export const airiHairStyles=[
 {id:'airi-a-short-bob',name:'Chin-length bob',characterId:'ctrl-anime-airi-a'},
 {id:'airi-a-long-bob',name:'Long bob',characterId:'ctrl-anime-airi-a'},
 {id:'airi-b-loose',name:'Long hair · no ribbon',characterId:'ctrl-anime-airi-b'},
 {id:'airi-b-straight',name:'Straight long hair · no side locks',characterId:'ctrl-anime-airi-b'},
 {id:'airi-b-short',name:'Layered short back',characterId:'ctrl-anime-airi-b'},
]as const;
export const airiWardrobeStyles=[
 {id:'airi-a-inner',name:'Lace tank + shorts',characterId:'ctrl-anime-airi-a',native:true},
 {id:'airi-a-vest',name:'Sleeveless cardigan + shorts',characterId:'ctrl-anime-airi-a',native:true},
 {id:'airi-b-inner',name:'Graphic top + pleated skirt',characterId:'ctrl-anime-airi-b',native:true},
 {id:'airi-b-vest',name:'Varsity vest + pleated skirt',characterId:'ctrl-anime-airi-b',native:true},
]as const;
export function isCompleteAiri(id:string){return id==='ctrl-anime-airi-a'||id==='ctrl-anime-airi-b';}
