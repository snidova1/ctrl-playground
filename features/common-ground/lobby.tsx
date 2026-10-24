'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {BrandMark} from '@/components/brand';
import {nextAtmospherePreset,type AtmospherePreset} from '@/features/habitat/atmosphere-presets';
import type {CharacterAppearance} from '@/features/plaza/characters/catalog';
import {loadGuestIdentity,createGuestIdentity,type GuestIdentity} from './guest';
import CreatorForm from './creator-form';
import AnalogStick from '@/features/habitat/analog-stick';
import TouchRunButton from '@/features/habitat/touch-run-button';
import './lobby.css';
const LobbyScene=dynamic(()=>import('./lobby-scene'),{ssr:false});
const WalletConnection=dynamic(()=>import('@/features/wallet/wallet-connect'),{ssr:false});
interface PublicProfile{name:string;appearance:CharacterAppearance}
export default function CommonGroundLobby(){
 const router=useRouter(),input=useRef({x:0,z:0,run:false});
 const [phase,setPhase]=useState<AtmospherePreset>('afternoon'),[guest,setGuest]=useState<GuestIdentity|null>(null),[verified,setVerified]=useState(false),[profile,setProfile]=useState<PublicProfile|null>(null),[modal,setModal]=useState<'wallet'|'avatar'|null>(null),[draft,setDraft]=useState<CharacterAppearance|null>(null),[name,setName]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const stop=useCallback(()=>{input.current.x=0;input.current.z=0;input.current.run=false;},[]);
 // Browser-tab identity must be restored after hydration, never during SSR.
 // eslint-disable-next-line react-hooks/set-state-in-effect
 useEffect(()=>{let identity:GuestIdentity;try{identity=loadGuestIdentity(sessionStorage,()=>crypto.randomUUID());}catch{identity=createGuestIdentity(crypto.randomUUID());}setGuest(identity);setDraft(identity.appearance);
  const abort=new AbortController();fetch('/api/habitat/profile',{signal:abort.signal,cache:'no-store'}).then(async r=>{if(r.status===401)return;if(!r.ok)throw new Error('Your saved avatar could not be checked.');const data=await r.json() as {profile:PublicProfile|null;error?:{message?:string}};setVerified(true);setProfile(data.profile);if(data.profile){setDraft(data.profile.appearance);setName(data.profile.name);}}).catch(e=>{if(!abort.signal.aborted)setError(e.message);});
  const reset=()=>stop();window.addEventListener('blur',reset);document.addEventListener('visibilitychange',reset);
  if(new URLSearchParams(location.search).has('connect'))setModal('wallet');
  return()=>{abort.abort();stop();window.removeEventListener('blur',reset);document.removeEventListener('visibilitychange',reset);};
 },[stop]);
 useEffect(()=>{if(!modal)return;stop();const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!document.querySelector('w3m-modal.open')){setModal(null);stop();}};window.addEventListener('keydown',escape,true);return()=>window.removeEventListener('keydown',escape,true);},[modal,stop]);
 const open=(next:'wallet'|'avatar')=>{stop();setError('');if(next==='avatar'&&!verified){setModal('wallet');return;}setModal(next);};

 async function signedIn(){try{const r=await fetch('/api/habitat/profile',{cache:'no-store'});if(!r.ok)throw new Error('The wallet signature could not be verified.');const data=await r.json() as {profile:PublicProfile|null;error?:{message?:string}};setVerified(true);setProfile(data.profile);if(data.profile){setDraft(data.profile.appearance);setName(data.profile.name);router.push('/public-world');}else setModal('avatar');}catch(e){setError(e instanceof Error?e.message:'Sign-in failed.');}}
 async function saveAvatar(e:FormEvent){e.preventDefault();if(!verified||!draft||busy)return;setBusy(true);setError('');try{const r=await fetch('/api/habitat/public-profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name.trim(),character:draft.gender,variant:draft.variantId,appearance:draft})});const data=await r.json() as {profile:PublicProfile|null;error?:{message?:string}};if(!r.ok)throw new Error(data.error?.message??'Your avatar could not be saved.');setProfile(data.profile);setModal(null);router.push('/public-world');}catch(e){setError(e instanceof Error?e.message:'Save failed.');}finally{setBusy(false);}}
 async function logout(){const r=await fetch('/api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(!r.ok){setError('Could not sign out. Please retry.');return;}setVerified(false);setProfile(null);setName('');setDraft(guest?.appearance??null);setModal(null);stop();}
 // Draft edits belong to the creator only. Keep the paused meadow's saved model
 // and simulation mounted; do not load each new hair/body into a second canvas.
 const look=verified?(profile?.appearance??guest?.appearance):guest?.appearance;
 return <main className='cg-lobby' id='main' data-product-area='playable-landing' data-identity={verified?'wallet':'guest'} data-guest-id={guest?.id}>
  <section className='cg-scene' aria-label='Common Ground open-air playable landing'><LobbyScene phase={phase} appearance={look??undefined} input={input} playable={!modal&&!!guest} paused={modal==='avatar'}/></section>
  <header className='cg-header'><Link prefetch={false} href='/' aria-label='CTRL home'><BrandMark/><strong>CTRL</strong></Link><div className='cg-brand'><h1>Common Ground</h1><span>{verified?profile?.name??'Your avatar, your next adventure.':'A little walk before the wider world.'}</span></div><div className='cg-actions'><button aria-label='Change the light' onClick={()=>setPhase(nextAtmospherePreset)}>☀</button>{verified?<><button onClick={()=>open('avatar')}>Edit avatar</button><button className='cg-primary' onClick={()=>profile?router.push('/public-world'):open('avatar')}>{profile?'Enter Public World':'Create your avatar'} ↗</button></>:<button className='cg-primary' onClick={()=>open('wallet')}>Connect wallet ↗</button>}</div></header>
  <aside className='cg-note' aria-label='Your access'><span className='cg-eyebrow'>{verified?'WALLET CONNECTED':'GUEST / RANDOM AVATAR'}</span><p>{verified?'Your saved avatar travels with you.':'Walk around and have a look. Your guest avatar is randomly assigned.'}</p><small>{verified?'Public World is free to explore. A personal Habitat is separate.':'Connect your wallet to make your own avatar and explore Public World.'}</small>{verified&&<button className='cg-signout' onClick={()=>void logout()}>Sign out</button>}</aside>
  <div className='cg-willow'><span>BEYOND THE COMMON</span><strong>Willow · Garden · Market</strong><small>Three connected districts to explore.</small></div>
  <footer className='cg-help'>WASD / arrows to walk · Shift to run · Drag to look<span>No wallet needed here. No building or avatar editing as a guest.</span></footer>
  {!modal&&!!guest&&<nav className='cg-touch-controls' aria-label='Touch movement and running'>
   <AnalogStick onMove={({x,z})=>{input.current.x=x;input.current.z=z;}}/>
   <TouchRunButton className='cg-run' onRun={running=>{input.current.run=running;}}/>
  </nav>}
  {error&&!modal&&<div className='cg-error' role='alert'>{error}<button onClick={()=>setError('')}>Dismiss</button></div>}
  {modal&&<div className='cg-scrim'><section className={`cg-dialog${modal==='avatar'?' cg-avatar-dialog':''}`} role='dialog' aria-modal='true' aria-labelledby='cg-dialog-title' onKeyDown={e=>{if(e.key!=='Escape')e.stopPropagation();}}>
   <button className='cg-close' aria-label='Close sign-in or avatar' onClick={()=>{setModal(null);stop();}}>×</button>
   <h2 id='cg-dialog-title'>{modal==='wallet'?'Bring your own character.':'Make yourself at home.'}</h2>
   {modal==='wallet'?<><p>Connect and sign to create your avatar and enter Public World. You do not need to buy a Key to explore.</p><WalletConnection purpose='public-world' onVerified={()=>void signedIn()}/>{error&&<p role='alert'>{error}</p>}</>:verified&&draft&&<CreatorForm appearance={draft} name={name} busy={busy} error={error} onNameChange={setName} onAppearanceChange={setDraft} onSubmit={e=>void saveAvatar(e)}/>}
  </section></div>}
 </main>;
}
