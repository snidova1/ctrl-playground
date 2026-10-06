'use client';
import {ExhibitionRoom} from '@/features/exhibition/room';
import {useResource} from '@/lib/use-resource';
import type {WorldManifest} from '@/domain/types';
import {worlds} from './data';
import Link from '@/components/navigation';
export default function WorldsIndex(){const registry=useResource<WorldManifest[]>('worlds');const generated=registry.data?.filter(w=>!worlds.some(base=>base.slug===w.slug))??[];return <><Link href="/worlds/create" className="world-builder-entry">CREATE A WORLD +</Link><ExhibitionRoom worldsOnly/>{generated.length>0&&<section className="collection-additions"><span className="eyebrow">ADDED BY THE MACHINE</span>{generated.map(w=><Link key={w.slug} href={`/worlds/${w.slug}`}><span>{w.missionId}</span><h2>{w.title}</h2><span>OPEN WORLD</span></Link>)}</section>}</>;}
