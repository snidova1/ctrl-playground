/** Local WebP captures of the shared live VRM renderer, not generated art. */
const base='/worlds/characters/creator-thumbnails';
export function lookThumbnail(look:string){return look==='airi'?`${base}/a-cozy.webp`:look==='airi-b'?`${base}/b-street.webp`:undefined;}
export function styleThumbnail(slot:'hair'|'outfit',look:string|undefined,id:string){return look==='airi'||look==='airi-b'?`${base}/${slot}-${look}-${id}.webp`:undefined;}
export function presetThumbnail(id:string){return `${base}/${id}.webp`;}
