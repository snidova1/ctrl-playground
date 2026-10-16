import type {ReactNode} from 'react';
export type HabitIconName='home'|'furnish'|'paint'|'sun'|'moon'|'check'|'close'|'rotate'|'store'|'camera'|'help'|'search'|'arrow'|'leaf'|'reset';
const shapes:Record<HabitIconName,ReactNode>={
 home:<><path d='m3 11 9-8 9 8M5 10v10h14V10'/><path d='M10 20v-7h4v7'/></>,
 furnish:<><path d='M6 12V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5M5 18v2m14-2v2'/><path d='M4 10a2 2 0 0 0-2 2v6h20v-6a2 2 0 0 0-4 0v2H6v-2a2 2 0 0 0-2-2Z'/></>,
 paint:<><path d='m14 4 6 6-9 9-6-6Z'/><path d='m16 2 6 6M5 13l-2 8 8-2M3 21l4-4'/></>,
 sun:<><circle cx='12' cy='12' r='4'/><path d='M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5'/></>,
 moon:<path d='M20 14A8 8 0 0 1 10 4a8.5 8.5 0 1 0 10 10Z'/>,
 check:<path d='m5 12 4 4L19 6'/>,close:<path d='m6 6 12 12M6 18 18 6'/>,
 rotate:<><path d='M4 10a8 8 0 1 1 1 8M4 4v6h6'/></>,
 store:<><path d='m3 7 9-4 9 4-9 4Z'/><path d='M3 7v11l9 4 9-4V7M12 11v11M7 5l10 4'/></>,
 camera:<><path d='M8 6 10 3h4l2 3h5v14H3V6Z'/><circle cx='12' cy='13' r='4'/></>,
 help:<><circle cx='12' cy='12' r='9'/><path d='M9.5 9a2.5 2.5 0 1 1 4 2c-1.5 1-1.5 1-1.5 3M12 17h.01'/></>,
 search:<><circle cx='10.5' cy='10.5' r='6.5'/><path d='m16 16 5 5'/></>,
 arrow:<><path d='M4 12h15m-5-5 5 5-5 5'/></>,
 leaf:<><path d='M20 3C7 2 2 7 5 15s16 3 15-12Z'/><path d='M3 21 15 9'/></>,
 reset:<><path d='M4 10a8 8 0 1 1 2 8M4 4v6h6'/><path d='M12 8v5l3 2'/></>,
};
export default function HabitIcon({name,size=18}:{name:HabitIconName;size?:number}){return <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.7' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>{shapes[name]}</svg>;}
