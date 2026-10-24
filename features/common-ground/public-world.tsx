'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import type {CharacterAppearance} from '@/features/plaza/characters/catalog';
const World=dynamic(()=>import('@/features/worldgacha/app'),{ssr:false});
interface Profile{name:string;appearance:CharacterAppearance}
/** Product entry guard uses the real signed-wallet API. Static preview assets stay public. */
export default function PublicWorldEntry(){
 const [profile,setProfile]=useState<Profile|null>(null),[loaded,setLoaded]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const abort=new AbortController();fetch('/api/habitat/profile',{signal:abort.signal,cache:'no-store'}).then(async r=>{if(r.status===401){setError('Connect your wallet in Common Ground to enter Public World.');return;}if(!r.ok)throw new Error('Your avatar could not be loaded.');const data=await r.json() as {profile:Profile|null};if(!data.profile){setError('Create your avatar in Common Ground first.');return;}setProfile(data.profile);}).catch(e=>{if(!abort.signal.aborted)setError(e.message);}).finally(()=>{if(!abort.signal.aborted)setLoaded(true);});return()=>abort.abort();},[]);
 if(!profile)return <main style={{minHeight:'100dvh',display:'grid',placeContent:'center',padding:24,background:'#eee9dc',color:'#40513c',fontFamily:'Georgia,serif'}}><h1>Public World</h1><p role='status'>{loaded?error:'Checking your saved avatar…'}</p><Link href='/?connect=1'>Return to Common Ground →</Link></main>;
 return <><World playerAppearance={profile.appearance} playerName={profile.name}/><Link href='/' style={{position:'fixed',zIndex:35,bottom:26,right:20,padding:'10px 16px',borderRadius:12,background:'#f6f1e4e8',color:'#40513c',font:'12px Arial,sans-serif',textDecoration:'none'}}>← Common Ground / edit avatar</Link></>;
}
