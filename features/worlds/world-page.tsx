'use client';
import {useMemo} from 'react';
import {useResource} from '@/lib/use-resource';
import type {WorldManifest} from '@/domain/types';
import {MachineLoading,ErrorState} from '@/components/states';
import {recipeFromCommand,worldRecipeSchema} from '@/domain/world';
import ArchiveExperience from './archive/experience';
import LivingWorld from './runtime/living-world';
export default function WorldPage({slug}:{slug:string}){const {data,error,loading,refresh}=useResource<{manifest:WorldManifest;data?:unknown}>(`worlds/${slug}`);const recipe=useMemo(()=>{if(!data)return null;const parsed=worldRecipeSchema.safeParse(data.manifest.recipe);return parsed.success?parsed.data:recipeFromCommand(data.manifest.subtitle,data.manifest.renderer);},[data]);if(error)return <div className="page"><ErrorState error={error} retry={refresh}/></div>;if(loading||!data||!recipe)return <MachineLoading title="OPENING A LIVING WORLD"/>;if(recipe.kit==="dead-web")return <ArchiveExperience recipe={{...recipe,title:data.manifest.title}} manifest={data.manifest}/>;return <LivingWorld recipe={{...recipe,title:data.manifest.title}} manifest={data.manifest}/>;}
