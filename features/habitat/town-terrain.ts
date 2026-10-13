/** Decorative terrain stays beyond the shared walking bounds. */
export const TOWN_HILLS=[[-39,-40,12,7],[-6,-47,22,10],[34,-42,15,8],[-51,22,18,9],[52,26,19,11]] as const;
export function townTerrainHeight(x:number,z:number){
 let height=-.1;
 for(const [cx,cz,width,h] of TOWN_HILLS){
  const radial=1-((x-cx)/width)**2-((z-cz)/(width*.6))**2;
  if(radial>0)height=Math.max(height,-h*.32+h*Math.sqrt(radial));
 }
 return height;
}
