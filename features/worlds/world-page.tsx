'use client';
import {useResource} from '@/lib/use-resource';
import type {WorldManifest} from '@/domain/types';
import {MachineLoading,ErrorState} from '@/components/states';
import ExhibitionWorld from '@/features/exhibition/world';
export default function WorldPage({slug}:{slug:string}){const {data,error,loading,refresh}=useResource<{manifest:WorldManifest;data?:unknown}>(`worlds/${slug}`);if(error)return <div className="page"><ErrorState error={error} retry={refresh}/></div>;if(loading||!data)return <MachineLoading title="OPENING THE EXHIBITION"/>;return <ExhibitionWorld world={data.manifest}/>;}
