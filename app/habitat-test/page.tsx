import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import HabitatTest from '@/features/habitat/habitat-test';
import {isHabitatTestHost} from '@/features/habitat/test-access';
export const dynamic='force-dynamic';
export const metadata={title:'Tes Habitat | CTRL',robots:{index:false,follow:false}};
export default async function HabitatTestPage(){
 const host=(await headers()).get('host')??'';
 if(!isHabitatTestHost(host))notFound();
 return <HabitatTest/>;
}
