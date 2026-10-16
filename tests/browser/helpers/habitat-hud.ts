import {expect,type Page} from '@playwright/test';

/** Read actual composited element geometry, not screenshots/mock layout. */
export async function assertTouchHUD(p:Page){
 if(!await p.evaluate(()=>matchMedia('(pointer:coarse)').matches))return;
 const controls=['.hb-touch','.hb-bottom','.hb-chat-toggle','.hb-music-player','.hb-venue-guide','.hb-title','.hb-life-actions'];
 const boxes:{name:string;x:number;y:number;width:number;height:number}[]=[];
 for(const name of controls){
  const node=p.locator(name);
  if(await node.isVisible()){const box=await node.boundingBox();expect(box).not.toBeNull();boxes.push({name,...box!});}
 }
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
  const a=boxes[i],b=boxes[j],overlap=Math.min(a.x+a.width,b.x+b.width)>Math.max(a.x,b.x)&&Math.min(a.y+a.height,b.y+b.height)>Math.max(a.y,b.y);
  expect(overlap,`Actual touch HUD overlap: ${a.name} and ${b.name}`).toBe(false);
 }
 for(const button of await p.locator('.hb-touch button,.hb-bottom button').all()){
  const box=await button.boundingBox();expect(box).not.toBeNull();expect(box!.width).toBeGreaterThanOrEqual(44);expect(box!.height).toBeGreaterThanOrEqual(44);
 }
}
