import type {Metadata} from 'next';
import WorldGachaApp from '@/features/worldgacha/app';
export const metadata:Metadata={title:'Riverside · CTRL World Study',description:'A playable World Gacha riverside district with baked Recast navigation and optimized town geometry.'};
export default function WorldPreview(){return <WorldGachaApp/>;}
