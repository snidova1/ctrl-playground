import {notFound} from 'next/navigation';
import PlazaApp from '@/features/plaza/plaza-app';
export const dynamic='force-dynamic';
export const metadata={title:'CTRL · Character study',robots:{index:false,follow:false}};
export default function CharacterPreview(){
  if(process.env.CTRL_CHARACTER_PREVIEW!=='1')notFound();
  return <PlazaApp characterPreview/>;
}
